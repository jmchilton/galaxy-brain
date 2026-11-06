// galaxy-brain agent board for the Herdr app, a tab whose only pane is this mod: a tile per agent, then
// Tasks, Blockers and Fell Through the Cracks tabs. Launches open gb-pane's draft dialog; the same mod draws its snooze popup.

import { div, View } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { closeOverlay, notify, openOverlay, props, theme, watchFolder } from "herdr";
import type { AgentsTab, Routine } from "../../obsidian-plugin/src/agent-routines";
import { type CrackDay, type MissedPr, missedPrMeta } from "../../obsidian-plugin/src/missed-prs";
import { addDays, linkLabel, type ListedTask, localDay, refinementPrompt, SNOOZES, type Task } from "../../obsidian-plugin/src/task-list";
import { boardChanged, boardCracks, boardTasks, crackKey, splitAgents, taskKey } from "./board-model";
import { host, logRenderFailures } from "./host";
import { markPrReviewed, removeListedTask, snoozeListedTask } from "./note-edits";
import { openRecordTab } from "./record-tab";

export const BOARD_MOD = "gb-board";
const AGENTS_DIR = `${__GB_ROOT__}/vault/agents`;
const POLL_MS = 30_000;

type Cx = any;
type El = any;
type Day = CrackDay & { obsidian: string };

/** The native host's `agents` reply. */
interface Overview {
	agents: Array<{
		dir: string;
		routines: Routine[];
		tasks: ListedTask[];
		blockers: Array<{ agentDir: string; name: string; condition: string; obsidian: string }>;
		cracks?: Day[];
		counts: Array<{ tab: string; count: number; label: string }>;
		error?: string;
	}>;
	profiles: Array<{ name: string }>;
	environments: Array<{ name: string; icon?: string }>;
}

async function openUrl(url: string): Promise<void> {
	await host({ type: "open", url }).catch((error: unknown) => notify({ title: "Not opened", body: String(error), level: "error" }));
}

const delay = (cx: Cx, ms: number) => new Promise<void>((resolve) => cx.timer.after(ms, () => resolve()));

export default class GbBoard extends View {
	declare overview: Overview | null;
	declare error: string | null;
	declare agent: string | null;
	declare tab: AgentsTab;
	/** Tasks and PRs acted on, hidden until the next read shows them gone. */
	declare gone: Set<string>;
	/** Agent tasks whose prompt shows in full, and open PR sections. */
	declare unfolded: Set<string>;

	init(_props: unknown, cx: Cx) {
		if (props()?.view === "snooze") return;
		this.overview = null;
		this.error = null;
		this.agent = props()?.agent ?? null;
		this.tab = "tasks";
		this.gone = new Set();
		this.unfolded = new Set();
		cx.spawn(async (cx: Cx) => this.load(cx));
		cx.spawn(async (cx: Cx) => this.watch(cx));
	}

	async load(cx: Cx) {
		try {
			this.overview = await host({ type: "agents" });
			this.error = null;
			this.gone = new Set();
		} catch (error) {
			this.error = String(error);
		}
		cx.notify();
	}

	/** Reloads on changes to what it shows; polls if the folder can't be watched. */
	async watch(cx: Cx) {
		for (;;) {
			try {
				if (!boardChanged(await watchFolder(AGENTS_DIR), AGENTS_DIR)) continue;
				await delay(cx, 300);
			} catch {
				await delay(cx, POLL_MS);
			}
			await this.load(cx);
		}
	}

	render(_cx: Cx): El {
		const t = theme();
		if (props()?.view === "snooze") return this.renderSnooze(t);
		const root = v_flex().id("gb-board").size_full().min_h(0).bg(t.background).text_color(t.foreground).text_size(13);
		if (!this.overview) return root.child(div().p(16).text_color(t.dim).child(this.error ?? "Loading…"));
		const { agents } = this.overview;
		const shown = agents.filter((one) => this.agent === null || one.dir === this.agent);
		const { busy, quiet } = splitAgents(agents);
		const tasks = boardTasks(agents, this.agent, localDay(), this.gone);
		const blockers = shown.flatMap((one) => one.blockers);
		const hasCracks = shown.some((one) => one.cracks);
		const days = boardCracks(agents, this.agent, this.gone);
		if (this.tab === "cracks" && !hasCracks) this.tab = "tasks";
		return root.child(
			v_flex()
				.id("gb-board-scroll")
				.flex_1()
				.min_h(0)
				.p(16)
				.gap(10)
				.overflow_y_scrollbar()
				.child(this.renderHeader(t))
				.when(this.error !== null, (el: El) => el.child(div().text_color(t.blocked).child(this.error)))
				.children(shown.filter((one) => one.error).map((one) => div().text_color(t.blocked).child(`${one.dir}/TASKS.md: ${one.error}`)))
				.when(this.agent === null, (el: El) =>
					el
						.child(h_flex().flex_wrap().gap(8).children(busy.map((one) => this.renderTile(t, one))))
						.child(h_flex().flex_wrap().gap(8).children(quiet.map((one) => this.renderTile(t, one)))),
				)
				.when(this.agent !== null, (el: El) => el.child(this.renderRoutines(t, shown[0])))
				.child(
					h_flex()
						.gap(16)
						.border_b(1)
						.border_color(t.border)
						.child(this.renderTab(t, "tasks", "Tasks", tasks.length))
						.child(this.renderTab(t, "blockers", "Blockers", blockers.length))
						.when(hasCracks, (el: El) => el.child(this.renderTab(t, "cracks", "Fell Through the Cracks", days.reduce((sum, day) => sum + day.prs.length, 0)))),
				)
				.when(this.tab === "tasks", (el: El) => el.child(this.renderTasks(t, tasks)))
				.when(this.tab === "blockers", (el: El) => el.child(this.renderBlockers(t, blockers)))
				.when(this.tab === "cracks", (el: El) => el.child(this.renderCracks(t, days))),
		);
	}

	renderHeader(t: any): El {
		return h_flex()
			.gap(8)
			.items_center()
			.when(this.agent !== null, (el: El) => el.child(this.action(t, "gb-b-back", "‹ All agents", "All agents", () => this.choose(null))))
			.child(div().flex_1().truncate().text_size(16).font_semibold().child(this.agent ?? "All agents"))
			.child(this.action(t, "gb-b-reload", "↻", "Reload", (cx) => cx.spawn(async (cx: Cx) => this.load(cx))));
	}

	choose(agent: string | null, tab?: AgentsTab) {
		this.agent = agent;
		if (tab) this.tab = tab;
	}

	/** A small borderless button; stays clear of a surrounding click target. */
	action(t: any, id: string, label: string, tooltip: string, click: (cx: Cx) => void): El {
		return div()
			.id(id)
			.px(4)
			.py(1)
			.rounded(5)
			.flex_none()
			.cursor_pointer()
			.text_color(t.dim)
			.hover((s: El) => s.bg(t.hover).text_color(t.foreground))
			.tooltip(tooltip)
			.on_click((_e: unknown, cx: Cx) => {
				cx.stop_propagation();
				click(cx);
				cx.notify();
			})
			.child(label);
	}

	renderRoutineButtons(t: any, agent: Overview["agents"][number], labelled: boolean): El[] {
		return agent.routines.map((routine, i) => {
			const text = labelled ? `${routine.emoji} ${routine.label}` : routine.emoji;
			return this.action(t, `gb-b-r-${agent.dir}-${i}`, text, `${routine.label} · ${agent.dir}: ${routine.task.prompt}`, () => this.openLaunch(`${routine.label} · ${agent.dir}`, routine.task, routine.name));
		});
	}

	renderRoutines(t: any, agent: Overview["agents"][number] | undefined): El {
		return h_flex().gap(8).items_center().children(agent ? this.renderRoutineButtons(t, agent, true) : []);
	}

	// Busy agents get a card; quiet ones a single line.
	renderTile(t: any, agent: Overview["agents"][number]): El {
		const quiet = !agent.counts.length;
		return v_flex()
			.id(`gb-b-tile-${agent.dir}`)
			.w(196)
			.flex_none()
			.gap(4)
			.px(10)
			.py(quiet ? 2 : 8)
			.rounded(8)
			.cursor_pointer()
			.when(!quiet, (el: El) => el.bg(t.raised))
			.hover((s: El) => s.bg(t.hover))
			.on_click((_e: unknown, cx: Cx) => {
				this.choose(agent.dir);
				cx.notify();
			})
			.child(
				h_flex()
					.gap(2)
					.items_center()
					.child(div().flex_1().truncate().text_size(12.5).text_color(quiet ? t.dim : t.foreground).when(!quiet, (el: El) => el.font_medium()).child(agent.dir))
					.children(this.renderRoutineButtons(t, agent, false)),
			)
			.when(!quiet, (el: El) =>
				el.child(
					h_flex()
						.flex_wrap()
						.gap(4)
						.children(
							agent.counts.map((count) =>
								div()
									.id(`gb-b-c-${agent.dir}-${count.tab}`)
									.px(6)
									.rounded(4)
									.text_size(11)
									.bg(t.hover)
									.text_color(count.tab === "cracks" ? t.blocked : t.muted)
									.hover((s: El) => s.text_color(t.foreground))
									.on_click((_e: unknown, cx: Cx) => {
										cx.stop_propagation();
										this.choose(agent.dir, count.tab as AgentsTab);
										cx.notify();
									})
									.child(count.label),
							),
						),
				),
			);
	}

	renderTab(t: any, tab: AgentsTab, label: string, count: number): El {
		const active = this.tab === tab;
		return h_flex()
			.id(`gb-b-tab-${tab}`)
			.gap(6)
			.pb(6)
			.border_b(2)
			.border_color(active ? t.solid : `${t.solid}00`)
			.cursor_pointer()
			.text_size(12.5)
			.font_medium()
			.text_color(active ? t.foreground : t.dim)
			.on_click((_e: unknown, cx: Cx) => {
				this.tab = tab;
				cx.notify();
			})
			.child(label)
			.child(div().text_color(t.dim).child(String(count)));
	}

	renderTasks(t: any, tasks: ListedTask[]): El {
		if (!tasks.length) return div().text_color(t.dim).child("No tasks.");
		return v_flex().gap(8).children(tasks.map((task, i) => this.renderTask(t, task, i)));
	}

	renderTask(t: any, task: ListedTask, i: number): El {
		const human = task.kind === "human";
		const key = taskKey(task);
		const profile = task.profile ?? this.overview!.profiles[0]?.name;
		const unfolded = human || this.unfolded.has(key);
		const badge = (text: string, color: string) => div().flex_none().px(6).rounded(4).text_size(11).bg(`${color}26`).text_color(color).child(text);
		const remove = (cx: Cx) => this.hideWhile(cx, key, () => removeListedTask(task));
		const { record, link } = task;
		const ref = record && `${record.repo}/${record.kind}/${record.name}`;
		return v_flex()
			.id(`gb-b-task-${i}`)
			.gap(6)
			.px(12)
			.py(10)
			.rounded(8)
			.bg(t.raised)
			.when(task.status === "idea", (el: El) => el.bg(`${t.raised}00`).border_1().border_color(t.border))
			.when(task.priority === "high", (el: El) => el.border_l(3).border_color(t.blocked))
			.when(task.priority === "low", (el: El) => el.opacity(0.75))
			.child(
				h_flex()
					.gap(8)
					.items_start()
					.child(div().flex_1().min_w(0).text_size(13.5).child((task.description ?? task.prompt).trim()))
					.when(!human, (el: El) => el.child(this.action(t, `gb-b-go-${i}`, "🚀", "Launch", () => this.openLaunch(`🚀 ${task.agentDir}`, task, task.agentDir, task))))
					.child(this.action(t, `gb-b-ref-${i}`, "🪄", "Discuss task refinement", () => this.openLaunch("🪄 Refine task", { prompt: refinementPrompt(task), agentDir: "factory" }, "refine-task")))
					.child(this.action(t, `gb-b-snz-${i}`, "💤", "Snooze", () => openOverlay({ mod: BOARD_MOD, kind: "popup", width: 160, props: { view: "snooze", task } })))
					.child(this.action(t, `gb-b-rm-${i}`, human ? "✔" : "✖", human ? "Done" : "Remove", remove)),
			)
			.child(
				h_flex()
					.flex_wrap()
					.gap(8)
					.items_center()
					.text_size(11.5)
					.text_color(t.dim)
					.when(Boolean(task.priority), (el: El) => el.child(task.priority === "high" ? badge("high", t.blocked) : badge(task.priority!, t.dim)))
					.when(Boolean(task.status), (el: El) => el.child(badge(task.status!, task.status === "recommended" ? t.muted : t.dim)))
					.when(human, (el: El) => el.child(badge("for John", t.foreground)))
					.child(div().flex_none().child(task.agentDir))
					.when(!human && Boolean(profile), (el: El) => el.child(div().flex_none().child(profile)))
					.when(Boolean(ref), (el: El) => el.child(this.action(t, `gb-b-rec-${i}`, `📓 ${ref}`, "Open record", () => openRecordTab(ref!))))
					.when(Boolean(link), (el: El) => el.child(this.action(t, `gb-b-link-${i}`, `🔗 ${linkLabel(link ?? "")}`, "Open on GitHub", (cx) => cx.spawn(async () => openUrl(link!))))),
			)
			.when(Boolean(task.description), (el: El) =>
				el.child(
					div()
						.id(`gb-b-prompt-${i}`)
						.text_size(12)
						.text_color(human ? t.foreground : t.dim)
						.when(!unfolded, (row: El) => row.truncate())
						.when(!human, (row: El) =>
							row.cursor_pointer().on_click((_e: unknown, cx: Cx) => {
								if (!this.unfolded.delete(key)) this.unfolded.add(key);
								cx.notify();
							}),
						)
						.child(task.prompt.trim()),
				),
			);
	}

	/** Hides a card while its edit runs; it comes back if the edit fails. */
	hideWhile(cx: Cx, key: string, write: () => Promise<boolean>) {
		this.gone.add(key);
		cx.spawn(async (cx: Cx) => {
			if (await write()) return;
			this.gone.delete(key);
			cx.notify();
		});
	}

	// Unreviewed PRs under a heading per day that opens its note.
	renderCracks(t: any, days: Day[]): El {
		if (!days.length) return div().text_color(t.dim).child("Nothing unreviewed.");
		return v_flex().gap(14).children(
			days.map((day) =>
				v_flex()
					.id(`gb-b-day-${day.path}`)
					.gap(8)
					.child(
						h_flex()
							.gap(8)
							.items_center()
							.child(div().id(`gb-b-day-o-${day.path}`).cursor_pointer().font_medium().hover((s: El) => s.text_color(t.solid)).on_click((_e: unknown, cx: Cx) => cx.spawn(async () => openUrl(day.obsidian))).child(day.date))
							.when(this.agent === null, (el: El) => el.child(div().text_size(11.5).text_color(t.dim).child(day.agentDir ?? ""))),
					)
					.when(Boolean(day.error), (el: El) => el.child(div().text_color(t.blocked).child(`${day.path}: ${day.error}`)))
					.children(day.prs.map((pr) => this.renderPr(t, day, pr))),
			),
		);
	}

	renderPr(t: any, day: Day, pr: MissedPr): El {
		const key = crackKey(day.path, pr.pr);
		const id = `${day.date}-${pr.pr}`;
		const sections = ([["Details", pr.details], ["Discussion", pr.discussion]] as const).filter(([, text]) => text);
		const openKey = (label: string) => `${key}\0${label}`;
		return v_flex()
			.id(`gb-b-pr-${id}`)
			.gap(6)
			.px(12)
			.py(10)
			.rounded(8)
			.bg(t.raised)
			.child(
				h_flex()
					.gap(8)
					.items_start()
					.child(this.action(t, `gb-b-pr-l-${id}`, `🔗 #${pr.pr}`, "Open on GitHub", (cx) => cx.spawn(async () => openUrl(pr.url))))
					.child(div().flex_1().min_w(0).text_size(13.5).child(pr.title))
					.child(this.action(t, `gb-b-pr-ok-${id}`, "✔", "Mark reviewed", (cx) => this.hideWhile(cx, key, () => markPrReviewed(day.path, pr.pr)))),
			)
			.child(div().text_size(11.5).text_color(t.dim).child(missedPrMeta(pr)))
			.when(Boolean(pr.summary), (el: El) => el.child(div().text_size(12.5).child(pr.summary!.trim())))
			.when(Boolean(pr.discussionSummary), (el: El) => el.child(div().text_size(12.5).text_color(t.muted).child(`💬 ${pr.discussionSummary!.trim()}`)))
			.when(sections.length > 0, (el: El) =>
				el.child(
					h_flex().gap(8).text_size(11.5).children(
						sections.map(([label]) =>
							this.action(t, `gb-b-pr-${label}-${id}`, `${this.unfolded.has(openKey(label)) ? "▾" : "▸"} ${label}`, label, () => {
								if (!this.unfolded.delete(openKey(label))) this.unfolded.add(openKey(label));
							}),
						),
					),
				),
			)
			.children(sections.filter(([label]) => this.unfolded.has(openKey(label))).map(([label, text]) => div().id(`gb-b-pr-t-${label}-${id}`).text_size(12).text_color(t.dim).child(text!.trim())));
	}

	renderBlockers(t: any, blockers: Overview["agents"][number]["blockers"]): El {
		if (!blockers.length) return div().text_color(t.dim).child("No blockers.");
		return v_flex().gap(8).children(
			blockers.map((blocker, i) =>
				v_flex()
					.id(`gb-b-blk-${i}`)
					.gap(4)
					.px(12)
					.py(10)
					.rounded(8)
					.bg(t.raised)
					.child(
						h_flex()
							.gap(8)
							.items_center()
							.child(div().id(`gb-b-blk-o-${i}`).cursor_pointer().font_medium().hover((s: El) => s.text_color(t.solid)).on_click((_e: unknown, cx: Cx) => cx.spawn(async () => openUrl(blocker.obsidian))).child(blocker.name))
							.when(this.agent === null, (el: El) => el.child(div().text_size(11.5).text_color(t.dim).child(blocker.agentDir))),
					)
					.when(Boolean(blocker.condition), (el: El) => el.child(div().text_size(12).text_color(t.dim).child(blocker.condition))),
			),
		);
	}

	/** Prompt, profile and environment in gb-pane's draft dialog; a listed task leaves its TASKS.md once launched. */
	openLaunch(label: string, task: Task, name: string, listed?: ListedTask) {
		const { profiles, environments } = this.overview!;
		openOverlay({
			mod: "gb-pane",
			kind: "dialog",
			width: 640,
			props: {
				view: "draft",
				label,
				text: task.prompt.trim(),
				launch: { type: "newAgent", dir: task.agentDir, name, profile: task.profile ?? profiles[0]?.name, environment: environments[0]?.name },
				choices: { profiles, environments },
				...(listed ? { task: listed } : {}),
			},
		});
	}

	// Popup: how long to snooze.
	renderSnooze(t: any): El {
		const p = props() ?? {};
		return v_flex()
			.id("gb-b-snooze")
			.w_full()
			.p(6)
			.gap(2)
			.bg(t.popover)
			.text_size(12.5)
			.text_color(t.foreground)
			.children(
				SNOOZES.map(([label, days]) =>
					div()
						.id(`gb-b-sz-${days}`)
						.px(8)
						.py(4)
						.rounded(5)
						.cursor_pointer()
						.hover((s: El) => s.bg(t.hover))
						.on_click((_e: unknown, cx: Cx) => {
							closeOverlay(p.overlay);
							cx.spawn(async () => snoozeListedTask(p.task, addDays(localDay(), days)));
						})
						.child(`💤 ${label}`),
				),
			);
	}
}

logRenderFailures(BOARD_MOD, GbBoard);
