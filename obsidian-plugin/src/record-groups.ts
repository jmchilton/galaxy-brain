// Repository-specific record grouping from a curated queue file, e.g. gx_branches/MY_BRANCHES.md.

import type { RecordKind } from "../../site/src/lib/records";
import { recordFromPath } from "./launchers";
import { type RecordSummary, repositorySections, type StatusGroup } from "./repository";

/** Vault path of the queue file that groups a repository's records of a kind. */
const GROUPINGS: Record<string, string> = {
	"galaxy/branches": "agents/gx_branches/MY_BRANCHES.md",
};

export function groupingFor(repo: string, kind: RecordKind): string | undefined {
	return GROUPINGS[`${repo}/${kind}`];
}

export interface GroupingSection {
	key: string;
	label: string;
	/** Record names linked from the section's list items, in order. */
	names: string[];
}

/** Resolve a relative link against the directory of `from`, both vault paths. */
function resolve(from: string, link: string): string {
	const parts = from.split("/").slice(0, -1);
	for (const part of link.split("/")) {
		if (part === "..") parts.pop();
		else if (part !== ".") parts.push(part);
	}
	return parts.join("/");
}

/** `## Label (`key`)` sections, each listing records via `- [..](relative/path)` items. */
export function parseGrouping(text: string, path: string, repo: string, kind: RecordKind): GroupingSection[] {
	const sections: GroupingSection[] = [];
	for (const line of text.split("\n")) {
		const heading = line.match(/^## (.+?)\s*\(`([^`]+)`\)\s*$/);
		if (heading) {
			sections.push({ label: heading[1]!, key: heading[2]!, names: [] });
			continue;
		}
		const link = line.match(/^- \[[^\]]*\]\(([^)\s]+)\)/);
		const section = sections[sections.length - 1];
		if (!link || !section) continue;
		const record = recordFromPath(resolve(path, decodeURI(link[1]!)));
		if (record?.repo === repo && record.kind === kind && !section.names.includes(record.name)) section.names.push(record.name);
	}
	return sections;
}

/** The grouping's non-empty sections first, then generic status groups for unlisted records. */
export function groupRecords(records: RecordSummary[], kind: RecordKind, grouping: GroupingSection[] | undefined): StatusGroup[] {
	const ofKind = records.filter((record) => record.kind === kind);
	const byName = new Map(ofKind.map((record) => [record.name, record]));
	const listed = new Set<string>();
	const groups: StatusGroup[] = [];
	for (const section of grouping ?? []) {
		const found = section.names.flatMap((name) => {
			const record = byName.get(name);
			if (!record || listed.has(name)) return [];
			listed.add(name);
			return [record];
		});
		if (found.length) groups.push({ status: section.key, label: section.label, collapsed: false, records: found });
	}
	const rest = ofKind.filter((record) => !listed.has(record.name));
	return [...groups, ...(repositorySections(rest).find((section) => section.kind === kind)?.groups ?? [])];
}
