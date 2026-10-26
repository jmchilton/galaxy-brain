// Differential-review DOM: plain DOM + diff2html, no Obsidian APIs (testable with happy-dom, reusable elsewhere).
import { html as diffHtml } from "diff2html";
import {
	type Baseline,
	type CommitView,
	commitHunks,
	type FileView,
	findHunk,
	type HunkSource,
	type HunkView,
	hunkPatch,
	interdiffPatch,
	previousHunk,
	type ReviewStatus,
	type ReviewView,
	snapshotFiles,
	snapshotLabel,
	type SnapshotSummary,
} from "../../differential-review/src/core";

export interface ReviewActions {
	toggleHunk(file: FileView, hunk: HunkView): void;
	toggleFile(file: FileView): void;
	toggleCommit(commit: CommitView): void;
	setBaseline(baseline: Baseline): void;
	setHideReviewed(hide: boolean): void;
}

/** View-local UI state, kept across re-renders. */
export interface ReviewUi {
	hideReviewed: boolean;
	/** `file:<path>` / `commit:<sha>` keys of open sections. */
	expanded: Set<string>;
	/** `<hunk id>:reviewed|baseline` keys of open interdiffs. */
	interdiffs: Set<string>;
	/** diff2html output by patch text. */
	htmlCache: Map<string, string>;
}

export function newReviewUi(hideReviewed = true): ReviewUi {
	return { hideReviewed, expanded: new Set(), interdiffs: new Set(), htmlCache: new Map() };
}

const STATE_LABELS: Record<ReviewStatus, string> = { reviewed: "reviewed", new: "new", changed: "changed" };
/** Below this many visible diff lines, files open expanded. */
export const AUTO_EXPAND_LINES = 400;

function el<K extends keyof HTMLElementTagNameMap>(parent: HTMLElement | null, tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] {
	const node = document.createElement(tag);
	if (cls) node.className = cls;
	if (text !== undefined) node.textContent = text;
	parent?.appendChild(node);
	return node;
}

function badge(parent: HTMLElement, state: ReviewStatus) {
	el(parent, "span", `gbdr-badge gbdr-${state}`, STATE_LABELS[state]);
}

function checkbox(parent: HTMLElement, checked: boolean, label: string, onChange: () => void): HTMLInputElement {
	const box = el(parent, "input", "gbdr-check");
	box.type = "checkbox";
	box.checked = checked;
	box.title = label;
	box.setAttribute("aria-label", label);
	box.onclick = (event) => event.stopPropagation();
	box.onchange = onChange;
	return box;
}

function renderPatch(parent: HTMLElement, patch: string, ui: ReviewUi) {
	let markup = ui.htmlCache.get(patch);
	if (markup === undefined) {
		markup = diffHtml(patch, { drawFileList: false, outputFormat: "line-by-line", matching: "lines", diffStyle: "word" });
		ui.htmlCache.set(patch, markup);
	}
	el(parent, "div", "gbdr-diff").innerHTML = markup;
}

function renderHunkBody(parent: HTMLElement, source: HunkSource, ui: ReviewUi) {
	const patch = hunkPatch(source);
	if (patch) renderPatch(parent, patch, ui);
	else el(parent, "pre", "gbdr-meta-lines", source.hunk.lines.join("\n"));
}

/** Diff lines the visible hunks would render; decides whether files open expanded. */
export function visibleLineCount(view: ReviewView): number {
	const files = snapshotFiles(view.snapshot);
	let n = 0;
	for (const file of view.files) {
		for (const hunk of file.hunks) if (hunk.visible) n += findHunk(files, hunk.id)?.hunk.lines.length ?? 0;
	}
	return n;
}

/** "Since <previous>: …" only when the last snapshot changed something beyond a clean rebase. */
export function summaryText(summary: SnapshotSummary, previousLabel: string | null): string | null {
	const { commits, hunks } = summary;
	if (!summary.previousSnapshotId) return null;
	if (!commits.changed && !commits.new && !commits.dropped && !hunks.changed && !hunks.new && !hunks.dropped) return null;
	const parts = (counts: Record<string, number>) =>
		Object.entries(counts)
			.filter(([, n]) => n > 0)
			.map(([k, n]) => `${n} ${k}`)
			.join(", ");
	return `Since ${previousLabel ?? summary.previousSnapshotId}: commits ${parts(commits) || "none"}; hunks ${parts(hunks) || "none"}.`;
}

function progress(parent: HTMLElement, label: string, counts: Record<ReviewStatus, number>) {
	const total = counts.reviewed + counts.new + counts.changed;
	const item = el(parent, "span", "gbdr-progress-item");
	el(item, "strong", undefined, `${label} `);
	item.append(`${counts.reviewed}/${total}`);
	if (counts.changed) el(item, "span", "gbdr-badge gbdr-changed", `${counts.changed} changed`);
	if (counts.new) el(item, "span", "gbdr-badge gbdr-new", `${counts.new} new`);
}

function renderHeader(root: HTMLElement, view: ReviewView, ui: ReviewUi, actions: ReviewActions) {
	const { snapshot } = view;
	const header = el(root, "div", "gbdr-header");
	el(header, "h2", undefined, `Review ${snapshot.branch}`);
	el(header, "div", "gbdr-meta", `${snapshotLabel(snapshot)} vs ${snapshot.base.ref} (merge-base ${snapshot.base.mergeBase.slice(0, 8)}) · ${view.snapshots.length} snapshot(s)`);

	const bar = el(header, "div", "gbdr-progress");
	progress(bar, "Hunks", view.counts.hunks);
	progress(bar, "Files", view.counts.files);
	progress(bar, "Commits", view.counts.commits);
	const total = view.counts.hunks.reviewed + view.counts.hunks.new + view.counts.hunks.changed;
	const meter = el(header, "div", "gbdr-meter");
	el(meter, "div", "gbdr-meter-fill").style.width = `${total ? (100 * view.counts.hunks.reviewed) / total : 100}%`;

	const controls = el(header, "div", "gbdr-controls");
	const label = el(controls, "label", undefined, "Show ");
	const select = el(label, "select", "dropdown gbdr-baseline");
	const review = el(select, "option", undefined, "everything, badged since my last review");
	review.value = "";
	for (const option of view.baselineOptions) {
		const node = el(select, "option", undefined, `only changes since ${option.label}`);
		node.value = option.id;
	}
	select.value = view.baseline.kind === "snapshot" ? view.baseline.snapshotId : "";
	select.onchange = () => actions.setBaseline(select.value ? { kind: "snapshot", snapshotId: select.value } : { kind: "review" });
	const hide = el(controls, "label", "gbdr-hide");
	checkbox(hide, ui.hideReviewed, "Hide reviewed", () => actions.setHideReviewed(!ui.hideReviewed));
	hide.append(" Hide reviewed");

	const previous = view.snapshots.find((s) => s.id === view.summary.previousSnapshotId);
	const summary = summaryText(view.summary, previous ? snapshotLabel(previous) : null);
	if (summary) el(header, "div", "gbdr-summary", summary);
	if (view.needsRelook) {
		const n = view.commits.filter((c) => c.state === "changed").length;
		el(header, "div", "gbdr-callout", `${n} commit(s) changed since you signed them off: re-look below under Commits.`);
	}
}

function hiddenNote(parent: HTMLElement, n: number, what: string) {
	if (n > 0) el(parent, "p", "gbdr-hidden", `${n} ${what} hidden (reviewed or unchanged since the baseline).`);
}

function interdiffToggle(parent: HTMLElement, body: HTMLElement, view: ReviewView, file: FileView, hunk: HunkView, against: "reviewed" | "baseline", ui: ReviewUi) {
	const before = previousHunk(view, hunk, against);
	const after = findHunk(snapshotFiles(view.snapshot), hunk.id);
	if (!before || !after || hunk.kind === "meta") return;
	const key = `${hunk.id}:${against}`;
	const text = against === "reviewed" ? "since reviewed" : "since baseline";
	const button = el(parent, "button", "gbdr-link", `Δ ${text}`);
	const panel = el(null, "div", "gbdr-interdiff");
	const show = () => {
		panel.replaceChildren();
		el(panel, "div", "gbdr-caption", `How this hunk's changed lines differ from the version ${against === "reviewed" ? "you reviewed" : "in the baseline"}:`);
		renderPatch(panel, interdiffPatch(file.path, before.hunk, after.hunk), ui);
		body.prepend(panel);
	};
	button.onclick = (event) => {
		event.stopPropagation();
		if (ui.interdiffs.delete(key)) panel.remove();
		else {
			ui.interdiffs.add(key);
			show();
		}
	};
	if (ui.interdiffs.has(key)) show();
}

function renderHunk(parent: HTMLElement, view: ReviewView, file: FileView, hunk: HunkView, ui: ReviewUi, actions: ReviewActions) {
	const source = findHunk(snapshotFiles(view.snapshot), hunk.id);
	const box = el(parent, "div", `gbdr-hunk gbdr-state-${hunk.state}`);
	const bar = el(box, "div", "gbdr-hunk-bar gbdr-nav");
	bar.tabIndex = 0;
	bar.dataset.key = `hunk:${hunk.id}`;
	checkbox(bar, hunk.state === "reviewed", "Hunk reviewed (x)", () => actions.toggleHunk(file, hunk));
	badge(bar, hunk.state);
	el(bar, "code", "gbdr-hunk-header", hunk.header);
	if (hunk.kind === "text") el(bar, "span", "gbdr-stat", `+${hunk.added} −${hunk.removed}`);
	if (hunk.whitespaceOnly) el(bar, "span", "gbdr-tag", "whitespace only");
	if (hunk.sinceBaseline && hunk.sinceBaseline !== "carried") el(bar, "span", "gbdr-tag", `${hunk.sinceBaseline} since baseline`);
	const body = el(box, "div", "gbdr-hunk-body");
	if (hunk.state === "changed") interdiffToggle(bar, body, view, file, hunk, "reviewed", ui);
	if (hunk.sinceBaseline === "changed") interdiffToggle(bar, body, view, file, hunk, "baseline", ui);
	if (source) renderHunkBody(body, source, ui);
}

function section(parent: HTMLElement, key: string, ui: ReviewUi, fill: (body: HTMLElement) => void): { details: HTMLDetailsElement; summary: HTMLElement } {
	const details = el(parent, "details", "gbdr-section");
	const summary = el(details, "summary", "gbdr-nav");
	summary.dataset.key = key;
	let filled = false;
	const body = el(details, "div", "gbdr-section-body");
	const fillOnce = () => {
		if (filled) return;
		filled = true;
		fill(body);
	};
	details.open = ui.expanded.has(key);
	if (details.open) fillOnce();
	details.ontoggle = () => {
		if (details.open) {
			ui.expanded.add(key);
			fillOnce();
		} else ui.expanded.delete(key);
	};
	return { details, summary };
}

function renderFile(parent: HTMLElement, view: ReviewView, file: FileView, ui: ReviewUi, actions: ReviewActions) {
	const { summary } = section(parent, `file:${file.path}`, ui, (body) => {
		for (const hunk of file.hunks) if (hunk.visible) renderHunk(body, view, file, hunk, ui, actions);
		hiddenNote(body, file.hunks.filter((h) => !h.visible).length, "hunk(s)");
	});
	summary.classList.add(`gbdr-state-${file.state}`);
	checkbox(summary, file.state === "reviewed", "File reviewed (x)", () => actions.toggleFile(file));
	badge(summary, file.state);
	el(summary, "span", "gbdr-path", file.oldPath && file.oldPath !== file.path ? `${file.oldPath} → ${file.path}` : file.path);
	if (file.status !== "modified") el(summary, "span", "gbdr-tag", file.status);
	if (file.binary) el(summary, "span", "gbdr-tag", "binary");
	const total = file.hunks.length;
	el(summary, "span", "gbdr-stat", `${file.counts.reviewed}/${total} hunk(s) reviewed`);
}

function renderCommit(parent: HTMLElement, view: ReviewView, commit: CommitView, ui: ReviewUi, actions: ReviewActions) {
	const source = view.snapshot.commits.find((c) => c.sha === commit.sha)!;
	const { summary } = section(parent, `commit:${commit.sha}`, ui, (body) => {
		el(body, "pre", "gbdr-message", commit.message.trim());
		el(body, "div", "gbdr-caption", `${commit.author} · ${commit.authorDate}`);
		if (commit.signoff && commit.state !== "reviewed") {
			el(body, "div", "gbdr-caption", `You signed off ${commit.signoff.sha.slice(0, 8)} "${commit.signoff.subject}" at ${commit.signoff.signedOffAt}.`);
		}
		if (commit.contextOnly) {
			el(body, "p", "gbdr-callout", "Its patch-id changed but every hunk carried over (e.g. rebase context). Re-look at the commit as a whole and sign off again.");
			return;
		}
		const ids = commit.state === "changed" ? commit.differingHunks : null;
		if (ids) el(body, "div", "gbdr-caption", "Only the hunks that differ from the signed-off version:");
		for (const file of commitHunks(source, ids)) {
			el(body, "div", "gbdr-commit-file", file.path);
			for (const hunk of file.hunks) renderHunkBody(body, { file, hunk }, ui);
		}
	});
	summary.classList.add(`gbdr-state-${commit.state}`);
	const label = commit.state === "reviewed" ? "Revoke sign-off (x)" : "Sign off commit (x)";
	checkbox(summary, commit.state === "reviewed", label, () => actions.toggleCommit(commit));
	badge(summary, commit.state);
	el(summary, "code", "gbdr-sha", commit.sha.slice(0, 8));
	el(summary, "span", "gbdr-path", commit.subject);
	if (commit.contextOnly) el(summary, "span", "gbdr-tag", "rebased, context only");
	else if (commit.state === "changed") el(summary, "span", "gbdr-tag", `${commit.differingHunks?.length ?? 0} differing hunk(s)`);
	if (commit.sinceBaseline && commit.sinceBaseline !== "unchanged") el(summary, "span", "gbdr-tag", `${commit.sinceBaseline} since baseline`);
}

/** Render the whole review into `root`; sections fill lazily when opened. */
export function renderReview(root: HTMLElement, view: ReviewView, ui: ReviewUi, actions: ReviewActions) {
	root.replaceChildren();
	root.classList.add("gbdr");
	renderHeader(root, view, ui, actions);

	el(root, "h3", undefined, "Files");
	const files = el(root, "div", "gbdr-files");
	for (const file of view.files) if (file.visible) renderFile(files, view, file, ui, actions);
	if (!view.files.some((f) => f.visible)) el(files, "p", "gbdr-empty", "Nothing to review in the branch diff.");
	hiddenNote(files, view.hidden.files, "file(s)");

	el(root, "h3", undefined, "Commits");
	const commits = el(root, "div", "gbdr-commits");
	for (const commit of view.commits) if (commit.visible) renderCommit(commits, view, commit, ui, actions);
	if (!view.commits.some((c) => c.visible)) el(commits, "p", "gbdr-empty", "No commits to sign off.");
	hiddenNote(commits, view.hidden.commits, "commit(s)");

	el(root, "p", "gbdr-keys", "Keys: j/k move · x check off · o open/close · h hide reviewed · e expand all · c collapse all");
}

export interface KeyActions {
	setHideReviewed(hide: boolean): void;
	rerender(): void;
}

/** j/k/x/o/h/e/c over `.gbdr-nav` items; returns true when the key was handled. */
export function handleReviewKey(root: HTMLElement, event: KeyboardEvent, view: ReviewView, ui: ReviewUi, keys: KeyActions): boolean {
	if (event.metaKey || event.ctrlKey || event.altKey) return false;
	const target = event.target as HTMLElement | null;
	if (target && (target.tagName === "SELECT" || target.tagName === "TEXTAREA" || (target.tagName === "INPUT" && (target as HTMLInputElement).type !== "checkbox"))) return false;
	const items = [...root.querySelectorAll<HTMLElement>(".gbdr-nav")];
	const current = (document.activeElement as HTMLElement | null)?.closest<HTMLElement>(".gbdr-nav") ?? null;
	const index = current ? items.indexOf(current) : -1;
	const focus = (node: HTMLElement | undefined) => {
		node?.focus();
		node?.scrollIntoView({ block: "nearest" });
	};
	switch (event.key) {
		case "j":
			focus(items[Math.min(items.length - 1, index + 1)]);
			return true;
		case "k":
			focus(items[Math.max(0, index - 1)]);
			return true;
		case "x":
			current?.querySelector<HTMLInputElement>(":scope > .gbdr-check")?.click();
			return !!current;
		case "o":
			if (current?.tagName === "SUMMARY") (current.parentElement as HTMLDetailsElement).open = !(current.parentElement as HTMLDetailsElement).open;
			return !!current;
		case "h":
			keys.setHideReviewed(!ui.hideReviewed);
			return true;
		case "e":
		case "c":
			ui.expanded.clear();
			if (event.key === "e") {
				for (const f of view.files) if (f.visible) ui.expanded.add(`file:${f.path}`);
				for (const c of view.commits) if (c.visible) ui.expanded.add(`commit:${c.sha}`);
			}
			keys.rerender();
			return true;
	}
	return false;
}

/** The focused nav item's key and position, to restore after a re-render. */
export function focusedItem(root: HTMLElement): { key: string; index: number } | null {
	const node = (document.activeElement as HTMLElement | null)?.closest<HTMLElement>(".gbdr-nav");
	if (!node || !root.contains(node)) return null;
	return { key: node.dataset.key ?? "", index: [...root.querySelectorAll(".gbdr-nav")].indexOf(node) };
}

/** Refocus that item, or whatever took its place (e.g. after a check-off hid it). */
export function restoreFocus(root: HTMLElement, item: { key: string; index: number } | null) {
	if (!item) return;
	const items = [...root.querySelectorAll<HTMLElement>(".gbdr-nav")];
	(items.find((n) => n.dataset.key === item.key) ?? items[Math.min(item.index, items.length - 1)])?.focus({ preventScroll: true });
}
