// One native host request (herdr-plugin/src/native-host.ts) through the herdr-plugin CLI.

import { exec, setShared, shared } from "herdr";
import type { Environment } from "../../obsidian-plugin/src/environments";
import { reportRenderFailures } from "./render-log";

const HOST_CLI = `${__GB_ROOT__}/herdr-plugin/bin/run.sh`;
const ENVIRONMENTS = "gb.environments";

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

/** A request only these mods make (herdr-plugin/src/app-host.ts); its result, or a thrown error. */
export const appHost = (request: object): Promise<any> => call("app", request);

/** As the sidebar last loaded them, so each pane's copy doesn't start a host process. */
export const knownEnvironments = (): Environment[] => (shared(ENVIRONMENTS) as Environment[] | null) ?? [];

export async function refreshEnvironments(): Promise<Environment[]> {
	const environments: Environment[] = await appHost({ type: "environments" });
	if (JSON.stringify(environments) !== JSON.stringify(knownEnvironments())) setShared(ENVIRONMENTS, environments);
	return environments;
}

/** Sends the view's render failures to the error log (herdr-plugin/src/error-log.ts). */
export const logRenderFailures = (mod: string, view: { prototype: any }): void =>
	reportRenderFailures(view, (message, cx) => cx.spawn(async () => appHost({ type: "logRenderFailure", mod, message }).catch(() => undefined)));
