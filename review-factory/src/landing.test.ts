import { describe, expect, it } from "vitest";
import { composeComment, composePrBody } from "./compose";
import { landing, noteLabel, statusTone } from "./landing";
import { context24706, finding } from "./test-fixtures";

describe("landing", () => {
  it("lists postable findings by id, and filtered ones apart with their reason", () => {
    const page = landing(context24706());
    expect(page.findings.map((f) => `${f.id} ${f.include}`)).toEqual([
      "P2 1 true",
      "P2 2 true",
      "P2 3 false",
      ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `P3 ${n} true`),
    ]);
    expect(page.filtered.map((f) => f.id)).toEqual(["F1", "F2", "F3", "F4", "F5", "F6"]);
    expect(page.filtered[2]).toMatchObject({ include: false, filtered: { category: "pre_existing" } });
    expect(page.filtered[2]!.text).toBeUndefined();
  });

  it("expands a finding to its posted text, without the heading", () => {
    const ctx = context24706();
    const p32 = landing(ctx).findings.find((f) => f.id === "P3 2")!;
    expect(p32).toMatchObject({ title: finding(ctx.file, "P3 2").title, summary: finding(ctx.file, "P3 2").summary, fixedIn: [{ sha: "bef11669426", subject: "Let apply_sort_column select computed sort columns" }] });
    expect(p32.text!.startsWith(finding(ctx.file, "P3 2").issue!.trim())).toBe(true);
    expect(p32.text).toContain("Fixed on the review branch in [`bef11669426`]");
    expect(composeComment(ctx)).toContain(p32.text);
  });

  it("marks each note missing, empty or written", () => {
    const ctx = context24706();
    expect(landing(ctx).notes).toEqual([
      { name: "johns_review_0_comment_note.md", state: "written" },
      { name: "johns_review_0_pr_note.md", state: "missing" },
    ]);
    ctx.prNote = "<!-- John's words for the review-branch PR body -->\n";
    expect(landing(ctx).notes[1]).toEqual({ name: "johns_review_0_pr_note.md", state: "empty" });
  });

  it("hides actions that can't apply unless they're checked", () => {
    const shown = (ctx = context24706()) => landing(ctx).actions.map((a) => `${a.label}${a.checked ? " ☑" : ""}`);
    expect(shown()).toEqual(["Approve ☑", "Approve and merge", "Comment", "Review comment", "Request changes", "Pull request", "Push"]);
    const bare = context24706((f) => {
      f.branches = [];
      f.actions.issue_refactor = true;
    });
    bare.learningIssue = true;
    expect(shown(bare)).toEqual(["Approve ☑", "Approve and merge", "Comment", "Review comment", "Request changes", "Issue (refactor) ☑", "Issue (galaxy-brain)"]);
  });

  it("previews the comment, and the PR body when there's a branch", () => {
    const ctx = context24706();
    expect(landing(ctx)).toMatchObject({ status: "✅ Ready to approve", errors: [], warnings: [], previews: { comment: composeComment(ctx), pr: composePrBody(ctx) } });
    expect(landing(context24706((f) => (f.branches = []))).previews.pr).toBeNull();
  });

  it("gates as for opening the PR while Pull request is checked", () => {
    const ctx = context24706((f) => (f.actions.pull_request = true));
    const page = landing(ctx);
    expect(page.status).toBe("⛔ johns_review_0_pr_note.md is empty");
    expect(page.errors).toEqual(["johns_review_0_pr_note.md is empty"]);
    expect(page.previews.comment).toContain("are in the review-branch PR.");
    expect(page.previews.comment).not.toContain("undefined");
  });
});

describe("findings labels", () => {
  it("names a note by kind and state", () => {
    expect(noteLabel({ name: "johns_review_0_comment_note.md", state: "written" })).toBe("📝 Comment note");
    expect(noteLabel({ name: "johns_review_1_pr_note.md", state: "empty" })).toBe("📝 PR note · empty");
    expect(noteLabel({ name: "johns_review_0_pr_note.md", state: "missing" })).toBe("📝 PR note · missing");
  });

  it("tones the status, or a line of check output, by its mark", () => {
    const lines = ["✅ Ready to approve", "⛔ johns_review_0_comment_note.md is empty", "✂️ Trim: drop bef11669426 (P3 2)", "⚠️ PR #24706 has moved"];
    expect(lines.map(statusTone)).toEqual(["ready", "blocked", "trim", "warning"]);
  });
});
