// ```gb-missed-prs blocks of merged PRs John missed; format in vault/agents/gx_reviews/the_cracks/FELL_THROUGH_THE_CRACKS_NOTE_FORMAT.md.

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
}

export const CRACKS_DIR = "agents/gx_reviews/the_cracks";

const TEXT_FIELDS = { author: "author", merged_by: "mergedBy", summary: "summary", discussion_summary: "discussionSummary", details: "details", discussion: "discussion" } as const;
const FIELDS = ["pr", "title", "url", "merged_at", "approvers", ...Object.keys(TEXT_FIELDS)];

/** PRs from a block's parsed YAML; throws on anything the format rejects. */
export function parseMissedPrs(data: unknown): MissedPr[] {
	if (data === null || data === undefined) return [];
	if (!Array.isArray(data)) throw new Error("gb-missed-prs block must be a list of PRs");
	return data.map((entry: Record<string, unknown>, i) => {
		const fail = (message: string) => new Error(`entry ${i + 1}: ${message}`);
		if (!entry || typeof entry !== "object") throw fail("not a mapping");
		const extra = Object.keys(entry).find((key) => !FIELDS.includes(key));
		if (extra) throw fail(`unknown field ${extra}`);
		const { pr, title, url, merged_at: mergedAt, approvers = [] } = entry;
		if (typeof pr !== "number" || !Number.isInteger(pr)) throw fail("missing pr");
		if (typeof title !== "string" || !title.trim()) throw fail("missing title");
		if (typeof url !== "string" || !/^https?:\/\/\S+$/.test(url)) throw fail("url must be an http(s) URL");
		if (!Array.isArray(approvers) || approvers.some((login) => typeof login !== "string")) throw fail("approvers must be a list of logins");
		const result: MissedPr = { pr, title, url, approvers };
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

/** Merge-date files (`YYYY-MM-DD.md`) directly in dir, newest first. */
export function crackFiles(paths: string[], dir: string): Array<{ path: string; date: string }> {
	const pattern = /^(\d{4}-\d{2}-\d{2})\.md$/;
	return paths
		.filter((path) => path.startsWith(`${dir}/`))
		.map((path) => ({ path, match: pattern.exec(path.slice(dir.length + 1)) }))
		.filter((file) => file.match)
		.map(({ path, match }) => ({ path, date: match![1]! }))
		.sort((a, b) => b.date.localeCompare(a.date));
}
