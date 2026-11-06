import { describe, expect, it } from "vitest";
import { blockerFromPath, blockersPath, recordBlockers, recordIdLabel, recordIndexPath, recordLinks, recordRefs, relatedBranches } from "./blockers";

describe("blockersPath", () => {
	it("is blockers/ in the agent dir", () => {
		expect(blockersPath("planemo")).toBe("agents/planemo/blockers");
	});
});

describe("blockerFromPath", () => {
	it("finds the blocker for its directory or any file inside it", () => {
		expect(blockerFromPath("agents/planemo/blockers/wait_for_1733")).toEqual({ agentDir: "planemo", name: "wait_for_1733" });
		expect(blockerFromPath("agents/gx_branches/blockers/ci_fix/condition.md")).toEqual({ agentDir: "gx_branches", name: "ci_fix" });
	});

	it("is null outside a blocker directory", () => {
		expect(blockerFromPath("agents/planemo/blockers")).toBeNull();
		expect(blockerFromPath("agents/planemo/TASKS.md")).toBeNull();
		expect(blockerFromPath("repositories/galaxy/blockers/x/index.md")).toBeNull();
	});
});

describe("recordBlockers", () => {
	it("reads agent and record blockers named in a record's frontmatter", () => {
		expect(recordBlockers("---\nupstream_base_branch: dev\nblockers: gx_branches/wait_for_24501\n---\n# Fix\n")).toEqual([{ agentDir: "gx_branches", name: "wait_for_24501" }]);
		expect(recordBlockers('---\nblockers: ["planemo/release", galaxy/reviews/24484]\n---\n')).toEqual([
			{ agentDir: "planemo", name: "release" },
			{ repo: "galaxy", kind: "reviews", name: "24484" },
		]);
	});

	it("is empty without frontmatter blockers, and skips malformed ones", () => {
		expect(recordBlockers("# Fix\n\nblockers: gx_branches/wait\n")).toEqual([]);
		expect(recordBlockers("---\nupstream_base_branch: dev\n---\n")).toEqual([]);
		expect(recordBlockers("---\nblockers: [no_slash, galaxy/pulls/12]\n---\n")).toEqual([]);
	});
});

describe("recordRefs", () => {
	it("reads the records a record blocks", () => {
		expect(recordRefs("---\nblocking:\n  - galaxy/issues/24551\n  - planemo/branches/fix_26.1\n---\n", "blocking")).toEqual([
			{ repo: "galaxy", kind: "issues", name: "24551" },
			{ repo: "planemo", kind: "branches", name: "fix_26.1" },
		]);
	});

	it("reads related records, skipping malformed ones", () => {
		expect(recordRefs("---\nrelated_records: [galaxy/reviews/24484, gx_branches/wait]\n---\n", "related_records")).toEqual([
			{ repo: "galaxy", kind: "reviews", name: "24484" },
		]);
	});
});

describe("relatedBranches", () => {
	it("reads a branch record's parent and children as branch records in its repository", () => {
		const body = "---\nupstream_base_branch: dev\nparent_branch: base\nchild_branches:\n  - child_a\n  - child_b\n---\n";
		expect(relatedBranches(body, "galaxy")).toEqual({
			parents: [{ repo: "galaxy", kind: "branches", name: "base" }],
			children: [
				{ repo: "galaxy", kind: "branches", name: "child_a" },
				{ repo: "galaxy", kind: "branches", name: "child_b" },
			],
		});
	});

	it("is empty for an independent branch", () => {
		expect(relatedBranches("---\nupstream_base_branch: dev\n---\n", "galaxy")).toEqual({ parents: [], children: [] });
	});
});

describe("recordIndexPath", () => {
	it("finds a record's index.md under any status", () => {
		const paths = ["repositories/galaxy/issues/queued/24551/index.md", "repositories/galaxy/issues/queued/24551/plan.md", "repositories/galaxy/reviews/active/24551/index.md"];
		expect(recordIndexPath(paths, { repo: "galaxy", kind: "issues", name: "24551" })).toBe("repositories/galaxy/issues/queued/24551/index.md");
		expect(recordIndexPath(paths, { repo: "galaxy", kind: "branches", name: "24551" })).toBeUndefined();
	});
});

describe("recordIdLabel", () => {
	it("is the frontmatter reference", () => {
		expect(recordIdLabel({ repo: "galaxy", kind: "reviews", name: "24484" })).toBe("galaxy/reviews/24484");
	});
});

describe("recordLinks", () => {
	it("lists blockers, blocked and related records, then parent and child branches", () => {
		const body = "---\nblockers: [gx_branches/wait, galaxy/reviews/1]\nblocking: galaxy/issues/2\nrelated_records: [foundry/issues/3]\nparent_branch: base\nchild_branches: [kid]\n---\n# T\n";
		expect(recordLinks(body, "galaxy").map(({ text, label, icon }) => [text, label, icon])).toEqual([
			["🔒 gx_branches/wait", "Blocked: gx_branches/wait", "lock"],
			["🔒 galaxy/reviews/1", "Blocked by galaxy/reviews/1", "lock"],
			["🚫 galaxy/issues/2", "Blocking galaxy/issues/2", "ban"],
			["🔗 foundry/issues/3", "Related: foundry/issues/3", "link"],
			["↑ base", "Parent branch: base", "arrow-up"],
			["↓ kid", "Child branch: kid", "arrow-down"],
		]);
	});

	it("targets the blocker or record each one names", () => {
		const [agent, record, parent] = recordLinks("---\nblockers: [gx_branches/wait, galaxy/reviews/1]\nparent_branch: base\n---\n", "foundry");
		expect(agent!.target).toEqual({ agentDir: "gx_branches", name: "wait" });
		expect(record!.target).toEqual({ repo: "galaxy", kind: "reviews", name: "1" });
		expect(parent!.target).toEqual({ repo: "foundry", kind: "branches", name: "base" });
	});

	it("is empty without those fields", () => {
		expect(recordLinks("---\npr: 1\n---\n# T\n", "galaxy")).toEqual([]);
		expect(recordLinks("# T\n", "galaxy")).toEqual([]);
	});
});
