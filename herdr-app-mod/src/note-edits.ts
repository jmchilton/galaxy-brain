// Edits vault notes; a write loses to any change made since the read rather than overwriting it.

import { notify, readTextFile, writeTextFile } from "herdr";
import { parse, stringify } from "yaml";
import { tasksPath } from "../../obsidian-plugin/src/agent-routines";
import { setMissedPrReviewed } from "../../obsidian-plugin/src/missed-prs";
import { type ListedTask, removeTask, snoozeTask } from "../../obsidian-plugin/src/task-list";

/** Unwrapped, so an edit leaves other entries' lines alone and paths stay greppable. */
const unwrapped = (data: unknown) => stringify(data, { lineWidth: 0 });

async function edit(vaultPath: string, missing: string, change: (note: string) => string | undefined): Promise<boolean> {
	const path = `${__GB_ROOT__}/vault/${vaultPath}`;
	const note: string | null = await readTextFile(path).catch(() => null);
	const updated = note === null ? undefined : change(note);
	if (updated === undefined) {
		notify({ title: missing, level: "info", timeout: 3000 });
		return false;
	}
	try {
		await writeTextFile(path, updated, note);
		return true;
	} catch (error) {
		notify({ title: `${vaultPath} not updated`, body: String(error), level: "error" });
		return false;
	}
}

const TASK_GONE = "Task already removed";

export const removeListedTask = (task: ListedTask) => edit(tasksPath(task.source), TASK_GONE, (note) => removeTask(note, task, parse, unwrapped));

export const snoozeListedTask = (task: ListedTask, day: string) => edit(tasksPath(task.source), TASK_GONE, (note) => snoozeTask(note, task, day, parse, unwrapped));

export const markPrReviewed = (path: string, pr: number) => edit(path, `#${pr} not found in ${path}`, (note) => setMissedPrReviewed(note, pr, true, parse, unwrapped));
