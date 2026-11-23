// The Herdr app's branch PR panel, in Node: branch-panel's model and title edits, for a branch record ref.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { BRANCH_PANEL_FILES, type BranchFiles, type BranchPanel, type BranchPanelFile, branchPanel as panelOf, setPrTitle } from "../../obsidian-plugin/src/branch-panel";
import { reviewRecordDir } from "./review-host";

/** The record's vault-relative directory. */
export function branchDir(vaultRoot: string, ref: string): string {
	const dir = ref.split("/")[1] === "branches" ? reviewRecordDir(vaultRoot, ref) : null;
	if (!dir) throw new Error(`no branch record ${ref}`);
	return dir;
}

function readFiles(dir: string): BranchFiles {
	const read = (name: string) => (existsSync(join(dir, name)) ? readFileSync(join(dir, name), "utf8") : null);
	return Object.fromEntries((Object.entries(BRANCH_PANEL_FILES) as Array<[BranchPanelFile, string]>).map(([key, name]) => [key, read(name)])) as BranchFiles;
}

/** Null for a branch without PR files yet. */
export const branchPanel = (vaultRoot: string, ref: string): BranchPanel | null => panelOf(readFiles(join(vaultRoot, branchDir(vaultRoot, ref))));

/** index.md's vault path and its change; only a title the panel offers, or null to clear it. */
export function branchTitleEdit(vaultRoot: string, { ref, title }: { ref: string; title: string | null }): { path: string; change: (text: string) => string } {
	const dir = branchDir(vaultRoot, ref);
	if (title !== null && !panelOf(readFiles(join(vaultRoot, dir)))?.titles.some((one) => one.title === title)) throw new Error(`${title} isn't one of ${ref}'s titles; reload`);
	return { path: join(dir, BRANCH_PANEL_FILES.index), change: (text) => setPrTitle(text, title) };
}
