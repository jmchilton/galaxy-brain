// One native host request (herdr-plugin/src/native-host.ts) through the herdr-plugin CLI.

import { exec } from "herdr";

const HOST_CLI = `${__GB_ROOT__}/herdr-plugin/bin/run.sh`;

async function call(command: string, request: object): Promise<any> {
	const result = await exec(HOST_CLI, [command, JSON.stringify(request)]).catch((error: unknown) => ({ code: 1, stdout: "", stderr: String(error) }));
	let reply: { ok: boolean; result?: unknown; error?: string };
	try {
		reply = JSON.parse(result.stdout);
	} catch {
		reply = { ok: false, error: (result.stderr || result.stdout || `exited ${result.code}`).trim() };
	}
	if (!reply.ok) throw new Error(reply.error);
	return reply.result;
}

/** Its result, or a thrown error. */
export const host = (request: object): Promise<any> => call("host", request);

/** A differential review request (herdr-plugin/src/review-types.ts); its result, or a thrown error. */
export const reviewHost = (request: object): Promise<any> => call("review", request);
