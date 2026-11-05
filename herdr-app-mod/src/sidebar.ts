// The gb-agents sidebar's model: terminals grouped by galaxy-brain agent dir.

import type { Environment } from "../../obsidian-plugin/src/environments";
import { agentContext } from "./context";

export interface SidebarPane {
	pane: string;
	terminal: string | null;
	cwd: string | null;
	status: string | null;
	title: string;
	program: { key: string; name: string; agent: boolean };
	/** The terminal's launch name (`hc run --name`). */
	name: string | null;
	machine: string | null;
}

export interface SidebarGroup {
	id: string;
	label: string;
	rows: SidebarPane[];
}

export const OTHER = "Other";
export const RANK: Record<string, number> = { blocked: 4, done: 3, working: 2, idle: 1 };

/** Terminals by agent dir, alphabetically; shells and agents elsewhere go in Other, last. Rows most urgent first. */
export function groupPanes(panes: SidebarPane[]): SidebarGroup[] {
	const groups = new Map<string, SidebarPane[]>();
	for (const p of panes) {
		if (!p.terminal) continue;
		const label = (p.program.agent && agentContext(p.cwd)?.agentDir) || OTHER;
		groups.set(label, [...(groups.get(label) ?? []), p]);
	}
	return [...groups]
		.sort(([a], [b]) => Number(a === OTHER) - Number(b === OTHER) || a.localeCompare(b))
		.map(([label, rows]) => ({ id: `grp-${label}`, label, rows: rows.sort((x, y) => (RANK[y.status ?? ""] ?? 0) - (RANK[x.status ?? ""] ?? 0)) }));
}

/** The program's title when it says something: no leading glyph, not a path, user@host or the program's name. */
function telling(p: SidebarPane): string | null {
	if (/^\s*[~/]/.test(p.title) || p.title.includes("@")) return null;
	const title = p.title.replace(/^[^\p{L}\p{N}]+/u, "").trim();
	if (!title) return null;
	const lower = title.toLowerCase();
	return lower === p.program.name.toLowerCase() || lower === p.program.key ? null : title;
}

/** Launch name plus the title, else the title, else the program. */
export function rowText(p: SidebarPane): { name: string; detail: string | null } {
	const detail = telling(p);
	if (p.name) return { name: p.name, detail };
	return { name: detail ?? p.program.name, detail: null };
}

/** The icon of the environment on this machine (no host) or on the named host. */
export function machineIcon(machine: string | null, environments: Pick<Environment, "host" | "icon">[]): string | null {
	return environments.find((env) => (machine ? env.host === machine : env.host === undefined))?.icon ?? null;
}
