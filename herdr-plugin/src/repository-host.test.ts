import { mkdirSync, mkdtempSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { appRequest } from "./app-host";
import { recordIndex, repositoryPage } from "./repository-host";

const DAY = 86_400;

/** Vault with the given files; each `[path, text, daysAgo]` is modified that long ago. */
function vault(files: Array<[string, string, number?]>): string {
	const root = mkdtempSync(join(tmpdir(), "gb-repo-vault-"));
	const now = Date.now() / 1000;
	for (const [path, text, daysAgo = 0] of files) {
		mkdirSync(dirname(join(root, path)), { recursive: true });
		writeFileSync(join(root, path), text);
		utimesSync(join(root, path), now - daysAgo * DAY, now - daysAgo * DAY);
	}
	return root;
}

const GALAXY = "repositories/galaxy";
const fixture = () =>
	vault([
		[`${GALAXY}/branches/active/queued_one/index.md`, "# Queued one\n", 3],
		[`${GALAXY}/branches/active/unlisted/index.md`, "# Unlisted\n", 1],
		[`${GALAXY}/branches/merged/done/index.md`, "# Done\n", 9],
		[`${GALAXY}/branches/MY_BRANCHES.md`, "## Ready (`ready`)\n\n- [`queued_one`](active/queued_one/index.md) — x\n"],
		[`${GALAXY}/reviews/active/24719/index.md`, "# Review it\n\n[PR](https://github.com/galaxyproject/galaxy/pull/24719)\n", 2],
		[`${GALAXY}/reviews/SYNC_REPORT.md`, "synced\n"],
		["repositories/pulsar/issues/queued/12/index.md", "# Pulsar issue\n", 0],
		["repositories/_defaults/branches/LAUNCHERS.md", ""],
	]);

describe("recordIndex", () => {
	it("lists every record, open ones first and newest first, with the repositories", () => {
		const { repositories, records } = recordIndex(fixture());
		expect(repositories).toEqual(["galaxy", "pulsar"]);
		expect(records.map((r) => r.ref)).toEqual(["pulsar/issues/12", "galaxy/branches/unlisted", "galaxy/reviews/24719", "galaxy/branches/queued_one", "galaxy/branches/done"]);
		expect(records[2]).toEqual({ ref: "galaxy/reviews/24719", repo: "galaxy", kind: "reviews", status: "active", name: "24719", title: "Review it" });
	});
});

describe("repositoryPage", () => {
	it("is null for a repository with no records", () => {
		expect(repositoryPage(fixture(), { repo: "../agents" })).toBeNull();
	});

	it("groups a kind by its queue sections, then statuses, with terminal statuses collapsed", () => {
		const page = repositoryPage(fixture(), { repo: "galaxy" })!;
		const branches = page.kinds.find((one) => one.kind === "branches")!;
		expect(branches.count).toBe(3);
		expect(branches.label).toBe("My branches");
		expect(branches.groups.map((g) => [g.key, g.label, g.collapsed, g.rows.map((r) => r.name)])).toEqual([
			["ready", "Ready", false, ["queued_one"]],
			["active", "active", false, ["unlisted"]],
			["merged", "merged", true, ["done"]],
		]);
	});

	it("lists every kind and only the repository's records", () => {
		const page = repositoryPage(fixture(), { repo: "galaxy" })!;
		expect(page.repositories).toEqual(["galaxy", "pulsar"]);
		expect(page.kinds.map((one) => [one.kind, one.count])).toEqual([["branches", 3], ["issues", 0], ["issues_incubator", 0], ["reviews", 1]]);
	});

	it("names the queue file and sync report only when they exist", () => {
		const page = repositoryPage(fixture(), { repo: "galaxy" })!;
		const of = (kind: string) => page.kinds.find((one) => one.kind === kind)!;
		expect(of("branches").queue).toBe(`${GALAXY}/branches/MY_BRANCHES.md`);
		expect(of("reviews").queue).toBeUndefined();
		expect(of("reviews").report).toBe(`${GALAXY}/reviews/SYNC_REPORT.md`);
		expect(of("branches").report).toBeUndefined();
	});

	it("gives rows their ref, GitHub link and modification time", () => {
		const page = repositoryPage(fixture(), { repo: "galaxy" })!;
		const [row] = page.kinds.find((one) => one.kind === "reviews")!.groups[0]!.rows;
		expect(row).toMatchObject({ ref: "galaxy/reviews/24719", title: "Review it", github: "https://github.com/galaxyproject/galaxy/pull/24719" });
		expect(Math.round((Date.now() - row!.time) / (DAY * 1000))).toBe(2);
	});

	it("takes the upstream from the records' links", () => {
		expect(repositoryPage(fixture(), { repo: "galaxy" })!.upstream).toBe("galaxyproject/galaxy");
	});

	it("lists recent records by update, narrowed by kind", () => {
		const root = fixture();
		const names = (kind?: "branches") => repositoryPage(root, { repo: "galaxy", by: "updated", ...(kind ? { kind } : {}) })!.recent.map((r) => r.name);
		expect(names()).toEqual(["unlisted", "24719", "queued_one", "done"]);
		expect(names("branches")).toEqual(["unlisted", "queued_one", "done"]);
	});

	it("across every repository has only recent records", () => {
		const page = repositoryPage(fixture(), { by: "updated" })!;
		expect(page.repo).toBeNull();
		expect(page.kinds).toEqual([]);
		expect(page.recent.map((r) => r.ref)).toEqual(["pulsar/issues/12", "galaxy/branches/unlisted", "galaxy/reviews/24719", "galaxy/branches/queued_one", "galaxy/branches/done"]);
	});
});

describe("appRequest", () => {
	const deps = (vaultRoot: string) => ({ vaultRoot, appHome: "", run: () => ({ status: 0, stdout: "", stderr: "" }), now: () => new Date() });

	it("answers recordIndex and repositoryPage", () => {
		const root = fixture();
		expect(appRequest({ type: "recordIndex" }, deps(root))).toEqual(recordIndex(root));
		expect(appRequest({ type: "repositoryPage", repo: "pulsar" }, deps(root))).toMatchObject({ repo: "pulsar", recent: [{ ref: "pulsar/issues/12" }] });
	});
});
