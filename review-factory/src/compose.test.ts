import { describe, expect, it } from "vitest";
import { compose, composeComment, composePrBody, GITHUB_BODY_LIMIT } from "./compose";
import { context24706, finding, fixture } from "./test-fixtures";

const sortedLines = (text: string) => text.split("\n").sort();

describe("compose comment", () => {
  it("matches the golden #24706 response", () => {
    expect(composeComment(context24706())).toBe(fixture("24706/expected_comment.md"));
  });

  it("golden differs from the posted #24706 response only in block order", () => {
    expect(sortedLines(fixture("24706/expected_comment.md"))).toEqual(sortedLines(fixture("24706/posted.md")));
  });

  it("passes the gates for #24706", () => {
    expect(compose(context24706(), "comment")).toEqual({ body: fixture("24706/expected_comment.md"), errors: [], warnings: [] });
  });

  it("picks the no-findings line by PR number mod 3", () => {
    const lines = [24705, 24706, 24707].map((pr) => {
      const ctx = context24706((f) => {
        f.findings.forEach((one) => (one.include = false));
        f.branches = [];
      });
      ctx.pr = pr;
      ctx.risks = null;
      return composeComment(ctx).split("\n\n").at(-1)!.trim();
    });
    expect(lines).toEqual([
      "- What is this magic 🪄 - no findings! What a trick you pulled off here.",
      "- Exit 0 from these Unix-y agents 🐧 - everything must be okay.",
      "- Heroic effort 🦸 - none of the agents found issues.",
    ]);
  });

  it("puts the human review under its heading after the note", () => {
    const ctx = context24706();
    ctx.humanReview = "John reviewed all commits of the snapshot at `5006c8fbfe3`.\n";
    expect(composeComment(ctx).startsWith(":shipit: -John\n\n## Human Review\n\nJohn reviewed all commits of the snapshot at `5006c8fbfe3`.\n\n<details><summary>Automated Review Details</summary>")).toBe(true);
  });

  it("drops HTML comments from notes", () => {
    const ctx = context24706();
    ctx.commentNote = "<!-- John's words for the PR comment -->\nLooks good.\n";
    expect(composeComment(ctx).startsWith("Looks good.\n\n<details>")).toBe(true);
  });

  it("fences the follow-up issue past its own backticks", () => {
    const ctx = context24706((f) => (f.followup_target = "dev"));
    ctx.followupIssue = "# Follow-up\n\n```python\nx = 1\n```\n";
    expect(composeComment(ctx).endsWith(
      "<details><summary>Suggested Follow-Up Refactoring for dev</summary>\n\nHere's draft text for a follow-up issue covering refactorings this review recommends that don't fit this PR or its target branch. When creating the issue, feel free to assign John (jmchilton).\n\n````markdown\n# Follow-up\n\n```python\nx = 1\n```\n````\n\n</details>\n",
    )).toBe(true);
  });

  it("refuses a body over GitHub's limit", () => {
    const ctx = context24706();
    finding(ctx.file, "P3 7").fix = "x".repeat(GITHUB_BODY_LIMIT);
    const result = compose(ctx, "comment");
    expect(result.body).toBeNull();
    expect(result.errors).toEqual([`the comment is ${composeComment(ctx).length} characters; GitHub allows ${GITHUB_BODY_LIMIT}`]);
  });

  it("outputs nothing when a gate refuses", () => {
    const ctx = context24706();
    ctx.commentNote = "";
    expect(compose(ctx, "comment")).toEqual({ body: null, errors: ["johns_review_0_comment_note.md is empty"], warnings: [] });
  });
});

describe("pull request mode", () => {
  const prContext = () => {
    const ctx = context24706((f) => (f.actions.pull_request = true));
    ctx.prNote = "Fixes from my review of #24706.\n";
    ctx.prUrl = "https://github.com/galaxyproject/galaxy/pull/24800";
    return ctx;
  };

  it("keeps findings out of the comment and links the PR", () => {
    expect(compose(prContext(), "comment").body).toBe(
      ":shipit: -John\n\nThe automated review findings, and a branch with fixes for them, are in https://github.com/galaxyproject/galaxy/pull/24800.\n",
    );
  });

  it("puts the PR note, agent details, risks, findings and branch in the PR body", () => {
    const body = compose(prContext(), "pr").body!;
    const comment = fixture("24706/expected_comment.md");
    expect(body).toBe(comment.replace(":shipit: -John\n", "Fixes from my review of #24706.\n"));
  });

  it("leaves the human review out of the PR body", () => {
    const ctx = prContext();
    ctx.humanReview = "John reviewed all commits.";
    expect(composePrBody(ctx)).not.toContain("Human Review");
    expect(compose(ctx, "comment").body).toContain("## Human Review\n\nJohn reviewed all commits.\n\nThe automated review findings");
  });
});

describe("John-only text", () => {
  it("never posts summaries or filter reasons", () => {
    const ctx = context24706((f) => {
      f.followup_target = "dev";
      f.findings.forEach((one, i) => {
        one.summary = `SUMMARY-${i}`;
        if (one.filtered) one.filtered.reason = `REASON-${i}`;
      });
    });
    ctx.followupIssue = "# Follow-up\n";
    ctx.humanReview = "Reviewed.";
    const pr = { ...ctx, prNote: "PR note", prUrl: "https://example.org/pr" };
    for (const body of [composeComment(ctx), composePrBody(pr), composeComment(pr)]) {
      expect(body).not.toMatch(/SUMMARY-|REASON-/);
    }
  });
});
