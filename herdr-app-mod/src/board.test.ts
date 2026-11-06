import { describe, expect, it } from "vitest";
import { boardChanged, boardCracks, boardTasks, crackKey, splitAgents, taskKey } from "./board-model";

const task = (agentDir: string, prompt: string, extra: object = {}) => ({ prompt, agentDir, source: agentDir, ...extra });

describe("boardTasks", () => {
	const agents = [
		{ dir: "a", tasks: [task("a", "low", { priority: "low" }), task("a", "later", { snoozedUntil: "2026-12-01" })] },
		{ dir: "b", tasks: [task("b", "high", { priority: "high" })] },
	];

	it("merges every agent's tasks by priority, skipping snoozed ones", () => {
		expect(boardTasks(agents, null, "2026-11-05", new Set()).map((t) => t.prompt)).toEqual(["high", "low"]);
	});

	it("shows one agent's tasks when one is chosen", () => {
		expect(boardTasks(agents, "a", "2026-11-05", new Set()).map((t) => t.prompt)).toEqual(["low"]);
	});

	it("skips tasks just acted on", () => {
		const gone = new Set([taskKey(task("b", "high"))]);
		expect(boardTasks(agents, null, "2026-11-05", gone).map((t) => t.prompt)).toEqual(["low"]);
	});
});

describe("boardCracks", () => {
	const pr = (number: number, reviewed = false) => ({ pr: number, title: "t", url: "u", approvers: [], reviewed });
	const day = (date: string, prs: ReturnType<typeof pr>[], extra: object = {}) => ({ path: `agents/a/the_cracks/${date}.md`, date, prs, ...extra });
	const agents = [
		{ dir: "a", cracks: [day("2026-11-03", [pr(1), pr(2, true)]), day("2026-11-01", [pr(3, true)])] },
		{ dir: "b", cracks: [day("2026-11-04", [pr(4)])] },
		{ dir: "c" },
	];

	it("merges days newest first, with only unreviewed PRs, dropping days with none", () => {
		const days = boardCracks(agents, null, new Set());
		expect(days.map((one) => [one.date, one.prs.map((p) => p.pr)])).toEqual([["2026-11-04", [4]], ["2026-11-03", [1]]]);
	});

	it("shows one agent's when one is chosen", () => {
		expect(boardCracks(agents, "b", new Set()).map((one) => one.date)).toEqual(["2026-11-04"]);
		expect(boardCracks(agents, "c", new Set())).toEqual([]);
	});

	it("skips PRs just marked", () => {
		const gone = new Set([crackKey("agents/a/the_cracks/2026-11-03.md", 1)]);
		expect(boardCracks(agents, "a", gone)).toEqual([]);
	});

	it("keeps a day that failed to parse, to show its error", () => {
		const broken = [{ dir: "a", cracks: [day("2026-11-03", [], { error: "bad" })] }];
		expect(boardCracks(broken, null, new Set())).toHaveLength(1);
	});
});

describe("splitAgents", () => {
	it("puts agents with something pending first", () => {
		const agent = (dir: string, count: number) => ({ dir, counts: count ? [{ tab: "tasks", count, label: `${count}` }] : [] });
		const { busy, quiet } = splitAgents([agent("a", 0), agent("b", 2), agent("c", 0)]);
		expect(busy.map((one) => one.dir)).toEqual(["b"]);
		expect(quiet.map((one) => one.dir)).toEqual(["a", "c"]);
	});
});

describe("boardChanged", () => {
	it("is true for task, launcher, blocker and cracks files", () => {
		expect(boardChanged(["/v/agents/planemo/TASKS.md"])).toBe(true);
		expect(boardChanged(["/v/agents/planemo/LAUNCHERS.md"])).toBe(true);
		expect(boardChanged(["/v/agents/planemo/blockers/x/condition.md"])).toBe(true);
		expect(boardChanged(["/v/agents/gx_reviews/the_cracks/2026-11-04.md"])).toBe(true);
	});

	it("is true when the batch holds the watched root", () => {
		expect(boardChanged(["/v/agents"], "/v/agents")).toBe(true);
	});

	it("is false for other agent files", () => {
		expect(boardChanged(["/v/agents/planemo/NOTES.md", "/v/agents/planemo/sub/TASKS.md.tmp"])).toBe(false);
	});
});
