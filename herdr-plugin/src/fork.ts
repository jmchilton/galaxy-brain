// Fork an agent's session (hc_session_label.sh's gb.session label) into a new tab of its space, on its machine.

import { randomBytes } from "node:crypto";
import { CLEAN_ENV } from "../../obsidian-plugin/src/environments";
import type { AgentKind } from "../../obsidian-plugin/src/launchers";
import { profileFlags } from "../../obsidian-plugin/src/profiles";
import type { HostDeps } from "./native-host";

/** `hc get --json`, the fields a fork reads. */
export interface HcTerminal {
	address: string;
	name?: string | null;
	cwd?: string | null;
	foreground?: { argv?: string[]; cwd?: string } | null;
	status?: { app?: string; state?: string } | null;
	labels?: Record<string, string>;
}

export interface ForkPlan {
	name: string;
	/** Null for this machine. */
	machine: string | null;
	tab: string;
	/** The `hc run` command. */
	argv: string[];
}

export interface ForkDeps {
	run: HostDeps["run"];
	/** Runs a command that only reads. */
	query: HostDeps["run"];
	ids: () => { space: string; tab: string };
	sleep: (ms: number) => void;
}

const HARNESSES: AgentKind[] = ["claude", "codex"];
const RENAME_TRIES = 20;

/** launch_agent.sh's unique_name: [a-z][a-z0-9_-], base cut to 28, then -2, -3… past taken names. */
export function forkName(source: string | null, taken: string[]): string {
	const base =
		`${source ?? "agent"}-fork`
			.toLowerCase()
			.replace(/[^a-z0-9_-]/g, "-")
			.replace(/^[^a-z]+/, "")
			.slice(0, 28) || "agent";
	let name = base;
	for (let n = 2; taken.includes(name); n++) name = `${base}-${n}`;
	return name;
}

/** The fork's command for this source; throws why it can't be forked. */
export function forkPlan(source: HcTerminal, taken: string[], ids: { space: string; tab: string }): ForkPlan {
	const labels = source.labels ?? {};
	const shown = source.name ?? source.address;
	const harness = labels["gb.harness"] as AgentKind | undefined;
	const session = labels["gb.session"];
	if (source.status?.state === "working") throw new Error(`${shown} is working; fork it once it stops`);
	if (!session) throw new Error(`${shown} has no session label yet (Codex sets it on the first prompt)`);
	if (!harness || !HARNESSES.includes(harness)) throw new Error(`${shown}: unknown harness ${harness}`);
	const cwd = source.foreground?.cwd ?? source.cwd;
	if (!cwd) throw new Error(`${shown} has no working directory`);
	const slash = source.address.lastIndexOf("/");
	const machine = slash < 0 ? null : source.address.slice(0, slash);
	const name = forkName(source.name ?? null, taken);
	const carried = profileFlags(harness, source.foreground?.argv ?? []);
	const command = harness === "claude" ? ["claude", "--resume", session, "--fork-session", ...carried] : ["codex", "fork", "--no-daemon", ...carried, session];
	const records = Object.entries(labels).filter(([key]) => key.startsWith("gb.record."));
	const label = (key: string, value: string) => ["--label", `${key}=${value}`];
	const argv = [
		...["hc", "run", "--bg", "--json", "--no-parent", "--name", name],
		...label("herdr.space", labels["herdr.space"] ?? ids.space),
		...label("herdr.tab", ids.tab),
		...records.flatMap(([key, value]) => label(key, value)),
		...label("gb.fork.from", source.address),
		...label("gb.fork.session", session),
		...["--cwd", cwd],
		...(machine ? ["--on", machine] : []),
		...["--", "sh", "-c", CLEAN_ENV, "sh"],
		...command,
	];
	return { name, machine, tab: ids.tab, argv };
}

function json(result: ReturnType<HostDeps["run"]>, what: string): any {
	if (result.status !== 0) throw new Error((result.stderr || result.stdout).trim() || `${what} exited ${result.status}`);
	return JSON.parse(result.stdout);
}

/** Starts the fork and names its tab once the window shows it (without herdr-app it keeps Herdr's name). */
export function fork(deps: ForkDeps, terminal: string): { message: string; terminal: string } {
	const source: HcTerminal = json(deps.query(["hc", "get", terminal, "--json"]), "hc get");
	const taken = (json(deps.query(["hc", "ls", "--json"]), "hc ls").terminals ?? []).flatMap((t: HcTerminal) => (t.name ? [t.name] : []));
	const plan = forkPlan(source, taken, deps.ids());
	const transcript = source.labels?.["gb.transcript"];
	if (transcript && deps.query(["hc", "exec", ...(plan.machine ? ["--on", plan.machine] : []), "test", "-f", transcript]).status !== 0) {
		throw new Error(`${source.name ?? terminal}'s transcript was never written (transcript saving off, likely an inherited CLAUDE_CODE_CHILD_SESSION), so it can't be forked`);
	}
	const address = json(deps.run(plan.argv), "hc run").address as string;
	const rename = ["herdr-app", "do", "tab.rename", "--id", plan.machine ? `${plan.machine}/${plan.tab}` : plan.tab, "--name", plan.name];
	for (let n = 0; n < RENAME_TRIES && deps.run(rename).status !== 0; n++) deps.sleep(250);
	const where = plan.machine ? ` on ${plan.machine}` : "";
	return { message: `Forked ${source.name ?? terminal} as '${plan.name}'${where}, terminal ${address}`, terminal: address };
}

const hex = () => randomBytes(16).toString("hex");
export const newIds = () => ({ space: `sp${hex()}`, tab: `tb${hex()}` });
export const sleepSync = (ms: number) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
