import { describe, expect, it } from "vitest";
import { composeGates, fileGates, noteIsEmpty } from "./gates";
import { context24706, file24706, finding } from "./test-fixtures";

describe("fileGates", () => {
  it("passes the #24706 conversion", () => {
    expect(fileGates(file24706())).toEqual([]);
  });

  it("rejects duplicate ids", () => {
    const file = file24706();
    finding(file, "P3 2").id = "P3 1";
    expect(fileGates(file)).toContain("P3 1 is used by 2 findings");
  });

  it("requires filtered on F items only", () => {
    const file = file24706();
    finding(file, "P2 1").filtered = { category: "disproved", reason: "R" };
    delete finding(file, "F1").filtered;
    expect(fileGates(file)).toEqual(["P2 1: only F items are filtered", "F1: F items need filtered"]);
  });

  it("requires issue text on P findings", () => {
    const file = file24706();
    delete finding(file, "P3 1").issue;
    expect(fileGates(file)).toEqual(["P3 1: missing issue"]);
  });

  it("requires every discovering profile among the agents", () => {
    const file = file24706();
    finding(file, "P3 9").discovered_by[0]!.profile = "thermo_review";
    expect(fileGates(file)).toEqual(["P3 9: discovered by thermo_review, which isn't in agents"]);
  });

  it("checks the branch manifest", () => {
    const file = file24706();
    file.branches[1]!.revision = 0;
    file.branches[1]!.commits[0]!.findings = ["P1 7"];
    file.branches[1]!.commits[1]!.findings = ["F2"];
    expect(fileGates(file)).toEqual([
      "branches[1]: revision 0 must be above the previous 0",
      "branches[1] commit 627e17e0be1: no finding P1 7",
      "branches[1] commit 17fdff7bb7c: F2 is filtered; trim gives a finding a P id before a commit can fix it",
    ]);
  });
});

describe("noteIsEmpty", () => {
  it("treats whitespace, HTML comments and the old placeholder as empty", () => {
    expect(noteIsEmpty(null)).toBe(true);
    expect(noteIsEmpty(" \n<!-- John's words -->\n")).toBe(true);
    expect(noteIsEmpty("(space for John's free style comments - just keep empty)\n")).toBe(true);
    expect(noteIsEmpty(":shipit: -John\n")).toBe(false);
  });
});

describe("composeGates", () => {
  const errors = (edit: Parameters<typeof context24706>[0], change: (ctx: ReturnType<typeof context24706>) => void = () => {}) => {
    const ctx = context24706(edit);
    change(ctx);
    return composeGates(ctx, "comment").errors;
  };

  it("passes #24706 as approved", () => {
    expect(composeGates(context24706(), "comment")).toEqual({ errors: [], warnings: [] });
  });

  it("requires exactly one comment type", () => {
    expect(errors((f) => (f.actions.approve = false))).toEqual(["check one of approve, approve and merge, comment, review comment, request changes"]);
    expect(errors((f) => (f.actions.comment = true))).toEqual(["check only one of approve, comment"]);
  });

  it("refuses an empty or placeholder comment note", () => {
    expect(errors(() => {}, (ctx) => (ctx.commentNote = "\n<!-- notes -->\n"))).toEqual(["johns_review_0_comment_note.md is empty"]);
  });

  it("refuses a note citing a finding that isn't included", () => {
    expect(errors(() => {}, (ctx) => (ctx.commentNote = "See P2 3 and P3 1."))).toEqual(["the comment note cites P2 3, which isn't included"]);
  });

  it("refuses a dropped finding still on the branch", () => {
    expect(errors((f) => (finding(f, "P3 2").include = false))).toEqual(["✂️ Trim: drop bef11669426 (P3 2)"]);
  });

  it("refuses a re-included F item", () => {
    expect(errors((f) => (finding(f, "F1").include = true))).toEqual(["F1 is included; trim must verify it and give it a P id"]);
  });

  it("refuses @mentions in agent text, outside code", () => {
    expect(errors((f) => (finding(f, "P3 7").fix = "Ask @mvdbeek. Not `@decorator` or me@example.org."))).toEqual(["P3 7 mentions @mvdbeek; put it in backticks or drop the @"]);
    expect(errors(() => {}, (ctx) => (ctx.commentNote = "Thanks @mvdbeek!"))).toEqual([]);
  });

  it("checks pull request preconditions", () => {
    const pr = (change: (ctx: ReturnType<typeof context24706>) => void) => {
      const ctx = context24706((f) => {
        f.actions.pull_request = true;
        f.actions.push = true;
      });
      change(ctx);
      return composeGates(ctx, "pr").errors;
    };
    expect(pr(() => {})).toEqual(["johns_review_0_pr_note.md is empty", "check Pull request or Push, not both"]);
    const comment = context24706((f) => (f.actions.pull_request = true));
    comment.prNote = "Fixes.";
    expect(composeGates(comment, "comment").errors).toEqual(["Pull request is checked: run `compose pr`, open the PR, then `compose comment --pr-url <url>`"]);
    expect(composeGates(context24706(), "pr").errors).toEqual(["Pull request isn't checked"]);
  });

  it("refuses issue actions without their files", () => {
    expect(errors((f) => (f.actions.issue_refactor = f.actions.issue_galaxy_brain = true))).toEqual([
      "Issue (refactor) is checked but there's no followup_refactor_issue.md",
      "Issue (galaxy-brain) is checked but there's no learning_galaxy_followup_issue.md",
    ]);
    expect(errors(() => {}, (ctx) => (ctx.followupIssue = "# Follow-up"))).toEqual(["followup_refactor_issue.md needs followup_target"]);
  });

  it("warns when the human review names another commit", () => {
    const ctx = context24706();
    ctx.humanReview = "John reviewed all commits of the snapshot at `abcdef01234`.";
    expect(composeGates(ctx, "comment").warnings).toEqual(["human_review.md names abcdef01234, not the reviewed commit 5006c8fbfe3"]);
  });
});
