// Routine prompts (GOOD_MORNING.md, TICK.md) and suggested-task files in agent dirs.

import type { Task } from "./task-list";

export interface Routine {
	file: string;
	label: string;
	/** Agent name prefix. */
	prefix: string;
}

export const ROUTINES: Routine[] = [
	{ file: "GOOD_MORNING.md", label: "🌅 Good morning", prefix: "gm" },
	{ file: "TICK.md", label: "⏱️ Tick", prefix: "tick" },
];

export const ROUTINE_PROFILE = "Sonnet (medium)";

/** Where PROCESS_COLLECT_SUGGESTED_TASKS.md appends an agent dir's tasks. */
export const tasksPath = (agentDir: string) => `agents/${agentDir}/TASKS.md`;

export function routineLaunch(agentDir: string, routine: Routine): { task: Task; name: string } {
	return {
		task: { prompt: `Run ./${routine.file}`, agentDir, profile: ROUTINE_PROFILE },
		name: `${routine.prefix}-${agentDir}`,
	};
}
