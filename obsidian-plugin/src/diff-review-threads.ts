// Source-coordinate comments layered onto the existing diff renderer.
import { captureReviewOrigin, type HunkSource, type ReviewOrigin, type ReviewThreadView, type ReviewView } from "../../differential-review-lib/src/core";

export interface AnnotationActions {
	createThread(origin: ReviewOrigin, body: string): Promise<void>;
	reply(threadId: string, body: string): Promise<void>;
	resolve(threadId: string, resolved: boolean): Promise<void>;
	refresh(): void;
}
interface Editor { body: string; saving: boolean; error?: string }
export interface ThreadUi {
	draft: (Editor & { origin: ReviewOrigin }) | null;
	replyDrafts: Map<string, Editor>;
	openThreadsOnly: boolean;
	showResolved: boolean;
	activeThreadId: string | null;
}
export function newThreadUi(): ThreadUi {
	return { draft: null, replyDrafts: new Map(), openThreadsOnly: false, showResolved: false, activeThreadId: null };
}
function el<K extends keyof HTMLElementTagNameMap>(parent: HTMLElement, tag: K, cls: string, text?: string): HTMLElementTagNameMap[K] {
	const node = document.createElement(tag);
	node.className = cls;
	if (text !== undefined) node.textContent = text;
	parent.appendChild(node);
	return node;
}
function button(parent: HTMLElement, text: string, click: () => void) {
	const b = el(parent, "button", "gbdr-thread-button", text);
	b.type = "button";
	b.onclick = click;
	return b;
}
const errorText = (e: unknown) => e instanceof Error ? e.message : String(e);

function editor(parent: HTMLElement, state: Editor, label: string, save: () => Promise<void>, saved: () => void, redraw: () => void) {
	const form = el(parent, "form", "gbdr-comment-form");
	const input = el(form, "textarea", "gbdr-comment-input");
	input.setAttribute("aria-label", label);
	input.placeholder = label;
	input.value = state.body;
	input.disabled = state.saving;
	input.oninput = () => { state.body = input.value; };
	const submit = el(form, "button", "mod-cta", state.saving ? "Saving…" : "Save");
	submit.type = "submit";
	submit.disabled = state.saving;
	if (state.error) el(form, "p", "gbdr-comment-error", state.error);
	form.onsubmit = (event) => {
		event.preventDefault();
		if (state.saving || !state.body.trim()) return;
		state.saving = true;
		state.error = undefined;
		input.disabled = submit.disabled = true;
		void save().then(saved).catch((error) => { state.error = errorText(error); }).finally(() => { state.saving = false; redraw(); });
	};
}

export function renderCommentDraft(parent: HTMLElement, ui: ThreadUi, actions: AnnotationActions, redraw: () => void) {
	const draft = ui.draft;
	if (!draft) return;
	const box = el(parent, "div", "gbdr-comment-draft");
	const o = draft.origin;
	el(box, "strong", "", `Comment on ${o.path} · ${o.side} lines ${o.range.join("–")}`);
	el(box, "div", "gbdr-meta", `Original snapshot: ${o.snapshotId}`);
	el(box, "pre", "gbdr-comment-quote", o.quote);
	editor(box, draft, "Review comment", () => actions.createThread(o, draft.body), () => { if (ui.draft === draft) ui.draft = null; }, () => actions.refresh());
	const cancel = button(box, "Cancel", () => { ui.draft = null; redraw(); });
	cancel.disabled = draft.saving;
}

export function renderThread(parent: HTMLElement, item: ReviewThreadView, view: { snapshots: ReviewView["snapshots"]; snapshot: ReviewView["snapshot"] | null }, ui: ThreadUi, actions: AnnotationActions, redraw: () => void) {
	const { thread: t, replies, placement: p } = item;
	const card = el(parent, "article", `gbdr-thread gbdr-thread-${p.state}`);
	card.dataset.threadId = t.id;
	card.tabIndex = 0;
	el(card, "strong", "", `${t.author} · ${t.status}`);
	el(card, "div", "gbdr-meta", `${t.origin.path} · ${t.origin.side} ${t.origin.range.join("–")} · ${t.createdAt}`);
	el(card, "p", "gbdr-comment-body", t.body);
	if (p.range && p.state === "moved") el(card, "div", "gbdr-meta", `Current location: ${p.path} · ${t.origin.side} ${p.range.join("–")}`);
	if (p.state === "outdated" || p.state === "unmapped") el(card, "p", "gbdr-comment-warning", p.state === "outdated" ? "Code changed or placement is ambiguous. Inspect the original excerpt before responding." : "The original location is absent from this diff. Inspect the original excerpt before responding.");
	const original = el(card, "details", "gbdr-comment-original");
	original.open = p.state === "outdated" || p.state === "unmapped";
	el(original, "summary", "", `Original excerpt · ${t.origin.snapshotId}`);
	el(original, "pre", "gbdr-comment-quote", t.origin.quote);
	for (const r of replies) {
		const reply = el(card, "div", "gbdr-reply");
		el(reply, "strong", "", `${r.author} (${r.source})`);
		el(reply, "p", "gbdr-comment-body", r.body);
		if (r.snapshotId) {
			const snapshot = view.snapshots.find((s) => s.id === r.snapshotId);
			el(reply, "div", "gbdr-meta", snapshot ? `Response revision: ${snapshot.phase} @ ${snapshot.head.slice(0, 8)}${snapshot.id === view.snapshot?.id ? " (current)" : ""}` : `Response revision: ${r.snapshotId} (snapshot unavailable)`);
		}
	}
	const controls = el(card, "div", "gbdr-thread-controls");
	button(controls, "Reply", () => {
		if (!ui.replyDrafts.has(t.id)) ui.replyDrafts.set(t.id, { body: "", saving: false });
		redraw();
	});
	const resolve = button(controls, t.status === "open" ? "Resolve" : "Reopen", () => {
		resolve.disabled = true;
		void actions.resolve(t.id, t.status === "open").then(() => actions.refresh()).catch((e) => {
			el(card, "p", "gbdr-comment-error", errorText(e)); resolve.disabled = false;
		});
	});
	const draft = ui.replyDrafts.get(t.id);
	if (draft) editor(card, draft, "Reply to review comment", () => actions.reply(t.id, draft.body), () => { ui.replyDrafts.delete(t.id); }, () => actions.refresh());
}

/** Adds accessible line-number buttons and inserts threads beside their source rows. */
export function annotateHunk(parent: HTMLElement, source: HunkSource, view: ReviewView, ui: ThreadUi, actions: AnnotationActions, redraw: () => void) {
	const { file, hunk } = source;
	const rows = [...parent.querySelectorAll<HTMLTableRowElement>(":scope > .gbdr-diff tr")];
	for (const row of rows) {
		for (const side of ["old", "new"] as const) {
			const cell = row.querySelector<HTMLElement>(side === "old" ? ".line-num1" : ".line-num2");
			const line = Number(cell?.textContent?.trim());
			if (!cell || !Number.isSafeInteger(line) || line < 1) continue;
			cell.replaceChildren();
			const b = button(cell, String(line), () => {});
			b.className = "gbdr-comment-line";
			b.dataset.side = side; b.dataset.line = String(line);
			b.setAttribute("aria-label", `Comment on ${side} line ${line}; Shift-click to select a range`);
			b.onclick = (event) => {
				if (ui.draft?.saving) return;
				const previous = ui.draft?.origin;
				const extend = event.shiftKey && previous?.snapshotId === view.snapshot.id && previous?.hunkId === hunk.id && previous?.side === side;
				const start = extend ? previous.range[0] : line;
				const origin = captureReviewOrigin(view.snapshot, { path: file.path, hunkId: hunk.id, side, range: [Math.min(start, line), Math.max(start, line)] });
				ui.draft = { origin, body: ui.draft?.body ?? "", saving: false };
				redraw();
				// Preserve the selected line's focus for Shift-click and keyboard range selection.
			};
			const o = ui.draft?.origin;
			if (o?.snapshotId === view.snapshot.id && o.hunkId === hunk.id && o.side === side && line >= o.range[0] && line <= o.range[1]) b.classList.add("is-selected");
		}
	}
	const insertAfter = new Map<HTMLTableRowElement, HTMLTableRowElement>();
	const anchoredPanel = (side: "old" | "new", line: number | undefined): HTMLElement => {
		const row = line && rows.find((r) => Number(r.querySelector(side === "old" ? ".line-num1" : ".line-num2")?.textContent) === line);
		if (!row) return parent;
		const tr = document.createElement("tr"); tr.className = "gbdr-thread-row";
		const td = document.createElement("td"); td.colSpan = 2; tr.appendChild(td);
		(insertAfter.get(row) ?? row).after(tr); insertAfter.set(row, tr);
		return td;
	};
	if (ui.draft?.origin.snapshotId === view.snapshot.id && ui.draft.origin.hunkId === hunk.id) {
		renderCommentDraft(anchoredPanel(ui.draft.origin.side, ui.draft.origin.range[1]), ui, actions, redraw);
	}
	for (const item of view.threads.filter((t) => t.placement.hunkId === hunk.id && t.thread.status === "open")) {
		renderThread(anchoredPanel(item.thread.origin.side, item.placement.range?.[1]), item, view, ui, actions, redraw);
	}
}
