// The Herdr app's differential review, in Node: the app's script runtime stops a call after about 500 ms,
// less than parsing a large snapshot takes, so its review tab only draws what this returns.

import { existsSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { nodeReadAdapter } from "../../differential-review-lib/src/cli/node-storage";
import {
	annotationStore,
	type Baseline,
	buildReviewView,
	captureReviewOrigin,
	type CommitView,
	commitHunks,
	type FileView,
	findHunk,
	type HunkView,
	interdiffPatch,
	previousHunk,
	reviewStateStore,
	type ReviewView,
	snapshotFiles,
	snapshotLabel,
	snapshotReader,
	type TextFileAdapter,
	updateReviewState,
} from "../../differential-review-lib/src/core";
import { refreshSnapshots, reviewMetaText, saveNewThread, saveReply, saveResolved, summaryText, toggleCommitReview, toggleFileReview, toggleHunkReview } from "../../obsidian-plugin/src/diff-review-model";
import { HUMAN_REVIEW_FILE, humanReviewStatus } from "../../obsidian-plugin/src/diff-review-status";
import { isReviewableRecordKind, recordReviewDir } from "../../site/src/lib/records";
import type { ReviewCommit, ReviewHunk, ReviewModel, ReviewRequest } from "./review-types";
import { writeAtomic } from "./vault";

/** A record's directory from a reference, without walking the vault: check-offs need to feel immediate. */
export function reviewRecordDir(vaultRoot: string, ref: string): string | null {
	const parts = ref.split("/");
	if (parts.length !== 3 || parts.some((part) => !part || part.startsWith("."))) return null;
	const [repo, kind, name] = parts as [string, string, string];
	if (!isReviewableRecordKind(kind)) return null;
	const records = join("repositories", repo, kind);
	if (!existsSync(join(vaultRoot, records))) return null;
	for (const status of readdirSync(join(vaultRoot, records), { withFileTypes: true })) {
		if (status.isDirectory() && existsSync(join(vaultRoot, records, status.name, name))) return join(records, status.name, name);
	}
	return null;
}

const fileAdapter: TextFileAdapter = {
	...nodeReadAdapter,
	async write(path, data) {
		writeAtomic(path, data);
	},
};

function hunkModel(view: ReviewView, file: FileView, hunk: HunkView): ReviewHunk {
	const source = hunk.visible ? findHunk(snapshotFiles(view.snapshot), hunk.id) : null;
	const interdiff = (against: "reviewed" | "baseline") => {
		const before = source && hunk.kind !== "meta" ? previousHunk(view, hunk, against) : null;
		return before && source ? interdiffPatch(file.path, before.hunk, source.hunk) : undefined;
	};
	const reviewed = hunk.state === "changed" ? interdiff("reviewed") : undefined;
	const baseline = hunk.sinceBaseline === "changed" ? interdiff("baseline") : undefined;
	return { ...hunk, oldStart: source?.hunk.oldStart ?? 0, newStart: source?.hunk.newStart ?? 0, lines: source?.hunk.lines ?? [], interdiff: { ...(reviewed ? { reviewed } : {}), ...(baseline ? { baseline } : {}) } };
}

function commitModel(view: ReviewView, commit: CommitView): ReviewCommit {
	const source = view.snapshot.commits.find((c) => c.sha === commit.sha);
	const files = source && commit.visible && !commit.contextOnly ? commitHunks(source, commit.state === "changed" ? commit.differingHunks : null) : [];
	return { ...commit, files: files.map((file) => ({ path: file.path, hunks: file.hunks.map(({ id, kind, header, oldStart, newStart, lines }) => ({ id, kind, header, oldStart, newStart, lines })) })) };
}

/** Just what the tab draws; a whole view carries every snapshot's diffs. */
export function reviewModel(view: ReviewView, dir: string): ReviewModel {
	const previous = view.snapshots.find((s) => s.id === view.summary.previousSnapshotId);
	return {
		dir,
		snapshotId: view.snapshot.id,
		title: `Review ${view.snapshot.branch}`,
		meta: reviewMetaText(view),
		summary: summaryText(view.summary, previous ? snapshotLabel(previous) : null),
		counts: view.counts,
		hidden: view.hidden,
		baseline: view.baseline,
		baselineOptions: view.baselineOptions,
		needsRelook: view.needsRelook,
		files: view.files.map((file) => ({ ...file, hunks: file.hunks.map((hunk) => hunkModel(view, file, hunk)) })),
		commits: view.commits.map((commit) => commitModel(view, commit)),
		threads: view.threads,
		labels: Object.fromEntries(view.snapshots.map((s) => [s.id, snapshotLabel(s)])),
	};
}

function writeHumanReview(vaultRoot: string, recordDir: string, view: ReviewView) {
	const path = join(vaultRoot, recordDir, HUMAN_REVIEW_FILE);
	const status = humanReviewStatus(view);
	if (status === null) rmSync(path, { force: true });
	else writeFileSync(path, status);
}

/** Applies the request's act, if any, and gives the review after it; null without a snapshot. */
export async function reviewRequest(vaultRoot: string, request: ReviewRequest): Promise<ReviewModel | null> {
	const recordDir = reviewRecordDir(vaultRoot, request.ref);
	if (!recordDir) throw new Error(`no reviewable record ${request.ref}`);
	const dir = join(vaultRoot, recordReviewDir(recordDir));
	const store = reviewStateStore(fileAdapter, dir);
	const threads = annotationStore(fileAdapter, dir);
	const snapshots = [...(await refreshSnapshots(snapshotReader(fileAdapter, dir), new Map())).values()];
	const baseline: Baseline = request.baseline ? { kind: "snapshot", snapshotId: request.baseline } : { kind: "review" };
	const build = async () => buildReviewView(snapshots, await store.readReviewState(), { baseline, hideReviewed: request.hideReviewed, annotations: await threads.read() });
	const before = await build();
	const { act } = request;
	if (!act || !before) return before && reviewModel(before, recordReviewDir(recordDir));
	const now = new Date().toISOString();
	const { snapshot } = before;
	switch (act.kind) {
		case "hunk": {
			const hunk = before.files.flatMap((file) => file.hunks).find((h) => h.id === act.id);
			if (!hunk) throw new Error("This hunk is no longer in the review; reload it.");
			await updateReviewState(store, (state) => toggleHunkReview(state, snapshot, hunk, now));
			break;
		}
		case "file": {
			const file = before.files.find((f) => f.path === act.path);
			if (!file) throw new Error("This file is no longer in the review; reload it.");
			await updateReviewState(store, (state) => toggleFileReview(state, snapshot, file, now));
			break;
		}
		case "commit": {
			const commit = before.commits.find((c) => c.sha === act.sha);
			if (!commit) throw new Error("This commit is no longer in the review; reload it.");
			await updateReviewState(store, (state) => toggleCommitReview(state, snapshot, commit, now));
			break;
		}
		case "comment":
			await saveNewThread(threads, captureReviewOrigin(snapshot, act.target), act.body);
			break;
		case "reply":
			await saveReply(threads, act.threadId, act.body, snapshot.id);
			break;
		case "resolve":
			await saveResolved(threads, act.threadId, act.resolved);
			break;
	}
	const after = (await build())!;
	if (act.kind === "hunk" || act.kind === "file" || act.kind === "commit") writeHumanReview(vaultRoot, recordDir, after);
	return reviewModel(after, recordReviewDir(recordDir));
}
