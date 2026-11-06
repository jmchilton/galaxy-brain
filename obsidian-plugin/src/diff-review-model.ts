// Differential-review logic with no DOM, shared by the Obsidian view and the Herdr app's review tab.
import {
	type AnnotationStore,
	type CommitView,
	createReviewThread,
	type FileView,
	findHunk,
	type HunkView,
	markFileReviewed,
	markHunksReviewed,
	parseReviewReply,
	type ReviewOrigin,
	type ReviewState,
	type ReviewView,
	revokeCommitSignoff,
	setThreadResolved,
	signOffCommit,
	type Snapshot,
	type SnapshotReader,
	snapshotFiles,
	snapshotLabel,
	type SnapshotSummary,
	unmarkHunks,
} from "../../differential-review-lib/src/core";

/** Below this many visible diff lines, files open expanded. */
export const AUTO_EXPAND_LINES = 400;

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

/** The line under a review's title. */
export function reviewMetaText(view: Pick<ReviewView, "snapshot" | "snapshots">): string {
	const { snapshot } = view;
	return `${snapshotLabel(snapshot)} vs ${snapshot.base.ref} (merge-base ${snapshot.base.mergeBase.slice(0, 8)}) · ${view.snapshots.length} snapshot(s)`;
}

/** Whether a hunk shows when narrowed to hunks with open threads. */
export function hunkShown(view: ReviewView, hunk: HunkView, openThreadsOnly: boolean): boolean {
	return hunk.visible && (!openThreadsOnly || view.threads.some((t) => t.thread.status === "open" && t.placement.hunkId === hunk.id));
}

/** Whether a file shows when narrowed to files with open threads placed on a hunk. */
export function fileShown(view: ReviewView, file: FileView, openThreadsOnly: boolean): boolean {
	return file.visible && (!openThreadsOnly || view.threads.some((t) => t.thread.status === "open" && t.placement.path === file.path && t.placement.hunkId));
}

export function toggleHunkReview(state: ReviewState, snapshot: Snapshot, hunk: HunkView, now: string): ReviewState {
	return hunk.state === "reviewed" ? unmarkHunks(state, [hunk.id, ...(hunk.reviewedAs ? [hunk.reviewedAs.hunkId] : [])], now) : markHunksReviewed(state, snapshot, [hunk.id], now);
}

export function toggleFileReview(state: ReviewState, snapshot: Snapshot, file: FileView, now: string): ReviewState {
	return file.state === "reviewed" ? unmarkHunks(state, file.hunks.flatMap((h) => [h.id, ...(h.reviewedAs ? [h.reviewedAs.hunkId] : [])]), now) : markFileReviewed(state, snapshot, file.path, now);
}

export function toggleCommitReview(state: ReviewState, snapshot: Snapshot, commit: CommitView, now: string): ReviewState {
	return commit.state === "reviewed" && commit.signoff ? revokeCommitSignoff(state, commit.signoff.key, now) : signOffCommit(state, snapshot, commit.sha, now);
}

/** Current snapshots by id; snapshots are immutable, so only ones not yet in `known` are read. */
export async function refreshSnapshots(reader: SnapshotReader, known: ReadonlyMap<string, Snapshot>): Promise<Map<string, Snapshot>> {
	const snapshots = new Map(known);
	const ids = await reader.listSnapshotIds();
	for (const id of [...snapshots.keys()]) if (!ids.includes(id)) snapshots.delete(id);
	for (const id of ids) if (!snapshots.has(id)) snapshots.set(id, await reader.readSnapshot(id));
	return snapshots;
}

export async function saveNewThread(store: AnnotationStore, origin: ReviewOrigin, body: string): Promise<void> {
	await store.writeThread(createReviewThread({ id: crypto.randomUUID(), origin, body, author: "John", createdAt: new Date().toISOString() }));
}

export async function saveReply(store: AnnotationStore, threadId: string, body: string, snapshotId: string | undefined): Promise<void> {
	const annotations = await store.read();
	if (!annotations.threads.some((t) => t.id === threadId)) throw new Error("This thread no longer exists; reload the review.");
	await store.writeReply(parseReviewReply({ schemaVersion: 1, kind: "differential-review-reply", id: crypto.randomUUID(), threadId, body, author: "John", source: "human", createdAt: new Date().toISOString(), ...(snapshotId ? { snapshotId } : {}) }));
}

export async function saveResolved(store: AnnotationStore, threadId: string, resolved: boolean): Promise<void> {
	const annotations = await store.read();
	const thread = annotations.threads.find((t) => t.id === threadId);
	if (!thread) throw new Error("This thread no longer exists; reload the review.");
	await store.writeThread(setThreadResolved(thread, resolved, new Date().toISOString()));
}
