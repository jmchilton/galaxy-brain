import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { GIT_ENV, isolateGit, TestRepo } from "../../differential-review-lib/src/cli/test-repo";
import { branchGates } from "./branch-gates";
import type { ComposeContext } from "./gates";
import { context24706 } from "./test-fixtures";

const bare = (path: string) => execFileSync("git", ["init", "-q", "--bare", path], { env: { ...process.env, ...GIT_ENV } });

/** A clone whose `jmchilton` remote holds a two-commit review branch and whose origin holds the PR head. */
function setup() {
  const repo = new TestRepo();
  repo.write("a.txt", "a\n");
  const reviewed = repo.commit("reviewed");
  repo.git("checkout", "-q", "-b", "pr_24706_round_0_rev_0");
  repo.write("b.txt", "b\n");
  const first = repo.commit("fix P2 1");
  repo.write("c.txt", "c\n");
  const second = repo.commit("fix P3 1");
  for (const remote of ["jmchilton", "origin"]) {
    bare(join(repo.root, `${remote}.git`));
    repo.git("remote", "add", remote, join(repo.root, `${remote}.git`));
  }
  repo.git("push", "-q", "jmchilton", "pr_24706_round_0_rev_0");
  repo.git("push", "-q", "origin", `${reviewed}:refs/pull/24706/head`);
  return { repo, reviewed, first, second };
}

function ctxFor(reviewed: string, commits: Array<[string, string[]]>, head: string): ComposeContext {
  return context24706((f) => {
    f.reviewed_commit = reviewed;
    f.branches = [{ name: "pr_24706_round_0_rev_0", revision: 0, head: head.slice(0, 11), description: "D", commits: commits.map(([sha, findings]) => ({ sha: sha.slice(0, 11), subject: "S", findings })) }];
  });
}

describe("branchGates", () => {
  beforeAll(isolateGit);

  it("passes when the fork matches the manifest", () => {
    const { repo, reviewed, first, second } = setup();
    const ctx = ctxFor(reviewed, [[first, ["P2 1"]], [second, ["P3 1"]]], second);
    expect(branchGates(ctx, repo.dir)).toEqual({ errors: [], warnings: [] });
  });

  it("refuses a manifest that misses a commit", () => {
    const { repo, reviewed, first, second } = setup();
    const ctx = ctxFor(reviewed, [[first, ["P2 1"]]], second);
    expect(branchGates(ctx, repo.dir).errors).toEqual([
      `pr_24706_round_0_rev_0 has commits ${first.slice(0, 11)}, ${second.slice(0, 11)} on the reviewed commit, but the findings YAML lists ${first.slice(0, 11)}`,
    ]);
  });

  it("refuses an unpushed head", () => {
    const { repo, reviewed, first, second } = setup();
    repo.write("d.txt", "d\n");
    const third = repo.commit("fix P3 2");
    const ctx = ctxFor(reviewed, [[first, ["P2 1"]], [second, ["P3 1"]], [third, ["P3 2"]]], third);
    expect(branchGates(ctx, repo.dir).errors[0]).toBe(`pr_24706_round_0_rev_0 is at ${second.slice(0, 11)} on the fork, but the findings YAML says ${third.slice(0, 11)}`);
  });

  it("refuses a branch missing from the fork", () => {
    const { repo, reviewed, first } = setup();
    const ctx = ctxFor(reviewed, [[first, ["P2 1"]]], first);
    ctx.file.branches[0]!.name = "pr_24706_round_0_rev_1";
    expect(branchGates(ctx, repo.dir).errors).toEqual(["pr_24706_round_0_rev_1 isn't on John's fork; push it first"]);
  });

  it("warns when the PR moved, and refuses a push that wouldn't fast-forward", () => {
    const { repo, reviewed, first, second } = setup();
    repo.git("checkout", "-q", "-b", "author", reviewed);
    repo.write("e.txt", "e\n");
    const moved = repo.commit("author pushed");
    repo.git("push", "-q", "-f", "origin", `${moved}:refs/pull/24706/head`);
    const ctx = ctxFor(reviewed, [[first, ["P2 1"]], [second, ["P3 1"]]], second);
    expect(branchGates(ctx, repo.dir)).toEqual({ errors: [], warnings: [`PR #24706 has moved to ${moved.slice(0, 11)} since the reviewed commit ${reviewed.slice(0, 11)}`] });
    ctx.file.actions.push = true;
    expect(branchGates(ctx, repo.dir).errors).toEqual([`pushing pr_24706_round_0_rev_0 onto PR #24706 wouldn't fast-forward from ${moved.slice(0, 11)}`]);
  });
});
