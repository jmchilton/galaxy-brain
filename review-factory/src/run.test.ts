import { cpSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { run } from "./run";
import { fixture } from "./test-fixtures";

async function cli(...argv: string[]) {
  const out: string[] = [];
  const err: string[] = [];
  const code = await run(argv, { out: (l) => out.push(l), err: (l) => err.push(l) });
  return { code, out: out.join("\n"), err: err.join("\n") };
}

/** A copy of the #24706 fixture as a vault review record. */
function record24706(): string {
  const dir = join(mkdtempSync(join(tmpdir(), "review-factory-")), "repositories/galaxy/reviews/active/24706");
  mkdirSync(dir, { recursive: true });
  cpSync(join(__dirname, "fixtures/24706"), dir, { recursive: true });
  writeFileSync(join(dir, "index.md"), "# #24706 — Allow sorting the history list by size\n");
  return dir;
}

describe("review-factory CLI", () => {
  it("composes the golden comment", async () => {
    const result = await cli("compose", "comment", "--record", record24706(), "--no-git");
    expect(result).toEqual({ code: 0, out: fixture("24706/expected_comment.md").trimEnd(), err: "" });
  });

  it("refuses with every reason and prints nothing", async () => {
    const dir = record24706();
    writeFileSync(join(dir, "johns_review_0_comment_note.md"), "Cites P2 3.\n");
    writeFileSync(join(dir, "review_0_findings.yml"), fixture("24706/review_0_findings.yml").replace("  approve: true", "  approve: false"));
    const result = await cli("compose", "comment", "--record", dir, "--no-git");
    expect(result).toEqual({
      code: 1,
      out: "",
      err: "error: check one of approve, approve and merge, comment, review comment, request changes\nerror: the comment note cites P2 3, which isn't included",
    });
  });

  it("prints the PR title and body", async () => {
    const dir = record24706();
    writeFileSync(join(dir, "review_0_findings.yml"), fixture("24706/review_0_findings.yml").replace("  pull_request: false", "  pull_request: true"));
    writeFileSync(join(dir, "johns_review_0_pr_note.md"), "Fixes.\n");
    expect((await cli("compose", "pr", "--record", dir, "--title", "--no-git")).out).toBe("Review fixes for history size sorting");
    expect((await cli("compose", "pr", "--record", dir, "--no-git")).out.startsWith("Fixes.\n\n<details><summary>Automated Review Details")).toBe(true);
  });

  it("reports status", async () => {
    expect((await cli("status", "--record", record24706())).out).toBe("✅ Ready to approve");
    const dir = record24706();
    writeFileSync(join(dir, "review_0_findings.yml"), fixture("24706/review_0_findings.yml").replace("  - id: P3 2\n    include: true", "  - id: P3 2\n    include: false"));
    const status = await cli("status", "--record", dir, "--json");
    expect(JSON.parse(status.out)).toMatchObject({ status: "✂️ Trim: drop bef11669426 (P3 2)", trim: { drop: [{ sha: "bef11669426", findings: ["P3 2"] }] } });
  });

  it("validates findings files under a path", async () => {
    const dir = record24706();
    expect(await cli("validate", dir)).toEqual({ code: 0, out: "1 of 1 findings files valid", err: "" });
    writeFileSync(join(dir, "review_0_findings.yml"), fixture("24706/review_0_findings.yml").replace("    issue: |\n      This is a user-facing", "    issue: |\n      This is\n    Note: a user-facing"));
    const bad = await cli("validate", dir);
    expect(bad.code).toBe(1);
    expect(bad.err).toBe(`${join(dir, "review_0_findings.yml")}: findings[0] (P2 1): unknown key "Note" (a dedented line inside a block scalar becomes a key; indent it)`);
  });

  it("rejects usage errors", async () => {
    expect((await cli("compose", "draft", "--record", "x")).code).toBe(2);
    expect((await cli("validate", "/no/such/dir")).code).toBe(2);
    expect((await cli()).code).toBe(2);
  });
});
