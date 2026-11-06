import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { agentsOverview, handle, type HostDeps, lookup, recordPage } from "./native-host";

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

describe("recordPage", () => {
	const root = vault({
		"repositories/_defaults/reviews/FILE_DOCS.md": "## review.md\nThe review.\n\n## subagents/**\nDebriefs.\n",
		"repositories/galaxy/reviews/LAUNCHERS.md": "## 💬 Respond\nstatus: active\nagent_dir: gx_reviews\nprofile: Sonnet (medium)\n\nRespond to {name}\n\n## 🗄️ Archived only\nstatus: archived\nagent_dir: gx_reviews\n\nNope\n",
		"repositories/galaxy/reviews/active/7/index.md": "---\npr: 7\n---\n# Seven\n",
		"repositories/galaxy/reviews/active/7/review.md": "r",
		"repositories/galaxy/reviews/active/7/subagents/a.md": "a",
		"repositories/galaxy/reviews/active/7/plan.md": "p",
		"repositories/galaxy/reviews/active/70/review.md": "other record",
		"agents/_shared/ENVIRONMENTS.yml": "environments:\n  - name: Here\n    icon: 🏠\n",
	});

	it("gives a record's title, matching launchers and files split by File Docs", () => {
		const page = recordPage(root, "galaxy/reviews/7")!;
		expect(page.record).toMatchObject({ key: "repositories/galaxy/reviews/active/7", title: "Seven", status: "active" });
		expect(page.record.launchers.map((one) => [one.label, one.prompt])).toEqual([["💬 Respond", "Respond to 7"]]);
		expect(page.links).toEqual({
			documented: [{ path: "review.md", hint: "The review." }, { path: "subagents/", files: ["subagents/a.md"], hint: "Debriefs." }],
			other: [{ path: "plan.md" }],
		});
		expect(page.environments).toEqual([{ name: "Here", icon: "🏠" }]);
	});

	it("names the upstream repository, even for a branch that only has a fork link", () => {
		const branches = vault({
			"repositories/galaxy/branches/active/b/index.md": "# B\n\n[View on GitHub](https://github.com/jmchilton/galaxy/tree/b)\n",
			"repositories/tool-util/branches/active/c/index.md": "# C\n\n[PR](https://github.com/jmchilton/tool-util/pull/1)\n",
		});
		expect(recordPage(branches, "galaxy/branches/b")!.upstream).toBe("galaxyproject/galaxy");
		expect(recordPage(branches, "tool-util/branches/c")!.upstream).toBe("jmchilton/tool-util");
	});

	it("offers a differential review only for a reviewable record that has one", () => {
		const reviews = vault({
			"repositories/galaxy/reviews/active/1/index.md": "---\npr: 1\n---\n# One\n",
			"repositories/galaxy/reviews/active/1/differential-review/snapshots/s.json": "{}",
			"repositories/galaxy/reviews/active/2/index.md": "---\npr: 2\n---\n# Two\n",
			"repositories/galaxy/reviews/active/3/index.md": "---\npr: 3\n---\n# Three\n",
			"repositories/galaxy/reviews/active/3/differential-review/annotations/threads/t.json": "{}",
			"repositories/galaxy/issues/open/4/index.md": "---\nissue: 4\n---\n# Four\n",
			"repositories/galaxy/issues/open/4/differential-review/snapshots/s.json": "{}",
		});
		expect(["reviews/1", "reviews/2", "reviews/3", "issues/4"].map((id) => recordPage(reviews, `galaxy/${id}`)?.review)).toEqual([true, false, true, false]);
	});

	it("gives its related records, and agent blockers' conditions and Obsidian links", () => {
		const related = vault({
			"agents/gx_reviews/blockers/wait/condition.md": "It merged.\n",
			"repositories/galaxy/reviews/active/9/index.md": "---\nblockers: [gx_reviews/wait, galaxy/issues/1]\nrelated_records: galaxy/branches/b\n---\n# Nine\n",
		});
		expect(recordPage(related, "galaxy/reviews/9")!.related).toEqual([
			{ text: "🔒 gx_reviews/wait", label: "Blocked: gx_reviews/wait", condition: "It merged.", obsidian: `obsidian://open?path=${encodeURIComponent(`${related}/agents/gx_reviews/blockers/wait/index.md`)}` },
			{ text: "🔒 galaxy/issues/1", label: "Blocked by galaxy/issues/1", ref: "galaxy/issues/1" },
			{ text: "🔗 galaxy/branches/b", label: "Related: galaxy/branches/b", ref: "galaxy/branches/b" },
		]);
		expect(recordPage(root, "galaxy/reviews/7")!.related).toEqual([]);
	});

	it("is null for a record not in this vault", () => {
		expect(recordPage(root, "galaxy/reviews/8")).toBeNull();
	});

	it("is what the recordPage request returns", () => {
		const deps: HostDeps = { vaultRoot: root, run: () => ({ status: 0, stdout: "", stderr: "" }) };
		expect(handle({ type: "recordPage", ref: "galaxy/reviews/7" }, deps)).toEqual(recordPage(root, "galaxy/reviews/7"));
	});
});
