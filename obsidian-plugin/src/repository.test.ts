import { describe, expect, it } from "vitest";
import { collectRecords, recentRecords, repositoryNames, repositorySections, timeAgo, type VaultFile } from "./repository";

const FILES: VaultFile[] = [
	{ path: "repositories/galaxy/branches/active/fix_a/index.md", mtime: 10, ctime: 4 },
	{ path: "repositories/galaxy/branches/active/fix_a/subagents/review.md", mtime: 50, ctime: 45 },
	{ path: "repositories/galaxy/branches/active/fix_b/index.md", mtime: 30, ctime: 20 },
	{ path: "repositories/galaxy/branches/merged/old/index.md", mtime: 5, ctime: 2 },
	{ path: "repositories/galaxy/issues/queued/24350/index.md", mtime: 1, ctime: 1 },
	{ path: "repositories/galaxy/branches/FILE_DOCS.md", mtime: 99, ctime: 99 },
	{ path: "repositories/galaxy/reviews/active/7/notes.md", mtime: 60, ctime: 60 },
	{ path: "repositories/pulsar/reviews/active/12/index.md", mtime: 40, ctime: 30 },
	{ path: "repositories/pulsar/branches/active/p/index.md", mtime: 3, ctime: 3 },
	{ path: "repositories/_defaults/branches/active/x/index.md", mtime: 90, ctime: 90 },
	{ path: "agents/gx_branches/TICK.md", mtime: 1, ctime: 1 },
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
		expect(records.map((r) => r.name).sort()).toEqual(["24350", "7", "fix_a", "fix_b", "old"]);
	});

	it("dates creation by the oldest file and updates by index.md alone", () => {
		expect(records.find((r) => r.name === "fix_a")).toMatchObject({ created: 4, indexMtime: 10 });
		expect(records.find((r) => r.name === "7")).toMatchObject({ created: 60 });
		expect(records.find((r) => r.name === "7")).not.toHaveProperty("indexMtime");
	});

	it("collects every tracked repository without a repo, skipping _defaults", () => {
		const all = collectRecords(FILES, undefined, () => undefined);
		expect(all.map((r) => `${r.repo}/${r.name}`).sort()).toEqual([
			"galaxy/24350", "galaxy/7", "galaxy/fix_a", "galaxy/fix_b", "galaxy/old", "pulsar/12", "pulsar/p",
		]);
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

describe("recentRecords", () => {
	const all = collectRecords(FILES, undefined, () => undefined);
	const names = (records: { repo: string; name: string }[]) => records.map((r) => `${r.repo}/${r.name}`);

	it("sorts newest created first, of any kind or one", () => {
		expect(names(recentRecords(all, { by: "created" }))).toEqual([
			"galaxy/7", "pulsar/12", "galaxy/fix_b", "galaxy/fix_a", "pulsar/p", "galaxy/old", "galaxy/24350",
		]);
		expect(names(recentRecords(all, { by: "created", kind: "branches" }))).toEqual([
			"galaxy/fix_b", "galaxy/fix_a", "pulsar/p", "galaxy/old",
		]);
	});

	it("sorts by index.md update, dropping records without one", () => {
		expect(names(recentRecords(all, { by: "updated" }))).toEqual([
			"pulsar/12", "galaxy/fix_b", "galaxy/fix_a", "galaxy/old", "pulsar/p", "galaxy/24350",
		]);
	});

	it("keeps the newest `limit`, 25 by default", () => {
		expect(names(recentRecords(all, { by: "created", kind: "branches", limit: 2 }))).toEqual(["galaxy/fix_b", "galaxy/fix_a"]);
		const many = Array.from({ length: 30 }, (_, i) => ({ ...all[0]!, name: `r${i}`, created: i }));
		expect(recentRecords(many, { by: "created" })).toHaveLength(25);
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
			["reviews", [["active", false, ["7"]]]],
		]);
	});
});
