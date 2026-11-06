// Edits vault notes through the host, which holds the YAML parser; a write loses to any change made since the read.

import { notify } from "herdr";
import { tasksPath } from "../../obsidian-plugin/src/agent-routines";
import type { ListedTask } from "../../obsidian-plugin/src/task-list";
import { appHost } from "./host";

async function edit(vaultPath: string, missing: string, request: object): Promise<boolean> {
	try {
		if (await appHost(request)) return true;
		notify({ title: missing, level: "info", timeout: 3000 });
	} catch (error) {
		notify({ title: `${vaultPath} not updated`, body: String(error), level: "error" });
	}
	return false;
}

const TASK_GONE = "Task already removed";

export const removeListedTask = (task: ListedTask) => edit(tasksPath(task.source), TASK_GONE, { type: "removeTask", task });

export const snoozeListedTask = (task: ListedTask, day: string) => edit(tasksPath(task.source), TASK_GONE, { type: "snoozeTask", task, day });

export const markPrReviewed = (path: string, pr: number) => edit(path, `#${pr} not found in ${path}`, { type: "markPrReviewed", path, pr });
