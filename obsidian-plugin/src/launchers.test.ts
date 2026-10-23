import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { fillTemplate, launchersFor, parseLaunchers, recordFromPath } from "./launchers";

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
agent: codex

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
			agent: "claude",
			prompt: "Implement galaxyproject/galaxy#{name}.\nRecord: {record}",
		});
		expect(polish).toMatchObject({ statuses: [], name: "gx_branches", agent: "codex" });
	});

	it("skips launchers missing agent_dir or prompt", () => {
		expect(parseLaunchers(CONFIG).map((l) => l.label)).toEqual(["🐴 Implement", "✨ Polish"]);
	});

	it("parses the vault config", () => {
		const vaultConfig = readFileSync(new URL("../../vault/agents/_shared/LAUNCHERS.md", import.meta.url), "utf8");
		expect(parseLaunchers(vaultConfig).map((l) => l.agentDir)).toEqual([
			"gx_workhorse",
			"gx_workhorse",
			"gx_branches",
			"gx_reviews",
			"gx_reviews",
			"gx_issues",
			"gx_branches",
			"gx_reviews",
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
