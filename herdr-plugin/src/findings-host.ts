// The Herdr app's findings panel, in Node, which holds the YAML parser: review-factory's panel, for a record ref.

import { join } from "node:path";
import { recordCommitDiff } from "../../review-factory/src/commit-diff";
import { findingsEdit as recordEdit, findingsPanel as recordPanel } from "../../review-factory/src/panel";
import { detachedRequest, jobFile, startDetached } from "./detached";
import type { CommitDiff, FindingsCheck, FindingsEdit, FindingsPanel } from "./findings-types";
import { reviewRecordDir } from "./review-host";

/** The record's vault-relative directory. */
export function reviewDir(vaultRoot: string, ref: string): string {
	const dir = ref.split("/")[1] === "reviews" ? reviewRecordDir(vaultRoot, ref) : null;
	if (!dir) throw new Error(`no review record ${ref}`);
	return dir;
}

/** Null when the record has no findings YAML. */
export const findingsPanel = (vaultRoot: string, ref: string): FindingsPanel | null => recordPanel(join(vaultRoot, reviewDir(vaultRoot, ref)));

/** The file's vault path and its change; undefined when the finding is gone. */
export function findingsEdit(vaultRoot: string, edit: FindingsEdit): { path: string; change: (text: string) => string } | undefined {
	const dir = reviewDir(vaultRoot, edit.ref);
	const found = recordEdit(join(vaultRoot, dir), edit);
	return found && { path: join(dir, found.file), change: found.change };
}

/** A review-branch commit's diff, from the record's PR checkout. */
export function findingsCommit(vaultRoot: string, { ref, sha }: { ref: string; sha: string }, diffOf: (dir: string, sha: string) => CommitDiff = recordCommitDiff): CommitDiff {
	return diffOf(join(vaultRoot, reviewDir(vaultRoot, ref)), sha);
}

/** Starts `review-factory check`, which fetches, or gives its finished output once. */
export function findingsCheck(vaultRoot: string, { ref, check }: { ref: string; check: "start" | "result" }, start: (args: string[]) => void = startDetached): FindingsCheck | null {
	const dir = join(vaultRoot, reviewDir(vaultRoot, ref));
	const file = jobFile("check", ref);
	const argv = [join(vaultRoot, "../review-factory/bin/review-factory"), "check", "--record", dir];
	return detachedRequest(file, check, () => start(["run", file, JSON.stringify(argv)]));
}
