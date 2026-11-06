import { describe, expect, it } from "vitest";
import { recordFrontmatter, withoutFrontmatter } from "./record-frontmatter";

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
