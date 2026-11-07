// Opens a record's landing page, its differential review and a repository's records from the other mods.

import { panes, run, spaces } from "herdr";
import { recordTabName, reviewTabName } from "./record-page";
import { repositoryTabName } from "./repository-page";

function showModTab(mod: string, name: string, props: object) {
	const tabs = spaces().flatMap((space: any) => space.tabs);
	const open = panes().find((p: any) => p.mod === mod && tabs.find((tab: any) => tab.id === p.tab)?.name === name);
	if (open) run("pane.focus", { pane: open.pane });
	else run("tab.new", { name, mod, props });
}

/** Shows the record's tab, opening it if needed. */
export const openRecordTab = (ref: string) => showModTab("gb-record", recordTabName(ref), { ref });

/** Shows the record's differential review tab, opening it if needed. */
export const openReviewTab = (ref: string) => showModTab("gb-review", reviewTabName(ref), { ref });

/** Shows the repository's tab, or the one across every repository, opening it if needed. */
export const openRepositoryTab = (repo?: string) => showModTab("gb-repository", repositoryTabName(repo), repo ? { repo } : {});
