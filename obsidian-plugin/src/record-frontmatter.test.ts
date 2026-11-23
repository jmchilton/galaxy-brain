import { describe, expect, it } from "vitest";
import { recordFrontmatter, setFrontmatterScalar, withoutFrontmatter } from "./record-frontmatter";

describe("recordFrontmatter", () => {
	it("reads scalar fields, unquoting and coercing pr to a number", () => {
		const body = "---\nupstream_base_branch: \"release_26.0\"\nparent_branch: base_b\nblockers: gx_branches/wait\npr: 24300\n---\n# B\npr: 1\n";
		expect(recordFrontmatter(body)).toEqual({ upstream_base_branch: "release_26.0", parent_branch: "base_b", blockers: ["gx_branches/wait"], pr: 24300 });
	});

	it("reads blocker and blocking as one value, a flow list or a block list", () => {
		expect(recordFrontmatter("---\nblockers: [gx_branches/wait, 'galaxy/branches/parent']\nblocking:\n  - galaxy/issues/24551\n  - \"planemo/issues/1745\"\npr: 2\n---\n")).toEqual({
			blockers: ["gx_branches/wait", "galaxy/branches/parent"],
			blocking: ["galaxy/issues/24551", "planemo/issues/1745"],
			pr: 2,
		});
	});

	it("reads unindented block lists, as PyYAML writes them", () => {
		expect(recordFrontmatter("---\nblocking:\n- galaxy/issues/24551\n- planemo/issues/1745\npr: 2\n---\n")).toEqual({ blocking: ["galaxy/issues/24551", "planemo/issues/1745"], pr: 2 });
	});

	it("reads child_branches", () => {
		expect(recordFrontmatter("---\nchild_branches: [a, b]\n---\n")).toEqual({ child_branches: ["a", "b"] });
	});

	it("reads related_records", () => {
		expect(recordFrontmatter("---\nrelated_records: galaxy/reviews/24484\n---\n")).toEqual({ related_records: ["galaxy/reviews/24484"] });
	});

	it("reads pr_title, unescaping double quotes and keeping a leading bracket", () => {
		expect(recordFrontmatter('---\npr_title: "[26.0] Fix \\"x\\": y"\n---\n')).toEqual({ pr_title: '[26.0] Fix "x": y' });
		expect(recordFrontmatter("---\npr_title: 'It''s [WIP]'\n---\n")).toEqual({ pr_title: "It's [WIP]" });
		expect(recordFrontmatter("---\npr_title: Plain title\n---\n")).toEqual({ pr_title: "Plain title" });
	});

	it("is empty without leading frontmatter, and drops a non-numeric pr", () => {
		expect(recordFrontmatter("# B\n---\npr: 3\n---\n")).toEqual({});
		expect(recordFrontmatter("---\npr: soon\n---\n")).toEqual({});
	});
});

describe("withoutFrontmatter", () => {
	it("drops a leading block only", () => {
		expect(withoutFrontmatter("---\npr: 1\n---\n\n# Title\n\n---\nmore\n")).toBe("# Title\n\n---\nmore\n");
		expect(withoutFrontmatter("# Title\n\n---\nx: 1\n---\n")).toBe("# Title\n\n---\nx: 1\n---\n");
	});
});

describe("setFrontmatterScalar", () => {
	it("adds a block to a note without one", () => {
		expect(setFrontmatterScalar("# B\n", "pr_title", "[26.0] A: b")).toBe('---\npr_title: "[26.0] A: b"\n---\n# B\n');
		expect(setFrontmatterScalar("# B\n", "pr_title", null)).toBe("# B\n");
	});

	it("appends, replaces in place and keeps other keys and the body", () => {
		const body = "---\nupstream_base_branch: dev\nblocking:\n  - galaxy/issues/1\npr: 2\n---\n# B\n";
		const set = setFrontmatterScalar(body, "pr_title", "One");
		expect(set).toBe('---\nupstream_base_branch: dev\nblocking:\n  - galaxy/issues/1\npr: 2\npr_title: "One"\n---\n# B\n');
		expect(setFrontmatterScalar(set, "pr_title", 'Two "quoted"')).toBe('---\nupstream_base_branch: dev\nblocking:\n  - galaxy/issues/1\npr: 2\npr_title: "Two \\"quoted\\""\n---\n# B\n');
		expect(recordFrontmatter(setFrontmatterScalar(set, "pr_title", 'Two "quoted"')).pr_title).toBe('Two "quoted"');
	});

	it("replaces a value folded over indented lines", () => {
		expect(setFrontmatterScalar("---\npr_title: >-\n  Long\n  title\npr: 2\n---\n", "pr_title", "Short")).toBe('---\npr_title: "Short"\npr: 2\n---\n');
	});

	it("removes the key, and the block once it's empty", () => {
		expect(setFrontmatterScalar('---\npr: 2\npr_title: "One"\n---\n# B\n', "pr_title", null)).toBe("---\npr: 2\n---\n# B\n");
		expect(setFrontmatterScalar('---\npr_title: "One"\n---\n\n# B\n', "pr_title", null)).toBe("# B\n");
	});
});
