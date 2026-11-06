// galaxy-brain pane header for the Herdr app: the shipped `pane` header (Apache-2.0, herdrdev/herdr-app)
// plus suggested-prompt buttons (📋, emoji quick sends), in agent folders 🚀 record actions, and 📎 the terminal's labelled records.
// The same mod draws its popups and the draft dialog, chosen by props().view.

import { div, image, svg, View } from "gpui-kit";
import { h_flex, Textarea, TextareaState, v_flex } from "gpui-base";
import { closeOverlay, exec, hc, home, notify, openOverlay, panes, props, readTextFile, run, spaces, terminals, theme } from "herdr";
import { parse } from "yaml";
import { type Environment, parseEnvironments } from "../../obsidian-plugin/src/environments";
import { agentContext, folderName, machineOf, promptFiles, recordRefs, reroot } from "./context";
import { host } from "./host";
import { mergePrompts, parsePrompts, quickEmoji, type SuggestedPrompt } from "./prompts";
import { machineIcon } from "./sidebar";
import { removeListedTask } from "./note-edits";
import { openRecordTab } from "./record-tab";

const MOD = "gb-pane";
const ACTIONS_CLI = `${__GB_ROOT__}/herdr-plugin/bin/run.sh`;
const LOCAL_VAULT = `${__GB_ROOT__}/vault`;
const ENVIRONMENTS = `${LOCAL_VAULT}/agents/_shared/ENVIRONMENTS.yml`;

type Cx = any;
type El = any;

function programIcon(program: any, size: number, color: string): El | null {
	if (!program?.icon) return null;
	return program.tint ? svg(program.icon).size(size).flex_none().text_color(color) : image(program.icon).w(size).h(size).flex_none();
}

async function loadPrompts(cwd: string, machine: string | null): Promise<SuggestedPrompt[]> {
	const lists = await Promise.all(
		promptFiles(cwd).map(async (path) => {
			const text = await readTextFile(path, { on: machine }).catch(() => null);
			return text ? parsePrompts(text) : [];
		}),
	);
	return mergePrompts(lists);
}

/** The agent dir's record launchers as prompts, re-rooted to the pane's vault; none when the CLI fails. */
async function loadActions(vaultRoot: string, agentDir: string): Promise<SuggestedPrompt[]> {
	const result = await exec(ACTIONS_CLI, ["actions", agentDir]).catch(() => null);
	if (result?.code !== 0) return [];
	try {
		return (JSON.parse(result.stdout) as { label: string; prompt: string }[]).map(({ label, prompt }) => ({ label, text: reroot(prompt, LOCAL_VAULT, vaultRoot) }));
	} catch {
		return [];
	}
}

/** Types the prompt into the terminal and presses Enter; a toast says why when it can't. */
async function send(terminal: string, pane: string | undefined, text: string): Promise<void> {
	const result = await hc(["send", terminal, text]);
	if (result.code !== 0) {
		notify({ title: "Prompt not sent", body: (result.stderr || result.stdout || `hc send exited ${result.code}`).trim(), level: "error" });
	} else if (pane) {
		run("pane.focus", { pane });
	}
}

/** A dropdown entry, by the name the host knows it by. */
interface Choice {
	name: string;
	icon?: string;
}

interface PaneRecord {
	ref: string;
	/** Null when it isn't in this machine's vault yet. */
	record: {
		key: string;
		kind: string;
		status: string;
		name: string;
		title: string;
		obsidian?: string;
		launchers: { label: string; prompt: string; profile: string }[];
	} | null;
}

/** Opens the URL through the host; a toast says why when it can't. */
async function openUrl(url: string): Promise<void> {
	await host({ type: "open", url }).catch((error: unknown) => notify({ title: "Not opened", body: String(error), level: "error" }));
}

/** Starts a new agent: a record's launcher, or `request.type` when it says otherwise. A toast says how it went. */
async function launch(request: object, label: string, prompt: string): Promise<boolean> {
	notify({ title: `Starting ${label}`, level: "info", timeout: 3000 });
	try {
		await host({ type: "launch", ...request, prompt });
		return true;
	} catch (error) {
		notify({ title: `${label} not started`, body: String(error), level: "error" });
		return false;
	}
}

function button(t: any, id: string, label: El, action: (cx: Cx) => void): El {
	return div()
		.id(id)
		.px(4)
		.py(1)
		.rounded(4)
		.flex_none()
		.text_color(t.dim)
		.hover((s: El) => s.bg(t.hover).text_color(t.foreground))
		.on_click((_e: unknown, cx: Cx) => {
			cx.stop_propagation();
			action(cx);
		})
		.child(label);
}

function textButton(t: any, id: string, text: string, primary: boolean, action: (cx: Cx) => void): El {
	return h_flex()
		.id(id)
		.h(28)
		.px(12)
		.items_center()
		.rounded(7)
		.flex_none()
		.border_1()
		.border_color(primary ? t.solid : t.input)
		.bg(primary ? t.solid : t.raised)
		.text_color(primary ? t.solid_foreground : t.foreground)
		.text_size(12)
		.cursor_pointer()
		.hover((s: El) => s.opacity(0.88))
		.on_click((_e: unknown, cx: Cx) => {
			cx.stop_propagation();
			action(cx);
		})
		.child(text);
}

export default class GbPane extends View {
	declare view: string;
	declare prompts: SuggestedPrompt[];
	declare actions: SuggestedPrompt[];
	declare loadedFor: string | null;
	declare draft: any;
	declare environments: Environment[];
	/** Launch dialog: the chosen profile and environment, and which dropdown is open. */
	declare profile: string | null;
	declare environment: string | null;
	declare menu: string | null;

	init(_props: unknown, cx: Cx) {
		const p = props() ?? {};
		this.view = p.view ?? "header";
		this.prompts = [];
		this.loadedFor = null;
		this.actions = [];
		this.environments = [];
		if (this.view === "header") {
			cx.spawn(async (cx: Cx) => {
				const text = await readTextFile(ENVIRONMENTS).catch(() => null);
				this.environments = text ? parseEnvironments(parse(text)) : [];
				cx.notify();
			});
		}
		if (this.view === "draft") {
			this.profile = p.launch?.profile ?? null;
			this.environment = p.launch?.environment ?? null;
			this.menu = null;
			this.draft = TextareaState.new({ value: p.text ?? "", rows: 10 });
			this.draft.on("submit", (_e: unknown, cx: Cx) => this.sendDraft(cx));
			this.draft.focus();
			cx.timer.after(300, () => this.draft.focus());
		}
	}

	render(cx: Cx): El {
		if (this.view === "prompts") return this.renderPrompts();
		if (this.view === "actions") return this.renderActions();
		if (this.view === "records") return this.renderRecords();
		if (this.view === "draft") return this.renderDraft();
		return this.renderHeader(cx);
	}

	// Header: the shipped pane header plus the galaxy-brain buttons.
	renderHeader(cx: Cx): El {
		const t = theme();
		const p = panes().find((one: any) => one.pane === props()?.pane);
		if (!p) return div();
		const machine = machineOf(p.tab, spaces());
		this.reload(cx, p.cwd, machine);
		const pic = programIcon(p.program, 14, t.dim);
		// An agent's icon stands for its name.
		const tabName = p.mod ? spaces().flatMap((space: any) => space.tabs).find((tab: any) => tab.id === p.tab)?.name : null;
		const name = p.program?.agent && pic ? null : tabName || (p.program?.shell && p.program.name) || p.title || p.program?.name || "shell";
		const where = machineIcon(machine, this.environments);
		const pane = p.pane;
		const terminal = p.terminal;
		const refs = recordRefs(terminals().find((one: any) => one.address === terminal)?.labels);
		const quick = terminal ? this.prompts.flatMap((one: SuggestedPrompt, i: number) => {
			const emoji = quickEmoji(one.label);
			return emoji ? [button(t, `gb-q-${pane}-${i}`, emoji, (cx) => cx.spawn(async () => send(terminal, pane, one.text)))] : [];
		}) : [];
		return h_flex()
			.id(`gb-head-${pane}`)
			.size_full()
			.px(10)
			.gap(6)
			.items_center()
			.bg(t.background)
			.border_b(1)
			.border_color(t.border)
			.text_size(12)
			.on_click(() => run("pane.focus", { pane }))
			.when(Boolean(pic), (el: El) => el.child(pic))
			.when(Boolean(where), (el: El) => el.child(div().flex_none().child(where)))
			.when(!where && Boolean(machine), (el: El) => el.child(div().flex_none().text_size(10).text_color(t.dim).child(machine)))
			.when(Boolean(name), (el: El) => el.child(div().flex_none().truncate().max_w(220).font_medium().text_color(t.foreground).child(name)))
			.child(div().flex_1().truncate().text_color(t.dim).child(folderName(p.cwd, home())))
			.when(p.status === "working", (el: El) => el.child(svg("mods/workspace-chrome/spinner.svg").size(12).flex_none().text_color(t.working).spin(900)))
			.when(p.status === "blocked", (el: El) =>
				el.child(div().flex_none().px(6).h(18).flex().items_center().rounded(5).bg(`${t.blocked}26`).text_size(10.5).font_semibold().text_color(t.blocked).child("Needs you")),
			)
			.when(p.status === "done", (el: El) => el.child(div().size(7).flex_none().rounded(4).bg(t.done)))
			.children(quick)
			.when(Boolean(terminal && this.prompts.length), (el: El) =>
				el.child(button(t, `gb-p-${pane}`, `📋 ${this.prompts.length}`, (cx) => this.openPrompts(cx, terminal, pane, p.cwd, machine))),
			)
			.when(Boolean(terminal && this.actions.length), (el: El) =>
				el.child(button(t, `gb-a-${pane}`, "🚀", () => openOverlay({ mod: MOD, kind: "popup", width: 460, props: { view: "actions", terminal, pane, prompts: this.actions } }))),
			)
			.when(refs.length > 0, (el: El) => el.child(button(t, `gb-r-${pane}`, `📎 ${refs.length}`, (cx) => this.openRecords(cx, refs, machine))))
			.child(button(t, `gb-x-${pane}`, svg("mods/pane/close.svg").size(14), () => run("pane.close", { pane })));
	}

	/** Reads the prompt files and record actions when the pane's folder or machine changes. */
	reload(cx: Cx, cwd: string | null, machine: string | null) {
		const key = cwd ? `${machine ?? ""}:${cwd}` : null;
		if (key === this.loadedFor) return;
		this.loadedFor = key;
		this.prompts = [];
		this.actions = [];
		if (!cwd) return;
		const agent = agentContext(cwd);
		cx.spawn(async (cx: Cx) => {
			const [prompts, actions] = await Promise.all([loadPrompts(cwd, machine), agent ? loadActions(agent.vaultRoot, agent.agentDir) : []]);
			if (this.loadedFor !== key) return;
			this.prompts = prompts;
			this.actions = actions;
			cx.notify();
		});
	}

	openPrompts(cx: Cx, terminal: string, pane: string, cwd: string, machine: string | null) {
		cx.spawn(async (cx: Cx) => {
			this.prompts = await loadPrompts(cwd, machine);
			cx.notify();
			if (this.prompts.length) openOverlay({ mod: MOD, kind: "popup", width: 460, props: { view: "prompts", terminal, pane, prompts: this.prompts } });
		});
	}

	/** Launches default to the pane's machine. */
	openRecords(cx: Cx, refs: string[], machine: string | null) {
		cx.spawn(async () => {
			try {
				const [records, options]: [PaneRecord[], { profiles: { name: string }[]; environments: string[] }] = await Promise.all([host({ type: "records", refs }), host({ type: "lookup" })]);
				const environments = options.environments.map((name) => ({ name, icon: this.environments.find((one) => one.name === name)?.icon }));
				const environment = this.environments.find((one) => machine && one.host === machine)?.name ?? options.environments[0];
				openOverlay({ mod: MOD, kind: "popup", width: 560, props: { view: "records", records, environment, choices: { profiles: options.profiles.map(({ name }) => ({ name })), environments } } });
			} catch (error) {
				notify({ title: "Records not loaded", body: String(error), level: "error" });
			}
		});
	}

	// Popup: each record with Obsidian and its launchers, which open in the draft dialog.
	renderRecords(): El {
		const t = theme();
		const p = props() ?? {};
		const close = () => closeOverlay(p.overlay);
		return v_flex()
			.id("gb-records")
			.w_full()
			.max_h(520)
			.overflow_y_scroll()
			.p(8)
			.gap(10)
			.bg(t.popover)
			.text_size(12.5)
			.text_color(t.foreground)
			.children(
				(p.records as PaneRecord[]).map(({ ref, record }, i) => {
					if (!record) return v_flex().px(6).child(div().truncate().text_color(t.dim).child(ref)).child(div().text_size(11).text_color(t.dim).child("Not in this machine's vault yet; resync."));
					const obsidian = record.obsidian;
					return v_flex()
						.id(`gb-rec-${i}`)
						.px(6)
						.gap(4)
						.child(
							h_flex()
								.gap(6)
								.items_center()
								.child(div().flex_1().truncate().font_medium().child(record.title))
								.child(div().flex_none().text_size(11).text_color(t.dim).child(`${record.kind} · ${record.status}`))
								.child(textButton(t, `gb-rec-p-${i}`, "Page", false, () => {
									close();
									openRecordTab(ref);
								}))
								.when(Boolean(obsidian), (el: El) =>
									el.child(textButton(t, `gb-rec-o-${i}`, "Obsidian", false, (cx) => {
										close();
										cx.spawn(async () => openUrl(obsidian!));
									})),
								),
						)
						.child(
							h_flex()
								.flex_wrap()
								.gap(4)
								.text_size(11.5)
								.children(
									record.launchers.map((one, n) =>
										button(t, `gb-rec-l-${i}-${n}`, one.label, () => {
											close();
											const launch = { record: record.key, launcher: n, profile: one.profile, environment: p.environment };
											openOverlay({ mod: MOD, kind: "dialog", width: 640, props: { view: "draft", label: `${one.label} · ${record.name}`, text: one.prompt, launch, choices: p.choices } });
										}),
									),
								),
						);
				}),
			);
	}

	// Popup: each prompt with Send and Draft.
	renderPrompts(): El {
		const t = theme();
		const p = props() ?? {};
		const close = () => closeOverlay(p.overlay);
		return v_flex()
			.id("gb-prompts")
			.w_full()
			.p(8)
			.gap(2)
			.bg(t.popover)
			.text_size(12.5)
			.text_color(t.foreground)
			.children(
				(p.prompts as SuggestedPrompt[]).map((one, i) =>
					h_flex()
						.id(`gb-pr-${i}`)
						.gap(6)
						.px(6)
						.py(3)
						.items_center()
						.rounded(5)
						.hover((s: El) => s.bg(t.hover))
						.child(div().flex_1().truncate().child(one.label))
						.child(textButton(t, `gb-ps-${i}`, "Send", true, (cx) => {
							close();
							cx.spawn(async () => send(p.terminal, p.pane, one.text));
						}))
						.child(textButton(t, `gb-pd-${i}`, "Draft", false, () => {
							close();
							openOverlay({ mod: MOD, kind: "dialog", width: 640, props: { view: "draft", terminal: p.terminal, pane: p.pane, label: one.label, text: one.text } });
						})),
				),
			);
	}

	// Popup: record actions for this agent dir.
	renderActions(): El {
		const t = theme();
		const p = props() ?? {};
		return v_flex()
			.id("gb-actions")
			.w_full()
			.p(8)
			.gap(2)
			.bg(t.popover)
			.text_size(12.5)
			.text_color(t.foreground)
			.children(
				(p.prompts as SuggestedPrompt[]).map((one, i) =>
					h_flex()
						.id(`gb-ac-${i}`)
						.px(6)
						.py(4)
						.rounded(5)
						.cursor_pointer()
						.hover((s: El) => s.bg(t.hover))
						.on_click((_e: unknown, cx: Cx) => {
							closeOverlay(p.overlay);
							cx.spawn(async () => send(p.terminal, p.pane, one.text));
						})
						.child(div().flex_1().truncate().child(one.label)),
				),
			)
			.child(div().px(6).pt(6).text_size(11).text_color(t.dim).child("Runs on the record you're discussing; the agent asks if unclear."));
	}

	// A dropdown that opens upward, over what's above it, so it must come after that in the layout.
	dropdown(t: any, key: string, current: string | null, choices: Choice[], choose: (name: string) => void): El {
		const text = (one: Choice) => [one.icon, one.name].filter(Boolean).join(" ");
		const shown = choices.find((one) => one.name === current);
		return div()
			.relative()
			.flex_none()
			.child(textButton(t, `gb-dd-${key}`, `${shown ? text(shown) : (current ?? "")} ▾`, false, (cx) => {
				this.menu = this.menu === key ? null : key;
				cx.notify();
			}))
			.when(this.menu === key, (el: El) =>
				el.child(
					v_flex()
						.id(`gb-dd-list-${key}`)
						.absolute()
						.bottom(32)
						.left(0)
						.min_w(200)
						.max_h(240)
						.overflow_y_scroll()
						.p(4)
						.rounded(8)
						.border_1()
						.border_color(t.input)
						.bg(t.popover)
						.text_size(12)
						.children(
							choices.map((one, i) =>
								div()
									.id(`gb-dd-${key}-${i}`)
									.px(8)
									.py(4)
									.rounded(5)
									.cursor_pointer()
									.when(one.name === current, (row: El) => row.bg(t.hover))
									.hover((s: El) => s.bg(t.hover))
									.on_click((_e: unknown, cx: Cx) => {
										cx.stop_propagation();
										choose(one.name);
										this.menu = null;
										cx.notify();
									})
									.child(text(one)),
							),
						),
				),
			);
	}

	// Dialog: edit a prompt, then send it, or launch it with the chosen profile and environment.
	renderDraft(): El {
		const t = theme();
		const p = props() ?? {};
		return v_flex()
			.id("gb-draft")
			.w_full()
			.p(16)
			.gap(10)
			.bg(t.popover)
			.text_color(t.foreground)
			.child(h_flex().items_center().child(div().flex_1().truncate().text_size(14).font_semibold().child(p.label ?? "Draft")).child(div().text_size(11).text_color(t.dim).child("Esc")))
			.child(Textarea.new(this.draft).w_full().p(8).rounded(8).border_1().border_color(t.input).bg(t.background).text_size(12.5))
			.child(
				h_flex()
					.gap(8)
					.items_center()
					.when(Boolean(p.launch), (el: El) =>
						el
							.child(this.dropdown(t, "profile", this.profile, p.choices.profiles, (name) => (this.profile = name)))
							.child(this.dropdown(t, "environment", this.environment, p.choices.environments, (name) => (this.environment = name))),
					)
					.child(div().flex_1())
					.child(textButton(t, "gb-dc", "Cancel", false, () => closeOverlay(p.overlay)))
					.child(textButton(t, "gb-ds", p.launch ? "Launch" : "Send", true, (cx) => this.sendDraft(cx))),
			);
	}

	sendDraft(cx: Cx) {
		const p = props() ?? {};
		const text = this.draft.value();
		closeOverlay(p.overlay);
		if (!text.trim()) return;
		const request = { ...p.launch, profile: this.profile, environment: this.environment };
		cx.spawn(async () => {
			if (!p.launch) return send(p.terminal, p.pane, text);
			if ((await launch(request, p.label, text)) && p.task) await removeListedTask(p.task);
		});
	}
}
