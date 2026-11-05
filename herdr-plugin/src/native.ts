// Native messaging host for the galaxy-brain Chrome extension: one framed reply per framed request.

import { join, resolve } from "node:path";
import { hostRun } from "./host-run";
import { type Request, reply } from "./native-host";
import { decodeFrames, encodeFrame } from "./native-messaging";

const vaultRoot = resolve(join(__dirname, ".."), "../vault");

let buffer: Buffer = Buffer.alloc(0);
process.stdin.on("data", (chunk: Buffer) => {
	const { messages, rest } = decodeFrames(Buffer.concat([buffer, chunk]));
	buffer = rest;
	for (const message of messages) process.stdout.write(encodeFrame(reply(message as Request, { vaultRoot, run: hostRun })));
});
