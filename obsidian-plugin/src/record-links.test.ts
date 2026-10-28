import { describe, expect, it } from "vitest";
import { recordFromPath } from "./launchers";
import { compareUrl, githubUrl, worktreeCandidates } from "./record-links";

const branch = recordFromPath("repositories/galaxy/branches/active/fix_26.0/index.md")!;
const review = recordFromPath("repositories/galaxy/reviews/active/23295/index.md")!;
const issue = recordFromPath("repositories/galaxy/issues/queued/24350/index.md")!;

describe("githubUrl", () => {
	it("prefers a branch's linked PR over its tree and other links", () => {
		const body = `[run 1](https://github.com/jmchilton/galaxy/actions/runs/1) [#9](https://github.com/galaxyproject/galaxy/issues/9)
- [PR #24300](https://github.com/galaxyproject/galaxy/pull/24300)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/fix_26.0)`;
		expect(githubUrl(branch, body)).toBe("https://github.com/galaxyproject/galaxy/pull/24300");
	});

	it("uses a PR named on the Status line", () => {
		expect(githubUrl(branch, "Status: `ready` — PR #24202 (draft) rebased.\n\nBlocked on PR #1.")).toBe(
			"https://github.com/galaxyproject/galaxy/pull/24202",
		);
	});

	it("falls back to the branch tree, ignoring compare and dependency links", () => {
		const body = `- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.0...jmchilton:galaxy:fix_26.0?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/fix_26.0)
Blocked on [#24297](https://github.com/galaxyproject/galaxy/pull/24297).`;
		expect(githubUrl(branch, body)).toBe("https://github.com/jmchilton/galaxy/tree/fix_26.0");
	});

	it("guesses the fork branch when nothing is linked", () => {
		expect(githubUrl(branch, "No links.")).toBe("https://github.com/jmchilton/galaxy/tree/fix_26.0");
		const foundry = recordFromPath("repositories/foundry/branches/active/b/index.md")!;
		expect(githubUrl(foundry, "No links.")).toBe("https://github.com/galaxyproject/foundry/tree/b");
	});

	it("finds the review's PR, not review branches or comment anchors", () => {
		const body = `[branch](https://github.com/jmchilton/galaxy/tree/pr_23295_review_0) [c](https://github.com/galaxyproject/galaxy/pull/23295#issuecomment-1)
[View on GitHub](https://github.com/galaxyproject/galaxy/pull/23295)`;
		expect(githubUrl(review, body)).toBe("https://github.com/galaxyproject/galaxy/pull/23295");
	});

	it("builds review and issue URLs on the upstream owner when unlinked", () => {
		const docker = recordFromPath("repositories/docker-galaxy/reviews/active/7/index.md")!;
		expect(githubUrl(docker, "See [#3](https://github.com/bgruening/docker-galaxy/pull/3).")).toBe(
			"https://github.com/bgruening/docker-galaxy/pull/7",
		);
		expect(githubUrl(issue, "[other](https://github.com/galaxyproject/galaxy/issues/1)")).toBe(
			"https://github.com/galaxyproject/galaxy/issues/24350",
		);
	});
});

describe("githubUrl for issue incubator records", () => {
	it("opens the upstream issue list, not a fork branch", () => {
		const draft = recordFromPath("repositories/galaxy/issues_incubator/incubating/oidc_extra_authorize_params/index.md")!;
		expect(githubUrl(draft, "Related: [#9](https://github.com/galaxyproject/galaxy/issues/9)")).toBe("https://github.com/galaxyproject/galaxy/issues");
	});
});

describe("compareUrl", () => {
	it("compares a fork branch to its upstream_base_branch", () => {
		expect(compareUrl(branch, "---\nupstream_base_branch: release_26.0\n---\n# Fix")).toBe(
			"https://github.com/galaxyproject/galaxy/compare/release_26.0...jmchilton:galaxy:fix_26.0",
		);
	});

	it("compares within upstream for foundry", () => {
		const foundry = recordFromPath("repositories/foundry/branches/active/b/index.md")!;
		expect(compareUrl(foundry, "---\nupstream_base_branch: main\n---\n")).toBe("https://github.com/galaxyproject/foundry/compare/main...b");
	});

	it("is undefined without a base or outside frontmatter or for non-branches", () => {
		expect(compareUrl(branch, "# Fix")).toBeUndefined();
		expect(compareUrl(branch, "# Fix\nupstream_base_branch: dev\n")).toBeUndefined();
		expect(compareUrl(review, "---\nupstream_base_branch: dev\n---\n")).toBeUndefined();
	});
});

describe("worktreeCandidates", () => {
	it("lists a branch's Worktree line, expanding ~, then the conventional path", () => {
		expect(worktreeCandidates(branch, "Worktree: `~/elsewhere/fix`.", "/home/j")).toEqual([
			"/home/j/elsewhere/fix",
			"/home/j/projects/worktrees/galaxy/branch/fix_26.0",
		]);
		expect(worktreeCandidates(branch, "No worktree yet.", "/home/j")).toEqual([
			"/home/j/projects/worktrees/galaxy/branch/fix_26.0",
		]);
	});

	it("uses the PR worktree for reviews and none for issues", () => {
		expect(worktreeCandidates(review, "", "/home/j")).toEqual(["/home/j/projects/worktrees/galaxy/pr/23295"]);
		expect(worktreeCandidates(issue, "", "/home/j")).toEqual([]);
	});
});
