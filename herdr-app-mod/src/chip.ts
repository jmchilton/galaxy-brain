// The clickable labels shared by the mods' tabs.

import { div } from "gpui-kit";
import { h_flex } from "gpui-base";

/** A heading in a row of them, underlined when it's the one showing, with its count. */
export function sectionTab(t: any, id: string, label: string, count: number | null, active: boolean, click: (cx: any) => void): any {
	return h_flex()
		.id(id)
		.gap(6)
		.pb(6)
		.border_b(2)
		.border_color(active ? t.solid : `${t.solid}00`)
		.cursor_pointer()
		.text_size(12.5)
		.font_medium()
		.text_color(active ? t.foreground : t.dim)
		.on_click((_e: unknown, cx: any) => {
			click(cx);
			cx.notify();
		})
		.child(label)
		.when(count !== null, (el: any) => el.child(div().text_color(t.dim).child(String(count))));
}

export function chip(t: any, id: string, label: string, tooltip: string | undefined, active: boolean, click: (cx: any) => void): any {
	return div()
		.id(id)
		.px(6)
		.py(1)
		.rounded(5)
		.flex_none()
		.cursor_pointer()
		.text_size(12)
		.border_1()
		.border_color(t.border)
		.text_color(active ? t.foreground : t.muted)
		.when(active, (el: any) => el.bg(t.hover))
		.hover((s: any) => s.bg(t.hover).text_color(t.foreground))
		.when(Boolean(tooltip), (el: any) => el.tooltip(tooltip))
		.on_click((_e: unknown, cx: any) => {
			click(cx);
			cx.notify();
		})
		.child(label);
}
