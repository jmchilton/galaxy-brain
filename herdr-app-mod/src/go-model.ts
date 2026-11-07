// The gb-go popup's model: which records and repositories a query finds, and which of them show.

import type { RecordIndex, RecordIndexRow } from "../../herdr-plugin/src/repository-types";

export type GoRow = { type: "repository"; repo: string } | { type: "record"; record: RecordIndexRow };

/** Records with their search text worked out once: this runs on every key. */
export interface GoIndex {
	repositories: string[];
	records: Array<{ record: RecordIndexRow; text: string }>;
}

export function goIndex({ repositories, records }: RecordIndex): GoIndex {
	return { repositories, records: records.map((record) => ({ record, text: `${record.ref} ${record.status} ${record.title}`.toLowerCase() })) };
}

/** Repositories then records with every word of the query, a record named exactly that first; just the records with no query. */
export function goRows({ repositories, records }: GoIndex, query: string): GoRow[] {
	const needle = query.trim().toLowerCase();
	const words = needle.split(/\s+/).filter(Boolean);
	const matches = (text: string) => words.every((word) => text.includes(word));
	const found = records.filter(({ text }) => matches(text)).map(({ record }) => record);
	const isExact = (record: RecordIndexRow) => record.name.toLowerCase() === needle;
	return [
		...(words.length ? repositories.filter((repo) => matches(repo.toLowerCase())) : []).map((repo): GoRow => ({ type: "repository", repo })),
		...[...found.filter(isExact), ...found.filter((record) => !isExact(record))].map((record): GoRow => ({ type: "record", record })),
	];
}

/** The first row to show of `total`, `size` at a time, moving from `first` only as far as it takes to show `at`. */
export function scrollWindow(first: number, at: number, size: number, total: number): number {
	const inView = Math.min(first, at);
	return Math.max(0, Math.min(Math.max(inView, at - size + 1), total - size));
}
