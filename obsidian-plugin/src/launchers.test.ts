import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { agentFromPath, commandArgs, fillAgentTemplate, fillTemplate, launcherScope, launchersFor, parseAgentLaunchers, parseLaunchers, recordFromPath, untrackedRecord } from "./launchers";

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
const SHELVE_ISSUE = "needs_decision,queued,wip,blocked";

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
		expect(launcherScope("repositories/galaxy/issues_incubator/LAUNCHERS.md")).toEqual({ repo: "galaxy", kind: "issues_incubator" });
	});

	it("ignores other files", () => {
		expect(launcherScope("agents/_shared/LAUNCHERS.md")).toBeNull();
		expect(launcherScope("repositories/galaxy/issues/MY_ISSUES.md")).toBeNull();
		expect(launcherScope("repositories/galaxy/notes/LAUNCHERS.md")).toBeNull();
		expect(launcherScope("repositories/galaxy/issues/queued/1/LAUNCHERS.md")).toBeNull();
	});
});

describe("agent launchers", () => {
	it("finds the agent dir of files under agents/<agent>/", () => {
		expect(agentFromPath("agents/gx_branches/TODO.md")).toBe("gx_branches");
		expect(agentFromPath("agents/gx_branches/notes/x.md")).toBe("gx_branches");
		expect(agentFromPath("agents/_shared/LAUNCHERS.md")).toBeNull();
		expect(agentFromPath("agents/README.md")).toBeNull();
		expect(agentFromPath("repositories/galaxy/branches/LAUNCHERS.md")).toBeNull();
	});

	it("defaults agent_dir to the agent and drops command launchers", () => {
		const markdown = "## 🧹 Tidy\nprofile: Codex\n\nTidy {file} for {agent}\n\n## Elsewhere\nagent_dir: factory\nname: f\n\nGo\n\n## Cmd\ncommand: x.sh\n";
		const [tidy, elsewhere, ...rest] = parseAgentLaunchers(markdown, "gx_branches");
		expect(tidy).toMatchObject({ label: "🧹 Tidy", repo: null, kind: null, agentDir: "gx_branches", name: "gx_branches", profile: "Codex" });
		expect(elsewhere).toMatchObject({ agentDir: "factory", name: "f" });
		expect(rest).toEqual([]);
		expect(fillAgentTemplate(tidy!.prompt, "gx_branches", "/v/agents/gx_branches/TODO.md")).toBe("Tidy /v/agents/gx_branches/TODO.md for gx_branches");
	});

	it("parses the vault's wf_foundry launchers", () => {
		const markdown = readFileSync(new URL("../../vault/agents/wf_foundry/LAUNCHERS.md", import.meta.url), "utf8");
		expect(parseAgentLaunchers(markdown, "wf_foundry").map((l) => [l.label, l.agentDir])).toEqual([
			["☀️ Good morning", "wf_foundry"],
			["⏱️ Tick", "wf_foundry"],
			["📥 Pick up backlog", "wf_foundry"],
			["🧪 Test pipeline", "wf_foundry"],
			["💭 Discuss this note", "wf_foundry"],
		]);
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

	it("reads command launchers, which need no agent_dir or prompt", () => {
		const [file] = parseLaunchers("## 📤 File\nstatus: incubating\ncommand: agents/_shared/scripts/file.py {record} --dry-run\n", GALAXY_ISSUES);
		expect(file).toEqual({
			label: "📤 File",
			repo: "galaxy",
			kind: "issues",
			statuses: ["incubating"],
			agentDir: "",
			name: "",
			prompt: "",
			command: "agents/_shared/scripts/file.py {record} --dry-run",
		});
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
			["🛝 Build Slides - Pitch", "", "gx_branches"],
			["🗣 Build Slides - Implementation", "", "gx_branches"],
			["📝 Address diff comments", "active", "gx_branches"],
			["🗄️ Shelve", "active", "gx_branches"],
		]);
		expect(vaultLaunchers("repositories/galaxy/issues/LAUNCHERS.md")).toEqual([
			["🐴 Implement", "queued,wip,needs_decision,blocked", "gx_workhorse"],
			["💭 New session", "", "gx_issues"],
			["🩺 Root cause", "untracked", "gx_workhorse"],
			["🛠️ Work on", "untracked", "gx_workhorse"],
			["🗄️ Shelve", SHELVE_ISSUE, "gx_issues"],
		]);
		expect(vaultLaunchers("repositories/galaxy/issues_incubator/LAUNCHERS.md")).toEqual([
			["❯ Prepare to file", "incubating", "gx_issues"],
			["📤 File issue", "incubating,internal", ""],
			["📤 File issue and assign me", "incubating,internal", ""],
			["💭 New session", "", "gx_issues"],
		]);
		expect(vaultLaunchers("repositories/galaxy/reviews/LAUNCHERS.md")).toEqual([
			["💬 Respond to review", "active", "gx_reviews"],
			["✂️ Trim findings", "active", "gx_reviews"],
			["💭 New session", "", "gx_reviews"],
			["🔎 Review", "untracked", "gx_reviews"],
			["🔁 Rework review into PR", "active", "gx_reviews"],
			["⚡ Quick merge", "untracked,active", "gx_reviews"],
			["📝 Address diff comments", "active", "gx_reviews"],
			["🗄️ Shelve", "active", "gx_reviews"],
		]);
	});

	it("parses the vault's Foundry, workflow library, Pulsar and Planemo launchers", () => {
		const WORK_ON = "untracked,queued,wip,needs_decision,blocked";
		const OPEN_ISSUE = "needs_decision,queued,wip,blocked,delegated";
		const AGENT_DIRS = { foundry: "wf_foundry", gxformat2: "workflow_libs", "galaxy-tool-util-ts": "workflow_libs", pulsar: "pulsar", planemo: "planemo" };
		for (const [repo, dir] of Object.entries(AGENT_DIRS)) {
			const session = dir === "workflow_libs" ? [["💭 New session", "", dir]] : [];
			const issues =
				dir === "wf_foundry"
					? [["🏷️ Triage issue", "untracked,needs_decision", dir], ["🐴 Work on issue", "untracked,queued,wip", dir]]
					: [...session, ["🐴 Work on issue", WORK_ON, dir]];
			const expected = {
				branches: [...session, ["🚀 Open pull request", "active", dir], ["🟣 Merge branch", "active", dir], ["🗄️ Shelve", "active", dir]],
				issues: [...issues, ["✅ Close issue", OPEN_ISSUE, dir], ["🗄️ Shelve", SHELVE_ISSUE, dir]],
				reviews: [
					...session,
					["🔎 Review", "untracked", dir],
					["🟣 Merge pull request", "active", dir],
					["💬 Respond to review", "active", dir],
					["🔁 Rework review into PR", "active", dir],
					["⚡ Quick merge", "untracked,active", dir],
					["🗄️ Shelve", "active", dir],
				],
			};
			for (const [kind, launchers] of Object.entries(expected)) {
				expect(vaultLaunchers(`repositories/${repo}/${kind}/LAUNCHERS.md`), `${repo}/${kind}`).toEqual(launchers);
			}
		}
	});

	it("defaults the merge, quick merge, open, close, respond and rework launchers to Sonnet", () => {
		for (const repo of ["foundry", "gxformat2", "galaxy-tool-util-ts", "pulsar", "planemo", "galaxy"]) {
			// Galaxy only gets the review actions.
			const counts = repo === "galaxy" ? { reviews: 3 } : { branches: 2, issues: 1, reviews: 4 };
			for (const [kind, count] of Object.entries(counts)) {
				const path = `repositories/${repo}/${kind}/LAUNCHERS.md`;
				const launchers = parseLaunchers(readFileSync(new URL(`../../vault/${path}`, import.meta.url), "utf8"), launcherScope(path)!);
				const actions = launchers.filter((l) => /^(🚀 Open pull|🟣 |✅ |💬 Respond to review$|🔁 |⚡ )/.test(l.label));
				expect(actions.map((l) => l.profile), path).toEqual(actions.map(() => "Sonnet (medium)"));
				expect(actions.length, path).toBe(count);
			}
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

	it("finds issue incubator records", () => {
		expect(recordFromPath("repositories/galaxy/issues_incubator/rejected/oidc_optional_refresh_token/debrief.md")).toMatchObject({
			kind: "issues_incubator",
			status: "rejected",
			name: "oidc_optional_refresh_token",
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

describe("commandArgs", () => {
	it("splits the command before filling, resolving the executable in the vault", () => {
		const draft = recordFromPath("repositories/galaxy/issues_incubator/incubating/my draft/index.md")!;
		const [launcher] = parseLaunchers("## File\ncommand: agents/_shared/scripts/file.py {record} --repo {repo}\n", { repo: "galaxy", kind: "issues_incubator" });
		expect(commandArgs(launcher!, draft, "/vault")).toEqual([
			"/vault/agents/_shared/scripts/file.py",
			"/vault/repositories/galaxy/issues_incubator/incubating/my draft",
			"--repo",
			"galaxy",
		]);
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
