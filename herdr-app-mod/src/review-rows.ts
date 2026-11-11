// The review tab's diff pane as flat rows, for a virtual list: no handlers per row, so a row's click is its key.
import type { CommitFile } from "../../herdr-plugin/src/findings-types";
import type { ReviewCommit, ReviewFile, ReviewHunk, ReviewModel } from "../../herdr-plugin/src/review-types";
import type { CodeToken } from "../../obsidian-plugin/src/diff-highlight";
import { type DiffRow, hunkRows } from "../../obsidian-plugin/src/diff-review-rows";

export type ReviewItem = { kind: "file"; path: string } | { kind: "commit"; sha: string };

export type CodeRow = { type: "code"; key: string; row: DiffRow; tokens: CodeToken[]; path: string; hunkId: string | null; thread: boolean };

export type Row =
	| { type: "label"; key: string; text: string; tone: "file" | "note" | "warn" | "plain" }
	| { type: "hunk"; key: string; hunkId: string; state: ReviewHunk["state"]; header: string; added: number; removed: number; tags: string[] }
	| { type: "delta"; key: string; toggle: string; text: string; open: boolean }
	| CodeRow;

/** Code rows waiting for syntax colors, one run of lines. */
export interface HighlightJob {
	key: string;
	path: string;
	rows: CodeRow[];
}

export interface RowOptions {
	openThreadsOnly: boolean;
	/** `<hunk id>:reviewed|baseline` keys of open interdiffs. */
	interdiffs: ReadonlySet<string>;
	/** Tokens by job key; null when a run shows plain. */
	tokens: ReadonlyMap<string, CodeToken[][] | null>;
}

export interface BuiltRows {
	rows: Row[];
	jobs: HighlightJob[];
}

const label = (key: string, text: string, tone: "file" | "note" | "warn" | "plain" = "note"): Row => ({ type: "label", key, text, tone });

function codeRows(built: BuiltRows, prefix: string, path: string, lines: DiffRow[], jobKey: string, options: RowOptions, hunkId: string | null, isThreadLine: (row: DiffRow) => boolean = () => false) {
	const known = options.tokens.get(jobKey);
	const rows = lines.map((row, i): CodeRow => ({ type: "code", key: `${prefix}:${i}`, row, tokens: known?.[i] ?? [{ text: row.text }], path, hunkId, thread: isThreadLine(row) }));
	built.rows.push(...rows);
	if (known === undefined && rows.length) built.jobs.push({ key: jobKey, path, rows });
}

/** Rows where an open thread ends, on the thread's side. */
function threadLines(model: Pick<ReviewModel, "threads">, hunkId: string): (row: DiffRow) => boolean {
	const marks = model.threads.filter((t) => t.thread.status === "open" && t.placement.hunkId === hunkId && t.placement.range).map((t) => ({ side: t.thread.origin.side, line: t.placement.range![1] }));
	return (row) => marks.some((m) => (m.side === "old" ? row.oldLine : row.newLine) === m.line);
}

/** A patch's hunks, numbered, for an interdiff. */
export function patchRows(patch: string): DiffRow[] {
	const rows: DiffRow[] = [];
	let hunk: { oldStart: number; newStart: number; lines: string[] } | null = null;
	const flush = () => {
		if (hunk) rows.push(...hunkRows(hunk));
	};
	for (const line of patch.split("\n")) {
		const match = /^@@ -(\d+)(?:,\d+)? \+(\d+)/.exec(line);
		if (match) {
			flush();
			hunk = { oldStart: Number(match[1]), newStart: Number(match[2]), lines: [] };
		} else if (hunk && line) hunk.lines.push(line);
	}
	flush();
	return rows;
}

export interface CommitLines {
	files: Array<Omit<CommitFile, "patch"> & { rows: DiffRow[] }>;
	/** Lines left out past maxRows. */
	hidden: number;
}

/** A commit's files as numbered lines, up to maxRows in all: the findings panel isn't a virtual list. */
export function commitLines(files: readonly CommitFile[], maxRows: number): CommitLines {
	const out: CommitLines = { files: [], hidden: 0 };
	let room = maxRows;
	for (const { patch, ...file } of files) {
		const rows = patchRows(patch);
		if (room > 0) out.files.push({ ...file, rows: rows.slice(0, room) });
		out.hidden += Math.max(0, rows.length - room);
		room = Math.max(0, room - rows.length);
	}
	return out;
}

function interdiff(built: BuiltRows, file: ReviewFile, hunk: ReviewHunk, against: "reviewed" | "baseline", options: RowOptions) {
	const patch = hunk.interdiff[against];
	if (!patch) return;
	const toggle = `${hunk.id}:${against}`;
	const open = options.interdiffs.has(toggle);
	built.rows.push({ type: "delta", key: `delta:${toggle}`, toggle, open, text: `${open ? "▾" : "▸"} Δ since ${against === "reviewed" ? "you reviewed it" : "the baseline"}` });
	if (open) codeRows(built, `delta:${toggle}`, file.path, patchRows(patch), `interdiff:${toggle}`, options, null);
}

export function fileRows(model: Pick<ReviewModel, "threads">, file: ReviewFile, options: RowOptions): BuiltRows {
	const built: BuiltRows = { rows: [], jobs: [] };
	const hasOpenThread = (hunk: ReviewHunk) => model.threads.some((t) => t.thread.status === "open" && t.placement.hunkId === hunk.id);
	for (const hunk of file.hunks) {
		if (!hunk.visible || (options.openThreadsOnly && !hasOpenThread(hunk))) continue;
		const tags = [...(hunk.whitespaceOnly ? ["whitespace only"] : []), ...(hunk.sinceBaseline && hunk.sinceBaseline !== "carried" ? [`${hunk.sinceBaseline} since baseline`] : [])];
		built.rows.push({ type: "hunk", key: `hunk:${hunk.id}`, hunkId: hunk.id, state: hunk.state, header: hunk.header, added: hunk.added, removed: hunk.removed, tags });
		if (hunk.kind === "meta") {
			hunk.lines.forEach((line, i) => built.rows.push(label(`meta:${hunk.id}:${i}`, line)));
			continue;
		}
		interdiff(built, file, hunk, "reviewed", options);
		interdiff(built, file, hunk, "baseline", options);
		codeRows(built, `code:${hunk.id}`, file.path, hunkRows(hunk), hunk.id, options, hunk.id, threadLines(model, hunk.id));
	}
	const hidden = file.hunks.filter((h) => !h.visible).length;
	if (hidden) built.rows.push(label("hidden", `${hidden} hunk(s) hidden (reviewed or unchanged since the baseline).`));
	return built;
}

export function commitRows(commit: ReviewCommit, options: RowOptions): BuiltRows {
	const built: BuiltRows = { rows: commit.message.trim().split("\n").map((line, i) => label(`message:${i}`, line, "plain")), jobs: [] };
	built.rows.push(label("author", `${commit.author} · ${commit.authorDate}`));
	if (commit.signoff && commit.state !== "reviewed") built.rows.push(label("signoff", `You signed off ${commit.signoff.sha.slice(0, 8)} "${commit.signoff.subject}" at ${commit.signoff.signedOffAt}.`));
	if (commit.contextOnly) {
		built.rows.push(label("context-only", "Its patch-id changed but every hunk carried over (e.g. rebase context). Re-look at the commit as a whole and sign off again.", "warn"));
		return built;
	}
	if (commit.state === "changed") built.rows.push(label("differing", "Only the hunks that differ from the signed-off version:"));
	for (const file of commit.files) {
		built.rows.push(label(`commit-file:${file.path}`, file.path, "file"));
		for (const hunk of file.hunks) {
			if (hunk.kind === "meta") {
				hunk.lines.forEach((line, i) => built.rows.push(label(`commit-meta:${hunk.id}:${i}`, line)));
				continue;
			}
			built.rows.push(label(`commit-header:${hunk.id}`, hunk.header));
			codeRows(built, `commit-code:${hunk.id}`, file.path, hunkRows(hunk), `commit:${hunk.id}`, options, null);
		}
	}
	return built;
}

/** Whether a file shows when narrowed to files with open threads placed on a hunk. */
export function fileShown(model: Pick<ReviewModel, "threads">, file: Pick<ReviewFile, "visible" | "path">, openThreadsOnly: boolean): boolean {
	return file.visible && (!openThreadsOnly || model.threads.some((t) => t.thread.status === "open" && t.placement.path === file.path && t.placement.hunkId));
}

/** Every item the list shows, in order. */
export function reviewItems(model: Pick<ReviewModel, "threads" | "files" | "commits">, openThreadsOnly: boolean): ReviewItem[] {
	return [
		...model.files.filter((f) => fileShown(model, f, openThreadsOnly)).map((f): ReviewItem => ({ kind: "file", path: f.path })),
		...(openThreadsOnly ? [] : model.commits.filter((c) => c.visible).map((c): ReviewItem => ({ kind: "commit", sha: c.sha }))),
	];
}

/** The current item while it still shows, else the one that took its place, else the first. */
export function pickItem(items: readonly ReviewItem[], current: ReviewItem | null, previous: readonly ReviewItem[] = []): ReviewItem | null {
	const same = (a: ReviewItem, b: ReviewItem) => (a.kind === "file" ? b.kind === "file" && a.path === b.path : b.kind === "commit" && a.sha === b.sha);
	if (!current) return items[0] ?? null;
	if (items.some((item) => same(item, current))) return current;
	const was = previous.findIndex((item) => same(item, current));
	return items[Math.min(Math.max(was, 0), items.length - 1)] ?? null;
}

/** Widest code row in pixels at the mono size, so the diff scrolls sideways rather than clipping. */
export function rowsWidth(rows: readonly Row[], charWidth = 7.3, gutter = 120): number {
	return linesWidth(rows.flatMap((row) => (row.type === "code" ? [row.row] : [])), charWidth, gutter);
}

export function linesWidth(lines: readonly DiffRow[], charWidth = 7.3, gutter = 120): number {
	let widest = 0;
	for (const line of lines) if (line.text.length > widest) widest = line.text.length;
	return Math.max(300, widest * charWidth + gutter);
}
