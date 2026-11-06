// Numbered diff lines, free of the core so a mod can bundle it alone.
import type { DiffLine, DiffLineKind } from "./diff-highlight";

export interface DiffRow extends DiffLine {
	/** Base-side line number; absent on added lines. */
	oldLine?: number;
	/** Head-side line number; absent on removed lines. */
	newLine?: number;
}

const ROW_KINDS: Record<string, DiffLineKind> = { " ": "context", "+": "add", "-": "del" };

/** Numbers a hunk's marked lines; drops `\ No newline` notes. */
export function hunkRows(hunk: { oldStart: number; newStart: number; lines: readonly string[] }): DiffRow[] {
	let oldLine = hunk.oldStart;
	let newLine = hunk.newStart;
	const rows: DiffRow[] = [];
	for (const line of hunk.lines) {
		const kind = ROW_KINDS[line[0] ?? " "];
		if (!kind) continue;
		const text = line.slice(1);
		if (kind === "del") rows.push({ kind, text, oldLine: oldLine++ });
		else if (kind === "add") rows.push({ kind, text, newLine: newLine++ });
		else rows.push({ kind, text, oldLine: oldLine++, newLine: newLine++ });
	}
	return rows;
}
