// A record's differential review for the Herdr app, a tab whose only pane is this mod: same snapshots, check-offs
// and threads as Obsidian's view, as an item list beside the selected item's diff. The herdr-plugin CLI loads and
// changes them, since this runtime stops a call after about 500 ms; here it only draws and colors code.

import { div, View } from "gpui-kit";
import { h_flex, Scrollbar, Textarea, TextareaState, v_flex, v_virtual_list, VirtualListScrollHandle } from "gpui-base";
import { notify, props, settings, theme, watchFolder } from "herdr";
import type { ReviewAct, ReviewCommit, ReviewFile, ReviewModel } from "../../herdr-plugin/src/review-types";
import type { ReviewLineTarget, ReviewStatus, ReviewThreadView } from "../../differential-review-lib/src/core";
import { type CodeToken, highlightDiff, splitHunkHeader, syntaxGroup } from "../../obsidian-plugin/src/diff-highlight";
import { chip } from "./chip";
import { logRenderFailures, reviewHost } from "./host";
import { openRecordTab } from "./record-tab";
import { type CodeRow, commitRows, fileRows, fileShown, type HighlightJob, pickItem, type ReviewItem, reviewItems, type Row, rowsWidth } from "./review-rows";

const VAULT = `${__GB_ROOT__}/vault`;
const ROW = 20;
const POLL_MS = 30_000;
/** About 200 ms of highlighting: this run of lines shows plain rather than risk the runtime's time limit. */
const MAX_HIGHLIGHT_CHARS = 40_000;

type Cx = any;
type El = any;
type Compose = { kind: "new"; target: ReviewLineTarget } | { kind: "reply"; threadId: string };

const delay = (cx: Cx, ms: number) => new Promise<void>((resolve) => cx.timer.after(ms, () => resolve()));
const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));

function stateColor(t: any, state: ReviewStatus): string {
	return state === "reviewed" ? t.ansi2 : state === "changed" ? t.ansi3 : t.ansi4;
}

function tokenColor(t: any, token: CodeToken): string {
	switch (syntaxGroup(token.scope)) {
		case "keyword":
			return t.ansi5;
		case "string":
			return t.ansi2;
		case "comment":
		case "meta":
			return t.dim;
		case "function":
			return t.ansi4;
		case "type":
			return t.ansi3;
		case "number":
		case "attribute":
			return t.ansi6;
		case "tag":
			return t.ansi1;
		default:
			return t.foreground;
	}
}

export default class GbReview extends View {
	declare handle: any;
	declare listHandle: any;
	declare composer: any;
	declare model: ReviewModel | null;
	declare loaded: boolean;
	declare error: string | null;
	declare baseline: string | undefined;
	declare hideReviewed: boolean;
	declare openThreadsOnly: boolean;
	declare showResolved: boolean;
	declare item: ReviewItem | null;
	declare activeThread: string | null;
	declare rows: Row[];
	declare rowByKey: Map<string, Row>;
	declare interdiffs: Set<string>;
	declare tokens: Map<string, CodeToken[][] | null>;
	declare jobs: HighlightJob[];
	declare wakeHighlighter: (() => void) | null;
	declare compose: Compose | null;
	declare saving: boolean;
	declare typing: boolean;
	/** Host requests waiting, run one at a time in order. */
	declare requests: Array<{ act?: ReviewAct; done?: () => void }>;
	declare wakeRequests: (() => void) | null;

	init(_props: unknown, cx: Cx) {
		this.handle = cx.focus_handle();
		this.listHandle = VirtualListScrollHandle.new();
		this.composer = TextareaState.new({ rows: 3, placeholder: "Review comment" });
		this.composer.on("focus", (_e: unknown, cx: Cx) => {
			this.typing = true;
			cx.notify();
		});
		this.composer.on("blur", (_e: unknown, cx: Cx) => {
			this.typing = false;
			cx.notify();
		});
		this.model = null;
		this.loaded = false;
		this.error = null;
		this.baseline = undefined;
		this.hideReviewed = true;
		this.openThreadsOnly = false;
		this.showResolved = false;
		this.item = null;
		this.activeThread = null;
		this.rows = [];
		this.rowByKey = new Map();
		this.interdiffs = new Set();
		this.tokens = new Map();
		this.jobs = [];
		this.wakeHighlighter = null;
		this.compose = null;
		this.saving = false;
		this.typing = false;
		this.requests = [{}];
		this.wakeRequests = null;
		cx.spawn(async (cx: Cx) => this.requestLoop(cx));
		cx.spawn(async (cx: Cx) => this.highlightLoop(cx));
		cx.spawn(async (cx: Cx) => this.watch(cx));
	}

	/** Queues a load, or an act and then a load; handlers' `cx` doesn't outlive them, so one worker runs these. */
	request(act?: ReviewAct, done?: () => void) {
		this.requests.push({ act, done });
		const wake = this.wakeRequests;
		this.wakeRequests = null;
		wake?.();
	}

	/** Failures show as a notification and leave the page as it was. */
	async requestLoop(cx: Cx) {
		for (;;) {
			const next = this.requests.shift();
			if (!next) {
				await new Promise<void>((resolve) => {
					this.wakeRequests = resolve;
				});
				continue;
			}
			try {
				const model: ReviewModel | null = await reviewHost({ ref: props()?.ref, baseline: this.baseline, hideReviewed: this.hideReviewed, ...(next.act ? { act: next.act } : {}) });
				next.done?.();
				this.apply(model);
				this.error = null;
			} catch (error) {
				this.error = errorText(error);
				if (next.act) notify({ title: "Review not updated", body: this.error, level: "error" });
			}
			this.saving = false;
			this.loaded = true;
			cx.notify();
		}
	}

	apply(model: ReviewModel | null) {
		if (model?.snapshotId !== this.model?.snapshotId) this.tokens = new Map();
		const previous = this.model ? reviewItems(this.model, this.openThreadsOnly) : [];
		this.model = model;
		this.selectItem(this.item, previous);
	}

	/** Reloads on changes in the review, as an agent's snapshot or Obsidian's check-offs; polls if it can't be watched. */
	async watch(cx: Cx) {
		while (!this.loaded) await delay(cx, 100);
		for (;;) {
			try {
				if (!this.model) throw new Error("no snapshots to watch yet");
				await watchFolder(`${VAULT}/${this.model.dir}`);
				await delay(cx, 300);
			} catch {
				await delay(cx, POLL_MS);
			}
			this.request();
		}
	}

	/** Colors one run of lines per wake-up, so each stays inside the runtime's time limit. */
	async highlightLoop(cx: Cx) {
		for (;;) {
			const job = this.jobs.shift();
			if (!job) {
				await new Promise<void>((resolve) => {
					this.wakeHighlighter = resolve;
				});
				continue;
			}
			await delay(cx, 0);
			let tokens: CodeToken[][] | null = null;
			try {
				tokens = highlightDiff(job.path, job.rows.map((row) => row.row), MAX_HIGHLIGHT_CHARS);
			} catch {
				// A run that can't be colored stays plain; the loop has the others to do.
			}
			this.tokens.set(job.key, tokens);
			if (tokens) job.rows.forEach((row, i) => (row.tokens = tokens[i] ?? row.tokens));
			cx.notify();
		}
	}

	selectItem(item: ReviewItem | null, previous: readonly ReviewItem[] = []) {
		const { model } = this;
		this.item = model ? pickItem(reviewItems(model, this.openThreadsOnly), item, previous) : null;
		const options = { openThreadsOnly: this.openThreadsOnly, interdiffs: this.interdiffs, tokens: this.tokens };
		const file = this.selectedFile();
		const commit = this.selectedCommit();
		const built = file ? fileRows(model!, file, options) : commit ? commitRows(commit, options) : { rows: [], jobs: [] };
		this.rows = built.rows;
		this.rowByKey = new Map(built.rows.map((row) => [row.key, row]));
		this.jobs = built.jobs;
		const wake = this.wakeHighlighter;
		this.wakeHighlighter = null;
		wake?.();
	}

	selectedFile(): ReviewFile | undefined {
		const { item, model } = this;
		return item?.kind === "file" ? model?.files.find((f) => f.path === item.path) : undefined;
	}

	selectedCommit(): ReviewCommit | undefined {
		const { item, model } = this;
		return item?.kind === "commit" ? model?.commits.find((c) => c.sha === item.sha) : undefined;
	}

	submit() {
		const { compose } = this;
		const body = this.composer.value().trim();
		if (!compose || !body || this.saving) return;
		this.saving = true;
		const clear = () => {
			this.compose = null;
			this.composer.set_value("");
		};
		this.request(compose.kind === "new" ? { kind: "comment", target: compose.target, body } : { kind: "reply", threadId: compose.threadId, body }, clear);
	}

	/** A code row's click starts a comment there; another in the same hunk and side extends it, as Shift-click does in Obsidian. */
	clickCode(code: CodeRow) {
		if (!code.hunkId) return;
		const side = code.row.kind === "del" ? "old" : "new";
		const line = side === "old" ? code.row.oldLine : code.row.newLine;
		if (line === undefined) return;
		const previous = this.compose?.kind === "new" ? this.compose.target : null;
		const start = previous?.hunkId === code.hunkId && previous.side === side ? previous.range[0] : line;
		this.compose = { kind: "new", target: { path: code.path, hunkId: code.hunkId, side, range: [Math.min(start, line), Math.max(start, line)] } };
	}

	clickRow(key: string, cx: Cx) {
		const row = this.rowByKey.get(key);
		if (!row) return;
		if (row.type === "hunk") this.request({ kind: "hunk", id: row.hunkId });
		else if (row.type === "delta") {
			if (!this.interdiffs.delete(row.toggle)) this.interdiffs.add(row.toggle);
			this.selectItem(this.item);
		} else if (row.type === "code") this.clickCode(row);
		cx.notify();
	}

	toggleSelected() {
		const { item } = this;
		if (item) this.request(item.kind === "file" ? { kind: "file", path: item.path } : { kind: "commit", sha: item.sha });
	}

	moveSelection(by: number) {
		const items = this.model ? reviewItems(this.model, this.openThreadsOnly) : [];
		const index = items.findIndex((one) => JSON.stringify(one) === JSON.stringify(this.item));
		const next = items[Math.min(items.length - 1, Math.max(0, index + by))];
		if (next) this.selectItem(next);
	}

	shownThreads(): ReviewThreadView[] {
		return (this.model?.threads ?? []).filter((t) => t.thread.status === "open" || this.showResolved);
	}

	/** Selects a thread's file and brings its line on screen. */
	goToThread(item: ReviewThreadView) {
		this.activeThread = item.thread.id;
		if (item.placement.path) this.selectItem({ kind: "file", path: item.placement.path });
		const end = item.placement.range?.[1];
		const index = this.rows.findIndex((row) => row.type === "code" && row.hunkId === item.placement.hunkId && (item.thread.origin.side === "old" ? row.row.oldLine : row.row.newLine) === end);
		if (index >= 0) this.listHandle.scroll_to_item(index, "center");
	}

	stepThread(by: number) {
		const threads = this.shownThreads();
		if (!threads.length) return;
		const index = threads.findIndex((t) => t.thread.id === this.activeThread);
		this.goToThread(threads[index < 0 ? (by > 0 ? 0 : threads.length - 1) : (index + by + threads.length) % threads.length]!);
	}

	toggleHidden() {
		this.hideReviewed = !this.hideReviewed;
		this.request();
	}

	onKey(event: any, cx: Cx) {
		if (this.typing) return;
		const actions: Record<string, () => void> = {
			j: () => this.moveSelection(1),
			k: () => this.moveSelection(-1),
			x: () => this.toggleSelected(),
			h: () => this.toggleHidden(),
			"]": () => this.stepThread(1),
			"[": () => this.stepThread(-1),
		};
		const action = actions[event.key];
		if (!action) return;
		action();
		cx.notify();
	}

	render(_cx: Cx): El {
		const t = theme();
		const root = v_flex()
			.id("gb-review")
			.size_full()
			.min_h(0)
			.bg(t.background)
			.text_color(t.foreground)
			.text_size(13)
			.track_focus(this.handle)
			.on_key_down((event: any, cx: Cx) => this.onKey(event, cx));
		if (!this.model) {
			const empty = this.loaded ? "No differential-review snapshots for this record yet. Agents write one after each branch phase or PR review round." : "Loading…";
			return root.child(div().p(16).text_color(this.error ? t.blocked : t.dim).child(this.error ?? empty));
		}
		return root
			.child(this.renderHeader(t))
			.when(this.error !== null, (el: El) => el.child(div().px(14).py(4).text_color(t.blocked).child(this.error)))
			.child(h_flex().flex_1().min_h(0).items_stretch().child(this.renderItems(t)).child(this.renderPane(t)));
	}

	renderHeader(t: any): El {
		const model = this.model!;
		const { hunks, files, commits } = model.counts;
		const total = hunks.reviewed + hunks.new + hunks.changed;
		const relook = model.commits.filter((c) => c.state === "changed").length;
		const progress = (name: string, counts: Record<ReviewStatus, number>) =>
			h_flex()
				.gap(4)
				.items_center()
				.child(div().font_semibold().child(name))
				.child(`${counts.reviewed}/${counts.reviewed + counts.new + counts.changed}`)
				.when(counts.changed > 0, (el: El) => el.child(div().text_color(t.ansi3).child(`${counts.changed} changed`)))
				.when(counts.new > 0, (el: El) => el.child(div().text_color(t.ansi4).child(`${counts.new} new`)));
		const setBaseline = (id: string | undefined) => () => {
			this.baseline = id;
			this.request();
		};
		return v_flex()
			.flex_none()
			.px(14)
			.py(10)
			.gap(6)
			.border_b(1)
			.border_color(t.border)
			.child(
				h_flex()
					.gap(8)
					.items_center()
					.child(div().flex_1().truncate().text_size(15).font_semibold().child(model.title))
					.child(chip(t, "gb-rev-record", "📓 Record", "Open this record's page", false, () => openRecordTab(props()?.ref)))
					.child(chip(t, "gb-rev-reload", "↻", "Reload", false, () => this.request())),
			)
			.child(div().truncate().text_size(11.5).text_color(t.dim).child(model.meta))
			.child(h_flex().gap(14).text_size(12).child(progress("Hunks", hunks)).child(progress("Files", files)).child(progress("Commits", commits)))
			.child(h_flex().h(3).rounded(2).bg(t.border).overflow_hidden().child(div().h_full().bg(t.ansi2).flex_grow(total ? hunks.reviewed : 1)).child(div().h_full().flex_grow(total ? total - hunks.reviewed : 0)))
			.child(
				h_flex()
					.flex_wrap()
					.gap(4)
					.items_center()
					.child(chip(t, "gb-rev-base", "Since my review", "Everything, badged since your last review", model.baseline.kind === "review", setBaseline(undefined)))
					.children(model.baselineOptions.map((option, i) => chip(t, `gb-rev-base-${i}`, `Since ${option.label}`, `Only changes since ${option.label}`, model.baseline.kind === "snapshot" && model.baseline.snapshotId === option.id, setBaseline(option.id))))
					.child(chip(t, "gb-rev-hide", "Hide reviewed", "h", this.hideReviewed, () => this.toggleHidden()))
					.child(
						chip(t, "gb-rev-threads", "Open threads only", undefined, this.openThreadsOnly, () => {
							this.openThreadsOnly = !this.openThreadsOnly;
							this.selectItem(this.item);
						}),
					)
					.child(
						chip(t, "gb-rev-resolved", "Resolved threads", undefined, this.showResolved, () => {
							this.showResolved = !this.showResolved;
						}),
					),
			)
			.when(model.summary !== null, (el: El) => el.child(div().text_size(12).text_color(t.muted).child(model.summary)))
			.when(model.needsRelook, (el: El) => el.child(div().text_size(12).text_color(t.ansi3).child(`${relook} commit(s) changed since you signed them off: re-look below under Commits.`)));
	}

	renderItems(t: any): El {
		const model = this.model!;
		const threads = this.shownThreads();
		const files = model.files.filter((f) => fileShown(model, f, this.openThreadsOnly));
		const commits = this.openThreadsOnly ? [] : model.commits.filter((c) => c.visible);
		const heading = (text: string) => div().pt(8).pb(2).px(6).text_size(11).font_semibold().text_color(t.dim).child(text);
		const note = (text: string) => div().px(6).text_size(11.5).text_color(t.dim).child(text);
		return v_flex()
			.id("gb-rev-items")
			.w(330)
			.flex_none()
			.min_h(0)
			.p(6)
			.overflow_y_scrollbar()
			.border_r(1)
			.border_color(t.border)
			.when(threads.length > 0, (el: El) => el.child(heading(`THREADS (${threads.length})`)).children(threads.map((one) => this.renderThreadLink(t, one))))
			.child(heading(`FILES (${files.length})`))
			.children(files.map((file) => this.renderFileItem(t, file)))
			.when(files.length === 0, (el: El) => el.child(note("Nothing to review in the branch diff.")))
			.when(model.hidden.files > 0, (el: El) => el.child(note(`${model.hidden.files} file(s) hidden`)))
			.when(!this.openThreadsOnly, (el: El) =>
				el
					.child(heading(`COMMITS (${commits.length})`))
					.children(commits.map((commit) => this.renderCommitItem(t, commit)))
					.when(commits.length === 0, (el: El) => el.child(note("No commits to sign off.")))
					.when(model.hidden.commits > 0, (el: El) => el.child(note(`${model.hidden.commits} commit(s) hidden`))),
			)
			.child(div().pt(10).px(6).text_size(11).text_color(t.dim).child("j/k move · x check off · h hide reviewed · [/] threads"));
	}

	/** The box and the rest of the row are siblings, so a check-off can't also select. */
	itemRow(t: any, id: string, selected: boolean, state: ReviewStatus, label: string, onCheck: (cx: Cx) => void, onSelect: () => void, body: El): El {
		return h_flex()
			.h(26)
			.flex_none()
			.rounded(6)
			.items_center()
			.when(selected, (el: El) => el.bg(t.selected))
			.child(
				div()
					.id(`${id}-check`)
					.w(24)
					.h_full()
					.flex()
					.flex_none()
					.items_center()
					.justify_center()
					.cursor_pointer()
					.text_color(stateColor(t, state))
					.tooltip(label)
					.on_click((_e: unknown, cx: Cx) => {
						onCheck(cx);
						cx.notify();
					})
					.child(state === "reviewed" ? "☑" : "☐"),
			)
			.child(
				h_flex()
					.id(`${id}-select`)
					.flex_1()
					.min_w(0)
					.h_full()
					.rounded(6)
					.pr(6)
					.items_center()
					.cursor_pointer()
					.hover((s: El) => s.bg(t.hover))
					.on_click((_e: unknown, cx: Cx) => {
						onSelect();
						this.handle.focus();
						cx.notify();
					})
					.child(body),
			);
	}

	renderFileItem(t: any, file: ReviewFile): El {
		const parts = file.path.split("/");
		const name = parts.pop()!;
		const added = file.hunks.reduce((n, h) => n + h.added, 0);
		const removed = file.hunks.reduce((n, h) => n + h.removed, 0);
		const selected = this.item?.kind === "file" && this.item.path === file.path;
		return this.itemRow(
			t,
			`gb-rev-f-${file.path}`,
			selected,
			file.state,
			`File ${file.state} (x)`,
			() => this.request({ kind: "file", path: file.path }),
			() => this.selectItem({ kind: "file", path: file.path }),
			h_flex()
				.flex_1()
				.min_w(0)
				.gap(6)
				.items_center()
				.text_size(12)
				.child(
					h_flex()
						.flex_1()
						.min_w(0)
						.child(div().min_w(0).truncate().text_color(t.dim).child(parts.length ? `${parts.join("/")}/` : ""))
						.child(div().flex_none().max_w(200).truncate().child(name)),
				)
				.when(added > 0, (el: El) => el.child(div().flex_none().text_size(11).text_color(t.ansi2).child(`+${added}`)))
				.when(removed > 0, (el: El) => el.child(div().flex_none().text_size(11).text_color(t.ansi1).child(`−${removed}`))),
		);
	}

	renderCommitItem(t: any, commit: ReviewCommit): El {
		const selected = this.item?.kind === "commit" && this.item.sha === commit.sha;
		return this.itemRow(
			t,
			`gb-rev-c-${commit.sha}`,
			selected,
			commit.state,
			commit.state === "reviewed" ? "Revoke sign-off (x)" : "Sign off commit (x)",
			() => this.request({ kind: "commit", sha: commit.sha }),
			() => this.selectItem({ kind: "commit", sha: commit.sha }),
			h_flex()
				.flex_1()
				.min_w(0)
				.gap(6)
				.items_center()
				.text_size(12)
				.child(div().flex_none().text_size(11).text_color(t.dim).child(commit.sha.slice(0, 8)))
				.child(div().flex_1().min_w(0).truncate().child(commit.subject)),
		);
	}

	renderThreadLink(t: any, item: ReviewThreadView): El {
		const { thread } = item;
		return div()
			.id(`gb-rev-t-${thread.id}`)
			.h(24)
			.flex_none()
			.px(6)
			.truncate()
			.rounded(6)
			.cursor_pointer()
			.text_size(12)
			.text_color(thread.status === "open" ? t.foreground : t.dim)
			.when(this.activeThread === thread.id, (el: El) => el.bg(t.selected))
			.hover((s: El) => s.bg(t.hover))
			.on_click((_e: unknown, cx: Cx) => {
				this.goToThread(item);
				cx.notify();
			})
			.child(`💬 ${thread.origin.path.split("/").pop()}: ${thread.body.split("\n")[0]}`);
	}

	renderPane(t: any): El {
		const file = this.selectedFile();
		const commit = this.selectedCommit();
		const threads = this.paneThreads();
		const title = file ? file.path : commit ? `${commit.sha.slice(0, 8)} ${commit.subject}` : "Nothing selected";
		const detail = file
			? `${file.counts.reviewed}/${file.hunks.length} hunk(s) reviewed${file.status === "modified" ? "" : ` · ${file.status}`}${file.binary ? " · binary" : ""}`
			: commit?.state === "changed"
				? `${commit.differingHunks?.length ?? 0} differing hunk(s)`
				: "";
		return v_flex()
			.flex_1()
			.min_w(0)
			.min_h(0)
			.child(
				h_flex()
					.h(30)
					.flex_none()
					.px(12)
					.gap(8)
					.items_center()
					.border_b(1)
					.border_color(t.border)
					.child(div().flex_1().min_w(0).truncate().text_size(12).font_semibold().child(title))
					.child(div().flex_none().text_size(11).text_color(t.dim).child(detail)),
			)
			.when(threads.length > 0 || this.compose?.kind === "new", (el: El) =>
				el.child(
					v_flex()
						.id("gb-rev-thread-panel")
						.flex_none()
						.max_h(260)
						.overflow_y_scrollbar()
						.p(8)
						.gap(6)
						.border_b(1)
						.border_color(t.border)
						.when(this.compose?.kind === "new", (el: El) => el.child(this.renderDraft(t)))
						.children(threads.map((one) => this.renderThread(t, one))),
				),
			)
			.child(this.renderDiff(t));
	}

	/** The selected file's threads, and the thread picked in the list even if it lost its place. */
	paneThreads(): ReviewThreadView[] {
		const path = this.selectedFile()?.path;
		return this.shownThreads().filter((one) => one.thread.id === this.activeThread || (path !== undefined && one.placement.path === path));
	}

	renderDraft(t: any): El {
		const target = this.compose?.kind === "new" ? this.compose.target : null;
		if (!target) return div();
		return v_flex()
			.gap(4)
			.p(8)
			.rounded(6)
			.border_1()
			.border_color(t.accent)
			.child(div().text_size(12).font_semibold().child(`Comment on ${target.path} · ${target.side} lines ${target.range.join("–")}`))
			.child(div().text_size(11).text_color(t.dim).child("Click another line in this hunk to extend the range."))
			.child(this.renderComposer(t));
	}

	renderComposer(t: any): El {
		return v_flex()
			.gap(4)
			.child(Textarea.new(this.composer).text_size(12))
			.child(
				h_flex()
					.gap(4)
					.child(chip(t, "gb-rev-save", this.saving ? "Saving…" : "Save", undefined, true, () => this.submit()))
					.child(
						chip(t, "gb-rev-cancel", "Cancel", undefined, false, () => {
							this.compose = null;
							this.composer.set_value("");
							this.handle.focus();
						}),
					),
			);
	}

	renderThread(t: any, item: ReviewThreadView): El {
		const { thread, replies, placement } = item;
		const { origin } = thread;
		const replying = this.compose?.kind === "reply" && this.compose.threadId === thread.id;
		const warning = placement.state === "outdated" ? "Code changed or placement is ambiguous. Inspect the original excerpt before responding." : placement.state === "unmapped" ? "The original location is absent from this diff. Inspect the original excerpt before responding." : null;
		const revision = (id: string | undefined) => (id ? ` · ${this.model?.labels[id] ?? `${id} (snapshot unavailable)`}` : "");
		return v_flex()
			.gap(3)
			.p(8)
			.rounded(6)
			.border_1()
			.border_color(this.activeThread === thread.id ? t.accent : t.border)
			.text_size(12)
			.child(
				h_flex()
					.gap(6)
					.items_center()
					.child(div().flex_1().min_w(0).truncate().font_semibold().child(`${thread.author} · ${thread.status} · ${origin.side} ${origin.range.join("–")}`))
					.child(
						chip(t, `gb-rev-reply-${thread.id}`, "Reply", undefined, replying, () => {
							this.compose = { kind: "reply", threadId: thread.id };
						}),
					)
					.child(chip(t, `gb-rev-resolve-${thread.id}`, thread.status === "open" ? "Resolve" : "Reopen", undefined, false, () => this.request({ kind: "resolve", threadId: thread.id, resolved: thread.status === "open" }))),
			)
			.child(div().child(thread.body))
			.when(placement.state === "moved" && Boolean(placement.range), (el: El) => el.child(div().text_size(11).text_color(t.dim).child(`Current location: ${placement.path} · ${origin.side} ${placement.range?.join("–")}`)))
			.when(warning !== null, (el: El) =>
				el
					.child(div().text_color(t.ansi3).child(warning))
					.child(div().p(4).rounded(4).bg(t.raised).text_size(11).font_family(settings().font_family ?? "JetBrains Mono").child(origin.quote)),
			)
			.children(replies.map((reply) => div().pl(8).border_l(2).border_color(t.border).child(`${reply.author} (${reply.source})${revision(reply.snapshotId)}: ${reply.body}`)))
			.when(replying, (el: El) => el.child(this.renderComposer(t)));
	}

	renderDiff(t: any): El {
		const { rows } = this;
		if (!rows.length) return div().flex_1().p(16).text_color(t.dim).child(this.item ? "No text diff to show." : "Nothing to review.");
		return div()
			.flex_1()
			.min_h(0)
			.relative()
			.font_family(settings().font_family ?? "JetBrains Mono")
			.text_size(12)
			.child(
				div()
					.id("gb-rev-diff-x")
					.size_full()
					.overflow_x_scrollbar()
					.child(
						div()
							.w_full()
							.min_w(rowsWidth(rows))
							.h_full()
							.child(
								v_virtual_list(
									"gb-rev-diff",
									rows.length,
									ROW,
									(i: number) => rows[i]!.key,
									(range: { start: number; end: number }) => rows.slice(range.start, range.end).map((row) => this.drawRow(t, row)),
								)
									.track_scroll(this.listHandle)
									.on_item_click((key: string, cx: Cx) => this.clickRow(key, cx))
									.size_full(),
							),
					),
			)
			.child(Scrollbar.vertical("gb-rev-diff").viewport_from_layout().absolute().inset_0());
	}

	drawRow(t: any, row: Row): El {
		switch (row.type) {
			case "label": {
				const color = row.tone === "warn" ? t.ansi3 : row.tone === "note" ? t.dim : t.foreground;
				return div()
					.w_full()
					.h(ROW)
					.flex_none()
					.px(12)
					.truncate()
					.text_color(color)
					.when(row.tone === "file", (el: El) => el.font_semibold().bg(t.raised))
					.child(row.text);
			}
			case "hunk":
				return this.drawHunkBar(t, row);
			case "delta":
				return div().w_full().h(ROW).flex_none().px(12).cursor_pointer().text_color(t.ansi3).child(row.text);
			case "code":
				return this.drawCode(t, row);
		}
	}

	drawHunkBar(t: any, row: Extract<Row, { type: "hunk" }>): El {
		const { range, context } = splitHunkHeader(row.header);
		return h_flex()
			.w_full()
			.h(ROW)
			.flex_none()
			.gap(8)
			.px(8)
			.items_center()
			.cursor_pointer()
			.bg(t.raised)
			.child(div().flex_none().text_color(stateColor(t, row.state)).child(row.state === "reviewed" ? "☑" : "☐"))
			.child(div().flex_none().text_size(11).text_color(stateColor(t, row.state)).child(row.state))
			.child(div().flex_none().text_color(t.dim).child(range))
			.child(div().flex_none().child(context))
			.children(row.tags.map((tag) => div().flex_none().text_size(11).text_color(t.dim).child(tag)))
			.child(div().flex_1())
			.when(row.added > 0, (el: El) => el.child(div().flex_none().text_color(t.ansi2).child(`+${row.added}`)))
			.when(row.removed > 0, (el: El) => el.child(div().flex_none().text_color(t.ansi1).child(`−${row.removed}`)));
	}

	drawCode(t: any, code: CodeRow): El {
		const { row, tokens } = code;
		const target = this.compose?.kind === "new" ? this.compose.target : null;
		const line = target?.side === "old" ? row.oldLine : row.newLine;
		const picked = target !== null && code.hunkId === target.hunkId && line !== undefined && line >= target.range[0] && line <= target.range[1];
		const number = (value: number | undefined) => div().w(38).flex_none().text_right().text_color(t.dim).child(value === undefined ? "" : String(value));
		return h_flex()
			.w_full()
			.h(ROW)
			.flex_none()
			.items_center()
			.when(row.kind === "add", (el: El) => el.bg(`${t.ansi2}18`))
			.when(row.kind === "del", (el: El) => el.bg(`${t.ansi1}18`))
			.when(picked, (el: El) => el.bg(t.selection))
			.child(number(row.oldLine))
			.child(number(row.newLine))
			.child(div().w(22).flex_none().text_center().text_color(t.dim).child(code.thread ? "💬" : row.kind === "add" ? "+" : row.kind === "del" ? "−" : ""))
			.child(
				h_flex()
					.flex_none()
					.children(tokens.map((token) => div().flex_none().whitespace_nowrap().text_color(tokenColor(t, token)).child(token.text))),
			);
	}
}

logRenderFailures("gb-review", GbReview);
