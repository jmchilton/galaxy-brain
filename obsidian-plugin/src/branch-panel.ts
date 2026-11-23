// A branch record's PR panel: its title options and chosen `pr_title`, labels, checklist and the PR body
// the Open PR agent would post. No Node imports: Obsidian, mobile included, and the Herdr host share it.

import { recordFrontmatter, setFrontmatterScalar, withoutFrontmatter } from "./record-frontmatter";

/** Record-relative files the panel reads. */
export const BRANCH_PANEL_FILES = {
	index: "index.md",
	titles: "pr_titles.md",
	tags: "pr_tags.md",
	checklist: "pr_checklist.md",
	description: "pr_description.md",
	humanReview: "human_review.md",
} as const;

export type BranchPanelFile = keyof typeof BRANCH_PANEL_FILES;

/** Each file's text, null when the record doesn't have it. */
export type BranchFiles = Record<BranchPanelFile, string | null>;

export interface BranchTitle {
	title: string;
	chosen: boolean;
	/** False for a chosen title that isn't in pr_titles.md. */
	listed: boolean;
}

export interface BranchPanel {
	status: string;
	warnings: string[];
	pr: number | null;
	titles: BranchTitle[];
	chosen: string | null;
	tags: string[];
	checklist: { done: number; total: number } | null;
	/** Files the panel can open, record-relative, in BRANCH_PANEL_FILES order. */
	files: Array<{ name: string; label: string }>;
	/** `# title` and the description with its Human Review placeholder filled; null without pr_description.md. */
	preview: string | null;
}

const LIST_ITEM = /^[-*+]\s+(.+?)\s*$/;
const CHECK_ITEM = /^[-*+]\s+\[([ xX])\]/;
const PLACEHOLDER = /^\(PUBLISHING_AGENT:.*\)[ \t]*$/m;

const FILE_LABELS: Partial<Record<BranchPanelFile, string>> = {
	description: "📝 Description",
	titles: "🏷️ Titles",
	tags: "🔖 Labels",
	checklist: "☑️ Checklist",
	humanReview: "👀 Human review",
};

/** Top-level list items of a markdown note. */
export const listItems = (text: string | null): string[] => [
	...new Set(
		withoutFrontmatter(text ?? "")
			.split("\n")
			.map((line) => LIST_ITEM.exec(line)?.[1])
			.filter((item): item is string => Boolean(item)),
	),
];

function checklist(text: string | null): BranchPanel["checklist"] {
	if (text === null) return null;
	const marks = text.split("\n").flatMap((line) => CHECK_ITEM.exec(line)?.[1] ?? []);
	return marks.length ? { done: marks.filter((mark) => mark !== " ").length, total: marks.length } : null;
}

/** pr_description.md as it would be posted: the placeholder becomes human_review.md. */
export function prBody(description: string, humanReview: string | null): string {
	return humanReview === null ? description : description.replace(PLACEHOLDER, () => humanReview.trim());
}

/** Null for a branch without PR files yet. */
export function branchPanel(files: BranchFiles): BranchPanel | null {
	const { pr = null, pr_title } = recordFrontmatter(files.index ?? "");
	if (!pr && [files.titles, files.tags, files.checklist, files.description].every((text) => text === null)) return null;
	const options = listItems(files.titles);
	const chosen = pr_title ?? null;
	const titles: BranchTitle[] = options.map((title) => ({ title, chosen: title === chosen, listed: true }));
	if (chosen && !options.includes(chosen)) titles.unshift({ title: chosen, chosen: true, listed: false });

	const errors: string[] = [];
	const warnings: string[] = [];
	if (!pr) {
		if (files.description === null) errors.push("No pr_description.md; Open PR stops");
		// Required only where the description has the placeholder for it.
		if (files.humanReview === null) (files.description !== null && PLACEHOLDER.test(files.description) ? errors : warnings).push("No human_review.md; review the latest differential review snapshot");
		if (!chosen) warnings.push(options.length ? "No title chosen; Open PR takes the first" : "No pr_titles.md options");
		else if (!options.includes(chosen)) warnings.push("The chosen title isn't in pr_titles.md");
		if (files.tags === null) warnings.push("No pr_tags.md; the PR gets no labels");
	}
	const check = checklist(files.checklist);
	if (!pr && check && check.done < check.total) warnings.push(`Checklist ${check.done}/${check.total} answered yes`);
	const status = pr ? `✅ PR #${pr} is open` : errors.length ? `⛔ ${errors[0]}` : "✅ Ready to open the PR";
	const title = chosen ?? options[0];
	return {
		status,
		warnings: [...errors.slice(1).map((error) => `⛔ ${error}`), ...warnings.map((warning) => `⚠️ ${warning}`)],
		pr,
		titles,
		chosen,
		tags: listItems(files.tags).map((tag) => tag.replace(/^`(.*)`$/, "$1")),
		checklist: check,
		files: (Object.keys(FILE_LABELS) as BranchPanelFile[]).filter((key) => files[key] !== null).map((key) => ({ name: BRANCH_PANEL_FILES[key], label: FILE_LABELS[key]! })),
		preview: files.description === null ? null : `${title ? `# ${title}\n\n` : ""}${prBody(withoutFrontmatter(files.description), files.humanReview)}`,
	};
}

/** index.md with `pr_title` set, or removed for null. Sets, never toggles, so a stale click can't undo a newer choice. */
export const setPrTitle = (index: string, title: string | null): string => setFrontmatterScalar(index, "pr_title", title);
