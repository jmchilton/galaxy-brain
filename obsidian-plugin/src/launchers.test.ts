import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { fillTemplate, launchersFor, parseLaunchers, recordFromPath, untrackedRecord } from "./launchers";

const CONFIG = `Intro text, ignored.

## 🐴 Implement
records: galaxy/issues, pulsar/issues
status: queued
agent_dir: gx_workhorse
name: wh-{name}

Implement galaxyproject/galaxy#{name}.
Record: {record}

## ✨ Polish
records: galaxy/branches
agent_dir: gx_branches
profile: Codex

Run ./POLISH_BRANCH.md {name}

## Broken
records: galaxy/branches
`;

describe("parseLaunchers", () => {
	it("reads fields and the multi-line prompt", () => {
		const [implement, polish] = parseLaunchers(CONFIG);
		expect(implement).toEqual({
			label: "🐴 Implement",
			records: ["galaxy/issues", "pulsar/issues"],
			statuses: ["queued"],
			agentDir: "gx_workhorse",
			name: "wh-{name}",
			prompt: "Implement galaxyproject/galaxy#{name}.\nRecord: {record}",
		});
		expect(polish).toMatchObject({ statuses: [], name: "gx_branches", profile: "Codex" });
		expect(implement).not.toHaveProperty("profile");
	});

	it("skips launchers missing agent_dir or prompt", () => {
		expect(parseLaunchers(CONFIG).map((l) => l.label)).toEqual(["🐴 Implement", "✨ Polish"]);
	});

	it("parses the vault config", () => {
		const vaultConfig = readFileSync(new URL("../../vault/agents/_shared/LAUNCHERS.md", import.meta.url), "utf8");
		expect(parseLaunchers(vaultConfig).map((l) => [l.label, l.agentDir])).toEqual([
			["🐴 Implement", "gx_workhorse"],
			["🛡️ Harden", "gx_workhorse"],
			["✨ Polish", "gx_branches"],
			["🚦 Fix CI", "gx_branches"],
			["🔀 De-conflict", "gx_branches"],
			["🚀 Open PR", "gx_branches"],
			["💬 Respond to review", "gx_reviews"],
			["💬 Respond to review", "gx_branches"],
			["✂️ Trim findings", "gx_reviews"],
			["💭 New session", "gx_issues"],
			["💭 New session", "gx_branches"],
			["💭 New session", "gx_reviews"],
			["🔎 Review", "gx_reviews"],
			["🩺 Root cause", "gx_workhorse"],
			["🛠️ Work on", "gx_workhorse"],
		]);
	});
});

describe("recordFromPath", () => {
	it("finds the record for any file inside it", () => {
		expect(recordFromPath("repositories/galaxy/branches/active/fix_26.0/subagents/normal_review.md")).toEqual({
			repo: "galaxy",
			kind: "branches",
			status: "active",
			name: "fix_26.0",
			dir: "repositories/galaxy/branches/active/fix_26.0",
		});
	});

	it("ignores kind-level files and other notes", () => {
		expect(recordFromPath("repositories/galaxy/branches/FILE_DOCS.md")).toBeNull();
		expect(recordFromPath("repositories/galaxy/branches/active/x.md")).toBeNull();
		expect(recordFromPath("agents/gx_branches/TICK.md")).toBeNull();
	});
});

describe("launchersFor", () => {
	const launchers = parseLaunchers(CONFIG);
	const issue = recordFromPath("repositories/galaxy/issues/queued/24350/index.md")!;

	it("matches repo/kind and status", () => {
		expect(launchersFor(launchers, issue).map((l) => l.label)).toEqual(["🐴 Implement"]);
		expect(launchersFor(launchers, { ...issue, status: "closed" })).toEqual([]);
	});

	it("offers untracked items only launchers that list untracked", () => {
		const untracked = [...launchers, ...parseLaunchers("## Review\nrecords: galaxy/branches\nstatus: untracked\nagent_dir: gx_reviews\n\nGo")];
		expect(launchersFor(untracked, untrackedRecord("galaxy", "issues", 1))).toEqual([]);
		expect(launchersFor(untracked, { ...untrackedRecord("galaxy", "issues", 1), kind: "branches" }).map((l) => l.label)).toEqual([
			"Review",
		]);
	});

	it("treats a missing status as any", () => {
		const branch = recordFromPath("repositories/galaxy/branches/merged/b/index.md")!;
		expect(launchersFor(launchers, branch).map((l) => l.label)).toEqual(["✨ Polish"]);
	});
});

describe("fillTemplate", () => {
	it("fills placeholders and leaves unknown ones", () => {
		const issue = recordFromPath("repositories/galaxy/issues/queued/24350/index.md")!;
		expect(fillTemplate("#{name} at {record} {other}", issue, "/vault")).toBe(
			"#24350 at /vault/repositories/galaxy/issues/queued/24350 {other}",
		);
	});
});
