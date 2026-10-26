// Obsidian view for a branch or review record's differential review: reads snapshots, reads/writes review-state.json.
import { type App, debounce, ItemView, Notice, type Plugin, type ViewStateResult, type WorkspaceLeaf } from "obsidian";
import {
	type Baseline,
	buildReviewView,
	isReviewableRecordKind,
	markFileReviewed,
	markHunksReviewed,
	recordReviewStateStore,
	recordSnapshotReader,
	revokeCommitSignoff,
	reviewDir,
	reviewStatePath,
	type ReviewState,
	type ReviewStateStore,
	type ReviewView,
	signOffCommit,
	type Snapshot,
	type SnapshotReader,
	snapshotsDir,
	unmarkHunks,
	updateReviewState,
} from "../../differential-review/src/core";
import { AUTO_EXPAND_LINES, focusedItem, handleReviewKey, newReviewUi, renderReview, restoreFocus, type ReviewUi, visibleLineCount } from "./diff-review-render";
import { vaultFileAdapter } from "./diff-review-storage";
import { recordFromPath } from "./launchers";

export const DIFF_REVIEW_VIEW = "galaxy-brain-differential-review";

interface DiffReviewState extends Record<string, unknown> {
	recordDir?: string;
	/** Baseline snapshot id; absent for "since my last review". */
	baseline?: string;
	hideReviewed?: boolean;
}

/** A record dir with at least the snapshots folder; no file reads. */
export function hasDifferentialReview(app: App, recordDir: string): boolean {
	return app.vault.getFolderByPath(snapshotsDir(recordDir)) !== null;
}

export async function openDifferentialReview(app: App, recordDir: string, newTab = true) {
	// getViewState works on deferred (not yet loaded) tabs too.
	const existing = app.workspace.getLeavesOfType(DIFF_REVIEW_VIEW).find((leaf) => leaf.getViewState().state?.recordDir === recordDir);
	const leaf = existing ?? app.workspace.getLeaf(newTab ? "tab" : false);
	await leaf.setViewState({ type: DIFF_REVIEW_VIEW, state: { recordDir }, active: true });
	void app.workspace.revealLeaf(leaf);
}

/** View + "Open differential review" command; works on mobile too (vault adapter only). */
export function registerDifferentialReview(plugin: Plugin) {
	plugin.registerView(DIFF_REVIEW_VIEW, (leaf) => new DiffReviewView(leaf));
	plugin.addCommand({
		id: "open-differential-review",
		name: "Open differential review for this record",
		checkCallback: (checking) => {
			const file = plugin.app.workspace.getActiveFile();
			const record = file && recordFromPath(file.path);
			if (!record || !isReviewableRecordKind(record.kind)) return false;
			if (!checking) void openDifferentialReview(plugin.app, record.dir);
			return true;
		},
	});
}

export class DiffReviewView extends ItemView {
	private recordDir: string | undefined;
	private baseline: Baseline = { kind: "review" };
	private ui: ReviewUi = newReviewUi();
	/** Parsed snapshots by id; snapshots are immutable, so each is read once. */
	private snapshots = new Map<string, Snapshot>();
	private reviewState: ReviewState | null = null;
	private view: ReviewView | null = null;
	private reader: SnapshotReader | undefined;
	private store: ReviewStateStore | undefined;
	/** Serializes review-state writes from this view. */
	private writes: Promise<unknown> = Promise.resolve();
	/** What this view last wrote, to ignore its own modify events. */
	private lastWritten: string | undefined;
	private expandedOnce = false;
	private scheduleLoad = debounce(() => void this.reload(), 300, true);

	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
		this.contentEl.tabIndex = 0;
	}

	getViewType() {
		return DIFF_REVIEW_VIEW;
	}

	getDisplayText() {
		return `Review: ${this.recordDir?.split("/").pop() ?? "branch"}`;
	}

	getIcon() {
		return "git-compare";
	}

	getState(): DiffReviewState {
		return {
			...(this.recordDir ? { recordDir: this.recordDir } : {}),
			...(this.baseline.kind === "snapshot" ? { baseline: this.baseline.snapshotId } : {}),
			hideReviewed: this.ui.hideReviewed,
		};
	}

	async setState(state: DiffReviewState, result: ViewStateResult) {
		if (state.recordDir && state.recordDir !== this.recordDir) {
			this.recordDir = state.recordDir;
			const adapter = vaultFileAdapter(this.app.vault.adapter, (path, data) => {
				if (path === reviewStatePath(state.recordDir!)) this.lastWritten = data;
			});
			this.reader = recordSnapshotReader(adapter, state.recordDir);
			this.store = recordReviewStateStore(adapter, state.recordDir);
			this.snapshots.clear();
			this.ui = newReviewUi(this.ui.hideReviewed);
			this.expandedOnce = false;
		}
		this.baseline = state.baseline ? { kind: "snapshot", snapshotId: state.baseline } : { kind: "review" };
		if (typeof state.hideReviewed === "boolean") this.ui.hideReviewed = state.hideReviewed;
		await super.setState(state, result);
		await this.reload();
	}

	async onOpen() {
		const onChange = async (path: string) => {
			if (!this.recordDir || !path.startsWith(`${reviewDir(this.recordDir)}/`)) return;
			if (path === reviewStatePath(this.recordDir) && this.lastWritten !== undefined) {
				const text = await this.app.vault.adapter.read(path).catch(() => undefined);
				if (text === this.lastWritten) return;
			}
			this.scheduleLoad();
		};
		this.registerEvent(this.app.vault.on("create", (file) => void onChange(file.path)));
		this.registerEvent(this.app.vault.on("modify", (file) => void onChange(file.path)));
		this.registerEvent(this.app.vault.on("delete", (file) => void onChange(file.path)));
		this.registerEvent(this.app.vault.on("rename", (file, oldPath) => {
			void onChange(file.path);
			void onChange(oldPath);
		}));
		this.registerDomEvent(this.contentEl, "keydown", (event) => {
			if (!this.view) return;
			const handled = handleReviewKey(this.contentEl, event, this.view, this.ui, {
				setHideReviewed: (hide) => this.setHideReviewed(hide),
				rerender: () => this.render(),
			});
			if (handled) event.preventDefault();
		});
	}

	/** Re-read the snapshot list (reading only new ones) and review state, then render. */
	private async reload() {
		const { reader, store, recordDir } = this;
		if (!reader || !store || !recordDir) return;
		try {
			const ids = await reader.listSnapshotIds();
			for (const id of [...this.snapshots.keys()]) if (!ids.includes(id)) this.snapshots.delete(id);
			for (const id of ids) if (!this.snapshots.has(id)) this.snapshots.set(id, await reader.readSnapshot(id));
			this.reviewState = await store.readReviewState();
			this.rebuild();
		} catch (error) {
			this.view = null;
			this.showMessage(`Could not load the differential review for ${recordDir}: ${error instanceof Error ? error.message : error}`);
		}
	}

	private rebuild() {
		this.view = buildReviewView([...this.snapshots.values()], this.reviewState, { baseline: this.baseline, hideReviewed: this.ui.hideReviewed });
		if (this.view && !this.expandedOnce) {
			this.expandedOnce = true;
			if (visibleLineCount(this.view) <= AUTO_EXPAND_LINES) {
				for (const f of this.view.files) if (f.visible) this.ui.expanded.add(`file:${f.path}`);
			}
		}
		this.render();
	}

	private render() {
		const root = this.contentEl;
		if (!this.view) {
			this.showMessage(
				`No differential-review snapshots in ${this.recordDir}/differential-review/snapshots yet. Agents write one after each branch phase or PR review round (see agents/_shared/PROCESS_DIFFERENTIAL_REVIEW_SNAPSHOT.md).`,
			);
			return;
		}
		const scroll = root.scrollTop;
		const focused = focusedItem(root);
		renderReview(root, this.view, this.ui, {
			toggleHunk: (file, hunk) =>
				this.mutate((state, snapshot, now) =>
					hunk.state === "reviewed"
						? unmarkHunks(state, [hunk.id, ...(hunk.reviewedAs ? [hunk.reviewedAs.hunkId] : [])], now)
						: markHunksReviewed(state, snapshot, [hunk.id], now),
				),
			toggleFile: (file) =>
				this.mutate((state, snapshot, now) =>
					file.state === "reviewed"
						? unmarkHunks(state, file.hunks.flatMap((h) => [h.id, ...(h.reviewedAs ? [h.reviewedAs.hunkId] : [])]), now)
						: markFileReviewed(state, snapshot, file.path, now),
				),
			toggleCommit: (commit) =>
				this.mutate((state, snapshot, now) =>
					commit.state === "reviewed" && commit.signoff ? revokeCommitSignoff(state, commit.signoff.key, now) : signOffCommit(state, snapshot, commit.sha, now),
				),
			setBaseline: (baseline) => {
				this.baseline = baseline;
				this.app.workspace.requestSaveLayout();
				this.rebuild();
			},
			setHideReviewed: (hide) => this.setHideReviewed(hide),
		});
		root.scrollTop = scroll;
		restoreFocus(root, focused);
	}

	private setHideReviewed(hide: boolean) {
		this.ui.hideReviewed = hide;
		this.app.workspace.requestSaveLayout();
		this.rebuild();
	}

	/** Queue a check-off change: fresh read of review-state.json, apply, write, re-render. */
	private mutate(change: (state: ReviewState, snapshot: Snapshot, now: string) => ReviewState) {
		const { store, view } = this;
		if (!store || !view) return;
		this.writes = this.writes
			.then(async () => {
				this.reviewState = await updateReviewState(store, (state) => change(state, view.snapshot, new Date().toISOString()));
				this.rebuild();
			})
			.catch((error) => {
				new Notice(`Could not update review-state.json: ${error instanceof Error ? error.message : error}`, 10_000);
				void this.reload();
			});
	}

	private showMessage(text: string) {
		this.contentEl.replaceChildren();
		this.contentEl.createEl("p", { text, cls: "gbdr-empty" });
	}
}
