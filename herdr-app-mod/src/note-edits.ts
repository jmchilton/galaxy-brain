// Edits vault notes through the host, which holds the YAML parser; a write loses to any change made since the read.

import { notify } from "herdr";
import type { FindingsEdit, FindingsPanel } from "../../herdr-plugin/src/findings-types";
import { tasksPath } from "../../obsidian-plugin/src/agent-routines";
import type { ListedTask } from "../../obsidian-plugin/src/task-list";
import { appHost } from "./host";

/** The host's reply, or false after a toast saying why. */
async function edit<T>(vaultPath: string, missing: string, request: object): Promise<T | false> {
	try {
		const reply = await appHost(request);
		if (reply) return reply;
		notify({ title: missing, level: "info", timeout: 3000 });
	} catch (error) {
		notify({ title: `${vaultPath} not updated`, body: String(error), level: "error" });
	}
	return false;
}

const TASK_GONE = "Task already removed";

export const removeListedTask = (task: ListedTask) => edit<boolean>(tasksPath(task.source), TASK_GONE, { type: "removeTask", task });

export const snoozeListedTask = (task: ListedTask, day: string) => edit<boolean>(tasksPath(task.source), TASK_GONE, { type: "snoozeTask", task, day });

export const markPrReviewed = (path: string, pr: number) => edit<boolean>(path, `#${pr} not found in ${path}`, { type: "markPrReviewed", path, pr });

/** The panel after the edit. */
export const editFindings = (file: string, change: FindingsEdit) =>
	edit<FindingsPanel>(file, "id" in change ? `${change.id} is no longer in ${file}` : `${file} is gone`, { type: "id" in change ? "setFindingInclude" : "setFindingAction", ...change });
