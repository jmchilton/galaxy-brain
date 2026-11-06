// A log of Herdr app mod failures, which the app doesn't keep: `status` only lists current errors, and a render failure only shows in its banner.

import { appendFileSync, existsSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const LOG = "gb-errors.log";
const SEEN = "gb-errors.seen.json";
const MAX_BYTES = 1 << 20;

export interface ErrorLogDeps {
	/** Herdr's home folder. */
	appHome: string;
	/** Runs a command; its exit code and output. */
	run: (argv: string[]) => { status: number; stdout: string; stderr: string };
	now: () => Date;
}

function append(deps: ErrorLogDeps, entry: string) {
	const path = join(deps.appHome, LOG);
	if (existsSync(path) && statSync(path).size >= MAX_BYTES) renameSync(path, `${path}.1`);
	appendFileSync(path, `${deps.now().toISOString()} ${entry.replace(/\n\s*/g, "\n    ")}\n`);
}

export const logRenderFailure = (deps: ErrorLogDeps, mod: string, message: string) => append(deps, `render ${mod}: ${message}`);

const counted = (errors: string[]) => {
	const counts = new Map<string, number>();
	for (const error of errors) counts.set(error, (counts.get(error) ?? 0) + 1);
	return counts;
};

/** Errors with more copies than before, and how many more. */
export function newErrors(previous: string[], current: string[]): Array<{ message: string; copies: number }> {
	const before = counted(previous);
	return [...counted(current)].flatMap(([message, count]) => {
		const copies = count - (before.get(message) ?? 0);
		return copies > 0 ? [{ message, copies }] : [];
	});
}

/** Logs what `herdr-app status` shows that it didn't last time; how many entries that took. */
export function logStatusErrors(deps: ErrorLogDeps): number {
	const status = deps.run(["herdr-app", "status"]);
	if (status.status !== 0) throw new Error(status.stderr.trim() || `herdr-app status exited ${status.status}`);
	const errors = (JSON.parse(status.stdout) as { errors?: string[] }).errors ?? [];
	const seenPath = join(deps.appHome, SEEN);
	const entries = newErrors(existsSync(seenPath) ? (JSON.parse(readFileSync(seenPath, "utf8")) as string[]) : [], errors);
	for (const { message, copies } of entries) append(deps, `status ${copies > 1 ? `×${copies} ` : ""}${message}`);
	writeFileSync(seenPath, JSON.stringify(errors));
	return entries.length;
}
