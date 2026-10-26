// fzf input lines: a hidden key column, then the displayed columns.

const clean = (text: string) => text.replace(/[\t\r\n]+/g, " ");

export function fzfLine(key: string, columns: string[]): string {
	return `${clean(key)}\t${columns.map(clean).join("  ")}`;
}

/** Key of the selected line; null when nothing was chosen. */
export function fzfKey(selection: string): string | null {
	const line = selection.split("\n")[0]!;
	return line ? line.split("\t")[0]! : null;
}
