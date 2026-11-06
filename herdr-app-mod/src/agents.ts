// galaxy-brain sidebar for the Herdr app: every terminal grouped by agent dir, each row
// harness icon, machine icon, launch name · title, and status. Modeled on the shipped `agents` mod.
// + and each agent dir's routines start a new agent (the Chrome native host's newAgent, through the
// herdr-plugin CLI); the same mod draws the sidebar header and the New agent popup, chosen by props().view.

import { div, image, svg, View } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { closeOverlay, focused, layout, notify, openOverlay, panes, props, run, setAgentOrder, setShared, shared, spaces, terminals, theme, window } from "herdr";
import type { Routine } from "../../obsidian-plugin/src/agent-routines";
import type { Environment } from "../../obsidian-plugin/src/environments";
import { machineOf } from "./context";
import { appHost, host, knownEnvironments, logRenderFailures, refreshEnvironments } from "./host";
import { groupPanes, machineIcon, OTHER, RANK, rowText, type SidebarGroup, type SidebarPane } from "./sidebar";

const MOD = "gb-agents";
const ERROR_POLL_MS = 60_000;

interface NewAgentOptions {
	agentDirs: string[];
	profiles: { name: string; agent: string }[];
	/** Names; the first is the default. */
	environments: string[];
	/** Per agent dir. */
	routines: Record<string, Routine[]>;
}

/** Shows the agent board's tab, opening it if needed. */
function openBoard() {
	const open = panes().find((p: any) => p.mod === "gb-board");
	if (open) run("pane.focus", { pane: open.pane });
	else run("tab.new", { name: "🧠 Agents", mod: "gb-board" });
}

/** Starts a blank agent in the dir; a toast says how it went. */
async function newAgent(dir: string, profile?: string, environment?: string, routine?: Routine): Promise<void> {
	const label = routine ? `${routine.label} · ${dir}` : dir;
	notify({ title: `Starting ${label}`, body: [profile, environment].filter(Boolean).join(" · ") || undefined, level: "info", timeout: 3000 });
	try {
		await host({ type: "newAgent", dir, ...(profile ? { profile } : {}), ...(environment ? { environment } : {}), ...(routine ? { name: routine.name, prompt: routine.task.prompt } : {}) });
	} catch (error) {
		notify({ title: `${label} not started`, body: error instanceof Error ? error.message : String(error), level: "error" });
	}
}

function smallButton(t: any, id: string, label: El, tooltip: string, action: (cx: Cx) => void): El {
	return div()
		.id(id)
		.flex_none()
		.px(4)
		.rounded(4)
		.text_color(t.dim)
		.cursor_pointer()
		.hover((s: El) => s.bg(t.hover).text_color(t.foreground))
		.tooltip(tooltip)
		.on_click((_e: unknown, cx: Cx) => {
			cx.stop_propagation();
			action(cx);
		})
		.child(label);
}

type Cx = any;
type El = any;

function find(node: any, id: string): any {
	if (node?.id === id) return node;
	for (const child of node?.children ?? []) {
		const found = find(child, id);
		if (found) return found;
	}
	return null;
}

// The rail goes by the sidebar's width, as in the shipped mods.
const narrow = () => (find(layout(), "sidebar")?.size?.px ?? Infinity) < 160;

// To the rail (on macOS wide enough for the traffic lights), or back to the width it had.
function toggleSidebar() {
	const width = find(layout(), "sidebar")?.size?.px;
	if (!narrow()) setShared("sidebar.width", width);
	setShared("sidebar.collapsed", !narrow());
	run("layout.resize", { id: "sidebar", px: narrow() ? (shared("sidebar.width") ?? 268) : window()?.platform === "macos" ? 76 : 44 });
}

function programIcon(program: any, size: number, color: string): El | null {
	if (!program?.icon) return null;
	return program.tint ? svg(program.icon).size(size).flex_none().text_color(color) : image(program.icon).w(size).h(size).flex_none();
}

function statusMark(t: any, status: string | null, compact = false): El {
	if (status === "working") return svg("mods/workspace-chrome/spinner.svg").size(12).mx(1).flex_none().text_color(t.working).spin(900);
	if (status === "blocked" && compact) return div().size(14).flex_none().rounded(4).bg(`${t.blocked}26`).text_size(10.5).font_bold().text_color(t.blocked).flex().items_center().justify_center().child("!");
	if (status === "blocked") return div().flex_none().px(6).h(18).rounded(5).bg(`${t.blocked}26`).text_size(10.5).font_semibold().text_color(t.blocked).flex().items_center().child("Needs you");
	if (status === "idle") return div().size(7).mx(3).flex_none().rounded(4).border(1.5).border_color(t.idle ?? t.dim);
	return div().size(7).mx(3).flex_none().rounded(4).bg(status === "done" ? t.done : `${t.dim}00`);
}

const top = (rows: SidebarPane[]) => rows.reduce<string | null>((m, r) => ((RANK[r.status ?? ""] ?? 0) > (RANK[m ?? ""] ?? 0) ? r.status : m), null);

export default class GbAgents extends View {
	declare folded: Set<string>;
	declare environments: Environment[];
	declare options: NewAgentOptions | null;
	/** New agent popup: the chosen environment, and the dir whose profiles are shown. */
	declare environment: string | null;
	declare profilesFor: string | null;

	init(_props: unknown, cx: Cx) {
		if (props()?.view === "header") return;
		this.folded = new Set();
		this.environments = knownEnvironments();
		this.options = null;
		this.environment = null;
		this.profilesFor = null;
		cx.spawn(async (cx: Cx) => {
			const [environments, options] = await Promise.all([refreshEnvironments().catch(() => this.environments), host({ type: "lookup" }).catch(() => null)]);
			this.environments = environments;
			this.options = options;
			this.environment = options?.environments[0] ?? null;
			cx.notify();
		});
		// The sidebar list is the one copy that's always there.
		if (props()?.view === undefined) {
			const logErrors = (cx: Cx) => cx.spawn(async () => appHost({ type: "logStatusErrors" }).catch(() => undefined));
			logErrors(cx);
			cx.timer.every(ERROR_POLL_MS, logErrors);
		}
	}

	render(_cx: Cx): El {
		const t = theme();
		if (props()?.view === "new") return this.renderNew(t);
		if (props()?.view === "header") return this.renderHeader(t);
		const compact = narrow();
		const names = new Map<string, string | null>(terminals().map((one: any) => [one.address, one.name ?? null]));
		const allSpaces = spaces();
		const shown = focused()?.pane;
		const groups = groupPanes(
			panes().map((p: any) => ({ ...p, title: p.title ?? "", name: p.terminal ? (names.get(p.terminal) ?? null) : null, machine: machineOf(p.tab, allSpaces) })),
		);
		setAgentOrder(groups.flatMap((g) => g.rows.filter((r) => r.program.agent).map((r) => r.terminal)));
		const rows = compact
			? groups.flatMap((g) => g.rows.map((r) => this.railRow(t, r, shown)))
			: groups.flatMap((g) => [this.header(t, g), ...(this.folded.has(g.id) ? [] : g.rows.map((r) => this.row(t, r, shown)))]);
		return v_flex()
			.size_full()
			.min_h(0)
			.bg(t.chrome)
			.border_t(1)
			.border_color(t.border)
			.text_size(13)
			.when(!rows.length && !compact, (el: El) => el.child(div().px(16).pt(14).text_size(12).text_color(t.dim).child("No terminals yet.")))
			.child(v_flex().id("gb-ag-list").flex_1().min_h(0).px(compact ? 0 : 8).pt(6).overflow_y_scrollbar().mode("always").children(rows))
			.when(compact, (el: El) =>
				el.child(
					h_flex()
						.h(28)
						.flex_none()
						.items_center()
						.justify_center()
						.child(div().id("gb-ag-expand").text_size(13).text_color(t.dim).hover((s: El) => s.text_color(t.foreground)).on_click(toggleSidebar).child("»")),
				),
			);
	}

	// The sidebar header: the shipped one's search and collapse, with 🧠 and + (its footer stays shipped).
	renderHeader(t: any): El {
		const collapsed = narrow();
		const mac = window()?.platform === "macos";
		const button = (id: string, tooltip: string, icon: string, action: () => void) =>
			div()
				.id(id)
				.size(26)
				.flex_none()
				.flex()
				.items_center()
				.justify_center()
				.rounded(6)
				.text_color(t.muted)
				.hover((s: El) => s.bg(t.hover).text_color(t.foreground))
				.tooltip(tooltip)
				.on_mouse_down("left", (_e: unknown, cx: Cx) => cx.stop_propagation())
				.on_click(action)
				.child(svg(`mods/workspace-chrome/${icon}.svg`).size(15));
		return h_flex()
			.size_full()
			.bg(t.chrome)
			.pl(collapsed ? 6 : 14)
			.pr(10)
			.gap(4)
			.items_center()
			.when(mac && !window()?.fullscreen && !collapsed, (el: El) => el.pl(76))
			.when(!collapsed, (el: El) =>
				el
					.child(
						div()
							.flex_1()
							.child(
								div()
									.id("gb-ag-board")
									.w(26)
									.text_size(18)
									.cursor_pointer()
									.tooltip("Agent board")
									.on_mouse_down("left", (_e: unknown, cx: Cx) => cx.stop_propagation())
									.on_click(openBoard)
									.child("🧠"),
							),
					)
					.child(button("gb-ag-new", "New agent", "plus", () => openOverlay({ mod: MOD, kind: "popup", width: 340, props: { view: "new" } })))
					.child(button("gb-ag-search", "Search", "search", () => run("mod.open", { name: "picker" }))),
			)
			.when(!(collapsed && mac), (el: El) => el.child(button("gb-ag-toggle", "Collapse sidebar", "sidebar", toggleSidebar)));
	}

	/** A button per routine the agent dir has. */
	routineButtons(t: any, key: string, dir: string, start: (cx: Cx, routine: Routine) => void): El[] {
		return (this.options?.routines?.[dir] ?? []).map((routine, i) => smallButton(t, `gb-rt-${key}-${dir}-${i}`, routine.emoji, `${routine.label} · ${dir}: ${routine.task.prompt}`, (cx) => start(cx, routine)));
	}

	// A group's header folds it; folded, it shows the count and the most urgent state.
	header(t: any, g: SidebarGroup): El {
		const open = !this.folded.has(g.id);
		const urgent = top(g.rows);
		return h_flex()
			.id(g.id)
			.px(8)
			.pt(8)
			.h(30)
			.flex_none()
			.gap(6)
			.items_center()
			.text_size(11)
			.font_medium()
			.text_color(t.dim)
			.cursor_pointer()
			.hover((s: El) => s.text_color(t.foreground))
			.on_click((_e: unknown, cx: Cx) => {
				open ? this.folded.add(g.id) : this.folded.delete(g.id);
				cx.notify();
			})
			.child(div().truncate().child(g.label))
			.child(div().child(String(g.rows.length)))
			.child(div().flex_1())
			.when(g.label !== OTHER && Boolean(this.options?.agentDirs.includes(g.label)), (el: El) =>
				el
					.children(this.routineButtons(t, "group", g.label, (cx, routine) => cx.spawn(async () => newAgent(g.label, routine.task.profile, undefined, routine))))
					.child(smallButton(t, `gb-ag-add-${g.label}`, "+", `New ${g.label} agent`, () => void newAgent(g.label))),
			)
			.when(!open, (el: El) =>
				el
					.when(Boolean(urgent && urgent !== "idle"), (el: El) => el.child(statusMark(t, urgent, true)))
					.child(svg("mods/workspace-chrome/chevron-right.svg").size(11).flex_none()),
			);
	}

	row(t: any, r: SidebarPane, shown: string | null | undefined): El {
		const { name, detail } = rowText(r);
		const pic = programIcon(r.program, 16, t.foreground);
		const where = machineIcon(r.machine, this.environments);
		const on = r.pane === shown;
		const idle = (r.status === "idle" || !r.status) && !on;
		return h_flex()
			.id(`gb-ag-${r.pane}`)
			.px(8)
			.h(30)
			.flex_none()
			.rounded(8)
			.items_center()
			.gap(7)
			.when(on, (el: El) => el.bg(t.selected))
			.cursor_pointer()
			.hover((s: El) => s.bg(t.hover))
			.on_click(() => run("pane.focus", { pane: r.pane }))
			.when(Boolean(pic), (el: El) => el.child(pic))
			.when(Boolean(where), (el: El) => el.child(div().flex_none().text_size(12).child(where)))
			.when(!where && Boolean(r.machine), (el: El) => el.child(div().flex_none().text_size(10).text_color(t.dim).child(r.machine)))
			.child(
				h_flex()
					.flex_1()
					.min_w(0)
					.gap(5)
					.items_center()
					.child(div().min_w(0).max_w(detail ? 120 : 200).truncate().text_color(idle ? t.muted : t.foreground).child(name))
					.when(Boolean(detail), (el: El) => el.child(div().flex_1().min_w(0).truncate().text_color(t.dim).child(`· ${detail}`))),
			)
			.child(statusMark(t, r.status));
	}

	railRow(t: any, r: SidebarPane, shown: string | null | undefined): El {
		const pic = programIcon(r.program, 14, t.foreground);
		return h_flex()
			.id(`gb-ag-${r.pane}`)
			.h(26)
			.px(8)
			.flex_none()
			.items_center()
			.justify_between()
			.when(r.pane === shown, (el: El) => el.bg(t.selected))
			.hover((s: El) => s.bg(t.hover))
			.on_click(() => run("pane.focus", { pane: r.pane }))
			.child(pic ?? div())
			.child(h_flex().w(14).flex_none().items_center().justify_center().child(statusMark(t, r.status, true)));
	}

	// Popup: the machine, then each agent dir with its routines, ⚡ (default profile) and ⚙️ (pick a profile).
	renderNew(t: any): El {
		const options = this.options;
		const overlay = props()?.overlay;
		const start = (cx: Cx, dir: string, profile?: string, routine?: Routine) => {
			const environment = this.environment ?? undefined;
			closeOverlay(overlay);
			cx.spawn(async () => newAgent(dir, profile, environment, routine));
		};
		const row = (id: string, label: El) => h_flex().id(id).h(28).px(8).gap(6).items_center().rounded(6).hover((s: El) => s.bg(t.hover)).child(label);
		const machines = (options?.environments ?? []).map((name) => {
			const on = name === this.environment;
			const icon = this.environments.find((e) => e.name === name)?.icon;
			return h_flex()
				.id(`gb-env-${name}`)
				.h(24)
				.px(8)
				.gap(4)
				.items_center()
				.rounded(6)
				.border_1()
				.border_color(on ? t.accent : t.border)
				.bg(on ? t.selected : t.popover)
				.cursor_pointer()
				.on_click((_e: unknown, cx: Cx) => {
					this.environment = name;
					cx.notify();
				})
				.when(Boolean(icon), (el: El) => el.child(icon))
				.child(name);
		});
		const body = !options
			? [div().px(8).py(6).text_color(t.dim).child("Loading…")]
			: this.profilesFor
				? [
						row("gb-pf-back", div().text_color(t.dim).child(`‹ ${this.profilesFor}`)).cursor_pointer().on_click((_e: unknown, cx: Cx) => {
							this.profilesFor = null;
							cx.notify();
						}),
						...options.profiles.map((p, i) =>
							row(`gb-pf-${i}`, div().flex_1().truncate().child(p.name))
								.child(div().text_size(11).text_color(t.dim).child(p.agent))
								.cursor_pointer()
								.on_click((_e: unknown, cx: Cx) => start(cx, this.profilesFor!, p.name)),
						),
					]
				: options.agentDirs.map((dir) =>
						row(`gb-dir-${dir}`, div().flex_1().truncate().child(dir))
							.children(this.routineButtons(t, "new", dir, (cx, routine) => start(cx, dir, routine.task.profile, routine)))
							.child(smallButton(t, `gb-dir-go-${dir}`, "⚡", "Blank agent, default profile", (cx) => start(cx, dir)))
							.child(
								smallButton(t, `gb-dir-pf-${dir}`, "⚙️", "Pick a profile", (cx) => {
									this.profilesFor = dir;
									cx.notify();
								}),
							),
					);
		return v_flex()
			.id("gb-new")
			.w_full()
			.p(8)
			.gap(2)
			.bg(t.popover)
			.text_size(12.5)
			.text_color(t.foreground)
			.child(div().px(8).pb(4).text_size(11).text_color(t.dim).child("New agent"))
			.when(machines.length > 1, (el: El) => el.child(h_flex().px(6).pb(6).gap(6).children(machines)))
			.children(body);
	}
}

logRenderFailures(MOD, GbAgents);
