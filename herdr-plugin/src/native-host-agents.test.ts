import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { agentsOverview, handle, type HostDeps, lookup } from "./native-host";

function vault(files: Record<string, string>) {
	const root = mkdtempSync(join(tmpdir(), "gb-vault-"));
	for (const [path, text] of Object.entries(files)) {
		mkdirSync(dirname(join(root, path)), { recursive: true });
		writeFileSync(join(root, path), text);
	}
	return root;
}

const tasks = (...lines: string[]) => `\`\`\`gb-tasks\n${lines.join("\n")}\n\`\`\`\n`;

describe("agentsOverview", () => {
	it("gathers each agent's routines, tasks, blockers and unreviewed PRs", () => {
		const root = vault({
			"agents/alpha/AGENTS.md": "",
			"agents/alpha/LAUNCHERS.md": "## ☀️ Good morning\nroutine: true\nname: a-morning\nprofile: Sonnet (medium)\n\nRun ./GOOD_MORNING.md\n\n## 🧹 Tidy\n\nTidy up\n",
			"agents/alpha/TASKS.md": tasks("- prompt: do it", "  agent_dir: alpha"),
			"agents/alpha/blockers/waiting/condition.md": "It merged.\n",
			"agents/alpha/the_cracks/2026-11-04.md": "```gb-missed-prs\n- pr: 1\n  title: t\n  url: https://github.com/o/r/pull/1\n  reviewed: true\n- pr: 2\n  title: u\n  url: https://github.com/o/r/pull/2\n```\n",
			"agents/beta/AGENTS.md": "",
			"agents/_shared/AGENTS.md": "",
		});
		const { agents } = agentsOverview(root, "2026-11-05");
		expect(agents.map((one) => one.dir)).toEqual(["alpha", "beta"]);
		const [alpha, beta] = agents;
		expect(alpha!.routines).toEqual([{ label: "Good morning", emoji: "☀️", name: "a-morning", task: { prompt: "Run ./GOOD_MORNING.md", agentDir: "alpha", profile: "Sonnet (medium)" } }]);
		expect(beta!.routines).toEqual([]);
		expect(alpha!.tasks).toEqual([{ prompt: "do it", agentDir: "alpha", source: "alpha" }]);
		expect(alpha!.blockers).toEqual([{ agentDir: "alpha", name: "waiting", condition: "It merged.", obsidian: `obsidian://open?path=${encodeURIComponent(`${root}/agents/alpha/blockers/waiting/index.md`)}` }]);
		expect(alpha!.counts.map((one) => one.label)).toEqual(["1 task", "1 blocker", "1 missed PR"]);
		expect(beta!.counts).toEqual([]);
		expect(beta).not.toHaveProperty("cracks");
		const [day] = alpha!.cracks!;
		expect(day).toMatchObject({ path: "agents/alpha/the_cracks/2026-11-04.md", date: "2026-11-04", agentDir: "alpha", obsidian: `obsidian://open?path=${encodeURIComponent(`${root}/agents/alpha/the_cracks/2026-11-04.md`)}` });
		expect(day!.prs.map((pr) => [pr.pr, pr.reviewed])).toEqual([[1, true], [2, false]]);
	});

	it("lists the_cracks days newest first, skipping other files", () => {
		const note = "```gb-missed-prs\n```\n";
		const root = vault({
			"agents/alpha/AGENTS.md": "",
			"agents/alpha/the_cracks/2026-11-03.md": note,
			"agents/alpha/the_cracks/2026-11-04.md": note,
			"agents/alpha/the_cracks/FORMAT.md": "ignored",
		});
		expect(agentsOverview(root, "2026-11-05").agents[0]!.cracks!.map((day) => day.date)).toEqual(["2026-11-04", "2026-11-03"]);
	});

	it("reports a bad the_cracks note on its day, and counts nothing for it", () => {
		const root = vault({ "agents/alpha/AGENTS.md": "", "agents/alpha/the_cracks/2026-11-04.md": "```gb-missed-prs\n- pr: nope\n```\n" });
		const [alpha] = agentsOverview(root, "2026-11-05").agents;
		expect(alpha!.cracks![0]!.error).toBe("entry 1: missing pr");
		expect(alpha!.counts).toEqual([]);
	});

	it("reports a broken TASKS.md on its agent", () => {
		const root = vault({ "agents/alpha/AGENTS.md": "", "agents/alpha/TASKS.md": tasks("- prompt: x", "  agent_dir: nope") });
		expect(agentsOverview(root, "2026-11-05").agents[0]!.error).toBe("task 1: unknown agent_dir nope");
	});

	it("offers profiles and environments for the launch dialog", () => {
		const overview = agentsOverview(vault({ "agents/alpha/AGENTS.md": "" }), "2026-11-05");
		expect(overview.profiles.length).toBeGreaterThan(0);
		expect(overview.environments[0]).toHaveProperty("name");
	});
});

describe("lookup", () => {
	it("offers each agent dir's routines", () => {
		const root = vault({
			"agents/alpha/AGENTS.md": "",
			"agents/alpha/LAUNCHERS.md": "## ⏱️ Tick\nroutine: true\n\nRun ./TICK.md\n",
			"agents/beta/AGENTS.md": "",
			"repositories/.keep": "",
		});
		const { routines } = lookup(root);
		expect(routines.alpha!.map((one) => one.label)).toEqual(["Tick"]);
		expect(routines.beta).toEqual([]);
	});
});

describe("newAgent", () => {
	const run = () => {
		const runs: string[][] = [];
		const deps = (vaultRoot: string): HostDeps => ({ vaultRoot, run: (argv) => (runs.push(argv), { status: 0, stdout: "", stderr: "" }) });
		return { runs, deps };
	};

	it("starts with the given prompt and name", () => {
		const { runs, deps } = run();
		handle({ type: "newAgent", dir: "alpha", name: "gm-alpha", prompt: "Run ./GOOD_MORNING.md" }, deps(vault({ "agents/alpha/AGENTS.md": "" })));
		expect(runs[0]).toEqual(expect.arrayContaining(["alpha", "gm-alpha", "Run ./GOOD_MORNING.md"]));
	});

	it("stays blank and named for its dir without them", () => {
		const { runs, deps } = run();
		handle({ type: "newAgent", dir: "alpha" }, deps(vault({ "agents/alpha/AGENTS.md": "" })));
		expect(runs[0]).toEqual(expect.arrayContaining(["alpha", "alpha", ""]));
	});
});
