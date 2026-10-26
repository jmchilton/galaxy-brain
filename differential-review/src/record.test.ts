import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { commitFiles, readAllSnapshots, snapshotFiles, snapshotReader, snapshotsDir, type Snapshot } from "../../differential-review-lib/src/core/index.js";
import { baseCandidates, nodeReadAdapter } from "../../differential-review-lib/src/cli/index.js";
import { isolateGit, numberedLines, TestRepo } from "../../differential-review-lib/src/cli/test-repo.js";
import { isReviewableRecordKind, recordReviewDir } from "../../site/src/lib/records";
import { chooseBase } from "./record";
import { run } from "./run";

beforeAll(isolateGit);

let clock = Date.parse("2026-10-26T00:00:00Z");

async function cliIn(cwd: string | undefined, argv: string[]) {
  const out: string[] = [];
  const err: string[] = [];
  clock += 60_000;
  const code = await run(argv, { out: (l) => out.push(l), err: (l) => err.push(l), now: new Date(clock), cwd });
  return { code, out: out.join("\n"), err: err.join("\n") };
}

const cli = (...argv: string[]) => cliIn(undefined, argv);
const firstLine = (text: string) => text.split("\n")[0];

/** A vault branch (or review) record dir with optional index.md frontmatter. */
function makeRecord(repo: TestRepo, branch: string, frontmatter: Record<string, string> | null, kind: "branches" | "reviews" = "branches"): string {
  const dir = join(repo.root, "vault", "repositories", "demo", kind, "active", branch);
  mkdirSync(dir, { recursive: true });
  const fm = frontmatter ? `---\n${Object.entries(frontmatter).map(([k, v]) => `${k}: ${v}`).join("\n")}\n---\n` : "";
  writeFileSync(join(dir, "index.md"), `${fm}# ${branch}\n`);
  return dir;
}

async function snapshot(repo: TestRepo, record: string, phase: string, ...extra: string[]) {
  const r = await cli("snapshot", "--worktree", repo.dir, "--record", record, "--phase", phase, ...extra);
  expect(r.err.replace(/^warning: .*$/gm, "").trim()).toBe("");
  expect(r.code).toBe(0);
  return r;
}

async function snapshots(record: string): Promise<Snapshot[]> {
  return readAllSnapshots(snapshotReader(nodeReadAdapter, recordReviewDir(record)));
}

/** main with a 60-line module; feature changes lines 10 and 40 in one commit. */
function setup(frontmatter: Record<string, string> | null = { upstream_base_branch: "main" }) {
  const repo = new TestRepo();
  repo.write("lib/mod.py", numberedLines(60));
  repo.commit("base");
  repo.git("checkout", "-q", "-b", "feature");
  repo.edit("lib/mod.py", "x_10 = 10\n", "x_10 = 1000\n");
  repo.edit("lib/mod.py", "x_40 = 40\n", "x_40 = 4000\n");
  repo.commit("Change two values");
  return { repo, record: makeRecord(repo, "feature", frontmatter) };
}

describe("record storage", () => {
  it("keeps a review only in branch and review records, under <record>/differential-review/", () => {
    expect(["branches", "reviews", "issues", "projects"].filter(isReviewableRecordKind)).toEqual(["branches", "reviews"]);
    expect(recordReviewDir("repositories/galaxy/branches/active/feature/")).toBe("repositories/galaxy/branches/active/feature/differential-review");
  });
});

describe("snapshot --record", () => {
  it("writes an immutable snapshot of the branch against the record's base", async () => {
    const { repo, record } = setup();
    const r = await snapshot(repo, record, "implementation");
    expect(firstLine(r.out)).toMatch(/^created .*\/differential-review\/snapshots\/\d{8}T\d{6}Z-implementation-[0-9a-f]{12}\.json$/);
    expect(r.out).toContain("first snapshot: 1 commit, 1 file, 2 hunks");
    const [s] = await snapshots(record);
    expect(s).toMatchObject({ phase: "implementation", repo: "demo", branch: "feature", head: repo.head(), previousSnapshotId: null, mapping: null });
    expect(s.base).toMatchObject({ name: "main", source: "upstream_base_branch", ref: "main" });
    expect(s.files.map((f) => [f.path, f.hunks.length])).toEqual([["lib/mod.py", 2]]);
    expect(s.commits).toHaveLength(1);
    expect(s.commits[0].patchId).toMatch(/^[0-9a-f]{40}$/);
    expect(s.commits[0].subject).toBe("Change two values");
    expect(() => snapshotFiles(s)).not.toThrow();
    expect(() => commitFiles(s.commits[0])).not.toThrow();
  });

  it("requires --base when the record has no frontmatter", async () => {
    const { repo, record } = setup(null);
    const r = await cli("snapshot", "--worktree", repo.dir, "--record", record, "--phase", "implementation");
    expect(r.code).toBe(1);
    expect(r.err).toMatch(/upstream_base_branch.*--base/);
    expect(existsSync(snapshotsDir(recordReviewDir(record)))).toBe(false);
    await snapshot(repo, record, "implementation", "--base", "main");
    expect((await snapshots(record))[0].base).toMatchObject({ source: "override", ref: "main" });
  });

  it("refuses a record dir without index.md instead of creating it", async () => {
    const { repo, record } = setup();
    const typo = `${record}_typo`;
    for (const argv of [
      ["snapshot", "--worktree", repo.dir, "--record", typo, "--phase", "implementation", "--base", "main"],
      ["list", "--record", typo],
      ["status", "--record", typo],
    ]) {
      const r = await cli(...argv);
      expect(r.code).toBe(1);
      expect(r.err).toMatch(/no record at .*_typo \(no index\.md\)/);
    }
    expect(existsSync(typo)).toBe(false);
  });

  it("explains a worktree that is not a git repo, and an unresolvable base", async () => {
    const { repo, record } = setup();
    const notGit = await cli("snapshot", "--worktree", repo.root, "--record", record, "--phase", "implementation");
    expect(notGit.code).toBe(1);
    expect(notGit.err).toMatch(/is not inside a git worktree; pass --worktree/);

    const badBase = await cli("snapshot", "--worktree", repo.dir, "--record", record, "--phase", "implementation", "--base", "nope");
    expect(badBase.code).toBe(1);
    expect(badBase.err).toMatch(/could not resolve base nope .*tried refs\/heads\/nope, nope\. Fetch it/);
  });

  it("defaults --worktree to the current dir only when it is on the record's branch", async () => {
    const { repo, record } = setup();
    const ok = await cliIn(`${repo.dir}/lib`, ["snapshot", "--record", record, "--phase", "implementation"]);
    expect(ok.code).toBe(0);
    expect(ok.err).toBe("");

    repo.git("checkout", "-q", "main");
    const wrong = await cliIn(repo.dir, ["snapshot", "--record", record, "--phase", "hardening"]);
    expect(wrong.code).toBe(1);
    expect(wrong.err).toMatch(/^error: worktree is on main, record is feature \(in .*\); pass --worktree/);
    repo.git("checkout", "-q", "--detach", "feature");
    const detached = await cliIn(repo.dir, ["snapshot", "--record", record, "--phase", "hardening"]);
    expect(detached.code).toBe(1);
    expect(detached.err).toMatch(/^error: HEAD is detached at [0-9a-f]{12}; snapshotting it for record feature/);
    expect(await snapshots(record)).toHaveLength(1);
  });

  it("only warns about a detached HEAD or another branch when --worktree is explicit", async () => {
    const { repo, record } = setup();
    repo.git("checkout", "-q", "--detach");
    const r = await cli("snapshot", "--worktree", repo.dir, "--record", record, "--phase", "implementation");
    expect(r.code).toBe(0);
    expect(r.err).toMatch(/^warning: HEAD is detached at [0-9a-f]{12}; snapshotting it for record feature$/);
    expect((await snapshots(record))[0].head).toBe(repo.head());
  });

  it("snapshots a PR head into a review record without the branch check or touching the worktree", async () => {
    const { repo } = setup();
    const prHead = repo.head();
    const record = makeRecord(repo, "42", null, "reviews");
    repo.git("checkout", "-q", "-b", "pr_42_review_0");
    repo.write("lib/fix.py", "fix = 1\n");
    const reviewHead = repo.commit("Review fix");

    const noBase = await cliIn(repo.dir, ["snapshot", "--record", record, "--phase", "review", "--head", "feature"]);
    expect(noBase.code).toBe(1);
    expect(noBase.err).toMatch(/^error: review record 42 has no base: pass --base <the PR's base branch>/);

    const r = await cliIn(repo.dir, ["snapshot", "--record", record, "--phase", "review", "--base", "main", "--head", "feature"]);
    expect(r.code).toBe(0);
    expect(r.err).toBe("");
    const [s] = await snapshots(record);
    expect(s.head).toBe(prHead);
    expect(s.phase).toBe("review");
    expect(s.files.map((f) => f.path)).toEqual(["lib/mod.py"]);
    expect(repo.head()).toBe(reviewHead);
    expect(repo.git("symbolic-ref", "--short", "HEAD").trim()).toBe("pr_42_review_0");

    const missing = await cliIn(repo.dir, ["snapshot", "--record", record, "--phase", "review", "--base", "main", "--head", "nope"]);
    expect(missing.code).toBe(1);
    expect(missing.err).toMatch(/^error: --head nope is not a commit in .*; fetch it first/);
  });

  it("treats bad flags and commands as usage errors with per-command help", async () => {
    const { record } = setup();
    for (const argv of [["status", "--record", record, "--bogus"], ["list", "--record", record, "--phase", "x"], ["frobnicate"], ["list", "extra"]]) {
      const r = await cli(...argv);
      expect(r.code).toBe(2);
      expect(r.err).toMatch(/^usage error: /);
    }
    const help = await cli("snapshot", "--help");
    expect(help.code).toBe(0);
    expect(help.out).toMatch(/^usage: differential-review snapshot --record <dir> --phase/);
    expect(help.out).toContain("--worktree <dir>  the branch's worktree (default: current dir, which must be on a branch record's branch)");
    expect(help.out).toContain("--head <rev>");
    const top = await cli("--help");
    expect(top.code).toBe(0);
    expect(top.out).toMatch(/snapshot .*\n.*list .*\n.*status /);
    expect((await cli()).code).toBe(2);
  });

  it("prefers origin/<base> for upstream bases and the local branch for parents", async () => {
    const { repo, record } = setup();
    repo.git("remote", "add", "origin", repo.dir);
    repo.git("fetch", "-q", "origin");
    await snapshot(repo, record, "implementation");
    expect((await snapshots(record))[0].base.ref).toBe("origin/main");
    const info = { repo: "demo", kind: "branches", branch: "feature", upstreamBaseBranch: "dev", parentBranch: null } as const;
    expect(baseCandidates(chooseBase({ ...info, parentBranch: "dev" }, undefined), ["jmchilton", "origin"])).toEqual([
      "refs/heads/dev",
      "origin/dev",
      "jmchilton/dev",
    ]);
    expect(baseCandidates(chooseBase(info, undefined), ["origin"])).toEqual(["origin/dev", "refs/heads/dev", "dev"]);
    expect(baseCandidates(chooseBase(info, "dev"), ["origin"])).toEqual(["origin/dev", "refs/heads/dev", "dev"]);
  });
});
