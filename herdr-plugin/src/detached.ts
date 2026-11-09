// Work that outlives a host request, which the app's script runtime stops after about 500 ms (30 s for exec):
// each job runs in its own process and leaves its result in a file, which the app collects by polling.

import { spawn } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { CaptureResult as JobResult } from "./review-types";
import { writeAtomic } from "./vault";

/** Where a job of this kind leaves its result for the record. */
export const jobFile = (kind: string, ref: string): string => join(tmpdir(), `gb-${kind}-${ref.replaceAll("/", "__")}.json`);

/** Runs this CLI with `args` in its own process. Git can't prompt there, since no one would answer. */
export function startDetached(args: string[]): void {
	const env = { ...process.env, GIT_TERMINAL_PROMPT: "0", GIT_SSH_COMMAND: "ssh -o BatchMode=yes" };
	spawn(process.execPath, [process.argv[1]!, ...args], { detached: true, stdio: "ignore", env }).unref();
}

/** Starts a job, dropping an earlier result; or gives the finished job's result, once. Null when there's none to give. */
export function detachedRequest(resultFile: string, phase: "start" | "result", start: () => void): JobResult | null {
	if (phase === "start") {
		rmSync(resultFile, { force: true });
		start();
		return null;
	}
	if (!existsSync(resultFile)) return null;
	const result = JSON.parse(readFileSync(resultFile, "utf8")) as JobResult;
	rmSync(resultFile);
	return result;
}

/** Runs argv to its end, or kills it after timeoutMs; ok is a zero exit, and the message its stdout, then stderr. */
export function runCommand(resultFile: string, [command, ...args]: string[], timeoutMs = 180_000): Promise<void> {
	return new Promise((resolve) => {
		const stdout: string[] = [];
		const stderr: string[] = [];
		let finished = false;
		const done = (result: JobResult) => {
			if (finished) return;
			finished = true;
			clearTimeout(timer);
			writeAtomic(resultFile, JSON.stringify(result));
			resolve();
		};
		const child = spawn(command!, args, { stdio: ["ignore", "pipe", "pipe"] });
		const timer = setTimeout(() => {
			done({ ok: false, message: `⛔ stopped after ${timeoutMs / 1000} s` });
			child.kill();
		}, timeoutMs);
		child.stdout.on("data", (chunk) => stdout.push(String(chunk)));
		child.stderr.on("data", (chunk) => stderr.push(String(chunk)));
		child.on("error", (error) => done({ ok: false, message: error.message }));
		child.on("close", (code) => done({ ok: code === 0, message: [stdout.join("").trim(), stderr.join("").trim()].filter(Boolean).join("\n") }));
	});
}
