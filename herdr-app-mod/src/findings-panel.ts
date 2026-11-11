// The record page's findings panel: the round's status, notes, actions, findings and previews. The host
// computes all of it (herdr-plugin/src/findings-host.ts); this only draws it and reports clicks.

import { div } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { settings } from "herdr";
import type { FindingsCheck, FindingsPanel } from "../../herdr-plugin/src/findings-types";
import type { CodeToken } from "../../obsidian-plugin/src/diff-highlight";
import type { Action } from "../../review-factory/src/model";
import { type LandingFinding, noteLabel, statusTone, type Tone } from "../../review-factory/src/landing";
import { chip } from "./chip";
import { codeLine, ROW } from "./diff-lines";
import type { MarkdownBlock } from "./markdown-blocks";
import { type MarkdownHost, renderMarkdown } from "./markdown-view";
import { type CommitLines, linesWidth } from "./review-rows";

type Cx = any;
type El = any;

export interface FindingsUi {
	/** Finding ids, FILTERED, previews and commit keys, opened by hand. */
	opened: Set<string>;
	blocks(text: string): MarkdownBlock[];
	markdownHost(scope: string): MarkdownHost;
	setInclude(id: string, include: boolean, cx: Cx): void;
	setAction(action: Action, checked: boolean, cx: Cx): void;
	openNote(name: string, cx: Cx): void;
	/** The last check's output, and whether one runs now. */
	check: FindingsCheck | null;
	checking: boolean;
	runCheck(cx: Cx): void;
	/** A fixing commit's lines; undefined until first opened. */
	commit(sha: string): ShownCommit | "loading" | undefined;
	toggleCommit(sha: string, cx: Cx): void;
}

/** Lines with their tokens, row for row. */
export type ShownCommit = { missing: string } | { files: Array<CommitLines["files"][number] & { tokens: CodeToken[][] }>; hidden: number };

export const commitKey = (sha: string) => `commit:${sha}`;

const FILTERED = "filtered";
const COMMENT_PREVIEW = "preview:comment";
const PR_PREVIEW = "preview:pr";

const safeId = (key: string) => key.replace(/\W/g, "_");

function toggle(ui: FindingsUi, key: string) {
	return (cx: Cx) => {
		if (!ui.opened.delete(key)) ui.opened.add(key);
		cx.notify();
	};
}

function check(t: any, id: string, checked: boolean, tooltip: string, click: (cx: Cx) => void): El {
	return div()
		.id(id)
		.w(20)
		.flex_none()
		.cursor_pointer()
		.text_color(checked ? t.foreground : t.dim)
		.tooltip(tooltip)
		.on_click((_e: unknown, cx: Cx) => click(cx))
		.child(checked ? "☑" : "☐");
}

function heading(t: any, text: string): El {
	return div().text_size(11.5).font_semibold().text_color(t.dim).child(text);
}

function commitBody(t: any, shown: ShownCommit | "loading" | undefined, sha: string): El {
	if (!shown || shown === "loading") return div().pl(16).text_size(12).text_color(t.dim).child("Loading…");
	if ("missing" in shown) return div().pl(16).text_size(12).text_color(t.ansi3).child(`⚠️ ${shown.missing}`);
	const lines = shown.files.flatMap((file) => file.rows);
	return v_flex()
		.rounded(4)
		.border_1()
		.border_color(t.border)
		.font_family(settings().font_family ?? "JetBrains Mono")
		.text_size(12)
		.child(
			div()
				.id(`gb-fd-diff-${safeId(sha)}`)
				.w_full()
				.h(ROW * (lines.length + shown.files.length))
				.overflow_x_scrollbar()
				.child(
					v_flex()
						.min_w(linesWidth(lines))
						.children(
							shown.files.flatMap((file) => [
								h_flex()
									.h(ROW)
									.px(8)
									.gap(8)
									.items_center()
									.bg(t.raised)
									.child(div().flex_none().font_semibold().child(file.path))
									.child(div().flex_none().text_color(t.ansi2).child(`+${file.added}`))
									.child(div().flex_none().text_color(t.ansi1).child(`−${file.removed}`)),
								...file.rows.map((row, i) => codeLine(t, row, file.tokens[i] ?? [{ text: row.text }])),
							]),
						),
				),
		)
		.when(shown.hidden > 0, (el: El) => el.child(div().h(ROW).px(8).text_color(t.dim).child(`… ${shown.hidden} more lines: git show ${sha}`)));
}

function commitRow(t: any, ui: FindingsUi, { sha, subject }: LandingFinding["fixedIn"][number]): El {
	const open = ui.opened.has(commitKey(sha));
	return v_flex()
		.gap(4)
		.child(
			h_flex()
				.id(`gb-fd-commit-${safeId(sha)}`)
				.gap(6)
				.cursor_pointer()
				.tooltip(open ? "Hide the diff" : "Show the diff")
				.on_click((_e: unknown, cx: Cx) => ui.toggleCommit(sha, cx))
				.child(div().flex_none().text_color(t.dim).child(open ? "▾" : "▸"))
				.child(div().flex_none().text_color(t.dim).child(`🌿 ${sha}`))
				.child(div().flex_1().min_w(0).truncate().child(subject)),
		)
		.when(open, (el: El) => el.child(commitBody(t, ui.commit(sha), sha)));
}

function findingRow(t: any, ui: FindingsUi, f: LandingFinding): El {
	const key = safeId(f.id);
	const open = ui.opened.has(f.id);
	const expandable = Boolean(f.text) || f.fixedIn.length > 0;
	const detail = f.filtered ? `${f.filtered.category}: ${f.filtered.reason}` : f.summary;
	return v_flex()
		.gap(4)
		.child(
			h_flex()
				.gap(6)
				.items_start()
				.child(check(t, `gb-fd-in-${key}`, f.include, f.include ? `Leave ${f.id} out` : `Include ${f.id}`, (cx) => ui.setInclude(f.id, !f.include, cx)))
				.child(
					v_flex()
						.id(`gb-fd-row-${key}`)
						.flex_1()
						.min_w(0)
						.when(expandable, (el: El) => el.cursor_pointer().on_click((_e: unknown, cx: Cx) => toggle(ui, f.id)(cx)))
						.child(
							h_flex()
								.gap(6)
								.child(div().flex_none().text_color(t.dim).child(expandable ? (open ? "▾" : "▸") : " "))
								.child(div().flex_none().font_semibold().child(f.id))
								.child(div().flex_1().min_w(0).text_color(f.include ? t.foreground : t.muted).child(f.title))
								.when(f.fixedIn.length > 0, (el: El) => el.child(div().flex_none().text_size(11).text_color(t.dim).child(`🌿 ${f.fixedIn.map((c) => c.sha).join(", ")}`))),
						)
						.child(div().pl(16).text_size(12).text_color(t.dim).child(detail)),
				),
		)
		.when(open && expandable, (el: El) =>
			el.child(
				v_flex()
					.pl(26)
					.gap(6)
					.when(Boolean(f.text), (el: El) => el.child(renderMarkdown(t, ui.blocks(f.text!), ui.markdownHost(`fd-${key}`))))
					.children(f.fixedIn.map((c) => commitRow(t, ui, c))),
			),
		);
}

function checkRow(t: any, ui: FindingsUi): El {
	const lines = ui.check?.message.split("\n").filter(Boolean) ?? [];
	return v_flex()
		.gap(4)
		.child(h_flex().child(chip(t, "gb-fd-check", ui.checking ? "🔍 Checking…" : "🔍 Check before posting", "Every refusal Respond would give, with git: fetches the PR and the review branch", false, (cx) => ui.runCheck(cx))))
		.children(lines.map((line) => div().pl(10).text_size(12).text_color(toneColor(t, statusTone(line))).child(line)));
}

const toneColor = (t: any, tone: Tone) => ({ ready: t.ansi2, trim: t.ansi3, warning: t.ansi3, blocked: t.blocked })[tone];

function preview(t: any, ui: FindingsUi, key: string, label: string, text: string): El {
	const open = ui.opened.has(key);
	return v_flex()
		.gap(6)
		.child(h_flex().child(chip(t, `gb-fd-${safeId(key)}`, `${open ? "▾" : "▸"} ${label}`, "What compose would post, before its checks", open, toggle(ui, key))))
		.when(open, (el: El) => el.child(div().pl(10).border_l(2).border_color(t.border).child(renderMarkdown(t, ui.blocks(text), ui.markdownHost(safeId(key))))));
}

export function renderFindingsPanel(t: any, panel: FindingsPanel, ui: FindingsUi): El {
	const root = v_flex().id("gb-findings").gap(8).p(10).rounded(6).border_1().border_color(t.border);
	const title = heading(t, `Findings · ${panel.file}`);
	const { landing } = panel;
	if (!landing) {
		return root.child(title).child(div().text_color(t.blocked).child(`⚠️ ${panel.file} has errors; fix them to see the findings`)).children(panel.errors.map((error) => div().text_size(12).text_color(t.blocked).child(error)));
	}
	const filteredOpen = ui.opened.has(FILTERED);
	return root
		.child(title)
		.child(div().font_semibold().text_color(toneColor(t, statusTone(landing.status))).child(landing.status))
		.when(landing.errors.length > 1, (el: El) => el.children(landing.errors.slice(1).map((error) => div().text_size(12).text_color(t.blocked).child(`⛔ ${error}`))))
		.children(landing.warnings.map((warning) => div().text_size(12).text_color(t.ansi3).child(`⚠️ ${warning}`)))
		.child(
			h_flex()
				.flex_wrap()
				.gap(4)
				.children(landing.notes.map((note, i) => chip(t, `gb-fd-note-${i}`, noteLabel(note), `Edit ${note.name} in Obsidian`, false, (cx) => ui.openNote(note.name, cx)))),
		)
		.child(
			h_flex()
				.flex_wrap()
				.gap(10)
				.children(
					landing.actions.map((one) =>
						h_flex()
							.gap(2)
							.child(check(t, `gb-fd-act-${one.action}`, one.checked, one.checked ? `Uncheck ${one.label}` : `Check ${one.label}`, (cx) => ui.setAction(one.action, !one.checked, cx)))
							.child(div().text_color(one.checked ? t.foreground : t.muted).child(one.label)),
					),
				),
		)
		.child(checkRow(t, ui))
		.child(v_flex().gap(6).children(landing.findings.map((f) => findingRow(t, ui, f))))
		.when(landing.filtered.length > 0, (el: El) =>
			el.child(
				v_flex()
					.gap(6)
					.child(h_flex().child(chip(t, "gb-fd-filtered", `${filteredOpen ? "▾" : "▸"} Filtered (${landing.filtered.length})`, "Left out by the verifier's filters", filteredOpen, toggle(ui, FILTERED))))
					.when(filteredOpen, (el: El) => el.child(v_flex().gap(6).pl(10).children(landing.filtered.map((f) => findingRow(t, ui, f))))),
			),
		)
		.child(preview(t, ui, COMMENT_PREVIEW, "Preview comment", landing.previews.comment))
		.when(landing.previews.pr !== null, (el: El) => el.child(preview(t, ui, PR_PREVIEW, "Preview PR body", landing.previews.pr!)));
}
