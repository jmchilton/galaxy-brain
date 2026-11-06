// Routines (agent launchers marked `routine: true`) and suggested-task files in agent dirs.

import { fillAgentTemplate, parseAgentLaunchers, quickEmoji } from "./launchers";
import { isSnoozed, type Task } from "./task-list";

export interface Routine {
	/** Without its leading emoji. */
	label: string;
	emoji: string;
	/** Obsidian icon id; the emoji shows without one. */
	icon?: string;
	/** Agent name. */
	name: string;
	task: Task;
}

/** The dir's routines from its LAUNCHERS.md; one needing an open note ({file}) can't run from a button. */
export function agentRoutines(launchers: string | null, agent: string): Routine[] {
	return parseAgentLaunchers(launchers ?? "", agent)
		.filter((launcher) => launcher.routine && !launcher.prompt.includes("{file}"))
		.map(({ label, icon, name, prompt, agentDir, profile }) => {
			const emoji = quickEmoji(label);
			return {
				label: emoji ? label.slice(emoji.length).trim() : label,
				emoji: emoji ?? "▶️",
				...(icon ? { icon } : {}),
				name: fillAgentTemplate(name, agent, ""),
				task: { prompt: fillAgentTemplate(prompt, agent, ""), agentDir, ...(profile ? { profile } : {}) },
			};
		});
}

export type AgentsTab = "tasks" | "blockers" | "cracks";

/** A landing page chip: the tab it opens, and its text. */
export interface AgentCount {
	tab: AgentsTab;
	count: number;
	label: string;
}

/** What's pending for an agent, skipping snoozed tasks and zeros. */
export function agentCounts(tasks: Task[], blockers: number, missed: number, today: string): AgentCount[] {
	const counts: Array<[AgentsTab, number, string]> = [
		["tasks", tasks.filter((task) => !isSnoozed(task, today)).length, "task"],
		["blockers", blockers, "blocker"],
		["cracks", missed, "missed PR"],
	];
	return counts.filter(([, count]) => count > 0).map(([tab, count, noun]) => ({ tab, count, label: `${count} ${noun}${count === 1 ? "" : "s"}` }));
}

/** Where PROCESS_COLLECT_SUGGESTED_TASKS.md appends an agent dir's tasks. */
export const tasksPath = (agentDir: string) => `agents/${agentDir}/TASKS.md`;
