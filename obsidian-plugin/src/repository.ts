// Model for the repository view: a repository's records grouped by kind and status.

import {
	DEFAULTS_REPO,
	groupByStatus,
	isTerminalStatus,
	RECORD_KINDS,
	type RecordKind,
	recordTitle,
} from "../../site/src/lib/records";
import { type RecordRef, recordFromPath } from "./launchers";

export interface VaultFile {
	path: string;
	mtime: number;
	/** Filesystem creation time; survives renames between status directories. */
	ctime: number;
}

export interface RecordSummary extends RecordRef {
	title: string;
	/** Newest modification time of any file in the record. */
	mtime: number;
	/** Oldest creation time of any file in the record. */
	created: number;
	/** Modification time of index.md, when there is one. */
	indexMtime?: number;
	indexPath?: string;
}

export interface StatusGroup {
	status: string;
	/** Heading when it isn't the status label. */
	label?: string;
	collapsed: boolean;
	records: RecordSummary[];
}

export interface KindSection {
	kind: RecordKind;
	groups: StatusGroup[];
}

/** Tracked repositories that have at least one record. */
export function repositoryNames(files: Pick<VaultFile, "path">[]): string[] {
	const names = new Set<string>();
	for (const file of files) {
		const record = recordFromPath(file.path);
		if (record && record.repo !== DEFAULTS_REPO) names.add(record.repo);
	}
	return [...names].sort();
}

/** A repo's records, or every tracked repo's without one; `readIndex` returns an index.md body (or just its `# ` title line). */
export function collectRecords(
	files: VaultFile[],
	repo: string | undefined,
	readIndex: (path: string) => string | undefined,
): RecordSummary[] {
	const records = new Map<string, RecordSummary>();
	for (const file of files) {
		const ref = recordFromPath(file.path);
		if (!ref || (repo === undefined ? ref.repo === DEFAULTS_REPO : ref.repo !== repo)) continue;
		let record = records.get(ref.dir);
		if (!record) {
			record = { ...ref, title: ref.name, mtime: 0, created: file.ctime };
			records.set(ref.dir, record);
		}
		record.mtime = Math.max(record.mtime, file.mtime);
		record.created = Math.min(record.created, file.ctime);
		if (file.path === `${ref.dir}/index.md`) {
			record.indexPath = file.path;
			record.indexMtime = file.mtime;
			record.title = recordTitle(readIndex(file.path)) ?? ref.name;
		}
	}
	return [...records.values()];
}

export type RecentBy = "created" | "updated";

/** Newest records first, by creation or by index.md update; "updated" skips records without an index.md. */
export function recentRecords(
	records: RecordSummary[],
	{ by, kind, limit = 25 }: { by: RecentBy; kind?: RecordKind; limit?: number },
): RecordSummary[] {
	const time = (record: RecordSummary) => (by === "created" ? record.created : record.indexMtime);
	return records
		.filter((record) => (!kind || record.kind === kind) && time(record) !== undefined)
		.sort((a, b) => time(b)! - time(a)!)
		.slice(0, limit);
}

export function timeAgo(mtime: number, now: number): string {
	const minutes = Math.max(0, Math.round((now - mtime) / 60_000));
	if (minutes < 1) return "just now";
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.round(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	return `${Math.round(hours / 24)}d ago`;
}

/** Kinds in order, statuses in site order, newest-modified records first. */
export function repositorySections(records: RecordSummary[]): KindSection[] {
	return RECORD_KINDS.map((kind) => ({
		kind,
		groups: groupByStatus(records, kind).map(({ status, records }) => ({
			status,
			collapsed: isTerminalStatus(status),
			records: [...records].sort((a, b) => b.mtime - a.mtime),
		})),
	})).filter((section) => section.groups.length > 0);
}
