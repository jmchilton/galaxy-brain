import {
	App,
	FileSystemAdapter,
	FuzzySuggestModal,
	type MarkdownPostProcessorContext,
	MarkdownView,
	Menu,
	Modal,
	Notice,
	parseYaml,
	Platform,
	Plugin,
	Setting,
	stringifyYaml,
	TAbstractFile,
	TFile,
} from "obsidian";
import type { RecordKind } from "../../site/src/lib/records";
import { AGENTS_VIEW, AgentsView, ALL_AGENTS } from "./agents-view";
import { fillTemplate, type Launcher, launcherScope, launchersFor, parseLaunchers, type RecordRef, recordFromPath } from "./launchers";
import { defaultProfile, FALLBACK_PROFILES, type Profile, parseProfiles, profileArgs } from "./profiles";
import { isReviewableRecordKind } from "../../differential-review/src/core";
import { openDifferentialReview, registerDifferentialReview } from "./diff-review-view";
import { githubUrl, worktreeCandidates } from "./record-links";
import { parseRecordAgents, SYNC_PROCESSES, SYNC_PROFILE } from "./record-agents";
import { repositoryNames } from "./repository";
import { renderTaskCards } from "./task-cards";
import { parseTasks, replaceBlockBody, type Task } from "./task-list";
import { ALL_REPOS, REPOSITORY_VIEW, RepositoryView } from "./repository-view";

const PROFILES_PATH = "agents/_shared/AGENT_PROFILES.yml";
const RECORD_AGENTS_PATH = "agents/_shared/RECORD_AGENTS.yml";
const LAUNCH_SCRIPT = "agents/_shared/scripts/launch_agent.sh";
// Where the `code` and `gh` CLIs live; GUI apps get a bare PATH.
const CLI_BIN_DIRS = ["/usr/local/bin", "/opt/homebrew/bin", "/Applications/Visual Studio Code.app/Contents/Resources/app/bin"];

export default class GalaxyBrainPlugin extends Plugin {
	private recordActions = new WeakMap<MarkdownView, { reviewable: boolean; actions: HTMLElement[] }>();

	async onload() {
		registerDifferentialReview(this);
		this.registerEvent(
			this.app.workspace.on("file-menu", (menu, file) => {
				if (!(file instanceof TFile)) return;
				menu.addItem((item) =>
					item.setTitle("Copy contents").setIcon("copy").onClick(() => this.copyContents(file)),
				);
				void this.addLaunchItems(menu, file);
			}),
		);

		this.addCommand({
			id: "copy-contents",
			name: "Copy contents of current file",
			checkCallback: (checking) => {
				const file = this.app.workspace.getActiveFile();
				if (!file) return false;
				if (!checking) void this.copyContents(file);
				return true;
			},
		});

		this.registerView(REPOSITORY_VIEW, (leaf) => new RepositoryView(leaf, this));
		this.addRibbonIcon("library", "Open a repository's records", () => void this.pickRepository());
		this.addRibbonIcon("layers", "All repository records", () => void this.openRepository(ALL_REPOS));
		this.addCommand({
			id: "open-repository",
			name: "Open a repository's records",
			callback: () => void this.pickRepository(),
		});
		this.addCommand({
			id: "open-recent-records",
			name: "All repository records",
			callback: () => void this.openRepository(ALL_REPOS),
		});

		this.registerView(AGENTS_VIEW, (leaf) => new AgentsView(leaf, this));
		this.addRibbonIcon("bot", "Agents: routines and tasks", () => void this.openAgents());
		this.addCommand({
			id: "open-agents",
			name: "Agents: routines and tasks",
			callback: () => void this.openAgents(),
		});

		this.registerMarkdownCodeBlockProcessor("gb-tasks", (source, el, ctx) => this.renderTasks(source, el, ctx));

		if (!Platform.isDesktopApp) return;

		this.addCommand({
			id: "launch-agent",
			name: "Launch agent for this record",
			checkCallback: (checking) => {
				const file = this.app.workspace.getActiveFile();
				const record = file && recordFromPath(file.path);
				if (!record) return false;
				if (!checking) void this.pickLauncher(record);
				return true;
			},
		});

		const refresh = () => this.refreshRecordActions();
		this.registerEvent(this.app.workspace.on("file-open", refresh));
		this.registerEvent(this.app.workspace.on("layout-change", refresh));
		this.app.workspace.onLayoutReady(refresh);
	}

	async copyContents(file: TFile) {
		try {
			await navigator.clipboard.writeText(await this.app.vault.read(file));
			new Notice(`Copied ${file.name}`);
		} catch (error) {
			new Notice(`Could not copy ${file.name}: ${error}`);
		}
	}

	/** Code, GitHub, agent and (branches/reviews) differential review icons in the header of notes inside a repository record. */
	private refreshRecordActions() {
		for (const leaf of this.app.workspace.getLeavesOfType("markdown")) {
			const view = leaf.view;
			if (!(view instanceof MarkdownView)) continue;
			const record = view.file && recordFromPath(view.file.path);
			const reviewable = !!record && isReviewableRecordKind(record.kind);
			const existing = this.recordActions.get(view);
			if (existing && (!record || existing.reviewable !== reviewable)) {
				existing.actions.forEach((action) => action.remove());
				this.recordActions.delete(view);
			}
			if (record && !this.recordActions.has(view)) {
				const withRecord = (act: (record: RecordRef) => unknown) => () => {
					const current = view.file && recordFromPath(view.file.path);
					if (current) void act(current);
				};
				// addAction prepends, so the bot ends up leftmost, matching the repository view.
				const actions = [
					...(reviewable ? [view.addAction("git-compare", "Differential review", withRecord((r) => openDifferentialReview(this.app, r.dir)))] : []),
					view.addAction("code", "Open with Code", withRecord((r) => this.openRecordInCode(r))),
					view.addAction("github", "Open on GitHub", withRecord((r) => this.openRecordOnGithub(r))),
					view.addAction("bot", "Launch agent", withRecord((r) => this.pickLauncher(r))),
				];
				this.recordActions.set(view, { reviewable, actions });
				this.register(() => actions.forEach((action) => action.remove()));
			}
		}
	}

	private async indexBody(record: RecordRef): Promise<string> {
		const index = this.app.vault.getFileByPath(`${record.dir}/index.md`);
		return index ? this.app.vault.cachedRead(index) : "";
	}

	/** The record's worktree, if one exists on disk. */
	worktreeFor(record: RecordRef, body: string): string | null {
		const { existsSync } = require("fs") as typeof import("fs");
		const { homedir } = require("os") as typeof import("os");
		return worktreeCandidates(record, body, homedir()).find((path) => existsSync(path)) ?? null;
	}

	openInCode(path: string) {
		const { execFile } = require("child_process") as typeof import("child_process");
		const PATH = [...CLI_BIN_DIRS, process.env.PATH].join(":");
		execFile("code", [path], { env: { ...process.env, PATH } }, (error) => {
			if (error) new Notice(`Could not run the VS Code \`code\` CLI: ${error.message}`, 10_000);
		});
	}

	runGh(args: string[]): Promise<string> {
		const { execFile } = require("child_process") as typeof import("child_process");
		const PATH = [...CLI_BIN_DIRS, process.env.PATH].join(":");
		return new Promise((resolve, reject) => {
			execFile("gh", args, { env: { ...process.env, PATH }, timeout: 60_000, maxBuffer: 16 * 1024 * 1024 }, (error, stdout, stderr) => {
				if (error) reject(new Error((stderr || error.message).trim()));
				else resolve(stdout);
			});
		});
	}

	private async openRecordInCode(record: RecordRef) {
		const worktree = this.worktreeFor(record, await this.indexBody(record));
		if (worktree) this.openInCode(worktree);
		else new Notice(`No worktree on disk for ${record.name}`);
	}

	private async openRecordOnGithub(record: RecordRef) {
		window.open(githubUrl(record, await this.indexBody(record)));
	}

	async loadLaunchers(): Promise<Launcher[]> {
		// Repo files sort before `_defaults`, so a repo's own launchers list first.
		const files = this.app.vault
			.getMarkdownFiles()
			.flatMap((file) => {
				const scope = launcherScope(file.path);
				return scope ? [{ file, scope }] : [];
			})
			.sort((a, b) => Number(a.scope.repo === null) - Number(b.scope.repo === null));
		const parsed = await Promise.all(files.map(async ({ file, scope }) => parseLaunchers(await this.app.vault.cachedRead(file), scope)));
		return parsed.flat();
	}

	private async launchersFor(record: RecordRef): Promise<Launcher[]> {
		return launchersFor(await this.loadLaunchers(), record);
	}

	private async openRepository(repo: string) {
		const leaf = this.app.workspace.getLeaf("tab");
		await leaf.setViewState({ type: REPOSITORY_VIEW, state: { repo }, active: true });
	}

	private async openAgents() {
		const leaf = this.app.workspace.getLeaf("tab");
		await leaf.setViewState({ type: AGENTS_VIEW, state: { agent: ALL_AGENTS }, active: true });
	}

	/** Opens the current record's repository, or asks which one. */
	private async pickRepository() {
		const file = this.app.workspace.getActiveFile();
		const current = file && recordFromPath(file.path);
		if (current) return this.openRepository(current.repo);
		const files = this.app.vault.getMarkdownFiles().map((f) => ({ path: f.path, mtime: f.stat.mtime }));
		new ChoiceSuggest(this.app, repositoryNames(files), "Open repository…", (repo) => void this.openRepository(repo)).open();
	}

	private async addLaunchItems(menu: Menu, file: TAbstractFile) {
		if (!Platform.isDesktopApp) return;
		const record = recordFromPath(file.path);
		if (!record) return;
		for (const launcher of await this.launchersFor(record)) {
			menu.addItem((item) =>
				item.setTitle(`Launch: ${launcher.label}`).setIcon("bot").onClick(() => void this.confirmLaunch(launcher, record)),
			);
		}
	}

	async pickLauncher(record: RecordRef) {
		const launchers = await this.launchersFor(record);
		if (launchers.length === 0) {
			new Notice(`No launchers for ${record.repo}/${record.kind} (${record.status}) in repositories/${record.repo}/${record.kind}/LAUNCHERS.md`);
			return;
		}
		new LauncherSuggest(this.app, launchers, (launcher) => void this.confirmLaunch(launcher, record)).open();
	}

	async loadProfiles(): Promise<Profile[]> {
		try {
			const profiles = parseProfiles(parseYaml(await this.app.vault.adapter.read(PROFILES_PATH)));
			if (profiles.length > 0) return profiles;
		} catch (error) {
			new Notice(`Could not read ${PROFILES_PATH}: ${error}`);
		}
		return FALLBACK_PROFILES;
	}

	private async confirmLaunch(launcher: Launcher, record: RecordRef) {
		const vaultRoot = this.vaultRoot();
		if (!vaultRoot) return;
		const profiles = await this.loadProfiles();
		new LaunchModal(this.app, launcher, {
			profiles,
			profile: defaultProfile(profiles, launcher),
			name: fillTemplate(launcher.name, record, vaultRoot),
			prompt: fillTemplate(launcher.prompt, record, vaultRoot),
			launch: (profile, name, prompt) => this.launch(vaultRoot, launcher, profile, name, prompt),
		}).open();
	}

	private vaultRoot(): string | null {
		const adapter = this.app.vault.adapter;
		if (adapter instanceof FileSystemAdapter) return adapter.getBasePath();
		new Notice("Launching agents needs the desktop app");
		return null;
	}

	async syncAgent(repo: string, kind: RecordKind): Promise<string | undefined> {
		try {
			return parseRecordAgents(parseYaml(await this.app.vault.adapter.read(RECORD_AGENTS_PATH)))[repo]?.[kind];
		} catch {
			return undefined;
		}
	}

	async launchSync(repo: string, kind: RecordKind, agentDir: string) {
		const prompt = `Sync ${repo} ${kind} per agents/_shared/${SYNC_PROCESSES[kind]} (${repo} only).`;
		await this.confirmTask({ prompt, agentDir, profile: SYNC_PROFILE }, () => {});
	}

	/** Agent dirs with a CLAUDE.md, not `_`-prefixed. */
	async agentDirs(): Promise<string[]> {
		const { folders } = await this.app.vault.adapter.list("agents");
		const names = folders.map((folder) => folder.split("/").pop()!).filter((name) => !name.startsWith("_"));
		const withClaude = await Promise.all(names.map((name) => this.app.vault.adapter.exists(`agents/${name}/CLAUDE.md`)));
		return names.filter((_, i) => withClaude[i]).sort();
	}

	/** Cards for a ```gb-tasks block: 🚀 launches (and removes on success), ✖ removes. */
	private async renderTasks(source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) {
		const profiles = await this.loadProfiles();
		let raw: unknown;
		let tasks: Task[];
		try {
			raw = parseYaml(source);
			tasks = parseTasks(raw, { profiles: profiles.map((p) => p.name), agentDirs: await this.agentDirs() });
		} catch (error) {
			el.createDiv({ cls: "gb-tasks-error", text: `gb-tasks: ${error instanceof Error ? error.message : error}` });
			return;
		}
		const remove = async (index: number) => {
			const file = this.app.vault.getFileByPath(ctx.sourcePath);
			const section = ctx.getSectionInfo(el);
			if (!file || !section) return void new Notice("Could not locate this gb-tasks block");
			const rest = (raw as unknown[]).filter((_, i) => i !== index);
			await this.app.vault.process(file, (note) =>
				replaceBlockBody(note, section.lineStart, section.lineEnd, rest.length ? stringifyYaml(rest) : ""),
			);
		};
		renderTaskCards(el, tasks, {
			defaultProfile: profiles[0]?.name ?? "",
			...(Platform.isDesktopApp ? { launch: (task: Task, index: number) => void this.confirmTask(task, () => void remove(index)) } : {}),
			remove: (_task, index) => void remove(index),
		});
	}

	/** Launch dialog for a task; launched runs once the agent starts. */
	async confirmTask(task: Task, launched: () => void, name = task.agentDir) {
		const vaultRoot = this.vaultRoot();
		if (!vaultRoot) return;
		const profiles = await this.loadProfiles();
		const launcher: Launcher = { label: "Task", repo: null, kind: "branches", statuses: [], agentDir: task.agentDir, name, prompt: task.prompt, ...(task.profile ? { profile: task.profile } : {}) };
		new LaunchModal(this.app, launcher, {
			profiles,
			profile: defaultProfile(profiles, launcher),
			name: launcher.name,
			prompt: task.prompt,
			launch: (profile, name, prompt) => this.launch(vaultRoot, launcher, profile, name, prompt, launched),
		}).open();
	}

	private launch(vaultRoot: string, launcher: Launcher, profile: Profile, name: string, prompt: string, launched?: () => void) {
		// Required lazily: child_process doesn't exist on mobile.
		const { execFile } = require("child_process") as typeof import("child_process");
		const started = new Notice(`Launching ${profile.name} in ${launcher.agentDir}…`, 0);
		execFile(
			`${vaultRoot}/${LAUNCH_SCRIPT}`,
			[launcher.agentDir, profile.agent, name, prompt, ...profileArgs(profile)],
			{ timeout: 180_000 },
			(error, stdout, stderr) => {
				started.hide();
				if (error) new Notice(`Launch failed: ${(stderr || error.message).trim()}`, 15_000);
				else {
					new Notice(stdout.trim(), 10_000);
					launched?.();
				}
			},
		);
	}
}

class LauncherSuggest extends FuzzySuggestModal<Launcher> {
	constructor(
		app: App,
		private launchers: Launcher[],
		private choose: (launcher: Launcher) => void,
	) {
		super(app);
		this.setPlaceholder("Launch agent…");
	}

	getItems() {
		return this.launchers;
	}

	getItemText(launcher: Launcher) {
		return launcher.label;
	}

	onChooseItem(launcher: Launcher) {
		this.choose(launcher);
	}
}

class ChoiceSuggest extends FuzzySuggestModal<string> {
	constructor(
		app: App,
		private choices: string[],
		placeholder: string,
		private choose: (choice: string) => void,
	) {
		super(app);
		this.setPlaceholder(placeholder);
	}

	getItems() {
		return this.choices;
	}

	getItemText(choice: string) {
		return choice;
	}

	onChooseItem(choice: string) {
		this.choose(choice);
	}
}

interface LaunchDetails {
	profiles: Profile[];
	profile: Profile;
	name: string;
	prompt: string;
	launch: (profile: Profile, name: string, prompt: string) => void;
}

/** Confirm dialog: editable name and prompt, agent profile, launch. */
class LaunchModal extends Modal {
	constructor(
		app: App,
		private launcher: Launcher,
		private details: LaunchDetails,
	) {
		super(app);
	}

	onOpen() {
		const { launcher } = this;
		let { name, prompt, profile } = this.details;
		this.setTitle(`${launcher.label} in ${launcher.agentDir}`);
		new Setting(this.contentEl).setName("Agent name").addText((text) =>
			text.setValue(name).onChange((value) => (name = value)),
		);
		new Setting(this.contentEl)
			.setName("Prompt")
			.addTextArea((area) => {
				area.setValue(prompt).onChange((value) => (prompt = value));
				area.inputEl.rows = 6;
			})
			.settingEl.addClass("galaxy-brain-launch-prompt");
		new Setting(this.contentEl)
			.addDropdown((dropdown) => {
				for (const option of this.details.profiles) dropdown.addOption(option.name, option.name);
				dropdown.setValue(profile.name).onChange((value) => {
					profile = this.details.profiles.find((option) => option.name === value) ?? profile;
				});
			})
			.addButton((button) =>
				button
					.setButtonText("Launch")
					.setCta()
					.onClick(() => {
						this.close();
						this.details.launch(profile, name, prompt);
					}),
			)
			.addButton((button) => button.setButtonText("Cancel").onClick(() => this.close()));
	}

	onClose() {
		this.contentEl.empty();
	}
}
