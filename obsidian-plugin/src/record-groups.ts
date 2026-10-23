// Repository-specific record grouping from a curated queue file, e.g. repositories/galaxy/branches/MY_BRANCHES.md.

import { groupBySections, type GroupingSection, type RecordKind } from "../../site/src/lib/records";
import { type RecordSummary, repositorySections, type StatusGroup } from "./repository";

/** The grouping's non-empty sections first, then generic status groups for unlisted records. */
export function groupRecords(records: RecordSummary[], kind: RecordKind, grouping: GroupingSection[] | undefined): StatusGroup[] {
	const { sections, rest } = groupBySections(records, kind, grouping);
	const groups = sections.map(({ key, label, records }) => ({ status: key, label, collapsed: false, records }));
	return [...groups, ...(repositorySections(rest).find((section) => section.kind === kind)?.groups ?? [])];
}
