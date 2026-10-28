// Shelved work in agent dirs' blockers/ (vault/agents/_shared/BLOCKERS.md).

import { recordFrontmatter } from "./record-frontmatter";

export interface BlockerRef {
	agentDir: string;
	name: string;
}

export interface Blocker extends BlockerRef {
	/** condition.md, trimmed; empty when missing. */
	condition: string;
}

export const blockersPath = (agentDir: string) => `agents/${agentDir}/blockers`;

/** The blocker for `agents/<dir>/blockers/<name>` or any file inside it; null for anything else. */
export function blockerFromPath(path: string): BlockerRef | null {
	const m = path.match(/^agents\/([^/]+)\/blockers\/([^/]+)(?:\/|$)/);
	return m ? { agentDir: m[1]!, name: m[2]! } : null;
}

/** The blocker a record's index.md names in frontmatter as `blocker: <agent_dir>/<short_name>`; null without one. */
export function recordBlocker(body: string): BlockerRef | null {
	const m = /^([^\s/]+)\/([^\s/]+)$/.exec(recordFrontmatter(body).blocker ?? "");
	return m ? { agentDir: m[1]!, name: m[2]! } : null;
}
