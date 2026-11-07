import { mkdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { readAllSnapshots, snapshotReader, type Snapshot } from "../../differential-review-lib/src/core/index.js";
import { nodeReadAdapter } from "../../differential-review-lib/src/cli/index.js";
import { isolateGit, numberedLines, TestRepo } from "../../differential-review-lib/src/cli/test-repo.js";
import { recordReviewDir } from "../../site/src/lib/records";
import { captureMessage, captureRecord, recordBranchName } from "./capture";
import { run } from "./run";

beforeAll(isolateGit);

const GH_BASE = JSON.stringify({ baseRefName: "main" });

/** A clone at `<home>/projects/repositories/demo`, on `main`, with `origin` and `jmchilton` remotes. */
function setup() {
  const repo = new TestRepo();
  repo.write("lib/mod.py", numberedLines(60));
  repo.commit("base");
  for (const remote of ["origin", "jmchilton"]) {
    const bare = join(repo.root, `${remote}.git`);
    repo.git("init", "-q", "--bare", bare);
    repo.git("remote", "add", remote, bare);
  }
  repo.git("push", "-q", "origin", "main");
  const home = join(repo.root, "home");
  mkdirSync(join(home, "projects/repositories"), { recursive: true });
  symlinkSync(repo.dir, join(home, "projects/repositories/demo"));
  return { repo, home, env: { home, gh: () => GH_BASE } };
}

function feature(repo: TestRepo, name = "feature") {
  repo.git("checkout", "-q", "-b", name, "main");
  repo.edit("lib/mod.py", "x_10 = 10\n", "x_10 = 1000\n");
  const head = repo.commit("Change a value");
  repo.git("checkout", "-q", "main");
  return head;
}

function record(repo: TestRepo, kind: "branches" | "reviews", name: string, index: string): string {
  const dir = join(repo.root, "vault/repositories/demo", kind, "active", name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.md"), index);
  return dir;
}

const BASE_MAIN = "---\nupstream_base_branch: main\n---\n# A branch\n";
const taken = (dir: string): Promise<Snapshot[]> => readAllSnapshots(snapshotReader(nodeReadAdapter, recordReviewDir(dir)));

describe("captureRecord on a branch", () => {
  it("snapshots the local branch whatever the clone has checked out, as a revision", async () => {
    const { repo, env } = setup();
    const head = feature(repo);
    const dir = record(repo, "branches", "feature", BASE_MAIN);
    const result = await captureRecord(dir, env);
    expect(result.status).toBe("created");
    expect(result.snapshot).toMatchObject({ head, phase: "revision", branch: "feature", repo: "demo" });
    expect(result.snapshot.base).toMatchObject({ name: "main", source: "upstream_base_branch", ref: "origin/main" });
    expect(repo.git("symbolic-ref", "--short", "HEAD").trim()).toBe("main");
  });

  it("prefers the record's worktree to the clone", async () => {
    const { repo, home, env } = setup();
    const head = feature(repo);
    const worktree = join(home, "projects/worktrees/demo/branch/feature");
    mkdirSync(dirname(worktree), { recursive: true });
    repo.git("worktree", "add", "-q", worktree, "feature");
    rmSync(join(home, "projects/repositories/demo"));
    const result = await captureRecord(record(repo, "branches", "feature", BASE_MAIN), env);
    expect(result.snapshot.head).toBe(head);
  });

  it("fetches the upstream base first, so a rebased branch doesn't show the base's commits", async () => {
    const { repo, env } = setup();
    repo.git("checkout", "-q", "-b", "other", "main");
    repo.write("upstream.txt", "new upstream work\n");
    const upstream = repo.commit("Upstream work");
    repo.git("push", "-q", "origin", "other:main");
    repo.git("update-ref", "refs/remotes/origin/main", "main");
    repo.edit("lib/mod.py", "x_10 = 10\n", "x_10 = 1000\n");
    repo.commit("Change a value");
    repo.git("branch", "-q", "-m", "feature");
    repo.git("checkout", "-q", "main");
    const { snapshot } = await captureRecord(record(repo, "branches", "feature", BASE_MAIN), env);
    expect(snapshot.base.mergeBase).toBe(upstream);
    expect(snapshot.files.map((f) => f.path)).toEqual(["lib/mod.py"]);
  });

  it("warns and goes on when the base can't be fetched", async () => {
    const { repo, env } = setup();
    feature(repo);
    repo.git("remote", "set-url", "origin", join(repo.root, "gone.git"));
    const result = await captureRecord(record(repo, "branches", "feature", BASE_MAIN), env);
    expect(result.status).toBe("created");
    expect(result.warnings).toEqual(["could not fetch main from origin; comparing with the copy here"]);
  });

  it("finds a branch only on the fork", async () => {
    const { repo, env } = setup();
    const head = feature(repo);
    repo.git("push", "-q", "jmchilton", "feature");
    repo.git("branch", "-q", "-D", "feature");
    const { snapshot } = await captureRecord(record(repo, "branches", "feature", BASE_MAIN), env);
    expect(snapshot.head).toBe(head);
  });

  it("takes the fork's head when the local branch is behind it, and the local one when they've diverged", async () => {
    const { repo, env } = setup();
    feature(repo);
    repo.git("checkout", "-q", "feature");
    repo.edit("lib/mod.py", "x_20 = 20\n", "x_20 = 2000\n");
    const newer = repo.commit("Another change");
    repo.git("push", "-q", "jmchilton", "feature");
    repo.git("reset", "-q", "--hard", "HEAD~1");
    repo.git("checkout", "-q", "main");
    const dir = record(repo, "branches", "feature", BASE_MAIN);
    expect((await captureRecord(dir, env)).snapshot.head).toBe(newer);

    repo.git("checkout", "-q", "feature");
    repo.edit("lib/mod.py", "x_30 = 30\n", "x_30 = 3000\n");
    const diverged = repo.commit("A local change");
    repo.git("checkout", "-q", "main");
    expect((await captureRecord(dir, env)).snapshot.head).toBe(diverged);
  });

  it("uses the branch its GitHub link names, for itself and its parent", async () => {
    const { repo, env } = setup();
    const parentHead = feature(repo, "feat/parent");
    repo.git("checkout", "-q", "-b", "fix/child", "feat/parent");
    repo.edit("lib/mod.py", "x_20 = 20\n", "x_20 = 2000\n");
    const head = repo.commit("Child change");
    repo.git("checkout", "-q", "main");
    record(repo, "branches", "feat-parent", `${BASE_MAIN}\n- [View on GitHub](https://github.com/galaxyproject/demo/tree/feat/parent)\n`);
    const child = record(repo, "branches", "fix-child", "---\nupstream_base_branch: main\nparent_branch: feat-parent\n---\n# Child\n\n- [View on GitHub](https://github.com/galaxyproject/demo/tree/fix/child)\n");
    const { snapshot } = await captureRecord(child, env);
    expect(snapshot).toMatchObject({ head, branch: "fix/child" });
    expect(snapshot.base).toMatchObject({ name: "feat/parent", source: "parent_branch", sha: parentHead, mergeBase: parentHead });
    expect(snapshot.files.flatMap((f) => f.hunks)).toHaveLength(1);
  });

  it("explains a record without a base, a branch that's gone and a repo with no clone", async () => {
    const { repo, env } = setup();
    feature(repo);
    await expect(captureRecord(record(repo, "branches", "feature", "# No base\n"), env)).rejects.toThrow(/add `upstream_base_branch: <branch>`/);
    await expect(captureRecord(record(repo, "branches", "gone", BASE_MAIN), env)).rejects.toThrow(/no branch gone here or on jmchilton or origin/);
    await expect(captureRecord(record(repo, "branches", "feature", BASE_MAIN), { ...env, home: join(repo.root, "elsewhere") })).rejects.toThrow(/no clone of demo at .*elsewhere\/projects\/repositories\/demo/);
  });

  it("makes nothing new for a head that already has a snapshot, whichever phase took it", async () => {
    const { repo, home, env } = setup();
    feature(repo);
    const dir = record(repo, "branches", "feature", BASE_MAIN);
    const cli = await run(["snapshot", "--worktree", join(home, "projects/repositories/demo"), "--record", dir, "--phase", "implementation", "--head", "feature"], { out: () => undefined, err: () => undefined });
    expect(cli).toBe(0);
    const result = await captureRecord(dir, env);
    expect(result.status).toBe("exists");
    expect(await taken(dir)).toHaveLength(1);
  });
});

describe("captureRecord on a review", () => {
  it("snapshots the PR's head against the base GitHub gives, without touching the checkout", async () => {
    const { repo, home } = setup();
    const head = feature(repo);
    repo.git("push", "-q", "origin", "feature:refs/pull/42/head");
    repo.git("branch", "-q", "-D", "feature");
    const calls: string[][] = [];
    const dir = record(repo, "reviews", "42", "# #42\n\n- [View on GitHub](https://github.com/someone/demo/pull/42)\n");
    const { snapshot } = await captureRecord(dir, {
      home,
      gh: (args) => {
        calls.push(args);
        return GH_BASE;
      },
    });
    expect(calls).toEqual([["pr", "view", "42", "-R", "someone/demo", "--json", "baseRefName"]]);
    expect(snapshot).toMatchObject({ head, phase: "review", branch: "42" });
    expect(snapshot.base).toMatchObject({ name: "main", ref: "origin/main" });
    expect(repo.git("symbolic-ref", "--short", "HEAD").trim()).toBe("main");
  });

  it("refuses a record whose name isn't a PR number", async () => {
    const { repo, env } = setup();
    await expect(captureRecord(record(repo, "reviews", "fork-87", "# Fork\n"), env)).rejects.toThrow(/fork-87 isn't a PR number/);
  });
});

describe("recordBranchName", () => {
  it("reads only the record's own View on GitHub link", () => {
    expect(recordBranchName("a-b", "demo", "- [View on GitHub](https://github.com/x/demo/tree/a/b)")).toBe("a/b");
    expect(recordBranchName("a-b", "demo", "- [View on GitHub](https://github.com/x/other/tree/a/b)")).toBe("a-b");
    expect(recordBranchName("a-b", "demo", "- [Related work](https://github.com/x/demo/tree/c)")).toBe("a-b");
  });
});

describe("the capture command", () => {
  const cli = async (...argv: string[]) => {
    const out: string[] = [];
    const err: string[] = [];
    const code = await run(argv, { out: (l) => out.push(l), err: (l) => err.push(l) });
    return { code, out: out.join("\n"), err: err.join("\n") };
  };

  it("says what it did, or why it couldn't", async () => {
    const { repo, home } = setup();
    feature(repo);
    const original = process.env.HOME;
    process.env.HOME = home;
    try {
      const dir = record(repo, "branches", "feature", BASE_MAIN);
      const first = await cli("capture", "--record", dir);
      expect(first.code).toBe(0);
      expect(first.out).toMatch(/^Snapshot taken of feature at [0-9a-f]{12}, against origin\/main$/);
      expect((await cli("capture", "--record", dir)).out).toMatch(/^Already snapshotted feature at [0-9a-f]{12}$/);
      const noBase = await cli("capture", "--record", record(repo, "branches", "nobase", "# No base\n"));
      expect(noBase.code).toBe(1);
      expect(noBase.err).toMatch(/^error: record nobase has no base/);
    } finally {
      process.env.HOME = original;
    }
  });

  it("treats a missing --record as a usage error, and lists itself in the help", async () => {
    expect((await cli("capture")).code).toBe(2);
    expect((await cli("--help")).out).toContain("capture");
  });
});

describe("captureMessage", () => {
  it("adds warnings on their own lines", async () => {
    const { repo, env } = setup();
    feature(repo);
    repo.git("remote", "set-url", "origin", join(repo.root, "gone.git"));
    const message = captureMessage(await captureRecord(record(repo, "branches", "feature", BASE_MAIN), env));
    expect(message.split("\n")[1]).toBe("could not fetch main from origin; comparing with the copy here");
  });
});
