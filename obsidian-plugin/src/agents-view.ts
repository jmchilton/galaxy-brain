import { debounce, ItemView, Notice, parseYaml, Platform, setIcon, stringifyYaml, TFolder, type ViewStateResult, type WorkspaceLeaf } from "obsidian";
import { type AgentCount, agentCounts, agentRoutines, type AgentsTab, type Routine, tasksPath } from "./agent-routines";
import { type Blocker, blockerFromPath, blockersPath } from "./blockers";
import { readCrackDays, renderCrackDays } from "./cracks-feed";
import { agentLaunchersPath, agentFromPath } from "./launchers";
import { type CrackDay, cracksPath, isCrackFile, unreviewedCount } from "./missed-prs";
import type { Profile } from "./profiles";
import { renderTaskCards } from "./task-cards";
import { byPriority, isSnoozed, type ListedTask, localDay, parseAgentTasks, removeTask, snoozeTask, type Task, type TaskRecord } from "./task-list";

export const AGENTS_VIEW = "galaxy-brain-agents";
/** `agent` state for the landing page across every agent dir. */
export const ALL_AGENTS = "*";

export interface AgentHost {
	agentDirs(): Promise<string[]>;
	loadProfiles(): Promise<Profile[]>;
	confirmTask(task: Task, launched: () => void, name?: string, pending?: (on: boolean) => void): Promise<void>;
	refineTask(task: Task): Promise<void>;
	openTaskRecord(record: TaskRecord, newLeaf: boolean): void;
}

interface AgentsViewState extends Record<string, unknown> {
	agent?: string;
	tab?: AgentsTab;
}

/** Agent dirs' routines (LAUNCHERS.md), TASKS.md task lists, blockers and the_cracks/ unreviewed PRs: merged on the landing page, or one agent's. */
export class AgentsView extends ItemView {
	private agent = ALL_AGENTS;
	private tab: AgentsTab = "tasks";
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
		return { agent: this.agent, tab: this.tab };
	}

	async setState(state: AgentsViewState, result: ViewStateResult) {
		if (typeof state.agent === "string") this.agent = state.agent;
		if (state.tab === "tasks" || state.tab === "blockers" || state.tab === "cracks") this.tab = state.tab;
		await super.setState(state, result);
		await this.render();
	}

	async onOpen() {
		const onChange = (file: { path: string }) => {
			const agent = agentFromPath(file.path);
			if ((agent && (file.path === tasksPath(agent) || file.path === agentLaunchersPath(agent))) || blockerFromPath(file.path) || isCrackFile(file.path)) this.scheduleRender();
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
		const blockers = await Promise.all(shown.map((dir) => this.readBlockers(dir)));
		const cracks = await Promise.all(shown.map((dir) => this.readCracks(dir, all)));

		const today = localDay();
		const root = this.contentEl;
		root.empty();
		root.addClass("galaxy-brain-repository", "gb-agents");

		const header = root.createDiv({ cls: "gb-agents-header" });
		header.createEl("h1", { text: all ? "Agents" : this.agent });
		const select = header.createEl("select", { cls: "dropdown" });
		select.createEl("option", { text: "All agents", value: ALL_AGENTS }).selected = all;
		for (const dir of dirs) select.createEl("option", { text: dir, value: dir }).selected = dir === this.agent;
		select.onchange = () => void this.showAgent(select.value, this.tab);
		const refresh = header.createEl("button", { cls: "clickable-icon", attr: { "aria-label": "Refresh" } });
		setIcon(refresh, "refresh-cw");
		refresh.onclick = () => void this.render();

		if (all) {
			const busy = root.createDiv({ cls: "gb-agents-grid" });
			const quiet = root.createDiv({ cls: "gb-agents-grid gb-agents-grid-quiet" });
			shown.forEach((dir, i) => {
				const counts = agentCounts(lists[i]!.tasks, blockers[i]!.length, cracks[i] ? unreviewedCount(cracks[i]) : 0, today);
				this.renderTile(counts.length ? busy : quiet, dir, routines[i]!, counts);
			});
		} else {
			const bar = root.createDiv({ cls: "gb-agents-routines" });
			this.renderRoutineButtons(bar, this.agent, routines[0]!, true);
			const file = this.app.vault.getFileByPath(tasksPath(this.agent));
			if (file) {
				const open = bar.createEl("a", { text: "Open TASKS.md", cls: "internal-link", href: "#" });
				open.onclick = (event) => {
					event.preventDefault();
					void this.app.workspace.openLinkText(file.path, "", event.metaKey || event.ctrlKey);
				};
			}
		}

		const tasks = byPriority(lists.flatMap((list) => list.tasks));
		const allBlockers = blockers.flat();
		const hasCracks = cracks.some((days) => days !== undefined);
		const crackDays = cracks.flatMap((days) => days ?? []).sort((a, b) => b.date.localeCompare(a.date));
		if (this.tab === "cracks" && !hasCracks) this.tab = "tasks";
		const bar = root.createDiv({ cls: "gb-agents-tabs" });
		const tabs: Array<[AgentsTab, string, number]> = [["tasks", "Tasks", tasks.filter((task) => !isSnoozed(task, today)).length], ["blockers", "Blockers", allBlockers.length]];
		if (hasCracks) tabs.push(["cracks", "Fell Through the Cracks", unreviewedCount(crackDays)]);
		for (const [id, label, count] of tabs) {
			const button = bar.createEl("button", { text: label, cls: `gb-agents-tab${id === this.tab ? " is-active" : ""}` });
			button.createSpan({ text: String(count), cls: "gb-agents-tab-count" });
			button.onclick = () => {
				this.tab = id;
				void this.render();
			};
		}
		if (this.tab === "blockers") return this.renderBlockers(root, allBlockers, all);
		if (this.tab === "cracks") return renderCrackDays(this.app, root, crackDays, "");

		for (const { source, error } of lists) {
			if (error) root.createDiv({ cls: "gb-tasks-error", text: `${tasksPath(source)}: ${error}` });
		}
		renderTaskCards(root, tasks, {
			defaultProfile: profiles[0]?.name ?? "",
			...(Platform.isDesktopApp
				? {
						launch: (_task: Task, i: number, pending: (on: boolean) => void) =>
							void this.host.confirmTask(tasks[i]!, () => void this.remove(tasks[i]!), tasks[i]!.agentDir, pending),
						refine: (task: Task) => void this.host.refineTask(task),
					}
				: {}),
			remove: (_task, i) => void this.remove(tasks[i]!),
			snooze: (_task, i, day) => void this.snooze(tasks[i]!, day),
			openRecord: (record, newLeaf) => this.host.openTaskRecord(record, newLeaf),
		});
	}

	private showAgent(agent: string, tab: AgentsTab) {
		return this.leaf.setViewState({ type: AGENTS_VIEW, state: { agent, tab } });
	}

	/** An agent on the landing page: opens it when clicked, routine icons, and a chip opening each tab with anything in it. */
	private renderTile(grid: HTMLElement, dir: string, routines: Routine[], pending: AgentCount[]) {
		const tile = grid.createDiv({ cls: "gb-agent-tile" });
		tile.onclick = () => void this.showAgent(dir, this.tab);
		const head = tile.createDiv({ cls: "gb-agent-tile-head" });
		const name = head.createEl("a", { text: dir, cls: "gb-agent-name", href: "#" });
		name.onclick = (event) => event.preventDefault();
		const icons = head.createDiv({ cls: "gb-agent-tile-routines" });
		icons.onclick = (event) => event.stopPropagation();
		this.renderRoutineButtons(icons, dir, routines, false);
		if (!pending.length) return;
		const chips = tile.createDiv({ cls: "gb-agent-counts" });
		for (const { tab, label } of pending) {
			const chip = chips.createEl("button", { text: label, cls: `gb-agent-count gb-agent-count-${tab}` });
			chip.onclick = (event) => {
				event.stopPropagation();
				void this.showAgent(dir, tab);
			};
		}
	}

	/** One card per blocker: its name (opening index.md), agent dir on the landing page, and condition. */
	private renderBlockers(root: HTMLElement, blockers: Blocker[], all: boolean) {
		const list = root.createDiv({ cls: "gb-tasks" });
		if (!blockers.length) return void list.createDiv({ text: "No blockers.", cls: "gb-tasks-empty" });
		for (const blocker of blockers) {
			const card = list.createDiv({ cls: "gb-task" });
			const head = card.createDiv({ cls: "gb-task-meta gb-blocker-head" });
			const link = head.createEl("a", { text: blocker.name, cls: "internal-link gb-blocker-name", href: "#" });
			link.onclick = (event) => {
				event.preventDefault();
				void this.app.workspace.openLinkText(`${blockersPath(blocker.agentDir)}/${blocker.name}/index.md`, "", event.metaKey || event.ctrlKey);
			};
			if (all) head.createSpan({ text: blocker.agentDir });
			if (blocker.condition) card.createDiv({ text: blocker.condition, cls: "gb-task-prompt" });
		}
	}

	/** A button per routine, with its label or icon only; desktop only. */
	private renderRoutineButtons(el: HTMLElement, dir: string, routines: Routine[], labelled: boolean) {
		if (!Platform.isDesktopApp) return;
		for (const routine of routines) {
			const button = el.createEl("button", { cls: labelled ? "gb-agents-routine" : "clickable-icon", attr: { "aria-label": `${routine.label} · ${dir}: ${routine.task.prompt}` } });
			if (routine.icon) setIcon(button, routine.icon);
			else button.createSpan({ text: routine.emoji });
			if (labelled) button.createSpan({ text: routine.label });
			button.onclick = () => void this.host.confirmTask(routine.task, () => {}, routine.name);
		}
	}

	private async routinesFor(dir: string): Promise<Routine[]> {
		const file = this.app.vault.getFileByPath(agentLaunchersPath(dir));
		return agentRoutines(file ? await this.app.vault.cachedRead(file) : null, dir);
	}

	private async readBlockers(dir: string): Promise<Blocker[]> {
		const folder = this.app.vault.getFolderByPath(blockersPath(dir));
		const names = (folder?.children ?? []).filter((child) => child instanceof TFolder).map((child) => child.name).sort();
		return Promise.all(
			names.map(async (name) => {
				const file = this.app.vault.getFileByPath(`${blockersPath(dir)}/${name}/condition.md`);
				return { agentDir: dir, name, condition: file ? (await this.app.vault.cachedRead(file)).trim() : "" };
			}),
		);
	}

	/** The agent dir's the_cracks/ days, tagged with the dir on the landing page; undefined without the directory. */
	private async readCracks(dir: string, tagged: boolean): Promise<CrackDay[] | undefined> {
		if (!this.app.vault.getFolderByPath(cracksPath(dir))) return undefined;
		return readCrackDays(this.app, cracksPath(dir), tagged ? dir : undefined);
	}

	private async readTasks(dir: string, known: { profiles: string[]; agentDirs: string[] }) {
		const file = this.app.vault.getFileByPath(tasksPath(dir));
		return parseAgentTasks(dir, file ? await this.app.vault.cachedRead(file) : null, known, parseYaml);
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

	private async snooze(task: ListedTask, day: string) {
		const file = this.app.vault.getFileByPath(tasksPath(task.source));
		if (!file) return void new Notice(`${tasksPath(task.source)} is gone`);
		let found = false;
		await this.app.vault.process(file, (note) => {
			const updated = snoozeTask(note, task, day, parseYaml, stringifyYaml);
			found = updated !== undefined;
			return updated ?? note;
		});
		if (!found) new Notice("Task already removed");
	}
}
