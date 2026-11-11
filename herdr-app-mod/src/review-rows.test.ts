import { describe, expect, it } from "vitest";
import type { ReviewCommit, ReviewFile, ReviewHunk } from "../../herdr-plugin/src/review-types";
import { commitLines, commitRows, fileRows, fileShown, patchRows, pickItem, type ReviewItem, reviewItems, type Row, type RowOptions, rowsWidth } from "./review-rows";

const options = (interdiffs: string[] = [], tokens = new Map()): RowOptions => ({ openThreadsOnly: false, interdiffs: new Set(interdiffs), tokens });
const code = (rows: Row[]) => rows.filter((row): row is Extract<Row, { type: "code" }> => row.type === "code");

function hunk(over: Partial<ReviewHunk> = {}): ReviewHunk {
	return { id: "h1", kind: "text", header: "@@ -1,2 +1,2 @@ def f():", oldStart: 1, newStart: 1, lines: [" a = 1", "-b = 2", "+b = 3"], added: 1, removed: 1, whitespaceOnly: false, sinceBaseline: null, baselineHunkId: null, visible: true, state: "new", interdiff: {}, ...over } as ReviewHunk;
}

function file(hunks: ReviewHunk[]): ReviewFile {
	return { path: "a.py", oldPath: null, status: "modified", binary: false, state: "new", counts: { reviewed: 0, new: 1, changed: 0 }, hunks, visible: true };
}

const thread = (over: object) => ({ thread: { id: "t", status: "open", origin: { side: "new" } }, replies: [], placement: { state: "exact", path: "a.py", hunkId: "h1", range: [2, 2] }, ...over }) as any;

describe("fileRows", () => {
	it("gives each hunk's bar and numbered code, with unique keys and plain text until highlighted", () => {
		const { rows, jobs } = fileRows({ threads: [] }, file([hunk(), hunk({ id: "h2" })]), options());
		expect(rows.map((row) => row.type)).toEqual(["hunk", "code", "code", "code", "hunk", "code", "code", "code"]);
		expect(new Set(rows.map((row) => row.key)).size).toBe(rows.length);
		const lines = code(rows);
		expect(lines[1]).toMatchObject({ row: { kind: "del", text: "b = 2", oldLine: 2 }, tokens: [{ text: "b = 2" }], hunkId: "h1", path: "a.py" });
		expect(jobs.map((job) => job.key)).toEqual(["h1", "h2"]);
	});

	it("uses known tokens and queues no job for them, even when a run stays plain", () => {
		const tokens = new Map([["h1", [[{ text: "a = 1", scope: "x" }], [{ text: "b = 2" }], [{ text: "b = 3" }]]], ["h2", null]]);
		const { rows, jobs } = fileRows({ threads: [] }, file([hunk(), hunk({ id: "h2" })]), options([], tokens));
		expect(jobs).toEqual([]);
		expect(code(rows)[0]!.tokens).toEqual([{ text: "a = 1", scope: "x" }]);
		expect(code(rows)[3]!.tokens).toEqual([{ text: "a = 1" }]);
	});

	it("shows an interdiff only when opened, and never as a comment target", () => {
		const patch = "--- a\n+++ b\n@@ -5 +5 @@\n-old\n+new\n";
		const changed = hunk({ state: "changed", interdiff: { reviewed: patch } });
		const closed = fileRows({ threads: [] }, file([changed]), options());
		expect(closed.rows.map((row) => row.type)).toEqual(["hunk", "delta", "code", "code", "code"]);
		const delta = closed.rows[1] as Extract<Row, { type: "delta" }>;
		expect(delta.open).toBe(false);
		const open = fileRows({ threads: [] }, file([changed]), options([delta.toggle]));
		const shown = code(open.rows).filter((row) => row.key.startsWith("delta:"));
		expect(shown.map((row) => [row.row.text, row.hunkId])).toEqual([["old", null], ["new", null]]);
		expect(open.jobs.map((job) => job.key)).toEqual([`interdiff:${delta.toggle}`, "h1"]);
	});

	it("marks where an open thread ends, on its side", () => {
		const { rows } = fileRows({ threads: [thread({})] }, file([hunk()]), options());
		expect(code(rows).map((row) => row.thread)).toEqual([false, false, true]);
		const resolved = thread({ thread: { id: "t", status: "resolved", origin: { side: "new" } } });
		expect(code(fileRows({ threads: [resolved] }, file([hunk()]), options()).rows).some((row) => row.thread)).toBe(false);
	});

	it("narrows to hunks with open threads, and notes hidden hunks", () => {
		const narrowed = { ...options(), openThreadsOnly: true };
		expect(fileRows({ threads: [] }, file([hunk()]), narrowed).rows).toEqual([]);
		expect(fileRows({ threads: [thread({})] }, file([hunk()]), narrowed).rows[0]).toMatchObject({ type: "hunk", hunkId: "h1" });
		const { rows } = fileRows({ threads: [] }, file([hunk({ visible: false })]), options());
		expect(rows).toEqual([{ type: "label", key: "hidden", tone: "note", text: "1 hunk(s) hidden (reviewed or unchanged since the baseline)." }]);
	});

	it("lists a meta hunk's lines instead of code", () => {
		const { rows, jobs } = fileRows({ threads: [] }, file([hunk({ kind: "meta", lines: ["mode 100644 → 100755"] })]), options());
		expect(rows.map((row) => row.type)).toEqual(["hunk", "label"]);
		expect(jobs).toEqual([]);
	});
});

describe("commitRows", () => {
	const commit = (over: object = {}) => ({ sha: "abc", subject: "Do it", message: "Do it\n\nBody", author: "A", authorDate: "d", state: "new", signoff: null, contextOnly: false, visible: true, files: [{ path: "a.py", hunks: [hunk()] }], ...over }) as unknown as ReviewCommit;

	it("gives the message, author, file and code, without comment targets", () => {
		const { rows } = commitRows(commit(), options());
		expect(rows.slice(0, 5).map((row) => (row as { text: string }).text)).toEqual(["Do it", "", "Body", "A · d", "a.py"]);
		expect(code(rows).length).toBe(3);
		expect(code(rows).every((row) => row.hunkId === null)).toBe(true);
	});

	it("explains a context-only change and a changed commit", () => {
		const context = commitRows(commit({ state: "changed", contextOnly: true, files: [] }), options()).rows;
		expect(context[context.length - 1]).toMatchObject({ tone: "warn" });
		expect(commitRows(commit({ state: "changed" }), options()).rows.some((row) => (row as { text?: string }).text === "Only the hunks that differ from the signed-off version:")).toBe(true);
	});
});

describe("commitLines", () => {
	const files = [
		{ path: "a.py", patch: "diff --git a/a.py b/a.py\n--- a/a.py\n+++ b/a.py\n@@ -1 +1 @@\n-x\n+y\n", added: 1, removed: 1 },
		{ path: "b.py", patch: "--- a/b.py\n+++ b/b.py\n@@ -3 +3,2 @@\n z\n+w\n", added: 1, removed: 0 },
	];

	it("numbers each file's lines", () => {
		expect(commitLines(files, 10)).toEqual({
			files: [
				{ path: "a.py", added: 1, removed: 1, rows: [{ kind: "del", text: "x", oldLine: 1 }, { kind: "add", text: "y", newLine: 1 }] },
				{ path: "b.py", added: 1, removed: 0, rows: [{ kind: "context", text: "z", oldLine: 3, newLine: 3 }, { kind: "add", text: "w", newLine: 4 }] },
			],
			hidden: 0,
		});
	});

	it("stops at maxRows and counts the lines left out", () => {
		const { files: shown, hidden } = commitLines(files, 3);
		expect(shown.map((f) => [f.path, f.rows.length])).toEqual([["a.py", 2], ["b.py", 1]]);
		expect(hidden).toBe(1);
		expect(commitLines(files, 2).files.map((f) => f.path)).toEqual(["a.py"]);
	});
});

describe("patchRows", () => {
	it("numbers every hunk of a patch and skips its header", () => {
		expect(patchRows("--- a\n+++ b\n@@ -5 +7 @@\n-x\n+y\n@@ -20 +22 @@\n z\n")).toEqual([
			{ kind: "del", text: "x", oldLine: 5 },
			{ kind: "add", text: "y", newLine: 7 },
			{ kind: "context", text: "z", oldLine: 20, newLine: 22 },
		]);
	});
});

describe("items", () => {
	const a: ReviewItem = { kind: "file", path: "a" };
	const b: ReviewItem = { kind: "file", path: "b" };
	const c: ReviewItem = { kind: "commit", sha: "c" };

	it("lists shown files then visible commits, and only threaded files when narrowed", () => {
		const model = {
			threads: [thread({ placement: { state: "exact", path: "b", hunkId: "h", range: [1, 1] } })],
			files: [{ path: "a", visible: true }, { path: "b", visible: true }, { path: "hidden", visible: false }],
			commits: [{ sha: "c", visible: true }, { sha: "d", visible: false }],
		} as any;
		expect(reviewItems(model, false)).toEqual([a, b, c]);
		expect(reviewItems(model, true)).toEqual([b]);
		expect(fileShown(model, { path: "a", visible: true }, true)).toBe(false);
	});

	it("keeps the current item, else takes what replaced it, else the first", () => {
		expect(pickItem([a, b, c], b)).toEqual(b);
		expect(pickItem([a, c], b, [a, b, c])).toEqual(c);
		expect(pickItem([a], c, [a, b, c])).toEqual(a);
		expect(pickItem([a, b], null)).toEqual(a);
		expect(pickItem([], a)).toBeNull();
	});
});

describe("rowsWidth", () => {
	it("fits the widest code row, with a floor", () => {
		expect(rowsWidth([])).toBe(300);
		expect(rowsWidth([{ type: "code", key: "k", row: { kind: "add", text: "x".repeat(100), newLine: 1 }, tokens: [], path: "a", hunkId: null, thread: false }], 7, 120)).toBe(820);
	});
});
