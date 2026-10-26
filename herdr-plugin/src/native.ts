// Native messaging host for the galaxy-brain Chrome extension: one framed reply per framed request.

import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";
import { handle, type Request } from "./native-host";
import { decodeFrames, encodeFrame } from "./native-messaging";

const vaultRoot = resolve(join(__dirname, ".."), "../vault");
const dryRun = Boolean(process.env.GB_DRY_RUN);

function run(argv: string[]) {
	if (dryRun) return { status: 0, stdout: `Dry run: ${JSON.stringify(argv)}`, stderr: "" };
	const result = spawnSync(argv[0]!, argv.slice(1), { encoding: "utf8", timeout: 120_000 });
	return { status: result.status ?? 1, stdout: result.stdout ?? "", stderr: result.stderr || result.error?.message || "" };
}

function reply(request: Request) {
	try {
		return { ok: true, result: handle(request, { vaultRoot, run }) };
	} catch (error) {
		return { ok: false, error: error instanceof Error ? error.message : String(error) };
	}
}

let buffer: Buffer = Buffer.alloc(0);
process.stdin.on("data", (chunk: Buffer) => {
	const { messages, rest } = decodeFrames(Buffer.concat([buffer, chunk]));
	buffer = rest;
	for (const message of messages) process.stdout.write(encodeFrame(reply(message as Request)));
});
