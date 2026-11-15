import { describe, expect, it } from "vitest";
import { CLEAN_ENV } from "../../obsidian-plugin/src/environments";
import { type ForkDeps, type HcTerminal, fork, forkName, forkPlan } from "./fork";

const IDS = { space: "spNEW", tab: "tbNEW" };

const claude: HcTerminal = {
	address: "t7",
	name: "rv-24873",
	cwd: "/v/agents/gx_reviews",
	foreground: { argv: ["/x/vendor/claude", "--model", "opus", "--effort", "high", "Review it"], cwd: "/v/agents/gx_reviews" },
	status: { app: "claude-code", state: "done" },
	labels: {
		"herdr.space": "spOLD",
		"herdr.tab": "tbOLD",
		"gb.harness": "claude",
		"gb.session": "aaaa-1111",
		"gb.transcript": "/h/.claude/projects/x/aaaa-1111.jsonl",
		"gb.record.galaxy/reviews/24873": "1794000000",
		where: "gx_reviews / rv-24873",
	},
};

const codex: HcTerminal = {
	address: "box/t1m",
	name: "hooktest",
	cwd: "/r/agents/factory",
	foreground: { argv: ["/n/vendor/codex", "--no-daemon", "-m", "gpt-6.1-sol", "-c", 'model_reasoning_effort="high"', "go"], cwd: "/r/agents/factory" },
	status: { app: "codex", state: "blocked" },
	labels: { "herdr.space": "spBOX", "gb.harness": "codex", "gb.session": "019a-2222", "gb.transcript": "/r/x.jsonl" },
};

/** The agent command after `--`, past the env-cleaning prefix. */
function command(argv: string[]) {
	const rest = argv.slice(argv.indexOf("--") + 1);
	expect(rest.slice(0, 4)).toEqual(["sh", "-c", CLEAN_ENV, "sh"]);
	return rest.slice(4);
}

/** The value after each `--label`. */
const labels = (argv: string[]) => argv.flatMap((arg, i) => (argv[i - 1] === "--label" ? [arg] : []));

describe("forkPlan", () => {
	it("resumes a Claude session as a fork in a new tab of its space, carrying model, effort and records", () => {
		const plan = forkPlan(claude, ["rv-24873"], IDS);
		expect(plan.name).toBe("rv-24873-fork");
		expect(plan.machine).toBeNull();
		expect(plan.argv.slice(0, 7)).toEqual(["hc", "run", "--bg", "--json", "--no-parent", "--name", "rv-24873-fork"]);
		expect(labels(plan.argv)).toEqual([
			"herdr.space=spOLD",
			"herdr.tab=tbNEW",
			"gb.record.galaxy/reviews/24873=1794000000",
			"gb.fork.from=t7",
			"gb.fork.session=aaaa-1111",
		]);
		expect(plan.argv[plan.argv.indexOf("--cwd") + 1]).toBe("/v/agents/gx_reviews");
		expect(plan.argv).not.toContain("--on");
		expect(command(plan.argv)).toEqual(["claude", "--resume", "aaaa-1111", "--fork-session", "--model", "opus", "--effort", "high"]);
	});

	it("forks a remote Codex session on its machine, without the shared daemon", () => {
		const plan = forkPlan(codex, [], IDS);
		expect(plan.machine).toBe("box");
		expect(plan.argv[plan.argv.indexOf("--on") + 1]).toBe("box");
		expect(plan.argv[plan.argv.indexOf("--cwd") + 1]).toBe("/r/agents/factory");
		expect(labels(plan.argv)).toContain("herdr.space=spBOX");
		expect(command(plan.argv)).toEqual([
			"codex", "fork", "--no-daemon", "-m", "gpt-6.1-sol", "-c", 'model_reasoning_effort="high"', "019a-2222",
		]);
	});

	it("starts a new space when the source has none", () => {
		const { "herdr.space": _, ...rest } = claude.labels!;
		expect(labels(forkPlan({ ...claude, labels: rest }, [], IDS).argv)).toContain("herdr.space=spNEW");
	});

	it("refuses a working agent, or one with no session label yet", () => {
		expect(() => forkPlan({ ...claude, status: { state: "working" } }, [], IDS)).toThrow(/working/);
		const { "gb.session": _, ...rest } = codex.labels!;
		expect(() => forkPlan({ ...codex, labels: rest }, [], IDS)).toThrow(/no session/);
		expect(() => forkPlan({ ...claude, labels: { ...claude.labels, "gb.harness": "cursor" } }, [], IDS)).toThrow(/harness/);
	});
});

describe("forkName", () => {
	it("follows launch_agent.sh's name rules", () => {
		expect(forkName("rv-24873", [])).toBe("rv-24873-fork");
		expect(forkName("rv-24873", ["rv-24873-fork", "rv-24873-fork-2"])).toBe("rv-24873-fork-3");
		expect(forkName("Br_Issue 292.x", [])).toBe("br_issue-292-x-fork");
		expect(forkName("9lives", [])).toBe("lives-fork");
		expect(forkName(null, [])).toBe("agent-fork");
		expect(forkName("ptf-select_wrapper_iter_skip", ["ptf-select_wrapper_iter_skip"])).toBe("ptf-select_wrapper_iter_skip-2");
	});
});

describe("fork", () => {
	function deps(source: HcTerminal, renames = 0, transcript = true) {
		const runs: string[][] = [];
		const queries: string[][] = [];
		let failures = renames;
		const d: ForkDeps = {
			query: (argv) => {
				queries.push(argv);
				if (argv[1] === "get") return { status: 0, stdout: JSON.stringify(source), stderr: "" };
				if (argv[1] === "exec") return { status: transcript ? 0 : 1, stdout: "", stderr: "" };
				return { status: 0, stdout: JSON.stringify({ terminals: [{ address: "t7", name: "rv-24873" }, { address: "t8", name: null }] }), stderr: "" };
			},
			run: (argv) => {
				runs.push(argv);
				if (argv[0] === "herdr-app" && failures-- > 0) return { status: 1, stdout: "", stderr: "no such tab" };
				const address = argv.includes("--on") ? `${argv[argv.indexOf("--on") + 1]}/t9` : "t9";
				return { status: 0, stdout: argv[0] === "hc" ? JSON.stringify({ address }) : "", stderr: "" };
			},
			ids: () => IDS,
			sleep: () => undefined,
		};
		return { d, runs, queries };
	}

	it("checks the source's transcript is on its machine first", () => {
		const { d, queries } = deps(codex);
		fork(d, "box/t1m");
		expect(queries).toContainEqual(["hc", "exec", "--on", "box", "test", "-f", "/r/x.jsonl"]);
	});

	it("refuses a source whose transcript was never written, starting nothing", () => {
		const { d, runs } = deps(claude, 0, false);
		expect(() => fork(d, "t7")).toThrow(/transcript.*CLAUDE_CODE_CHILD_SESSION/);
		expect(runs).toEqual([]);
	});

	it("starts the fork, then names its tab once the window shows it", () => {
		const { d, runs } = deps(codex, 2);
		expect(fork(d, "box/t1m")).toEqual({ message: "Forked hooktest as 'hooktest-fork' on box, terminal box/t9", terminal: "box/t9" });
		expect(runs[0]![0]).toBe("hc");
		expect(runs.slice(1)).toEqual(Array(3).fill(["herdr-app", "do", "tab.rename", "--id", "box/tbNEW", "--name", "hooktest-fork"]));
	});

	it("reports hc run's failure", () => {
		const { d } = deps(claude);
		d.run = () => ({ status: 1, stdout: "", stderr: "no such machine" });
		expect(() => fork(d, "t7")).toThrow("no such machine");
	});
});
