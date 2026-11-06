// The gb-board tab's model: which tasks, missed PRs and tiles it shows, and which file changes it cares about.

import type { CrackDay } from "../../obsidian-plugin/src/missed-prs";
import { byPriority, isSnoozed, type Task } from "../../obsidian-plugin/src/task-list";

type Listed = Task & { source: string };

export const taskKey = (task: Pick<Listed, "source" | "agentDir" | "prompt">) => `${task.source}\0${task.agentDir}\0${task.prompt}`;

/** Tasks to show, by priority: every agent's, or the chosen one's; none snoozed or just acted on. */
export function boardTasks<T extends Listed>(agents: Array<{ dir: string; tasks: T[] }>, agent: string | null, today: string, gone: Set<string>): T[] {
	const shown = agents.filter((one) => agent === null || one.dir === agent).flatMap((one) => one.tasks);
	return byPriority(shown.filter((task) => !isSnoozed(task, today) && !gone.has(taskKey(task))));
}

export const crackKey = (path: string, pr: number) => `${path}\0${pr}`;

/** Missed-PR days to show, newest first: every agent's, or the chosen one's; only unreviewed PRs not just marked, and days with any or an error. */
export function boardCracks<T extends CrackDay>(agents: Array<{ dir: string; cracks?: T[] }>, agent: string | null, gone: Set<string>): T[] {
	return agents
		.filter((one) => agent === null || one.dir === agent)
		.flatMap((one) => one.cracks ?? [])
		.map((day) => ({ ...day, prs: day.prs.filter((pr) => !pr.reviewed && !gone.has(crackKey(day.path, pr.pr))) }))
		.filter((day) => day.error || day.prs.length)
		.sort((a, b) => b.date.localeCompare(a.date));
}

/** Agents with something pending, and the rest. */
export function splitAgents<T extends { counts: unknown[] }>(agents: T[]): { busy: T[]; quiet: T[] } {
	return { busy: agents.filter((one) => one.counts.length), quiet: agents.filter((one) => !one.counts.length) };
}

const BOARD_FILE = /\/agents\/[^/]+\/(?:TASKS\.md$|LAUNCHERS\.md$|blockers\/|the_cracks\/)/;

/** Whether a watched batch touches the board; a batch holding the watched root means anything may have changed. */
export function boardChanged(paths: string[], root?: string): boolean {
	return paths.some((path) => path === root || BOARD_FILE.test(path));
}
