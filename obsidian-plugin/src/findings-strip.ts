// A review record's findings panel in its landing strip: review-factory's panel model, drawn as DOM.
// Desktop only: the model reads the record with Node.

import { type App, type Component, MarkdownRenderer, Notice } from "obsidian";
import { type CommitDiff, type FindingsChange, type FindingsPanel, type LandingFinding, noteLabel, statusTone } from "../../review-factory/src/landing";
import { renderPatch } from "./diff-review-render";
import type { RecordRef } from "./launchers";

// Required lazily: they read the record and git with Node, which doesn't exist on mobile.
const panelModel = () => require("../../review-factory/src/panel") as typeof import("../../review-factory/src/panel");
const commitModel = () => require("../../review-factory/src/commit-diff") as typeof import("../../review-factory/src/commit-diff");

export interface FindingsCheck {
	ok: boolean;
	message: string;
}

/** Kept per record across redraws. */
export interface FindingsStripState {
	/** Finding ids, FILTERED, previews and commit keys, opened by hand. */
	opened: Set<string>;
	check: FindingsCheck | null;
	checking: boolean;
	/** Fixing commits' diffs by sha, and their rendered patches by patch text. */
	commits: Map<string, CommitDiff>;
	diffHtml: Map<string, string>;
}

export interface FindingsHooks {
	vaultRoot: string;
	component: Component;
	state: FindingsStripState;
	runCheck(): void;
}

const FILTERED = "filtered";

async function edit(app: App, record: RecordRef, dir: string, panel: FindingsPanel, change: FindingsChange) {
	try {
		const found = panelModel().findingsEdit(dir, { round: panel.round, ...change });
		const file = found && app.vault.getFileByPath(`${record.dir}/${found.file}`);
		if (!found || !file) return void new Notice("id" in change ? `${change.id} is no longer in ${panel.file}` : `${panel.file} is gone`);
		await app.vault.process(file, found.change);
	} catch (error) {
		new Notice(`${panel.file} not updated: ${error instanceof Error ? error.message : error}`);
	}
}

const toneLine = (el: HTMLElement, line: string, cls = "") => el.createDiv({ text: line, cls: `gb-findings-${statusTone(line)} ${cls}`.trim() });

/** A `<details>` whose markdown renders on first open, and whose state survives a redraw. */
function details(el: HTMLElement, key: string, label: string, hooks: FindingsHooks, fill: (body: HTMLElement) => void): HTMLDetailsElement {
	const box = el.createEl("details", { cls: "gb-findings-details" });
	box.createEl("summary", { text: label });
	const body = box.createDiv({ cls: "gb-findings-body" });
	let filled = false;
	const sync = () => {
		if (box.open && !filled) {
			filled = true;
			fill(body);
		}
	};
	box.open = hooks.state.opened.has(key);
	sync();
	box.addEventListener("toggle", () => {
		if (box.open) hooks.state.opened.add(key);
		else hooks.state.opened.delete(key);
		sync();
	});
	return box;
}

/** A fixing commit's diff, file by file, from the record's PR checkout; git runs once per sha that's there. */
function renderCommit(el: HTMLElement, dir: string, sha: string, state: FindingsStripState) {
	let diff = state.commits.get(sha);
	try {
		diff ??= commitModel().recordCommitDiff(dir, sha);
	} catch (error) {
		diff = { missing: error instanceof Error ? error.message : String(error) };
	}
	if ("missing" in diff) return void el.createDiv({ text: `⚠️ ${diff.missing}`, cls: "gb-findings-warning" });
	state.commits.set(sha, diff);
	const htmlCache = state.diffHtml;
	const box = el.createDiv({ cls: "gbdr gb-findings-diff" });
	for (const file of diff.files) {
		const head = box.createDiv({ cls: "gb-findings-diff-file" });
		head.createSpan({ text: file.path });
		head.createSpan({ text: ` +${file.added} −${file.removed}`, cls: "gb-findings-diff-stat" });
		renderPatch(box, file.patch, file.path, htmlCache);
	}
}

function checkbox(el: HTMLElement, checked: boolean, tooltip: string, onChange: (checked: boolean) => void): HTMLInputElement {
	const input = el.createEl("input", { type: "checkbox", attr: { "aria-label": tooltip, title: tooltip } });
	input.checked = checked;
	input.onchange = () => onChange(input.checked);
	return input;
}

/** Draws the panel into el; draws nothing for a record without findings YAML. */
export function renderFindings(app: App, el: HTMLElement, record: RecordRef, hooks: FindingsHooks) {
	const dir = `${hooks.vaultRoot}/${record.dir}`;
	let panel: FindingsPanel | null;
	try {
		panel = panelModel().findingsPanel(dir);
	} catch (error) {
		el.createDiv({ text: `⛔ Findings: ${error instanceof Error ? error.message : error}`, cls: "gb-findings-blocked" });
		return;
	}
	if (!panel) return;
	const root = el.createDiv({ cls: "gb-findings" });
	root.createDiv({ text: `Findings · ${panel.file}`, cls: "gb-findings-title" });
	const { landing } = panel;
	if (!landing) {
		root.createDiv({ text: `⚠️ ${panel.file} has errors; fix them to see the findings`, cls: "gb-findings-blocked" });
		for (const error of panel.errors) root.createDiv({ text: error, cls: "gb-findings-blocked" });
		return;
	}
	const markdown = (body: HTMLElement, text: string) => void MarkdownRenderer.render(app, text, body, `${record.dir}/index.md`, hooks.component);
	const change = (one: FindingsChange) => void edit(app, record, dir, panel, one);

	toneLine(root, landing.status, "gb-findings-status");
	for (const error of landing.errors.slice(1)) toneLine(root, `⛔ ${error}`);
	for (const warning of landing.warnings) toneLine(root, `⚠️ ${warning}`);

	const notes = root.createDiv({ cls: "gb-record-row" });
	for (const note of landing.notes) {
		const button = notes.createEl("button", { text: noteLabel(note), cls: "gb-record-chip", attr: { title: `Edit ${note.name}` } });
		button.onclick = (event) => void app.workspace.openLinkText(`${record.dir}/${note.name}`, "", event.metaKey || event.ctrlKey);
	}

	const actions = root.createDiv({ cls: "gb-record-row gb-findings-actions" });
	for (const one of landing.actions) {
		const label = actions.createEl("label");
		checkbox(label, one.checked, one.checked ? `Uncheck ${one.label}` : `Check ${one.label}`, (checked) => change({ action: one.action, checked }));
		label.appendText(one.label);
	}

	const checkRow = root.createDiv({ cls: "gb-record-row" });
	const { check, checking } = hooks.state;
	const run = checkRow.createEl("button", { text: checking ? "🔍 Checking…" : "🔍 Check before posting", cls: "gb-record-chip gb-record-chip-launch", attr: { title: "Every refusal Respond would give, with git: fetches the PR and the review branch" } });
	run.disabled = checking;
	run.onclick = () => hooks.runCheck();
	for (const line of check?.message.split("\n").filter(Boolean) ?? []) toneLine(root, line, "gb-findings-check");

	const commit = (body: HTMLElement, { sha, subject }: LandingFinding["fixedIn"][number]) =>
		details(body, `commit:${sha}`, `🌿 ${sha} ${subject}`, hooks, (box) => renderCommit(box, dir, sha, hooks.state)).addClass("gb-findings-commit");
	const row = (list: HTMLElement, f: LandingFinding) => {
		const item = list.createDiv({ cls: "gb-findings-item" });
		checkbox(item, f.include, f.include ? `Leave ${f.id} out` : `Include ${f.id}`, (include) => change({ id: f.id, include }));
		const main = item.createDiv({ cls: "gb-findings-main" });
		const label = `${f.id} ${f.title}${f.fixedIn.length ? ` 🌿 ${f.fixedIn.map((c) => c.sha).join(", ")}` : ""}`;
		const expandable = Boolean(f.text) || f.fixedIn.length > 0;
		const fill = (body: HTMLElement) => {
			if (f.text) markdown(body, f.text);
			for (const c of f.fixedIn) commit(body, c);
		};
		const head = expandable ? details(main, f.id, label, hooks, fill) : main.createDiv({ text: label });
		head.toggleClass("gb-findings-out", !f.include);
		main.createDiv({ text: f.filtered ? `${f.filtered.category}: ${f.filtered.reason}` : f.summary, cls: "gb-findings-summary" });
	};
	const list = root.createDiv({ cls: "gb-findings-list" });
	for (const f of landing.findings) row(list, f);
	if (landing.filtered.length) {
		details(root, FILTERED, `Filtered (${landing.filtered.length})`, hooks, (body) => {
			for (const f of landing.filtered) row(body, f);
		});
	}
	details(root, "preview:comment", "Preview comment", hooks, (body) => markdown(body, landing.previews.comment));
	if (landing.previews.pr !== null) details(root, "preview:pr", "Preview PR body", hooks, (body) => markdown(body, landing.previews.pr!));
}
