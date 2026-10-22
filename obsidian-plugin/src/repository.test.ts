import { describe, expect, it } from "vitest";
import { collectRecords, repositoryNames, repositorySections, timeAgo, type VaultFile } from "./repository";

const FILES: VaultFile[] = [
	{ path: "repositories/galaxy/branches/active/fix_a/index.md", mtime: 10 },
	{ path: "repositories/galaxy/branches/active/fix_a/subagents/review.md", mtime: 50 },
	{ path: "repositories/galaxy/branches/active/fix_b/index.md", mtime: 30 },
	{ path: "repositories/galaxy/branches/merged/old/index.md", mtime: 5 },
	{ path: "repositories/galaxy/issues/queued/24350/index.md", mtime: 1 },
	{ path: "repositories/galaxy/branches/FILE_DOCS.md", mtime: 99 },
	{ path: "repositories/pulsar/reviews/active/12/index.md", mtime: 1 },
	{ path: "repositories/_defaults/branches/active/x/index.md", mtime: 1 },
	{ path: "agents/gx_branches/TICK.md", mtime: 1 },
];

const BODIES: Record<string, string> = {
	"repositories/galaxy/branches/active/fix_b/index.md": "# Fix B title\n\nBody",
	"repositories/galaxy/issues/queued/24350/index.md": "# galaxy#24350 — docs\n",
};

describe("repositoryNames", () => {
	it("lists repositories with records, skipping _defaults", () => {
		expect(repositoryNames(FILES)).toEqual(["galaxy", "pulsar"]);
	});
});

describe("collectRecords", () => {
	const records = collectRecords(FILES, "galaxy", (path) => BODIES[path]);

	it("summarizes each record once with its newest mtime", () => {
		const fixA = records.find((r) => r.name === "fix_a")!;
		expect(fixA).toMatchObject({ mtime: 50, title: "fix_a", indexPath: "repositories/galaxy/branches/active/fix_a/index.md" });
		expect(records.map((r) => r.name).sort()).toEqual(["24350", "fix_a", "fix_b", "old"]);
	});

	it("titles records from the index heading", () => {
		expect(records.find((r) => r.name === "fix_b")!.title).toBe("Fix B title");
	});
});

describe("timeAgo", () => {
	it("picks the largest whole unit", () => {
		const now = 10 * 86_400_000;
		expect(timeAgo(now - 20_000, now)).toBe("just now");
		expect(timeAgo(now - 5 * 60_000, now)).toBe("5m ago");
		expect(timeAgo(now - 3 * 3_600_000, now)).toBe("3h ago");
		expect(timeAgo(now - 2 * 86_400_000, now)).toBe("2d ago");
	});
});

describe("repositorySections", () => {
	it("orders kinds and statuses, newest first, terminal statuses collapsed", () => {
		const sections = repositorySections(collectRecords(FILES, "galaxy", (path) => BODIES[path]));
		expect(
			sections.map((s) => [s.kind, s.groups.map((g) => [g.status, g.collapsed, g.records.map((r) => r.name)])]),
		).toEqual([
			["branches", [["active", false, ["fix_a", "fix_b"]], ["merged", true, ["old"]]]],
			["issues", [["queued", false, ["24350"]]]],
		]);
	});
});
