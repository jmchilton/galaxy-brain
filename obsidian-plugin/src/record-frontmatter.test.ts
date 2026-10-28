import { describe, expect, it } from "vitest";
import { recordFrontmatter } from "./record-frontmatter";

describe("recordFrontmatter", () => {
	it("reads scalar fields, unquoting and coercing pr to a number", () => {
		const body = "---\nupstream_base_branch: \"release_26.0\"\nparent_branch: base_b\nblocker: gx_branches/wait\npr: 24300\n---\n# B\npr: 1\n";
		expect(recordFrontmatter(body)).toEqual({ upstream_base_branch: "release_26.0", parent_branch: "base_b", blocker: "gx_branches/wait", pr: 24300 });
	});

	it("is empty without leading frontmatter, and drops a non-numeric pr", () => {
		expect(recordFrontmatter("# B\n---\npr: 3\n---\n")).toEqual({});
		expect(recordFrontmatter("---\npr: soon\n---\n")).toEqual({});
	});
});
