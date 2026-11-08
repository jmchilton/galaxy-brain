import { describe, expect, it } from "vitest";
import { includedFindings, latestBranch } from "./model";
import { parseFindings } from "./parse";
import { fixture } from "./test-fixtures";

const MINIMAL = `round: 0
reviewed_commit: 5006c8fbfe3a91c7f12f628fdd543c478f1854fa
agents:
  - {profile: default, path: _shared/reviewers/default.md, model: Claude Opus 5.5, effort: medium}
verification: {model: Claude Opus 5.5, effort: medium}
actions: {approve: false, approve_and_merge: false, comment: true, review_comment: false, request_changes: false, pull_request: false, push: false, issue_refactor: false, issue_galaxy_brain: false}
findings:
  - id: P2 1
    include: true
    title: T
    summary: S
    issue: |
      First line.
    discovered_by: [{profile: default, model: Claude Opus 5.5, effort: medium}]
`;

const errorsOf = (text: string) => parseFindings(text).errors;

describe("parseFindings", () => {
  it("reads the #24706 conversion", () => {
    const { file, errors } = parseFindings(fixture("24706/review_0_findings.yml"));
    expect(errors).toEqual([]);
    expect(file!.findings).toHaveLength(18);
    expect(includedFindings(file!).map((f) => f.id)).toEqual(["P2 1", "P2 2", "P3 1", "P3 2", "P3 3", "P3 4", "P3 5", "P3 6", "P3 7", "P3 8", "P3 9"]);
    expect(latestBranch(file!)!.name).toBe("pr_24706_review_1");
  });

  it("reads hand-styled YAML", () => {
    const { file, errors } = parseFindings(fixture("hand-styled.yml"));
    expect(errors).toEqual([]);
    expect(file!.findings[0]!.title).toBe("No E2E: test for sorting");
    expect(file!.findings[1]!.issue).toBe("folded text stays folded\n");
  });

  it("accepts the minimal file", () => {
    expect(errorsOf(MINIMAL)).toEqual([]);
  });

  it("rejects a bad priority id", () => {
    expect(errorsOf(MINIMAL.replace("id: P2 1", "id: P4 1"))).toEqual([`findings[0] (P4 1).id: "P4 1" isn't P<priority> <n> or F<n>`]);
  });

  it("rejects an unknown action and a missing one", () => {
    expect(errorsOf(MINIMAL.replace("approve: false,", "merge: false,"))).toEqual([
      `actions: unknown key "merge" (a dedented line inside a block scalar becomes a key; indent it)`,
      "actions: missing approve",
    ]);
  });

  it("rejects a dedented line that parses as a new key", () => {
    const text = MINIMAL.replace("      First line.\n", "      First line.\n    Note: the guard is untested.\n");
    expect(errorsOf(text)).toEqual([`findings[0] (P2 1): unknown key "Note" (a dedented line inside a block scalar becomes a key; indent it)`]);
  });

  it("requires include on every finding", () => {
    expect(errorsOf(MINIMAL.replace("    include: true\n", ""))).toEqual(["findings[0] (P2 1): missing include"]);
  });

  it("rejects a non-boolean include", () => {
    expect(errorsOf(MINIMAL.replace("include: true", "include: yes"))).toEqual([`findings[0] (P2 1).include: expected true or false, not "yes"`]);
  });

  it("reports parse errors with positions", () => {
    expect(errorsOf(MINIMAL.replace("title: T", "title: No E2E: test"))[0]).toMatch(/^line 10, column \d+: /);
    expect(errorsOf(MINIMAL.replace("    title: T", "\ttitle: T"))[0]).toMatch(/^line 10, /);
  });

  it("rejects multi-line text outside a block scalar", () => {
    expect(errorsOf(MINIMAL.replace("summary: S", 'summary: "one\n\n      two"'))).toEqual(["line 11, column 14: multi-line text must be a block scalar (`|`)"]);
  });

  it("keeps a numeric-looking short SHA as text", () => {
    const text = MINIMAL.replace("actions:", "branches:\n  - {name: b, revision: 0, head: 8e12345, commits: [{sha: 1234567, subject: S, findings: [P2 1]}]}\nactions:");
    const { file, errors } = parseFindings(text);
    expect(errors).toEqual([]);
    expect(file!.branches[0]!.head).toBe("8e12345");
    expect(file!.branches[0]!.commits[0]!.sha).toBe("1234567");
  });

  it("rejects an unknown filter category and a short reviewed commit", () => {
    const text = MINIMAL.replace("5006c8fbfe3a91c7f12f628fdd543c478f1854fa", "5006c8fbfe3").replace(
      "    discovered_by",
      "    filtered: {category: nitpick, reason: R}\n    discovered_by",
    );
    expect(errorsOf(text)).toEqual([
      `reviewed_commit: "5006c8fbfe3" isn't a full 40-character SHA`,
      `findings[0] (P2 1).filtered.category: "nitpick" isn't one of disproved, not_actionable, relitigates_pr, pre_existing, comment_nit, doctest, prop_vitest`,
    ]);
  });
});
