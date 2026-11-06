// The clickable label shared by the record and review tabs.

import { div } from "gpui-kit";

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
