import { describe, expect, it } from "vitest";
import { blockerFromPath, blockersPath, recordBlocker } from "./blockers";

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

describe("recordBlocker", () => {
	it("reads the blocker named in a record's frontmatter", () => {
		expect(recordBlocker("---\nupstream_base_branch: dev\nblocker: gx_branches/wait_for_24501\n---\n# Fix\n")).toEqual({ agentDir: "gx_branches", name: "wait_for_24501" });
		expect(recordBlocker('---\nblocker: "planemo/release"\n---\n')).toEqual({ agentDir: "planemo", name: "release" });
	});

	it("is null without a frontmatter blocker", () => {
		expect(recordBlocker("# Fix\n\nblocker: gx_branches/wait\n")).toBeNull();
		expect(recordBlocker("---\nupstream_base_branch: dev\n---\n")).toBeNull();
		expect(recordBlocker("---\nblocker: no_slash\n---\n")).toBeNull();
	});
});
