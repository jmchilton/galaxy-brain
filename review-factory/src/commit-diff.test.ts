import { beforeAll, describe, expect, it } from "vitest";
import { isolateGit, TestRepo } from "../../differential-review-lib/src/cli/test-repo";
import { commitDiff } from "./commit-diff";

describe("commitDiff", () => {
  beforeAll(isolateGit);

  it("gives a commit's patch per file, by short sha", () => {
    const repo = new TestRepo();
    repo.write("a.py", "x = 1\ny = 2\n");
    repo.commit("base");
    repo.edit("a.py", "y = 2", "y = 3");
    repo.write("b.txt", "b\n");
    const sha = repo.commit("fix P2 1");
    const diff = commitDiff(repo.dir, sha.slice(0, 11));
    expect(diff).toEqual({
      files: [
        { path: "a.py", added: 1, removed: 1, patch: expect.stringContaining("-y = 2\n+y = 3\n") },
        { path: "b.txt", added: 1, removed: 0, patch: expect.stringContaining("+b\n") },
      ],
    });
  });

  it("says when the commit isn't in the checkout, without fetching", () => {
    const repo = new TestRepo();
    repo.write("a.txt", "a\n");
    repo.commit("base");
    expect(commitDiff(repo.dir, "1d55b74c188")).toEqual({ missing: `1d55b74c188 isn't in ${repo.dir}; fetch the review branch there` });
  });
});
