// The record page's branch PR panel: status, PR files, labels, a title picker and the PR preview. The host
// computes it (herdr-plugin/src/branch-host.ts); this only draws it and reports clicks.

import { div } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import type { BranchPanel } from "../../obsidian-plugin/src/branch-panel";
import { statusTone, type Tone } from "../../review-factory/src/landing";
import { chip } from "./chip";
import type { MarkdownBlock } from "./markdown-blocks";
import { type MarkdownHost, renderMarkdown } from "./markdown-view";

type Cx = any;
type El = any;

export interface BranchUi {
	previewOpen: boolean;
	togglePreview(cx: Cx): void;
	preview(text: string): MarkdownBlock[];
	markdownHost(scope: string): MarkdownHost;
	openFile(name: string, cx: Cx): void;
	/** Null clears it. */
	setTitle(title: string | null, cx: Cx): void;
}

const toneColor = (t: any, tone: Tone) => ({ ready: t.ansi2, trim: t.ansi3, warning: t.ansi3, blocked: t.blocked })[tone];

function titleRow(t: any, ui: BranchUi, editable: boolean, one: BranchPanel["titles"][number], i: number): El {
	return h_flex()
		.id(`gb-br-title-${i}`)
		.gap(6)
		.items_start()
		.when(editable && !one.chosen, (el: El) => el.cursor_pointer().on_click((_e: unknown, cx: Cx) => ui.setTitle(one.title, cx)))
		.tooltip(editable ? (one.chosen ? "The chosen title" : "Use this title") : "Retitle the open PR on GitHub")
		.child(div().w(20).flex_none().text_color(one.chosen ? t.foreground : t.dim).child(one.chosen ? "◉" : "○"))
		.child(div().flex_1().min_w(0).text_color(one.chosen ? t.foreground : t.muted).child(one.title))
		.when(!one.listed, (el: El) => el.child(div().flex_none().text_size(11).text_color(t.dim).child("not in pr_titles.md")));
}

export function renderBranchPanel(t: any, panel: BranchPanel, ui: BranchUi): El {
	const editable = !panel.pr;
	return v_flex()
		.id("gb-branch")
		.gap(8)
		.p(10)
		.rounded(6)
		.border_1()
		.border_color(t.border)
		.child(div().text_size(11.5).font_semibold().text_color(t.dim).child(panel.pr ? `Pull request · #${panel.pr}` : "Pull request"))
		.child(div().font_semibold().text_color(toneColor(t, statusTone(panel.status))).child(panel.status))
		.children(panel.warnings.map((line) => div().text_size(12).text_color(toneColor(t, statusTone(line))).child(line)))
		.child(
			h_flex()
				.flex_wrap()
				.gap(4)
				.items_center()
				.children(panel.files.map((one, i) => chip(t, `gb-br-file-${i}`, one.label, `Show ${one.name}`, false, (cx) => ui.openFile(one.name, cx))))
				.when(panel.checklist !== null, (el: El) => el.child(div().text_size(12).text_color(t.dim).child(`☑ ${panel.checklist!.done}/${panel.checklist!.total}`)))
				.children(panel.tags.map((tag) => div().px(5).rounded(4).bg(t.raised).text_size(11.5).text_color(t.muted).child(tag))),
		)
		.when(panel.titles.length > 0, (el: El) => el.child(v_flex().gap(4).children(panel.titles.map((one, i) => titleRow(t, ui, editable, one, i)))))
		.when(editable && panel.chosen !== null, (el: El) => el.child(h_flex().child(chip(t, "gb-br-clear", "✕ Clear title", "Remove pr_title; Open PR takes the first option", false, (cx) => ui.setTitle(null, cx)))))
		.when(panel.preview !== null, (el: El) =>
			el.child(
				v_flex()
					.gap(6)
					.child(h_flex().child(chip(t, "gb-br-preview", `${ui.previewOpen ? "▾" : "▸"} Preview PR`, "The title and body Open PR would post", ui.previewOpen, (cx) => ui.togglePreview(cx))))
					.when(ui.previewOpen, (el: El) => el.child(div().pl(10).border_l(2).border_color(t.border).child(renderMarkdown(t, ui.preview(panel.preview!), ui.markdownHost("br-preview"))))),
			),
		);
}
