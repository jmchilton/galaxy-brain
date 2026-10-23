import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { fillTemplate, launcherScope, launchersFor, parseLaunchers, recordFromPath, untrackedRecord } from "./launchers";

const CONFIG = `Intro text, ignored.

## 🐴 Implement
status: queued
agent_dir: gx_workhorse
name: wh-{name}

Implement galaxyproject/galaxy#{name}.
Record: {record}

## ✨ Polish
agent_dir: gx_workhorse
profile: Codex

Polish #{name}

## Broken
status: queued
`;

const GALAXY_ISSUES = { repo: "galaxy", kind: "issues" } as const;

const vaultLaunchers = (path: string) =>
	parseLaunchers(readFileSync(new URL(`../../vault/${path}`, import.meta.url), "utf8"), launcherScope(path)!).map((l) => [
		l.label,
		l.statuses.join(","),
		l.agentDir,
	]);

describe("launcherScope", () => {
	it("reads repo and kind from a kind-level LAUNCHERS.md; _defaults applies to every repo", () => {
		expect(launcherScope("repositories/galaxy/issues/LAUNCHERS.md")).toEqual(GALAXY_ISSUES);
		expect(launcherScope("repositories/_defaults/branches/LAUNCHERS.md")).toEqual({ repo: null, kind: "branches" });
	});

	it("ignores other files", () => {
		expect(launcherScope("agents/_shared/LAUNCHERS.md")).toBeNull();
		expect(launcherScope("repositories/galaxy/issues/MY_ISSUES.md")).toBeNull();
		expect(launcherScope("repositories/galaxy/notes/LAUNCHERS.md")).toBeNull();
		expect(launcherScope("repositories/galaxy/issues/queued/1/LAUNCHERS.md")).toBeNull();
	});
});

describe("parseLaunchers", () => {
	it("reads fields and the multi-line prompt, scoped by the file", () => {
		const [implement, polish] = parseLaunchers(CONFIG, GALAXY_ISSUES);
		expect(implement).toEqual({
			label: "🐴 Implement",
			repo: "galaxy",
			kind: "issues",
			statuses: ["queued"],
			agentDir: "gx_workhorse",
			name: "wh-{name}",
			prompt: "Implement galaxyproject/galaxy#{name}.\nRecord: {record}",
		});
		expect(polish).toMatchObject({ statuses: [], name: "gx_workhorse", profile: "Codex" });
		expect(implement).not.toHaveProperty("profile");
	});

	it("skips launchers missing agent_dir or prompt", () => {
		expect(parseLaunchers(CONFIG, GALAXY_ISSUES).map((l) => l.label)).toEqual(["🐴 Implement", "✨ Polish"]);
	});

	it("parses the vault's Galaxy launchers", () => {
		expect(vaultLaunchers("repositories/galaxy/branches/LAUNCHERS.md")).toEqual([
			["🛡️ Harden", "active", "gx_workhorse"],
			["✨ Polish", "active", "gx_branches"],
			["🚦 Fix CI", "", "gx_branches"],
			["🔀 De-conflict", "active", "gx_branches"],
			["🚀 Open PR", "active", "gx_branches"],
			["💬 Respond to review", "active", "gx_branches"],
			["💭 New session", "", "gx_branches"],
		]);
		expect(vaultLaunchers("repositories/galaxy/issues/LAUNCHERS.md")).toEqual([
			["🐴 Implement", "queued,wip,needs_decision,blocked", "gx_workhorse"],
			["💭 New session", "", "gx_issues"],
			["🩺 Root cause", "untracked", "gx_workhorse"],
			["🛠️ Work on", "untracked", "gx_workhorse"],
		]);
		expect(vaultLaunchers("repositories/galaxy/reviews/LAUNCHERS.md")).toEqual([
			["💬 Respond to review", "active", "gx_reviews"],
			["✂️ Trim findings", "active", "gx_reviews"],
			["💭 New session", "", "gx_reviews"],
			["🔎 Review", "untracked", "gx_reviews"],
		]);
	});

	it("parses the vault's Foundry launchers", () => {
		expect(vaultLaunchers("repositories/foundry/issues/LAUNCHERS.md")).toEqual([
			["🏷️ Triage issue", "untracked,needs_decision", "wf_foundry"],
			["🐴 Work on issue", "untracked,queued,wip", "wf_foundry"],
		]);
		expect(vaultLaunchers("repositories/foundry/reviews/LAUNCHERS.md")).toEqual([["🔎 Review", "untracked", "wf_foundry"]]);
	});

	it("parses the vault's workflow library launchers", () => {
		for (const repo of ["gxformat2", "galaxy-tool-util-ts"]) {
			for (const kind of ["branches", "issues", "reviews"]) {
				const extra = {
					branches: [],
					issues: [["🐴 Work on issue", "untracked,queued,wip,needs_decision,blocked", "workflow_libs"]],
					reviews: [["🔎 Review", "untracked", "workflow_libs"]],
				}[kind];
				expect(vaultLaunchers(`repositories/${repo}/${kind}/LAUNCHERS.md`)).toEqual([["💭 New session", "", "workflow_libs"], ...extra!]);
			}
		}
	});

	it("parses the vault's Pulsar and Planemo launchers", () => {
		for (const repo of ["pulsar", "planemo"]) {
			expect(vaultLaunchers(`repositories/${repo}/issues/LAUNCHERS.md`)).toEqual([
				["🐴 Work on issue", "untracked,queued,wip,needs_decision,blocked", repo],
			]);
			expect(vaultLaunchers(`repositories/${repo}/reviews/LAUNCHERS.md`)).toEqual([["🔎 Review", "untracked", repo]]);
		}
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
	const launchers = parseLaunchers(CONFIG, GALAXY_ISSUES);
	const issue = recordFromPath("repositories/galaxy/issues/queued/24350/index.md")!;

	it("matches repo, kind and status", () => {
		expect(launchersFor(launchers, issue).map((l) => l.label)).toEqual(["🐴 Implement", "✨ Polish"]);
		expect(launchersFor(launchers, { ...issue, repo: "pulsar" })).toEqual([]);
		expect(launchersFor(launchers, { ...issue, kind: "reviews" })).toEqual([]);
	});

	it("applies _defaults launchers to every repo of the kind", () => {
		const defaults = parseLaunchers("## Chat\nagent_dir: gx_issues\n\nTalk", { repo: null, kind: "issues" });
		expect(launchersFor(defaults, { ...issue, repo: "pulsar" }).map((l) => l.label)).toEqual(["Chat"]);
		expect(launchersFor(defaults, { ...issue, kind: "branches" })).toEqual([]);
	});

	it("offers untracked items only launchers that list untracked", () => {
		const untracked = [...launchers, ...parseLaunchers("## Review\nstatus: untracked\nagent_dir: gx_reviews\n\nGo", GALAXY_ISSUES)];
		expect(launchersFor(untracked, untrackedRecord("galaxy", "issues", 1)).map((l) => l.label)).toEqual(["Review"]);
	});

	it("treats a missing status as any", () => {
		expect(launchersFor(launchers, { ...issue, status: "closed" }).map((l) => l.label)).toEqual(["✨ Polish"]);
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
