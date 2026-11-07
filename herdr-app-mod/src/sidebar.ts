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

export interface PagePane {
	pane: string;
	tab: string;
	name: string;
	status: null;
}

/** Mod panes (the board, a record, a review), by their tab's name; the `gb` layout has no tab bar to find them. */
export function pagePanes(panes: Array<{ pane: string; terminal: string | null; mod?: string; tab: string }>, tabs: Array<{ id: string; name: string }>): PagePane[] {
	return panes
		.filter((p) => p.mod?.startsWith("gb-") && !p.terminal)
		.map((p) => ({ pane: p.pane, tab: p.tab, name: tabs.find((tab) => tab.id === p.tab)?.name ?? p.mod!, status: null as null }))
		.sort((a, b) => a.name.localeCompare(b.name));
}

interface CoreTerminal {
	address: string;
	state: string;
	parent?: string | null;
	labels?: Record<string, string>;
}

const SPACE_LABEL = "herdr.space";
/** Remote ids are `<machine>/<id>`; labels and parents may hold just the id. */
const localId = (id: string) => id.slice(id.lastIndexOf("/") + 1);

/** The space a terminal's label or, for a sub-agent, its ancestors' name. Undefined when none does. */
function labeledSpace(terminal: CoreTerminal, terminals: CoreTerminal[]): string | undefined {
	const machine = terminal.address.slice(0, terminal.address.lastIndexOf("/") + 1);
	let at: CoreTerminal | undefined = terminal;
	while (at) {
		const space: string | undefined = at.labels?.[SPACE_LABEL];
		if (space) return space;
		const parent: string | null | undefined = at.parent;
		at = parent ? terminals.find((one) => one.address === machine + localId(parent)) : undefined;
	}
	return undefined;
}

/**
 * The command behind a page's ✕. A space's last pane closes the space, which asks; with no live terminal
 * in it there's nothing to ask about. A live one could have no pane, so that case keeps the prompt.
 */
export function closePageCommand(
	page: Pick<PagePane, "pane" | "tab">,
	spaces: Array<{ id: string; tabs: Array<{ id: string; panes: number }> }>,
	terminals: CoreTerminal[],
): [string, object] {
	const space = spaces.find((one) => one.tabs.some((tab) => tab.id === page.tab));
	const lastPane = space?.tabs.length === 1 && space.tabs[0]!.panes === 1;
	const id = space && localId(space.id);
	const live = terminals.some((t) => {
		if (t.state !== "live") return false;
		const labeled = labeledSpace(t, terminals);
		return labeled ? localId(labeled) === id : Boolean(t.parent);
	});
	return lastPane && !live ? ["space.close", { id: space.id, confirmed: true }] : ["pane.close", { pane: page.pane }];
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
