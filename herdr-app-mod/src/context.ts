// Where a pane's terminal is, in galaxy-brain terms.

export interface AgentContext {
	vaultRoot: string;
	agentDir: string;
}

/** A galaxy-brain agent folder (`<vault>/agents/<dir>`, not `_`-prefixed), else null. */
export function agentContext(cwd: string | null): AgentContext | null {
	const match = cwd && /^(.+)\/agents\/([^/_][^/]*)\/?$/.exec(cwd);
	return match ? { vaultRoot: match[1]!, agentDir: match[2]! } : null;
}

/** The path's last folder; `~` at home, `/` at the root, empty without a path. */
export function folderName(cwd: string | null, home: string): string {
	if (!cwd) return "";
	const dir = cwd.replace(/\/+$/, "");
	if (!dir) return "/";
	return dir === home.replace(/\/+$/, "") ? "~" : dir.slice(dir.lastIndexOf("/") + 1);
}

/** The folder's SUGGESTED_PROMPTS.md, then `../_shared/`'s. */
export function promptFiles(cwd: string): string[] {
	const dir = cwd.replace(/\/+$/, "");
	const parent = dir.slice(0, dir.lastIndexOf("/"));
	return [`${dir}/SUGGESTED_PROMPTS.md`, `${parent}/_shared/SUGGESTED_PROMPTS.md`];
}

/** Replaces the vault root `from` with `to` wherever it starts a path. */
export function reroot(text: string, from: string, to: string): string {
	return from === to ? text : text.split(`${from}/`).join(`${to}/`);
}

/** The machine of the space holding the tab; null for this computer or an unknown tab. */
export function machineOf(tab: string, spaces: { machine: string | null; tabs: { id: string }[] }[]): string | null {
	return spaces.find((space) => space.tabs.some((t) => t.id === tab))?.machine ?? null;
}
