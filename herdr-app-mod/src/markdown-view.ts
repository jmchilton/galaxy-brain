// Draws markdownBlocks() in a mod: TextView for the markdown, disclosure rows and colored bars for the rest.

import { div } from "gpui-kit";
import { h_flex, TextView, v_flex } from "gpui-base";
import type { AlertKind, MarkdownBlock } from "./markdown-blocks";

type Cx = any;
type El = any;

export interface MarkdownHost {
	/** Unique for the document, as TextView keeps its state by id. */
	id: string;
	isOpen(key: string, initial: boolean): boolean;
	setOpen(key: string, open: boolean, cx: Cx): void;
	onLink(url: string, cx: Cx): void;
}

const ALERTS: Record<AlertKind, { title: string; color: (t: any) => string }> = {
	note: { title: "ℹ️ Note", color: (t) => t.ansi4 },
	tip: { title: "💡 Tip", color: (t) => t.ansi2 },
	important: { title: "❗ Important", color: (t) => t.ansi5 },
	warning: { title: "⚠️ Warning", color: (t) => t.ansi3 },
	caution: { title: "🛑 Caution", color: (t) => t.ansi1 },
};

function renderDetails(t: any, block: Extract<MarkdownBlock, { type: "details" }>, key: string, host: MarkdownHost): El {
	const open = host.isOpen(key, block.open);
	return v_flex()
		.gap(6)
		.child(
			h_flex()
				.id(`${host.id}-toggle-${key}`)
				.gap(6)
				.px(6)
				.py(3)
				.rounded(6)
				.items_center()
				.cursor_pointer()
				.hover((s: El) => s.bg(t.hover))
				.on_click((_e: unknown, cx: Cx) => {
					host.setOpen(key, !open, cx);
					cx.notify();
				})
				.child(div().flex_none().text_color(t.dim).child(open ? "▾" : "▸"))
				.child(div().flex_1().min_w(0).font_semibold().child(block.summary)),
		)
		.when(open, (el: El) => el.child(v_flex().gap(8).pl(14).border_l(2).border_color(t.border).child(renderMarkdown(t, block.blocks, host, `${key}.`))));
}

function renderAlert(t: any, block: Extract<MarkdownBlock, { type: "alert" }>, key: string, host: MarkdownHost): El {
	const { title, color } = ALERTS[block.kind];
	return v_flex()
		.gap(6)
		.px(12)
		.py(6)
		.border_l(3)
		.border_color(color(t))
		.child(div().font_semibold().text_color(color(t)).child(title))
		.child(renderMarkdown(t, block.blocks, host, `${key}.`));
}

export function renderMarkdown(t: any, blocks: readonly MarkdownBlock[], host: MarkdownHost, prefix = ""): El {
	return v_flex()
		.gap(8)
		.children(
			blocks.map((block, i) => {
				const key = `${prefix}${i}`;
				if (block.type === "details") return renderDetails(t, block, key, host);
				if (block.type === "alert") return renderAlert(t, block, key, host);
				return TextView.markdown(`${host.id}-${key}`, block.text).selectable(true).on_link_click((url: string, cx: Cx) => host.onLink(url, cx));
			}),
		);
}
