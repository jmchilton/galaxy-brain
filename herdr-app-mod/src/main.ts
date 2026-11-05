// galaxy-brain pane header for the Herdr app: the shipped `pane` header (Apache-2.0, herdrdev/herdr-app)
// plus suggested-prompt buttons (📋, emoji quick sends) and, in agent folders, 🚀 record actions.
// The same mod draws its popups and the draft dialog, chosen by props().view.

import { div, image, svg, View } from "gpui-kit";
import { h_flex, Textarea, TextareaState, v_flex } from "gpui-base";
import { closeOverlay, exec, hc, home, notify, openOverlay, panes, props, readTextFile, run, spaces, theme } from "herdr";
import { agentContext, machineOf, promptFiles, reroot } from "./context";
import { mergePrompts, parsePrompts, quickEmoji, type SuggestedPrompt } from "./prompts";

const MOD = "gb-pane";
const ACTIONS_CLI = `${__GB_ROOT__}/herdr-plugin/bin/run.sh`;
const LOCAL_VAULT = `${__GB_ROOT__}/vault`;

type Cx = any;
type El = any;

function folderLabel(cwd: string | null): string {
	if (!cwd) return "";
	const h = home();
	return cwd === h ? "~" : cwd.startsWith(`${h}/`) ? `~${cwd.slice(h.length)}` : cwd;
}

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

	init(_props: unknown, cx: Cx) {
		const p = props() ?? {};
		this.view = p.view ?? "header";
		this.prompts = [];
		this.loadedFor = null;
		this.actions = [];
		if (this.view === "draft") {
			this.draft = TextareaState.new({ value: p.text ?? "", rows: 10 });
			this.draft.on("submit", (_e: unknown, cx: Cx) => this.sendDraft(cx));
			this.draft.focus();
			cx.timer.after(300, () => this.draft.focus());
		}
	}

	render(cx: Cx): El {
		if (this.view === "prompts") return this.renderPrompts();
		if (this.view === "actions") return this.renderActions();
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
		const name = ((p.program?.agent || p.program?.shell) && p.program.name) || p.title || p.program?.name || "shell";
		const pic = programIcon(p.program, 14, t.dim);
		const pane = p.pane;
		const terminal = p.terminal;
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
			.child(div().flex_none().truncate().max_w(220).font_medium().text_color(t.foreground).child(name))
			.child(div().flex_1().truncate().text_color(t.dim).child(folderLabel(p.cwd)))
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

	// Dialog: edit a prompt, then send it.
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
					.justify_end()
					.child(textButton(t, "gb-dc", "Cancel", false, () => closeOverlay(p.overlay)))
					.child(textButton(t, "gb-ds", "Send", true, (cx) => this.sendDraft(cx))),
			);
	}

	sendDraft(cx: Cx) {
		const p = props() ?? {};
		const text = this.draft.value();
		closeOverlay(p.overlay);
		if (text.trim()) cx.spawn(async () => send(p.terminal, p.pane, text));
	}
}
