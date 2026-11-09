// The record page's findings panel: the round's status, notes, actions, findings and previews. The host
// computes all of it (herdr-plugin/src/findings-host.ts); this only draws it and reports clicks.

import { div } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import type { FindingsPanel } from "../../herdr-plugin/src/findings-types";
import type { Action } from "../../review-factory/src/model";
import type { LandingFinding } from "../../review-factory/src/landing";
import { chip } from "./chip";
import type { MarkdownBlock } from "./markdown-blocks";
import { type MarkdownHost, renderMarkdown } from "./markdown-view";
import { noteLabel, statusTone } from "./record-page";

type Cx = any;
type El = any;

export interface FindingsUi {
	/** Finding ids, FILTERED and previews, opened by hand. */
	opened: Set<string>;
	blocks(text: string): MarkdownBlock[];
	markdownHost(scope: string): MarkdownHost;
	setInclude(id: string, include: boolean, cx: Cx): void;
	setAction(action: Action, checked: boolean, cx: Cx): void;
	openNote(name: string, cx: Cx): void;
}

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

function findingRow(t: any, ui: FindingsUi, f: LandingFinding): El {
	const key = safeId(f.id);
	const open = ui.opened.has(f.id);
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
						.when(Boolean(f.text), (el: El) => el.cursor_pointer().on_click((_e: unknown, cx: Cx) => toggle(ui, f.id)(cx)))
						.child(
							h_flex()
								.gap(6)
								.child(div().flex_none().text_color(t.dim).child(f.text ? (open ? "▾" : "▸") : " "))
								.child(div().flex_none().font_semibold().child(f.id))
								.child(div().flex_1().min_w(0).text_color(f.include ? t.foreground : t.muted).child(f.title))
								.when(f.fixedIn.length > 0, (el: El) => el.child(div().flex_none().text_size(11).text_color(t.dim).child(`🌿 ${f.fixedIn.join(", ")}`))),
						)
						.child(div().pl(16).text_size(12).text_color(t.dim).child(detail)),
				),
		)
		.when(open && Boolean(f.text), (el: El) => el.child(div().pl(26).child(renderMarkdown(t, ui.blocks(f.text!), ui.markdownHost(`fd-${key}`)))));
}

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
	const tone = statusTone(landing.status);
	const filteredOpen = ui.opened.has(FILTERED);
	return root
		.child(title)
		.child(div().font_semibold().text_color(tone === "ready" ? t.ansi2 : tone === "trim" ? t.ansi3 : t.blocked).child(landing.status))
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
