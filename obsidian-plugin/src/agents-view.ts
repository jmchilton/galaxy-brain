import { debounce, ItemView, Notice, parseYaml, Platform, stringifyYaml, type ViewStateResult, type WorkspaceLeaf } from "obsidian";
import { ROUTINES, routineLaunch, tasksPath } from "./agent-routines";
import type { Profile } from "./profiles";
import { renderTaskCards } from "./task-cards";
import { byPriority, parseTasks, removeTask, type Task, taskBlocks } from "./task-list";

export const AGENTS_VIEW = "galaxy-brain-agents";
/** `agent` state for the landing page across every agent dir. */
export const ALL_AGENTS = "*";

export interface AgentHost {
	agentDirs(): Promise<string[]>;
	loadProfiles(): Promise<Profile[]>;
	confirmTask(task: Task, launched: () => void, name?: string): Promise<void>;
}

/** A task and the agent dir whose TASKS.md holds it (not necessarily its `agent_dir`). */
type ListedTask = Task & { source: string };

interface AgentsViewState extends Record<string, unknown> {
	agent?: string;
}

/** Agent dirs' routines (good morning, tick) and TASKS.md task lists: merged on the landing page, or one agent's. */
export class AgentsView extends ItemView {
	private agent = ALL_AGENTS;
	private scheduleRender = debounce(() => void this.render(), 300, true);

	constructor(
		leaf: WorkspaceLeaf,
		private host: AgentHost,
	) {
		super(leaf);
	}

	getViewType() {
		return AGENTS_VIEW;
	}

	getDisplayText() {
		return this.agent === ALL_AGENTS ? "Agents" : `${this.agent} agent`;
	}

	getIcon() {
		return "bot";
	}

	getState(): AgentsViewState {
		return { agent: this.agent };
	}

	async setState(state: AgentsViewState, result: ViewStateResult) {
		if (typeof state.agent === "string") this.agent = state.agent;
		await super.setState(state, result);
		await this.render();
	}

	async onOpen() {
		const onChange = (file: { path: string }) => {
			if (file.path.startsWith("agents/") && file.path.endsWith("/TASKS.md")) this.scheduleRender();
		};
		this.registerEvent(this.app.vault.on("create", onChange));
		this.registerEvent(this.app.vault.on("modify", onChange));
		this.registerEvent(this.app.vault.on("delete", onChange));
		this.registerEvent(this.app.vault.on("rename", (file, oldPath) => {
			onChange(file);
			onChange({ path: oldPath });
		}));
		await this.render();
	}

	private async render() {
		const dirs = await this.host.agentDirs();
		const profiles = await this.host.loadProfiles();
		const known = { profiles: profiles.map((profile) => profile.name), agentDirs: dirs };
		const all = !dirs.includes(this.agent);
		const shown = all ? dirs : [this.agent];
		const lists = await Promise.all(shown.map((dir) => this.readTasks(dir, known)));
		const routines = await Promise.all(shown.map((dir) => this.routinesFor(dir)));

		const root = this.contentEl;
		root.empty();
		root.addClass("galaxy-brain-repository");

		const header = root.createDiv({ cls: "gbr-header" });
		header.createEl("h1", { text: all ? "All agents" : this.agent });
		const select = header.createEl("select", { cls: "dropdown" });
		select.createEl("option", { text: "All agents", value: ALL_AGENTS }).selected = all;
		for (const dir of dirs) select.createEl("option", { text: dir, value: dir }).selected = dir === this.agent;
		select.onchange = () => void this.leaf.setViewState({ type: AGENTS_VIEW, state: { agent: select.value } });

		if (all) {
			const list = root.createEl("ul");
			shown.forEach((dir, i) => {
				const row = list.createEl("li", { cls: "gbr-record" });
				this.renderRoutineButtons(row.createSpan({ cls: "gbr-actions" }), dir, routines[i]!);
				const link = row.createEl("a", { text: dir, cls: "internal-link", href: "#" });
				link.onclick = (event) => {
					event.preventDefault();
					void this.leaf.setViewState({ type: AGENTS_VIEW, state: { agent: dir } });
				};
				const count = lists[i]!.tasks.length;
				if (count) row.createSpan({ text: `${count} task${count === 1 ? "" : "s"}`, cls: "gbr-tag" });
			});
		} else {
			const bar = root.createDiv({ cls: "gbr-sync" });
			this.renderRoutineButtons(bar, this.agent, routines[0]!);
			const file = this.app.vault.getFileByPath(tasksPath(this.agent));
			if (file) {
				const open = bar.createEl("a", { text: "Open TASKS.md", cls: "internal-link", href: "#" });
				open.onclick = (event) => {
					event.preventDefault();
					void this.app.workspace.openLinkText(file.path, "", event.metaKey || event.ctrlKey);
				};
			}
		}

		for (const { source, error } of lists) {
			if (error) root.createDiv({ cls: "gb-tasks-error", text: `${tasksPath(source)}: ${error}` });
		}
		const tasks = byPriority(lists.flatMap((list) => list.tasks));
		renderTaskCards(root, tasks, {
			defaultProfile: profiles[0]?.name ?? "",
			...(Platform.isDesktopApp ? { launch: (_task: Task, i: number) => void this.host.confirmTask(tasks[i]!, () => void this.remove(tasks[i]!)) } : {}),
			remove: (_task, i) => void this.remove(tasks[i]!),
		});
	}

	/** 🌅 / ⏱️ buttons for the routine files the agent dir has; desktop only. */
	private renderRoutineButtons(el: HTMLElement, dir: string, routines: typeof ROUTINES) {
		if (!Platform.isDesktopApp) return;
		for (const routine of routines) {
			const { task, name } = routineLaunch(dir, routine);
			const button = el.createEl("button", { text: routine.label, attr: { "aria-label": `Launch ${dir} with ./${routine.file}` } });
			button.onclick = () => void this.host.confirmTask(task, () => {}, name);
		}
	}

	private async routinesFor(dir: string): Promise<typeof ROUTINES> {
		const present = await Promise.all(ROUTINES.map((routine) => this.app.vault.adapter.exists(`agents/${dir}/${routine.file}`)));
		return ROUTINES.filter((_, i) => present[i]);
	}

	private async readTasks(dir: string, known: { profiles: string[]; agentDirs: string[] }): Promise<{ source: string; tasks: ListedTask[]; error?: string }> {
		const file = this.app.vault.getFileByPath(tasksPath(dir));
		if (!file) return { source: dir, tasks: [] };
		try {
			const blocks = taskBlocks(await this.app.vault.cachedRead(file));
			const tasks = blocks.flatMap((block) => parseTasks(parseYaml(block.source), known));
			return { source: dir, tasks: tasks.map((task) => ({ ...task, source: dir })) };
		} catch (error) {
			return { source: dir, tasks: [], error: error instanceof Error ? error.message : String(error) };
		}
	}

	private async remove(task: ListedTask) {
		const file = this.app.vault.getFileByPath(tasksPath(task.source));
		if (!file) return void new Notice(`${tasksPath(task.source)} is gone`);
		let found = false;
		await this.app.vault.process(file, (note) => {
			const updated = removeTask(note, task, parseYaml, stringifyYaml);
			found = updated !== undefined;
			return updated ?? note;
		});
		if (!found) new Notice("Task already removed");
	}
}
