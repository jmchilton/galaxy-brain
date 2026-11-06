import { describe, expect, it } from "vitest";
import { agentCounts, agentRoutines, tasksPath } from "./agent-routines";

describe("agentCounts", () => {
	const task = (snoozedUntil?: string) => ({ prompt: "x", agentDir: "planemo", ...(snoozedUntil ? { snoozedUntil } : {}) });

	it("counts what's pending, singular or plural, skipping zeros", () => {
		expect(agentCounts([task(), task()], 1, 0, "2026-11-05")).toEqual([
			{ tab: "tasks", count: 2, label: "2 tasks" },
			{ tab: "blockers", count: 1, label: "1 blocker" },
		]);
		expect(agentCounts([], 0, 7, "2026-11-05")).toEqual([{ tab: "cracks", count: 7, label: "7 missed PRs" }]);
	});

	it("leaves out snoozed tasks", () => {
		expect(agentCounts([task("2026-11-06")], 0, 0, "2026-11-05")).toEqual([]);
		expect(agentCounts([task("2026-11-05")], 0, 0, "2026-11-05")).toEqual([{ tab: "tasks", count: 1, label: "1 task" }]);
	});
});

describe("agentRoutines", () => {
	const launchers = `Intro.

## ☀️ Good morning
routine: true
icon: sun
name: pulsar-morning
profile: Sonnet (medium)

Run ./GOOD_MORNING.md

## 🧹 Recover disk
name: pulsar-disk

Run ../_shared/GX_PROCESS_RECOVER_DISK.md
`;

	it("is the launchers marked routine, ready to launch", () => {
		expect(agentRoutines(launchers, "pulsar")).toEqual([
			{
				label: "Good morning",
				emoji: "☀️",
				icon: "sun",
				name: "pulsar-morning",
				task: { prompt: "Run ./GOOD_MORNING.md", agentDir: "pulsar", profile: "Sonnet (medium)" },
			},
		]);
	});

	it("fills {agent} and gives an emoji-less label a stand-in", () => {
		const [routine] = agentRoutines("## Sweep\nroutine: true\nname: {agent}-sweep\n\nSweep {agent}\n", "pulsar");
		expect(routine).toEqual({ label: "Sweep", emoji: "▶️", name: "pulsar-sweep", task: { prompt: "Sweep pulsar", agentDir: "pulsar" } });
	});

	it("skips one that needs an open note", () => {
		expect(agentRoutines("## 💭 Discuss\nroutine: true\n\nDiscuss {file}\n", "pulsar")).toEqual([]);
	});

	it("is empty without a launchers file", () => {
		expect(agentRoutines(null, "pulsar")).toEqual([]);
	});
});

describe("tasksPath", () => {
	it("is TASKS.md in the agent dir", () => {
		expect(tasksPath("planemo")).toBe("agents/planemo/TASKS.md");
	});
});
