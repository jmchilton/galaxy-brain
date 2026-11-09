// `app` requests, for the Herdr app's mods only, not Chrome: note edits, the findings panel and environments, which keep the YAML parser out of
// the app's one script heap, repository listings, and the error log.

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { parse, stringify } from "yaml";
import { tasksPath } from "../../obsidian-plugin/src/agent-routines";
import { isCrackFile, setMissedPrReviewed } from "../../obsidian-plugin/src/missed-prs";
import { removeTask, snoozeTask } from "../../obsidian-plugin/src/task-list";
import { type ErrorLogDeps, logRenderFailure, logStatusErrors } from "./error-log";
import { findingsEdit, findingsPanel } from "./findings-host";
import type { FindingsEdit } from "./findings-types";
import { agentDirs } from "./native-host";
import { recordIndex, repositoryPage } from "./repository-host";
import type { RepositoryPageRequest } from "./repository-types";
import { loadEnvironments, writeAtomic } from "./vault";

/** Its `source` is the agent dir whose TASKS.md lists it. */
interface TaskRef {
	prompt: string;
	agentDir: string;
	source: string;
}

export type AppRequest =
	| { type: "environments" }
	| { type: "recordIndex" }
	| ({ type: "repositoryPage" } & RepositoryPageRequest)
	/** These edits answer false when the entry or note is gone. */
	| { type: "removeTask"; task: TaskRef }
	| { type: "snoozeTask"; task: TaskRef; day: string }
	| { type: "markPrReviewed"; path: string; pr: number }
	| { type: "findings"; ref: string }
	/** These answer the new panel, or false when the finding is gone. */
	| ({ type: "setFindingInclude" } & FindingsEdit)
	| ({ type: "setFindingAction" } & FindingsEdit)
	| { type: "logRenderFailure"; mod: string; message: string }
	| { type: "logStatusErrors" };

export interface AppHostDeps extends ErrorLogDeps {
	vaultRoot: string;
}

/** Unwrapped, so an edit leaves other entries' lines alone and paths stay greppable. */
const unwrapped = (data: unknown) => stringify(data, { lineWidth: 0 });

/** False when there's no note or `change` finds nothing to change; a write loses to any change made since the read. */
export function editNote(vaultRoot: string, path: string, change: (note: string) => string | undefined): boolean {
	const file = join(vaultRoot, path);
	if (!existsSync(file)) return false;
	const note = readFileSync(file, "utf8");
	const updated = change(note);
	if (updated === undefined) return false;
	if (readFileSync(file, "utf8") !== note) throw new Error(`${path} changed during the edit`);
	writeAtomic(file, updated);
	return true;
}

function taskNote(vaultRoot: string, task: TaskRef): string {
	if (!agentDirs(vaultRoot).includes(task.source)) throw new Error(`unknown agent dir: ${task.source}`);
	return tasksPath(task.source);
}

export function appRequest(request: AppRequest, deps: AppHostDeps): unknown {
	const { vaultRoot } = deps;
	switch (request.type) {
		case "environments":
			return loadEnvironments(vaultRoot);
		case "recordIndex":
			return recordIndex(vaultRoot);
		case "repositoryPage":
			return repositoryPage(vaultRoot, request);
		case "removeTask":
			return editNote(vaultRoot, taskNote(vaultRoot, request.task), (note) => removeTask(note, request.task, parse, unwrapped));
		case "snoozeTask":
			return editNote(vaultRoot, taskNote(vaultRoot, request.task), (note) => snoozeTask(note, request.task, request.day, parse, unwrapped));
		case "markPrReviewed":
			if (!isCrackFile(request.path)) throw new Error(`not a the_cracks file: ${request.path}`);
			return editNote(vaultRoot, request.path, (note) => setMissedPrReviewed(note, request.pr, true, parse, unwrapped));
		case "findings":
			return findingsPanel(vaultRoot, request.ref);
		case "setFindingInclude":
		case "setFindingAction": {
			const edit = findingsEdit(vaultRoot, request);
			return Boolean(edit && editNote(vaultRoot, edit.path, edit.change)) && findingsPanel(vaultRoot, request.ref);
		}
		case "logRenderFailure":
			return logRenderFailure(deps, request.mod, request.message);
		case "logStatusErrors":
			return logStatusErrors(deps);
		default:
			throw new Error(`unknown app request: ${JSON.stringify(request)}`);
	}
}
