// Repository listings for the Herdr app's mods: every record for gb-go, one repository's groups for gb-repository.

import { existsSync } from "node:fs";
import { join } from "node:path";
import { SYNC_PROCESSES } from "../../obsidian-plugin/src/record-agents";
import { groupRecords } from "../../obsidian-plugin/src/record-groups";
import { githubUrl } from "../../obsidian-plugin/src/record-links";
import { collectRecords, recentRecords, type RecordSummary, repositoryNames } from "../../obsidian-plugin/src/repository";
import { groupingFor, parseGrouping, RECORD_KINDS, type RecordKind, statusLabel } from "../../site/src/lib/records";
import { repositoryTabs, upstreamOwner } from "../../site/src/lib/repository-tabs";
import type { RecordIndex, RecordIndexRow, RepositoryKind, RepositoryPage, RepositoryPageRequest, RepositoryRow } from "./repository-types";
import { byRecent, readVault, vaultFiles } from "./vault";

const indexRow = (record: RecordSummary): RecordIndexRow => ({
	ref: `${record.repo}/${record.kind}/${record.name}`,
	repo: record.repo,
	kind: record.kind as RecordKind,
	status: record.status,
	name: record.name,
	title: record.title,
});

export function recordIndex(vaultRoot: string): RecordIndex {
	const files = vaultFiles(vaultRoot);
	const records = collectRecords(files, undefined, (path) => readVault(vaultRoot, path));
	return { repositories: repositoryNames(files), records: records.sort(byRecent).map(indexRow) };
}

/** Null for a repository with no records. */
export function repositoryPage(vaultRoot: string, { repo, by = "created", kind }: RepositoryPageRequest): RepositoryPage | null {
	const files = vaultFiles(vaultRoot);
	const repositories = repositoryNames(files);
	if (repo !== undefined && !repositories.includes(repo)) return null;
	const bodies = new Map<string, string>();
	const read = (path: string) => {
		const body = readVault(vaultRoot, path);
		bodies.set(path, body);
		return body;
	};
	const records = collectRecords(files, repo, read);
	const row = (record: RecordSummary, time: number): RepositoryRow => {
		const github = githubUrl(record, (record.indexPath && bodies.get(record.indexPath)) || "");
		return { ...indexRow(record), time, ...(github ? { github } : {}) };
	};
	const present = (path: string | undefined) => (path && existsSync(join(vaultRoot, path)) ? path : undefined);
	const kinds = (repo: string): RepositoryKind[] =>
		repositoryTabs(repo).flatMap(({ id, label }) => {
			const kind = RECORD_KINDS.find((one) => one === id);
			if (!kind) return [];
			const queue = present(groupingFor(repo, kind));
			const report = SYNC_PROCESSES[kind] && present(`repositories/${repo}/${kind}/SYNC_REPORT.md`);
			const groups = groupRecords(records, kind, queue ? parseGrouping(readVault(vaultRoot, queue), queue, repo, kind) : undefined);
			return [
				{
					kind,
					label,
					count: records.filter((record) => record.kind === kind).length,
					groups: groups.map((group) => ({
						key: group.status,
						label: group.label ?? statusLabel(group.status),
						collapsed: group.collapsed,
						rows: group.records.map((record) => row(record, record.mtime)),
					})),
					...(queue ? { queue } : {}),
					...(report ? { report } : {}),
				},
			];
		});
	return {
		repo: repo ?? null,
		repositories,
		upstream: repo ? `${upstreamOwner(repo, [...bodies.values()])}/${repo}` : "",
		kinds: repo ? kinds(repo) : [],
		recent: recentRecords(records, { by, kind }).map((record) => row(record, by === "created" ? record.created : record.indexMtime!)),
	};
}
