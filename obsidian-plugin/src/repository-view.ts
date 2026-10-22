import { debounce, ItemView, Platform, setIcon, type ViewStateResult, type WorkspaceLeaf } from "obsidian";
import { KIND_LABELS, statusLabel } from "../../site/src/lib/records";
import { type Launcher, launchersFor, type RecordRef } from "./launchers";
import { githubUrl } from "./record-links";
import { collectRecords, type RecordSummary, repositoryNames, repositorySections, timeAgo } from "./repository";

export const REPOSITORY_VIEW = "galaxy-brain-repository";

export interface RecordHost {
	loadLaunchers(): Promise<Launcher[]>;
	pickLauncher(record: RecordRef): Promise<void>;
	worktreeFor(record: RecordRef, body: string): string | null;
	openInCode(path: string): void;
}

interface RepositoryViewState extends Record<string, unknown> {
	repo?: string;
}

/** Live landing page for one repository's branches, issues and reviews. */
export class RepositoryView extends ItemView {
	private repo = "galaxy";
	/** Status groups toggled away from their default, kept across re-renders. */
	private toggled = new Set<string>();
	private scheduleRender = debounce(() => void this.render(), 300, true);

	constructor(
		leaf: WorkspaceLeaf,
		private host: RecordHost,
	) {
		super(leaf);
	}

	getViewType() {
		return REPOSITORY_VIEW;
	}

	getDisplayText() {
		return `${this.repo} records`;
	}

	getIcon() {
		return "library";
	}

	getState(): RepositoryViewState {
		return { repo: this.repo };
	}

	async setState(state: RepositoryViewState, result: ViewStateResult) {
		if (state.repo && state.repo !== this.repo) {
			this.repo = state.repo;
			this.toggled.clear();
		}
		await super.setState(state, result);
		await this.render();
	}

	async onOpen() {
		const onChange = (file: { path: string }) => {
			if (file.path.startsWith(`repositories/${this.repo}/`)) this.scheduleRender();
		};
		this.registerEvent(this.app.vault.on("create", onChange));
		this.registerEvent(this.app.vault.on("delete", onChange));
		this.registerEvent(this.app.vault.on("rename", (file, oldPath) => {
			onChange(file);
			onChange({ path: oldPath });
		}));
		this.registerEvent(this.app.metadataCache.on("changed", onChange));
		await this.render();
	}

	private async render() {
		const files = this.app.vault.getMarkdownFiles().map((file) => ({ path: file.path, mtime: file.stat.mtime }));
		const bodies = await this.readIndexes(files.map((file) => file.path));
		const records = collectRecords(files, this.repo, (path) => bodies.get(path));
		const launchable = Platform.isDesktopApp ? await this.launchableRecords(records) : new Set<string>();

		const root = this.contentEl;
		root.empty();
		root.addClass("galaxy-brain-repository");

		const header = root.createDiv({ cls: "gbr-header" });
		header.createEl("h1", { text: this.repo });
		const select = header.createEl("select", { cls: "dropdown" });
		for (const name of repositoryNames(files)) {
			select.createEl("option", { text: name, value: name }).selected = name === this.repo;
		}
		select.onchange = () => void this.leaf.setViewState({ type: REPOSITORY_VIEW, state: { repo: select.value } });

		const sections = repositorySections(records);
		if (sections.length === 0) root.createEl("p", { text: "No records.", cls: "gbr-empty" });
		for (const { kind, groups } of sections) {
			const count = groups.reduce((n, group) => n + group.records.length, 0);
			root.createEl("h2", { text: `${KIND_LABELS[kind]} (${count})` });
			for (const group of groups) {
				const key = `${kind}/${group.status}`;
				const details = root.createEl("details", { cls: "gbr-group" });
				details.open = group.collapsed === this.toggled.has(key);
				details.ontoggle = () => {
					if (details.open === group.collapsed) this.toggled.add(key);
					else this.toggled.delete(key);
				};
				details.createEl("summary", { text: `${statusLabel(group.status)} (${group.records.length})` });
				const list = details.createEl("ul");
				for (const record of group.records) {
					const body = (record.indexPath && bodies.get(record.indexPath)) || "";
					this.renderRecord(list, record, body, launchable.has(record.dir));
				}
			}
		}
	}

	private async readIndexes(paths: string[]): Promise<Map<string, string>> {
		const prefix = `repositories/${this.repo}/`;
		const indexes = paths.filter((path) => path.startsWith(prefix) && path.endsWith("/index.md"));
		const bodies = new Map<string, string>();
		await Promise.all(indexes.map(async (path) => {
			const file = this.app.vault.getFileByPath(path);
			if (file) bodies.set(path, await this.app.vault.cachedRead(file));
		}));
		return bodies;
	}

	private renderRecord(list: HTMLElement, record: RecordSummary, body: string, launchable: boolean) {
		const item = list.createEl("li", { cls: "gbr-record" });
		const link = item.createEl("a", { text: record.title, cls: "internal-link", href: "#" });
		link.onclick = (event) => {
			event.preventDefault();
			void this.app.workspace.openLinkText(record.indexPath ?? record.dir, "", event.metaKey || event.ctrlKey);
		};
		if (record.title !== record.name) item.createSpan({ text: record.name, cls: "gbr-name" });
		item.createSpan({ text: timeAgo(record.mtime, Date.now()), cls: "gbr-time" });
		const actions = item.createSpan({ cls: "gbr-actions" });
		const action = (icon: string, label: string, onClick: () => void) => {
			const button = actions.createEl("button", { cls: "clickable-icon", attr: { "aria-label": label } });
			setIcon(button, icon);
			button.onclick = onClick;
		};
		if (launchable) action("bot", "Launch agent", () => void this.host.pickLauncher(record));
		action("github", "Open on GitHub", () => window.open(githubUrl(record, body)));
		const worktree = Platform.isDesktopApp ? this.host.worktreeFor(record, body) : null;
		if (worktree) action("code", "Open with Code", () => this.host.openInCode(worktree));
	}

	private async launchableRecords(records: RecordSummary[]): Promise<Set<string>> {
		const launchers = await this.host.loadLaunchers();
		return new Set(records.filter((record) => launchersFor(launchers, record).length > 0).map((record) => record.dir));
	}
}
