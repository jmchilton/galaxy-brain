// ```gb-missed-prs blocks of merged PRs John missed; format in vault/agents/gx_reviews/the_cracks/FELL_THROUGH_THE_CRACKS_NOTE_FORMAT.md.

import { editBlockEntry, fencedBlocks } from "./task-list";

export interface MissedPr {
	pr: number;
	title: string;
	url: string;
	author?: string;
	/** ISO timestamp. */
	mergedAt?: string;
	mergedBy?: string;
	approvers: string[];
	summary?: string;
	discussionSummary?: string;
	details?: string;
	discussion?: string;
	reviewed: boolean;
}

export const cracksPath = (agentDir: string) => `agents/${agentDir}/the_cracks`;

const DATE_FILE = /^(\d{4}-\d{2}-\d{2})\.md$/;

/** Whether path is a merge-date file in some agent dir's the_cracks/. */
export function isCrackFile(path: string): boolean {
	const m = /^agents\/[^/]+\/the_cracks\/([^/]+)$/.exec(path);
	return !!m && DATE_FILE.test(m[1]!);
}

const TEXT_FIELDS = { author: "author", merged_by: "mergedBy", summary: "summary", discussion_summary: "discussionSummary", details: "details", discussion: "discussion" } as const;
const FIELDS = ["pr", "title", "url", "merged_at", "approvers", "reviewed", ...Object.keys(TEXT_FIELDS)];

/** PRs from a block's parsed YAML; throws on anything the format rejects. */
export function parseMissedPrs(data: unknown): MissedPr[] {
	if (data === null || data === undefined) return [];
	if (!Array.isArray(data)) throw new Error("gb-missed-prs block must be a list of PRs");
	return data.map((entry: Record<string, unknown>, i) => {
		const fail = (message: string) => new Error(`entry ${i + 1}: ${message}`);
		if (!entry || typeof entry !== "object") throw fail("not a mapping");
		const extra = Object.keys(entry).find((key) => !FIELDS.includes(key));
		if (extra) throw fail(`unknown field ${extra}`);
		const { pr, title, url, merged_at: mergedAt, approvers = [], reviewed = false } = entry;
		if (typeof pr !== "number" || !Number.isInteger(pr)) throw fail("missing pr");
		if (typeof title !== "string" || !title.trim()) throw fail("missing title");
		if (typeof url !== "string" || !/^https?:\/\/\S+$/.test(url)) throw fail("url must be an http(s) URL");
		if (!Array.isArray(approvers) || approvers.some((login) => typeof login !== "string")) throw fail("approvers must be a list of logins");
		if (typeof reviewed !== "boolean") throw fail("reviewed must be true or false");
		const result: MissedPr = { pr, title, url, approvers, reviewed };
		for (const [key, field] of Object.entries(TEXT_FIELDS)) {
			const value = entry[key];
			if (value === undefined || value === null) continue;
			if (typeof value !== "string") throw fail(`${key} must be text`);
			result[field] = value;
		}
		// Obsidian's YAML parser may turn an unquoted timestamp into a Date.
		if (mergedAt instanceof Date) result.mergedAt = mergedAt.toISOString();
		else if (typeof mergedAt === "string") result.mergedAt = mergedAt;
		else if (mergedAt !== undefined && mergedAt !== null) throw fail("merged_at must be a timestamp");
		return result;
	});
}

/** The note with PR number pr's `reviewed` set (dropped when false), or undefined if no block lists it. */
export function setMissedPrReviewed(
	note: string,
	pr: number,
	reviewed: boolean,
	parse: (source: string) => unknown,
	stringify: (data: unknown) => string,
): string | undefined {
	return editBlockEntry(
		note,
		"gb-missed-prs",
		(entry) => entry?.pr === pr,
		(entry) => {
			const { reviewed: _, ...rest } = entry ?? {};
			return reviewed ? { ...rest, reviewed: true } : rest;
		},
		parse,
		stringify,
	);
}

/** One merge-date file's PRs; agentDir is set when days from several agents are merged. */
export interface CrackDay {
	path: string;
	date: string;
	agentDir?: string;
	prs: MissedPr[];
	error?: string;
}

/** A merge-date note's PRs, or its parse error. */
export function parseCrackDay(file: { path: string; date: string }, note: string, parse: (source: string) => unknown, agentDir?: string): CrackDay {
	const day: CrackDay = { ...file, prs: [], ...(agentDir ? { agentDir } : {}) };
	try {
		day.prs = fencedBlocks(note, "gb-missed-prs").flatMap((block) => parseMissedPrs(parse(block.source)));
	} catch (error) {
		day.error = error instanceof Error ? error.message : String(error);
	}
	return day;
}

export const unreviewedCount = (days: CrackDay[]) => days.reduce((count, day) => count + day.prs.filter((pr) => !pr.reviewed).length, 0);

/** A card's line of who wrote, merged and approved it, and when. */
export function missedPrMeta(pr: MissedPr): string {
	return [pr.author && `by ${pr.author}`, pr.mergedBy && `merged by ${pr.mergedBy}`, pr.approvers.length ? `approved by ${pr.approvers.join(", ")}` : "no approvals", pr.mergedAt?.slice(0, 10)].filter(Boolean).join(" · ");
}

/** Merge-date files (`YYYY-MM-DD.md`) directly in dir, newest first. */
export function crackFiles(paths: string[], dir: string): Array<{ path: string; date: string }> {
	return paths
		.filter((path) => path.startsWith(`${dir}/`))
		.map((path) => ({ path, match: DATE_FILE.exec(path.slice(dir.length + 1)) }))
		.filter((file) => file.match)
		.map(({ path, match }) => ({ path, date: match![1]! }))
		.sort((a, b) => b.date.localeCompare(a.date));
}
