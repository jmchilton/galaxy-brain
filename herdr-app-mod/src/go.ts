// galaxy-brain's "go to" popup for the Herdr app: type to filter every record and repository,
// ↑/↓ and Enter to open its tab, Esc to leave. Opened with `mod.open`, from a key or the sidebar.

import { div, svg, View } from "gpui-kit";
import { h_flex, Input, InputState, v_flex } from "gpui-base";
import { closeOverlay, props, theme } from "herdr";
import { type GoIndex, goIndex, type GoRow, goRows, scrollWindow } from "./go-model";
import { appHost, logRenderFailures } from "./host";
import { openRecordTab, openRepositoryTab } from "./record-tab";

const MOD = "gb-go";
const ROW_HEIGHT = 34;
const VISIBLE_ROWS = 11;

type Cx = any;
type El = any;

export default class GbGo extends View {
	declare input: any;
	declare handle: any;
	declare index: GoIndex | null;
	declare error: string | null;
	declare rows: GoRow[];
	/** The selected row, and the first one showing. */
	declare at: number;
	declare first: number;
	/** Wheel movement short of a whole row. */
	declare wheel: number;

	init(_props: unknown, cx: Cx) {
		this.index = null;
		this.error = null;
		this.rows = [];
		this.at = 0;
		this.first = 0;
		this.wheel = 0;
		this.input = InputState.new({ placeholder: "Go to a record or repository…" });
		this.input.on("change", (_e: unknown, cx: Cx) => {
			this.refilter();
			cx.notify();
		});
		this.input.on("submit", () => this.go(this.rows[this.at]));
		this.input.focus();
		cx.timer.after(600, () => this.input.focus());
		this.handle = cx.focus_handle();
		cx.spawn(async (cx: Cx) => {
			try {
				this.index = goIndex(await appHost({ type: "recordIndex" }));
				this.refilter();
			} catch (error) {
				this.error = String(error);
			}
			cx.notify();
		});
	}

	refilter() {
		if (!this.index) return;
		this.rows = goRows(this.index, this.input.value());
		this.at = 0;
		this.first = 0;
	}

	close() {
		closeOverlay(props().overlay);
	}

	go(row: GoRow | undefined) {
		if (!row) return;
		this.close();
		if (row.type === "repository") openRepositoryTab(row.repo);
		else openRecordTab(row.record.ref);
	}

	render(_cx: Cx): El {
		const t = theme();
		const total = this.rows.length;
		this.first = scrollWindow(this.first, this.at, VISIBLE_ROWS, total);
		return v_flex()
			.id("gb-go")
			.track_focus(this.handle)
			.w_full()
			.min_h(0)
			.p(18)
			.gap(10)
			.bg(t.popover)
			.text_size(13)
			.on_key_down((e: any, cx: Cx) => {
				if (e.key === "escape") return this.close();
				if (!total) return;
				if (e.key === "down") this.at = (this.at + 1) % total;
				else if (e.key === "up") this.at = (this.at + total - 1) % total;
				else return;
				cx.stop_propagation();
				cx.notify();
			})
			.child(
				h_flex()
					.items_center()
					.child(div().flex_1().text_size(15).font_semibold().text_color(t.foreground).child("Go to…"))
					.child(div().text_size(11).text_color(t.dim).child(this.index ? `${total} found · Esc` : "Esc")),
			)
			.child(
				h_flex()
					.h(36)
					.flex_none()
					.px(10)
					.gap(8)
					.items_center()
					.rounded(9)
					.border_1()
					.border_color(t.accent)
					.bg(t.background)
					.child(svg("mods/workspace-chrome/search.svg").size(15).text_color(t.dim))
					.child(Input.new(this.input).flex_1().h_full().text_size(12.8).text_color(t.foreground)),
			)
			.child(this.renderList(t, total));
	}

	renderList(t: any, total: number): El {
		if (!this.index) return div().px(10).py(6).text_color(this.error ? t.blocked : t.dim).child(this.error ?? "Loading…");
		if (!total) return div().px(10).py(6).text_color(t.dim).child("Nothing found.");
		const shown = this.rows.slice(this.first, this.first + VISIBLE_ROWS);
		return v_flex()
			.id("gb-go-list")
			.h(ROW_HEIGHT * shown.length)
			.flex_none()
			.overflow_hidden()
			.on_scroll_wheel((e: any, cx: Cx) => {
				this.wheel += e.delta.y;
				const steps = Math.trunc(this.wheel / ROW_HEIGHT);
				if (!steps) return;
				this.wheel -= steps * ROW_HEIGHT;
				this.first = Math.max(0, Math.min(this.first - steps, total - VISIBLE_ROWS));
				this.at = Math.max(this.first, Math.min(this.at, this.first + VISIBLE_ROWS - 1));
				cx.notify();
			})
			.children(shown.map((row, i) => this.renderRow(t, row, this.first + i)));
	}

	renderRow(t: any, row: GoRow, i: number): El {
		const repository = row.type === "repository";
		const title = repository ? row.repo : row.record.title;
		const detail = repository ? "repository" : `${row.record.ref} · ${row.record.status}`;
		return h_flex()
			.id(`gb-go-${repository ? `repo-${row.repo}` : row.record.ref}`)
			.h(ROW_HEIGHT)
			.flex_none()
			.px(10)
			.gap(8)
			.rounded(7)
			.items_center()
			.cursor_pointer()
			.when(i === this.at, (el: El) => el.bg(t.hover))
			.hover((s: El) => s.bg(t.hover))
			.on_click(() => this.go(row))
			.child(div().flex_none().child(repository ? "📚" : "📓"))
			.child(div().flex_1().min_w(0).truncate().text_color(t.foreground).child(title))
			.child(div().flex_none().max_w(260).truncate().text_size(11).text_color(t.dim).child(detail));
	}
}

logRenderFailures(MOD, GbGo);
