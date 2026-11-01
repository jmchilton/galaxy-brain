import { type App, Notice, parseYaml, stringifyYaml } from "obsidian";
import { renderMissedPrCards } from "./missed-pr-cards";
import { crackFiles, type MissedPr, parseMissedPrs, setMissedPrReviewed } from "./missed-prs";
import { fencedBlocks } from "./task-list";

/** One merge-date file's PRs; agentDir is set when days from several agents are merged. */
export interface CrackDay {
	path: string;
	date: string;
	agentDir?: string;
	prs: MissedPr[];
	error?: string;
}

/** Merge-date files in dir, newest first, with their parsed PRs or parse error. */
export async function readCrackDays(app: App, dir: string, agentDir?: string): Promise<CrackDay[]> {
	const files = crackFiles(app.vault.getMarkdownFiles().map((file) => file.path), dir);
	return Promise.all(
		files.map(async ({ path, date }) => {
			const day: CrackDay = { path, date, prs: [], ...(agentDir ? { agentDir } : {}) };
			const file = app.vault.getFileByPath(path);
			if (!file) return day;
			try {
				day.prs = fencedBlocks(await app.vault.cachedRead(file), "gb-missed-prs").flatMap((block) => parseMissedPrs(parseYaml(block.source)));
			} catch (error) {
				day.error = error instanceof Error ? error.message : String(error);
			}
			return day;
		}),
	);
}

export const unreviewedCount = (days: CrackDay[]) => days.reduce((count, day) => count + day.prs.filter((pr) => !pr.reviewed).length, 0);

/** Sets pr's `reviewed` in the note at path; false (with a notice) if the note or entry is gone. */
export async function setReviewedInFile(app: App, path: string, pr: MissedPr, reviewed: boolean): Promise<boolean> {
	const file = app.vault.getFileByPath(path);
	let found = false;
	if (file) {
		await app.vault.process(file, (note) => {
			const updated = setMissedPrReviewed(note, pr.pr, reviewed, parseYaml, stringifyYaml);
			found = updated !== undefined;
			return updated ?? note;
		});
	}
	if (!found) new Notice(`#${pr.pr} not found in ${path}`);
	return found;
}

export function renderMissedPrsError(el: HTMLElement, error: unknown) {
	el.createDiv({ cls: "gb-missed-prs-error", text: `gb-missed-prs: ${error instanceof Error ? error.message : error}` });
}

/** Unreviewed cards under a linked date heading per day; fully reviewed days are skipped. */
export function renderCrackDays(app: App, el: HTMLElement, days: CrackDay[], sourcePath: string) {
	const pending = days.filter((day) => day.error || day.prs.some((pr) => !pr.reviewed));
	if (!pending.length) return void el.createDiv({ cls: "gb-missed-prs-empty", text: "Nothing unreviewed." });
	for (const { path, date, agentDir, prs, error } of pending) {
		const section = el.createDiv({ cls: "gb-missed-prs-day" });
		const heading = section.createEl("h3");
		const link = heading.createEl("a", { text: date, cls: "internal-link", href: "#" });
		link.onclick = (event) => {
			event.preventDefault();
			void app.workspace.openLinkText(path, sourcePath, event.metaKey || event.ctrlKey);
		};
		if (agentDir) heading.createSpan({ text: agentDir, cls: "gbr-tag" });
		if (error) renderMissedPrsError(section, error);
		else renderMissedPrCards(section, prs, { hideReviewed: true, setReviewed: (pr, reviewed) => setReviewedInFile(app, path, pr, reviewed) });
	}
}
