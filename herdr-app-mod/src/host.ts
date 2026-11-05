// One native host request (herdr-plugin/src/native-host.ts) through the herdr-plugin CLI.

import { exec } from "herdr";

const HOST_CLI = `${__GB_ROOT__}/herdr-plugin/bin/run.sh`;

/** Its result, or a thrown error. */
export async function host(request: object): Promise<any> {
	const result = await exec(HOST_CLI, ["host", JSON.stringify(request)]).catch((error: unknown) => ({ code: 1, stdout: "", stderr: String(error) }));
	let reply: { ok: boolean; result?: unknown; error?: string };
	try {
		reply = JSON.parse(result.stdout);
	} catch {
		reply = { ok: false, error: (result.stderr || result.stdout || `exited ${result.code}`).trim() };
	}
	if (!reply.ok) throw new Error(reply.error);
	return reply.result;
}
