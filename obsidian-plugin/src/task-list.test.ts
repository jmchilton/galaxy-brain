import { describe, expect, it } from "vitest";
import { parse, stringify } from "yaml";
import { addDays, byPriority, isSnoozed, linkLabel, localDay, parseAgentTasks, parseTasks, recordIndexPath, refinementPrompt, removeTask, replaceBlockBody, snoozeTask, type Task, taskBlocks } from "./task-list";

const known = { profiles: ["Opus (high)", "Sonnet (medium)"], agentDirs: ["planemo", "wf_foundry"] };

describe("parseAgentTasks", () => {
	it("lists every block's tasks, tagged with the dir holding them", () => {
		const note = "```gb-tasks\n- prompt: a\n  agent_dir: planemo\n```\ntext\n```gb-tasks\n- prompt: b\n  agent_dir: wf_foundry\n```\n";
		expect(parseAgentTasks("planemo", note, known, parse)).toEqual({
			source: "planemo",
			tasks: [
				{ prompt: "a", agentDir: "planemo", source: "planemo" },
				{ prompt: "b", agentDir: "wf_foundry", source: "planemo" },
			],
		});
	});

	it("has no tasks without a note", () => {
		expect(parseAgentTasks("planemo", null, known, parse)).toEqual({ source: "planemo", tasks: [] });
	});

	it("reports a bad block instead of throwing", () => {
		const note = "```gb-tasks\n- prompt: a\n  agent_dir: nope\n```\n";
		expect(parseAgentTasks("planemo", note, known, parse)).toEqual({ source: "planemo", tasks: [], error: "task 1: unknown agent_dir nope" });
	});
});

describe("linkLabel", () => {
	it("shortens GitHub PRs and issues to owner/repo#N", () => {
		expect(linkLabel("https://github.com/galaxyproject/galaxy/pull/24361")).toBe("galaxyproject/galaxy#24361");
		expect(linkLabel("https://github.com/galaxyproject/foundry/issues/735#issuecomment-1")).toBe("galaxyproject/foundry#735");
	});

	it("drops only the scheme from anything else", () => {
		expect(linkLabel("https://github.com/galaxyproject/galaxy/tree/dev")).toBe("github.com/galaxyproject/galaxy/tree/dev");
		expect(linkLabel("http://example.org/a")).toBe("example.org/a");
	});
});

describe("parseTasks", () => {
	it("reads tasks with optional profiles", () => {
		const data = parse(`- prompt: "Review PR #1733."
  agent_dir: planemo
  profile: Opus (high)
  description: Planemo PR from the weekly sweep; touches lint.
- prompt: |
    Pick up the next branch.
  agent_dir: wf_foundry
`);
		expect(parseTasks(data, known)).toEqual([
			{ prompt: "Review PR #1733.", agentDir: "planemo", profile: "Opus (high)", description: "Planemo PR from the weekly sweep; touches lint." },
			{ prompt: "Pick up the next branch.\n", agentDir: "wf_foundry" },
		]);
	});

	it.each(["recommended", "idea"])("reads status %s", (status) => {
		expect(parseTasks([{ prompt: "x", agent_dir: "planemo", status }], known)).toEqual([{ prompt: "x", agentDir: "planemo", status }]);
	});

	it.each(["high", "low"])("reads priority %s", (priority) => {
		expect(parseTasks([{ prompt: "x", agent_dir: "planemo", priority }], known)).toEqual([{ prompt: "x", agentDir: "planemo", priority }]);
	});

	it("reads a human task", () => {
		expect(parseTasks([{ prompt: "Merge it.", agent_dir: "planemo", kind: "human" }], known)).toEqual([{ prompt: "Merge it.", agentDir: "planemo", kind: "human" }]);
	});

	it("reads a link", () => {
		const link = "https://github.com/galaxyproject/galaxy/pull/24396";
		expect(parseTasks([{ prompt: "x", agent_dir: "planemo", link }], known)).toEqual([{ prompt: "x", agentDir: "planemo", link }]);
	});

	it("reads an issue incubator record reference", () => {
		expect(parseTasks([{ prompt: "x", agent_dir: "planemo", record: "galaxy/issues_incubator/oidc_extra_authorize_params" }], known)).toEqual([
			{ prompt: "x", agentDir: "planemo", record: { repo: "galaxy", kind: "issues_incubator", name: "oidc_extra_authorize_params" } },
		]);
	});

	it("reads a record reference", () => {
		expect(parseTasks([{ prompt: "x", agent_dir: "planemo", record: "galaxy/reviews/24396" }], known)).toEqual([
			{ prompt: "x", agentDir: "planemo", record: { repo: "galaxy", kind: "reviews", name: "24396" } },
		]);
	});

	it("reads suggested_by", () => {
		const suggestedBy = "gx_reviews/SUGGESTED_TASKS.md#Review New PRs";
		expect(parseTasks([{ prompt: "x", agent_dir: "planemo", suggested_by: suggestedBy }], known)).toEqual([{ prompt: "x", agentDir: "planemo", suggestedBy }]);
	});

	it("reads snoozed_until", () => {
		expect(parseTasks([{ prompt: "x", agent_dir: "planemo", snoozed_until: "2026-11-08" }], known)).toEqual([{ prompt: "x", agentDir: "planemo", snoozedUntil: "2026-11-08" }]);
	});

	it("reads snoozed_until parsed as a date", () => {
		const data = parse("- prompt: x\n  agent_dir: planemo\n  snoozed_until: 2026-11-08\n", { customTags: ["timestamp"] });
		expect(parseTasks(data, known)).toEqual([{ prompt: "x", agentDir: "planemo", snoozedUntil: "2026-11-08" }]);
	});

	it("treats an empty block as no tasks", () => {
		expect(parseTasks(null, known)).toEqual([]);
	});

	it.each([
		[{ tasks: [] }, /must be a list/],
		[[{ agent_dir: "planemo" }], /task 1: missing prompt/],
		[[{ prompt: "x" }], /task 1: missing agent_dir/],
		[[{ prompt: "x", agent_dir: "nope" }], /task 1: unknown agent_dir nope/],
		[[{ prompt: "x", agent_dir: "planemo", profile: "Haiku" }], /task 1: unknown profile Haiku/],
		[[{ prompt: "x", agent_dir: "planemo", model: "opus" }], /task 1: unknown field model/],
		[[{ prompt: "x", agent_dir: "planemo", description: 3 }], /task 1: description must be text/],
		[[{ prompt: "x", agent_dir: "planemo", status: "maybe" }], /task 1: unknown status maybe/],
		[[{ prompt: "x", agent_dir: "planemo", priority: "urgent" }], /task 1: unknown priority urgent/],
		[[{ prompt: "x", agent_dir: "planemo", kind: "robot" }], /task 1: unknown kind robot/],
		[[{ prompt: "x", agent_dir: "planemo", kind: "human", profile: "Opus (high)" }], /task 1: human task with a profile/],
		[[{ prompt: "x", agent_dir: "planemo", link: "galaxy#24396" }], /task 1: link must be an http\(s\) URL/],
		[[{ prompt: "x", agent_dir: "planemo", record: "galaxy/pulls/24396" }], /task 1: record must be <repo>\/<branches\|issues\|issues_incubator\|reviews>\/<name>/],
		[[{ prompt: "x", agent_dir: "planemo", record: "repositories/galaxy/reviews/active/24396" }], /task 1: record must be/],
		[[{ prompt: "x", agent_dir: "planemo", suggested_by: "gx_reviews/SUGGESTED_TASKS" }], /task 1: suggested_by must be/],
		[[{ prompt: "x", agent_dir: "planemo", snoozed_until: "next week" }], /task 1: snoozed_until must be YYYY-MM-DD/],
		[[{ prompt: "x", agent_dir: "planemo", snoozed_until: 20261108 }], /task 1: snoozed_until must be YYYY-MM-DD/],
	])("rejects %j", (data, error) => {
		expect(() => parseTasks(data, known)).toThrow(error);
	});
});

describe("replaceBlockBody", () => {
	it("swaps the lines between a block's fences", () => {
		const note = "# Tasks\n\n```gb-tasks\n- prompt: a\n  agent_dir: planemo\n```\nafter\n";
		expect(replaceBlockBody(note, 2, 5, "[]\n")).toBe("# Tasks\n\n```gb-tasks\n[]\n```\nafter\n");
	});
});

const twoBlocks = "# Tasks\n```gb-tasks\n- prompt: a\n  agent_dir: planemo\n```\n\n```yaml\nx: 1\n```\n```gb-tasks\n- prompt: b\n  agent_dir: planemo\n- prompt: c\n  agent_dir: planemo\n```\n";

describe("taskBlocks", () => {
	it("finds each gb-tasks block's fences and source, skipping other fences", () => {
		expect(taskBlocks(twoBlocks)).toEqual([
			{ start: 1, end: 4, source: "- prompt: a\n  agent_dir: planemo" },
			{ start: 9, end: 14, source: "- prompt: b\n  agent_dir: planemo\n- prompt: c\n  agent_dir: planemo" },
		]);
	});

	it("ignores an unclosed block", () => {
		expect(taskBlocks("```gb-tasks\n- prompt: a\n")).toEqual([]);
	});
});

describe("removeTask", () => {
	it("drops the first matching entry from whichever block holds it", () => {
		expect(removeTask(twoBlocks, { prompt: "c", agentDir: "planemo" }, parse, stringify)).toBe(
			twoBlocks.replace("- prompt: c\n  agent_dir: planemo\n", ""),
		);
	});

	it("empties a block when its last task goes", () => {
		expect(removeTask(twoBlocks, { prompt: "a", agentDir: "planemo" }, parse, stringify)).toBe(
			twoBlocks.replace("```gb-tasks\n- prompt: a\n  agent_dir: planemo\n```", "```gb-tasks\n```"),
		);
	});

	it("returns undefined when no entry matches", () => {
		expect(removeTask(twoBlocks, { prompt: "a", agentDir: "wf_foundry" }, parse, stringify)).toBeUndefined();
	});
});

describe("snoozeTask", () => {
	it("sets snoozed_until on the first matching entry, keeping it in its block", () => {
		expect(snoozeTask(twoBlocks, { prompt: "c", agentDir: "planemo" }, "2026-11-08", parse, stringify)).toBe(
			twoBlocks.replace("- prompt: c\n  agent_dir: planemo\n", "- prompt: c\n  agent_dir: planemo\n  snoozed_until: 2026-11-08\n"),
		);
	});

	it("returns undefined when no entry matches", () => {
		expect(snoozeTask(twoBlocks, { prompt: "a", agentDir: "wf_foundry" }, "2026-11-08", parse, stringify)).toBeUndefined();
	});
});

describe("isSnoozed", () => {
	it.each([
		[undefined, false],
		["2026-11-02", true],
		["2026-11-01", false],
		["2026-10-31", false],
	])("snoozed_until %s on 2026-11-01 is %s", (snoozedUntil, expected) => {
		expect(isSnoozed({ prompt: "x", agentDir: "a", ...(snoozedUntil ? { snoozedUntil } : {}) }, "2026-11-01")).toBe(expected);
	});
});

describe("addDays", () => {
	it.each([
		["2026-11-01", 1, "2026-11-02"],
		["2026-11-01", 7, "2026-11-08"],
		["2026-12-28", 7, "2027-01-04"],
		["2026-03-07", 1, "2026-03-08"],
	])("%s + %i is %s", (day, days, expected) => {
		expect(addDays(day, days)).toBe(expected);
	});
});

describe("localDay", () => {
	it("formats the local calendar date", () => {
		expect(localDay(new Date(2026, 0, 5, 23, 30))).toBe("2026-01-05");
	});
});

describe("byPriority", () => {
	it("puts recommended first and ideas last, keeping order otherwise", () => {
		const tasks: Task[] = [
			{ prompt: "1", agentDir: "a", status: "idea" },
			{ prompt: "2", agentDir: "a" },
			{ prompt: "3", agentDir: "b", status: "recommended" },
			{ prompt: "4", agentDir: "b" },
		];
		expect(byPriority(tasks).map((task) => task.prompt)).toEqual(["3", "2", "4", "1"]);
	});

	it("orders by priority before status", () => {
		const tasks: Task[] = [
			{ prompt: "1", agentDir: "a", priority: "low", status: "recommended" },
			{ prompt: "2", agentDir: "a", status: "idea" },
			{ prompt: "3", agentDir: "a", priority: "high", status: "idea" },
			{ prompt: "4", agentDir: "a", status: "recommended" },
		];
		expect(byPriority(tasks).map((task) => task.prompt)).toEqual(["3", "4", "2", "1"]);
	});
});

describe("recordIndexPath", () => {
	const paths = ["repositories/galaxy/reviews/archived/24396/index.md", "repositories/galaxy/reviews/active/243/index.md", "repositories/galaxy/issues/active/24396/index.md"];
	it("finds the record's index.md in whichever status it's in", () => {
		expect(recordIndexPath({ repo: "galaxy", kind: "reviews", name: "24396" }, paths)).toBe("repositories/galaxy/reviews/archived/24396/index.md");
		expect(recordIndexPath({ repo: "galaxy", kind: "branches", name: "24396" }, paths)).toBeUndefined();
	});
});

describe("refinementPrompt", () => {
	it("names the agent, suggesting section, description and prompt", () => {
		const prompt = refinementPrompt({ prompt: "Run it\n", agentDir: "planemo", description: "Why\n", suggestedBy: "_shared/PROJECT_SUGGESTED_TASKS.md#Review New PRs" });
		expect(prompt).toContain("Agent: planemo\nSuggested by: vault/agents/_shared/PROJECT_SUGGESTED_TASKS.md#Review New PRs\n\nDescription:\nWhy\n\nPrompt:\nRun it");
	});

	it("flags a task with no suggested_by", () => {
		expect(refinementPrompt({ prompt: "x", agentDir: "planemo" })).toContain("Suggested by: unknown");
	});
});
