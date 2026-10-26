import { describe, expect, it } from "vitest";
import { ROUTINES, routineLaunch, tasksPath } from "./agent-routines";

describe("routineLaunch", () => {
	it("runs the agent dir's routine file as a Sonnet (medium) task", () => {
		const [morning, tick] = ROUTINES;
		expect(routineLaunch("gx_reviews", morning!)).toEqual({
			task: { prompt: "Run ./GOOD_MORNING.md", agentDir: "gx_reviews", profile: "Sonnet (medium)" },
			name: "gm-gx_reviews",
		});
		expect(routineLaunch("pulsar", tick!)).toEqual({
			task: { prompt: "Run ./TICK.md", agentDir: "pulsar", profile: "Sonnet (medium)" },
			name: "tick-pulsar",
		});
	});
});

describe("tasksPath", () => {
	it("is TASKS.md in the agent dir", () => {
		expect(tasksPath("planemo")).toBe("agents/planemo/TASKS.md");
	});
});
