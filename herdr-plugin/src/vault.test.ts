import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { loadLaunchers, loadProfiles, loadRecords, vaultFiles } from "./vault";

const VAULT = fileURLToPath(new URL("../../vault", import.meta.url));

describe("vault", () => {
	it("lists repository files with vault-relative paths and times", () => {
		const files = vaultFiles(VAULT);
		const launchers = files.find((f) => f.path === "repositories/galaxy/reviews/LAUNCHERS.md");
		expect(launchers?.mtime).toBeGreaterThan(0);
		expect(launchers?.ctime).toBeGreaterThan(0);
		expect(files.every((f) => f.path.startsWith("repositories/"))).toBe(true);
	});

	it("loads repo launchers before _defaults ones", () => {
		const launchers = loadLaunchers(VAULT);
		expect(launchers.find((l) => l.repo === "galaxy" && l.kind === "reviews" && l.label === "⚡ Quick merge")).toBeDefined();
		const firstDefault = launchers.findIndex((l) => l.repo === null);
		expect(firstDefault === -1 || launchers.slice(firstDefault).every((l) => l.repo === null)).toBe(true);
	});

	it("loads records across repos with titles from index.md", () => {
		const records = loadRecords(VAULT);
		expect(new Set(records.map((r) => r.repo))).toContain("galaxy");
		expect(records.some((r) => r.repo === "_defaults")).toBe(false);
		expect(records.some((r) => r.title !== r.name)).toBe(true);
	});

	it("loads the shared agent profiles", () => {
		expect(loadProfiles(VAULT).map((p) => p.name)).toContain("Sonnet (medium)");
	});
});
