// A branch record's PR panel in its landing strip: branch-panel's model, drawn as DOM, with a title picker.

import { type App, type Component, MarkdownRenderer, Notice } from "obsidian";
import { statusTone } from "../../review-factory/src/landing";
import { BRANCH_PANEL_FILES, type BranchFiles, type BranchPanelFile, branchPanel, setPrTitle } from "./branch-panel";
import type { RecordRef } from "./launchers";

/** Kept per record across redraws. */
export interface BranchStripState {
	previewOpen: boolean;
}

async function readFiles(app: App, record: RecordRef): Promise<BranchFiles> {
	const entries = await Promise.all(
		(Object.entries(BRANCH_PANEL_FILES) as Array<[BranchPanelFile, string]>).map(async ([key, name]) => {
			const file = app.vault.getFileByPath(`${record.dir}/${name}`);
			return [key, file ? await app.vault.cachedRead(file) : null] as const;
		}),
	);
	return Object.fromEntries(entries) as BranchFiles;
}

async function choose(app: App, record: RecordRef, title: string | null) {
	const file = app.vault.getFileByPath(`${record.dir}/index.md`);
	if (!file) return void new Notice(`${record.dir}/index.md is gone`);
	try {
		await app.vault.process(file, (text) => setPrTitle(text, title));
	} catch (error) {
		new Notice(`PR title not saved: ${error instanceof Error ? error.message : error}`);
	}
}

const toneLine = (el: HTMLElement, line: string, cls = "") => el.createDiv({ text: line, cls: `gb-findings-${statusTone(line)} ${cls}`.trim() });

/** Draws the panel into el; draws nothing for a branch without PR files. */
export async function renderBranchPanel(app: App, el: HTMLElement, record: RecordRef, component: Component, state: BranchStripState) {
	const panel = branchPanel(await readFiles(app, record));
	if (!panel) return;
	const root = el.createDiv({ cls: "gb-findings gb-branch-panel" });
	root.createDiv({ text: panel.pr ? `Pull request · #${panel.pr}` : "Pull request", cls: "gb-findings-title" });
	toneLine(root, panel.status, "gb-findings-status");
	for (const line of panel.warnings) toneLine(root, line);

	const files = root.createDiv({ cls: "gb-record-row" });
	for (const one of panel.files) {
		const button = files.createEl("button", { text: one.label, cls: "gb-record-chip", attr: { title: `Open ${one.name}` } });
		button.onclick = (event) => void app.workspace.openLinkText(`${record.dir}/${one.name}`, "", event.metaKey || event.ctrlKey);
	}
	if (panel.checklist) files.createSpan({ text: `☑ ${panel.checklist.done}/${panel.checklist.total}`, cls: "gb-record-where" });
	for (const tag of panel.tags) files.createSpan({ text: tag, cls: "gb-branch-tag" });

	if (panel.titles.length) {
		const editable = !panel.pr;
		const list = root.createDiv({ cls: "gb-findings-list" });
		for (const one of panel.titles) {
			const item = list.createEl("label", { cls: "gb-findings-item gb-branch-title" });
			const input = item.createEl("input", { type: "radio", attr: { name: `gb-pr-title-${record.dir}`, title: editable ? "Use this title" : "Retitle the open PR on GitHub" } });
			input.checked = one.chosen;
			input.disabled = !editable;
			input.onchange = () => void choose(app, record, one.title);
			item.createSpan({ text: one.title, cls: one.chosen ? "" : "gb-findings-out" });
			if (!one.listed) item.createSpan({ text: " (not in pr_titles.md)", cls: "gb-findings-summary" });
		}
		if (editable && panel.chosen) {
			const clear = root.createDiv({ cls: "gb-record-row" }).createEl("button", { text: "✕ Clear title", cls: "gb-record-chip gb-record-chip-quiet", attr: { title: "Remove pr_title; Open PR takes the first option" } });
			clear.onclick = () => void choose(app, record, null);
		}
	}

	if (panel.preview !== null) {
		const box = root.createEl("details", { cls: "gb-findings-details" });
		box.createEl("summary", { text: "Preview PR" });
		const body = box.createDiv({ cls: "gb-findings-body" });
		let filled = false;
		const sync = () => {
			if (!box.open || filled) return;
			filled = true;
			void MarkdownRenderer.render(app, panel.preview!, body, `${record.dir}/pr_description.md`, component);
		};
		box.open = state.previewOpen;
		sync();
		box.addEventListener("toggle", () => {
			state.previewOpen = box.open;
			sync();
		});
	}
}
