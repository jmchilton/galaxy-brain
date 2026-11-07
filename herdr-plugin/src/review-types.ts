// The review CLI's request and reply, free of Node so the Herdr app's review tab can share them.
import type { CommitView, FileView, HunkView, ReviewLineTarget, ReviewThreadView, ReviewView } from "../../differential-review-lib/src/core";

export type ReviewAct =
	| { kind: "hunk"; id: string }
	| { kind: "file"; path: string }
	| { kind: "commit"; sha: string }
	| { kind: "comment"; target: ReviewLineTarget; body: string }
	| { kind: "reply"; threadId: string; body: string }
	| { kind: "resolve"; threadId: string; resolved: boolean };

export interface ReviewRequest {
	/** `<repo>/<kind>/<name>`, as elsewhere; its status directory is found here. */
	ref: string;
	/** A snapshot id; absent for "since my last review". */
	baseline?: string;
	hideReviewed: boolean;
	act?: ReviewAct;
}

/** Starts a snapshot of the record, or collects how the last one went: a snapshot can outlast the app's 30 s limit on a command. */
export interface CaptureRequest {
	ref: string;
	capture: "start" | "result";
}

export interface CaptureResult {
	ok: boolean;
	message: string;
}

export interface ReviewHunkBody {
	id: string;
	kind: string;
	header: string;
	oldStart: number;
	newStart: number;
	lines: string[];
}

export interface ReviewHunk extends HunkView {
	oldStart: number;
	newStart: number;
	/** Empty on a hidden hunk. */
	lines: string[];
	/** Patches against the version reviewed and the baseline's, when it differs from them. */
	interdiff: { reviewed?: string; baseline?: string };
}

export interface ReviewFile extends Omit<FileView, "hunks"> {
	hunks: ReviewHunk[];
}

export interface ReviewCommit extends CommitView {
	files: Array<{ path: string; hunks: ReviewHunkBody[] }>;
}

export interface ReviewModel {
	/** The review's folder, vault-relative, for watching. */
	dir: string;
	snapshotId: string;
	title: string;
	meta: string;
	summary: string | null;
	counts: ReviewView["counts"];
	hidden: ReviewView["hidden"];
	baseline: ReviewView["baseline"];
	baselineOptions: ReviewView["baselineOptions"];
	needsRelook: boolean;
	files: ReviewFile[];
	commits: ReviewCommit[];
	threads: ReviewThreadView[];
	/** Snapshot labels by id, for replies naming their revision. */
	labels: Record<string, string>;
}
