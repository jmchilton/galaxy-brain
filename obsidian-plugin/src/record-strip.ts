import { type App, Menu, setTooltip, TFile, Vault } from "obsidian";
import { type FileDocsSource, fileDocSources, parseFileDocs, recordFileLabel, type RecordFileLink, recordFileLinks } from "../../site/src/lib/file-docs";
import { openRecordLink } from "./blocker-modal";
import { recordLinks } from "./blockers";
import type { RecordRef } from "./launchers";

const OPENABLE = new Set(["md", "png", "jpg", "jpeg", "gif", "webp", "svg"]);

export interface RecordStripAction {
	label: string;
	tooltip: string;
	run: () => void;
}

async function loadSources(app: App, record: RecordRef): Promise<FileDocsSource[]> {
	const loaded = await Promise.all(
		fileDocSources(record.repo, record.kind).map(async (source) => {
			const file = app.vault.getFileByPath(`${source}.md`);
			return file ? [{ source, docs: parseFileDocs(await app.vault.cachedRead(file)) }] : [];
		}),
	);
	return loaded.flat();
}

/** Record-relative paths of the files Obsidian can show. */
function recordFiles(app: App, record: RecordRef): string[] {
	const folder = app.vault.getFolderByPath(record.dir);
	const files: string[] = [];
	if (folder) {
		Vault.recurseChildren(folder, (child) => {
			if (child instanceof TFile && OPENABLE.has(child.extension)) files.push(child.path.slice(record.dir.length + 1));
		});
	}
	return files;
}

/** The landing strip above a record's index.md: its frontmatter references, files with File Docs hints, then launchers. */
export async function renderRecordStrip(app: App, el: HTMLElement, record: RecordRef, launchers: RecordStripAction[]) {
	const { documented, other } = recordFileLinks(recordFiles(app, record), await loadSources(app, record));
	const open = (path: string, event: MouseEvent) => void app.workspace.openLinkText(`${record.dir}/${path}`, "", event.metaKey || event.ctrlKey);
	const chip = (row: HTMLElement, label: string, tooltip: string | undefined, onClick: (event: MouseEvent) => void, cls = "") => {
		const button = row.createEl("button", { text: label, cls: `gb-record-chip ${cls}`.trim() });
		if (tooltip) setTooltip(button, tooltip, { placement: "bottom" });
		button.onclick = onClick;
	};
	const menu = (event: MouseEvent, paths: string[]) => {
		const list = new Menu();
		for (const path of paths) list.addItem((item) => item.setTitle(path).onClick((clicked) => open(path, clicked as MouseEvent)));
		list.showAtMouseEvent(event);
	};
	const link = (row: HTMLElement, one: RecordFileLink) => chip(row, recordFileLabel(one), one.hint, (event) => (one.files ? menu(event, one.files) : open(one.path, event)));

	const index = app.vault.getFileByPath(`${record.dir}/index.md`);
	const related = recordLinks(index ? await app.vault.cachedRead(index) : "", record.repo);
	if (related.length) {
		const row = el.createDiv({ cls: "gb-record-row" });
		for (const one of related) chip(row, one.text, one.label, (event) => openRecordLink(app, one, event), "gb-record-chip-launch");
	}
	const files = el.createDiv({ cls: "gb-record-row" });
	files.createSpan({ text: `${record.kind} · ${record.status}`, cls: "gb-record-where" });
	for (const one of documented) link(files, one);
	if (other.length) chip(files, `Other (${other.length})`, "Files File Docs doesn't describe", (event) => menu(event, other.flatMap((one) => one.files ?? [one.path])), "gb-record-chip-quiet");
	if (!launchers.length) return;
	const actions = el.createDiv({ cls: "gb-record-row" });
	for (const launcher of launchers) chip(actions, launcher.label, launcher.tooltip, launcher.run, "gb-record-chip-launch");
}
