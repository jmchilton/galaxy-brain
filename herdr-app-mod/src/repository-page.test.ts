import { describe, expect, it } from "vitest";
import { recordRefOf, repositoryChanged, repositoryTabName } from "./repository-page";

describe("repositoryTabName", () => {
	it("names the repository, or all of them", () => {
		expect(repositoryTabName("galaxy")).toBe("📚 galaxy");
		expect(repositoryTabName()).toBe("📚 All repositories");
	});
});

describe("recordRefOf", () => {
	it("is the ref of a path in a record, whatever its status", () => {
		expect(recordRefOf("repositories/galaxy/branches/active/my_branch/index.md")).toBe("galaxy/branches/my_branch");
		expect(recordRefOf("repositories/galaxy/reviews/archived/24719/plan.md")).toBe("galaxy/reviews/24719");
	});

	it("is null elsewhere", () => {
		expect(recordRefOf("repositories/galaxy/branches/MY_BRANCHES.md")).toBeNull();
		expect(recordRefOf("agents/factory/TODO.md")).toBeNull();
	});
});

describe("repositoryChanged", () => {
	const root = "/v/repositories/galaxy";

	it("cares about Markdown, and the root meaning anything may have changed", () => {
		expect(repositoryChanged([`${root}/branches/active/a/index.md`], root)).toBe(true);
		expect(repositoryChanged([root], root)).toBe(true);
	});

	it("ignores everything else", () => {
		expect(repositoryChanged([`${root}/branches/active/a/screenshots/s.png`, `${root}/reviews/active/1/review-state.json`], root)).toBe(false);
		expect(repositoryChanged([], root)).toBe(false);
	});
});
