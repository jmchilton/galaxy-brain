// One diff code line, as the review tab and the findings panel draw it.

import { div } from "gpui-kit";
import { h_flex } from "gpui-base";
import { type CodeToken, syntaxGroup } from "../../obsidian-plugin/src/diff-highlight";
import type { DiffRow } from "../../obsidian-plugin/src/diff-review-rows";

type El = any;

/** A line's height; the review tab's virtual list sizes rows by it. */
export const ROW = 20;
/** About 200 ms of highlighting: this run of lines shows plain rather than risk the runtime's time limit. */
export const MAX_HIGHLIGHT_CHARS = 40_000;

function tokenColor(t: any, token: CodeToken): string {
	switch (syntaxGroup(token.scope)) {
		case "keyword":
			return t.ansi5;
		case "string":
			return t.ansi2;
		case "comment":
		case "meta":
			return t.dim;
		case "function":
			return t.ansi4;
		case "type":
			return t.ansi3;
		case "number":
		case "attribute":
			return t.ansi6;
		case "tag":
			return t.ansi1;
		default:
			return t.foreground;
	}
}

/** Both line numbers, a marker (+, − or a thread's 💬), then the tokens. */
export function codeLine(t: any, row: DiffRow, tokens: CodeToken[], { picked = false, thread = false } = {}): El {
	const number = (value: number | undefined) => div().w(38).flex_none().text_right().text_color(t.dim).child(value === undefined ? "" : String(value));
	return h_flex()
		.w_full()
		.h(ROW)
		.flex_none()
		.items_center()
		.when(row.kind === "add", (el: El) => el.bg(`${t.ansi2}18`))
		.when(row.kind === "del", (el: El) => el.bg(`${t.ansi1}18`))
		.when(picked, (el: El) => el.bg(t.selection))
		.child(number(row.oldLine))
		.child(number(row.newLine))
		.child(div().w(22).flex_none().text_center().text_color(t.dim).child(thread ? "💬" : row.kind === "add" ? "+" : row.kind === "del" ? "−" : ""))
		.child(
			h_flex()
				.flex_none()
				.children(tokens.map((token) => div().flex_none().whitespace_nowrap().text_color(tokenColor(t, token)).child(token.text))),
		);
}
