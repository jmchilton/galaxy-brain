// Replies to the `recordIndex` and `repositoryPage` app requests, free of Node so the Herdr app's mods can share them.

import type { RecentBy } from "../../obsidian-plugin/src/repository";
import type { RecordKind } from "../../site/src/lib/records";

export interface RecordIndexRow {
	/** `<repo>/<kind>/<name>`. */
	ref: string;
	repo: string;
	kind: RecordKind;
	status: string;
	name: string;
	title: string;
}

export interface RecordIndex {
	repositories: string[];
	/** Open records first, then newest first. */
	records: RecordIndexRow[];
}

export interface RepositoryRow extends RecordIndexRow {
	/** Milliseconds; what the list it's in goes by. */
	time: number;
	github?: string;
}

export interface RepositoryGroup {
	key: string;
	label: string;
	collapsed: boolean;
	rows: RepositoryRow[];
}

export interface RepositoryKind {
	kind: RecordKind;
	label: string;
	count: number;
	groups: RepositoryGroup[];
	/** Vault paths, when they exist. */
	queue?: string;
	report?: string;
}

export interface RepositoryPageRequest {
	/** Every repository's recent records without one. */
	repo?: string;
	by?: RecentBy;
	kind?: RecordKind;
}

export interface RepositoryPage {
	repo: string | null;
	repositories: string[];
	/** "owner/name"; empty across every repository. */
	upstream: string;
	/** Empty across every repository. */
	kinds: RepositoryKind[];
	recent: RepositoryRow[];
}
