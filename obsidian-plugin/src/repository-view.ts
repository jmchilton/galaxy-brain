import { debounce, ItemView, Platform, setIcon, type ViewStateResult, type WorkspaceLeaf } from "obsidian";
import { RECORD_KINDS, type RecordKind, statusLabel } from "../../site/src/lib/records";
import { type Launcher, launchersFor, type RecordRef, untrackedRecord } from "./launchers";
import { type FeedItem, type FeedList, type Feeds, feedArgs, feedUrl, matchRecords, parseFeeds } from "./github-feed";
import { githubUrl, upstreamOwner } from "./record-links";
import { type GroupingSection, groupingFor, groupRecords, parseGrouping } from "./record-groups";
import { collectRecords, type RecordSummary, repositoryNames, timeAgo } from "./repository";

export const REPOSITORY_VIEW = "galaxy-brain-repository";

export interface RecordHost {
	loadLaunchers(): Promise<Launcher[]>;
	pickLauncher(record: RecordRef): Promise<void>;
	worktreeFor(record: RecordRef, body: string): string | null;
	openInCode(path: string): void;
	runGh(args: string[]): Promise<string>;
}

const TABS = [
	{ id: "branches", label: "My branches" },
	{ id: "issues", label: "My issues" },
	{ id: "reviews", label: "My reviews" },
	{ id: "my-drafts", label: "My drafts" },
	{ id: "conflicting", label: "Conflicting" },
	{ id: "new-prs", label: "New PRs" },
	{ id: "undrafted-prs", label: "Out of draft" },
	{ id: "new-issues", label: "New issues" },
] as const;
type Tab = (typeof TABS)[number]["id"];
type FeedTab = Exclude<Tab, RecordKind>;

const isRecordTab = (tab: Tab): tab is RecordKind => (RECORD_KINDS as readonly string[]).includes(tab);
const isMine = (tab: FeedTab) => tab === "my-drafts" || tab === "conflicting";

const RECORD_ICONS: Record<RecordKind, string> = { branches: "git-branch", reviews: "file-search", issues: "file-text" };

const FEED_KEYS: Record<FeedTab, FeedList> = {
	"new-prs": "newPrs",
	"undrafted-prs": "undraftedPrs",
	"new-issues": "issues",
	"my-drafts": "myDrafts",
	conflicting: "conflicting",
};

const FEED_LINKS: Record<FeedTab, string> = {
	"new-prs": "Open PRs, newest first, on GitHub",
	"undrafted-prs": "Open non-draft PRs, recently updated, on GitHub",
	"new-issues": "Open issues, newest first, on GitHub",
	"my-drafts": "My open draft PRs on GitHub",
	conflicting: "My open PRs on GitHub (it can't filter by conflicts)",
};

/** Wait before re-asking GitHub about PRs whose mergeability it was still computing. */
const RECHECK_MS = 5000;

interface FeedState {
	feeds?: Feeds;
	fetchedAt?: number;
	error?: string;
	loading?: Promise<void>;
	/** Waiting to re-fetch PRs GitHub hadn't checked for conflicts. */
	checking?: boolean;
}

interface RepositoryViewState extends Record<string, unknown> {
	repo?: string;
	tab?: Tab;
}

/** Live landing page for one repository's branches, issues and reviews. */
export class RepositoryView extends ItemView {
	private repo = "galaxy";
	private tab: Tab = "branches";
	/** GitHub feeds by repository, fetched on first view and on refresh. */
	private feeds = new Map<string, FeedState>();
	private launchers: Launcher[] = [];
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
		return { repo: this.repo, tab: this.tab };
	}

	async setState(state: RepositoryViewState, result: ViewStateResult) {
		if (state.repo && state.repo !== this.repo) {
			this.repo = state.repo;
			this.toggled.clear();
		}
		if (state.tab && TABS.some((tab) => tab.id === state.tab)) this.tab = state.tab;
		else if ((state.tab as string) === "records") this.tab = "branches";
		await super.setState(state, result);
		await this.render();
	}

	async onOpen() {
		const onChange = (file: { path: string }) => {
			const grouped = isRecordTab(this.tab) && file.path === groupingFor(this.repo, this.tab);
			if (grouped || file.path.startsWith(`repositories/${this.repo}/`)) this.scheduleRender();
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
		this.launchers = Platform.isDesktopApp ? await this.host.loadLaunchers() : [];
		const launchable = new Set(records.filter((record) => this.canLaunch(record)).map((record) => record.dir));

		const root = this.contentEl;
		root.empty();
		root.addClass("galaxy-brain-repository");

		const header = root.createDiv({ cls: "gbr-header" });
		header.createEl("h1", { text: this.repo });
		const select = header.createEl("select", { cls: "dropdown" });
		for (const name of repositoryNames(files)) {
			select.createEl("option", { text: name, value: name }).selected = name === this.repo;
		}
		select.onchange = () => void this.leaf.setViewState({ type: REPOSITORY_VIEW, state: { repo: select.value, tab: this.tab } });

		// GitHub tabs shell out to `gh`, so they're desktop only.
		const tabs = Platform.isDesktopApp ? TABS : TABS.filter((tab) => isRecordTab(tab.id));
		const current = tabs.some((tab) => tab.id === this.tab) ? this.tab : "branches";
		const bar = root.createDiv({ cls: "gbr-tabs" });
		for (const tab of tabs) {
			const count = isRecordTab(tab.id) ? ` (${records.filter((record) => record.kind === tab.id).length})` : "";
			const button = bar.createEl("button", { text: tab.label + count, cls: tab.id === current ? "mod-cta" : "" });
			button.onclick = () => {
				this.tab = tab.id;
				this.app.workspace.requestSaveLayout();
				void this.render();
			};
		}

		if (isRecordTab(current)) this.renderRecords(root, current, records, bodies, launchable, await this.readGrouping(current));
		else this.renderFeed(root, current, records, bodies, launchable, header);
	}

	private renderRecords(
		root: HTMLElement,
		kind: RecordKind,
		records: RecordSummary[],
		bodies: Map<string, string>,
		launchable: Set<string>,
		grouping: GroupingSection[] | undefined,
	) {
		const groups = groupRecords(records, kind, grouping);
		if (groups.length === 0) root.createEl("p", { text: "No records.", cls: "gbr-empty" });
		for (const group of groups) {
			const key = `${kind}/${group.status}`;
			const details = root.createEl("details", { cls: "gbr-group" });
			details.open = group.collapsed === this.toggled.has(key);
			details.ontoggle = () => {
				if (details.open === group.collapsed) this.toggled.add(key);
				else this.toggled.delete(key);
			};
			details.createEl("summary", { text: `${group.label ?? statusLabel(group.status)} (${group.records.length})` });
			const list = details.createEl("ul");
			for (const record of group.records) {
				const body = (record.indexPath && bodies.get(record.indexPath)) || "";
				this.renderRecord(list, record, body, launchable.has(record.dir));
			}
		}
	}

	private renderFeed(
		root: HTMLElement,
		tab: FeedTab,
		records: RecordSummary[],
		bodies: Map<string, string>,
		launchable: Set<string>,
		header: HTMLElement,
	) {
		const state = this.feedState();
		const refresh = header.createEl("button", { cls: "clickable-icon", attr: { "aria-label": "Refresh from GitHub" } });
		setIcon(refresh, "refresh-cw");
		refresh.onclick = () => void this.fetchFeeds(true);
		if (state.fetchedAt) header.createSpan({ text: `fetched ${timeAgo(state.fetchedAt, Date.now())}`, cls: "gbr-time" });
		const owner = upstreamOwner(this.repo, [...bodies.values()]);
		root.createEl("p", { cls: "gbr-github-link" }).createEl("a", {
			text: FEED_LINKS[tab],
			href: feedUrl(owner, this.repo, FEED_KEYS[tab]),
			cls: "external-link",
		});

		if (!state.feeds) {
			if (state.error) root.createEl("p", { text: `Could not fetch from GitHub: ${state.error}`, cls: "gbr-empty" });
			else root.createEl("p", { text: "Fetching from GitHub…", cls: "gbr-empty" });
			if (!state.loading && !state.error) void this.fetchFeeds(false);
			return;
		}

		const bodyOf = (record: RecordSummary) => (record.indexPath && bodies.get(record.indexPath)) || "";
		if (tab === "conflicting" && state.checking) {
			root.createEl("p", { text: "Checking for conflicts…", cls: "gbr-empty" });
			return;
		}
		const items = state.feeds[FEED_KEYS[tab]];
		const unchecked = tab === "conflicting" ? state.feeds.unchecked : 0;
		if (unchecked) root.createEl("p", { text: `GitHub hasn't checked ${unchecked} PR(s) yet; refresh to recheck.`, cls: "gbr-empty" });
		if (items.length === 0) root.createEl("p", { text: isMine(tab) ? "None." : "Nothing recent.", cls: "gbr-empty" });
		const list = root.createEl("ul");
		for (const item of items) {
			const matched = matchRecords(item, tab === "new-issues", records, bodyOf);
			this.renderFeedItem(list, item, tab === "new-issues", matched, bodyOf, launchable);
		}
	}

	private renderFeedItem(
		list: HTMLElement,
		item: FeedItem,
		isIssue: boolean,
		matched: RecordSummary[],
		bodyOf: (record: RecordSummary) => string,
		launchable: Set<string>,
	) {
		const row = list.createEl("li", { cls: "gbr-record" });
		const actions = row.createSpan({ cls: "gbr-actions" });
		row.createEl("a", { text: `#${item.number} ${item.title}`, href: item.url, cls: "external-link" });
		if (item.isDraft) row.createSpan({ text: "draft", cls: "gbr-tag" });
		row.createSpan({ text: `${item.author} · ${timeAgo(Date.parse(item.at), Date.now())}`, cls: "gbr-time" });
		const action = (icon: string, label: string, onClick: (event: MouseEvent) => void) => {
			const button = actions.createEl("button", { cls: "clickable-icon", attr: { "aria-label": label } });
			setIcon(button, icon);
			button.onclick = onClick;
		};
		if (matched.length === 0) {
			const untracked = untrackedRecord(this.repo, isIssue ? "issues" : "reviews", item.number);
			if (this.canLaunch(untracked)) action("bot", "Launch agent (no record yet)", () => void this.host.pickLauncher(untracked));
		}
		for (const record of matched) {
			const kind = record.kind === "branches" ? "branch" : record.kind === "reviews" ? "review" : "issue";
			action(RECORD_ICONS[record.kind], `Open ${kind} record ${record.name} (${statusLabel(record.status)})`, (event) =>
				void this.app.workspace.openLinkText(record.indexPath ?? record.dir, "", event.metaKey || event.ctrlKey),
			);
			if (launchable.has(record.dir)) action("bot", `Launch agent for ${kind} record`, () => void this.host.pickLauncher(record));
			const worktree = this.host.worktreeFor(record, bodyOf(record));
			if (worktree) action("code", `Open ${kind} worktree with Code`, () => this.host.openInCode(worktree));
		}
	}

	private feedState(): FeedState {
		let state = this.feeds.get(this.repo);
		if (!state) this.feeds.set(this.repo, (state = {}));
		return state;
	}

	private async fetchFeeds(force: boolean) {
		const state = this.feedState();
		if (state.loading) return state.loading;
		if (!force && state.feeds) return;
		const repo = this.repo;
		state.loading = (async () => {
			try {
				const prefix = `repositories/${repo}/`;
				const bodies = await this.readIndexes(this.app.vault.getMarkdownFiles().map((f) => f.path).filter((p) => p.startsWith(prefix)));
				const owner = upstreamOwner(repo, [...bodies.values()]);
				state.feeds = parseFeeds(await this.host.runGh(feedArgs(owner, repo)));
				state.fetchedAt = Date.now();
				state.error = undefined;
				if (state.feeds.unchecked) {
					state.checking = true;
					if (this.repo === repo) await this.render();
					await sleep(RECHECK_MS);
					state.feeds = parseFeeds(await this.host.runGh(feedArgs(owner, repo)));
					state.fetchedAt = Date.now();
				}
			} catch (error) {
				state.error = error instanceof Error ? error.message : String(error);
			} finally {
				state.loading = undefined;
				state.checking = undefined;
			}
			if (this.repo === repo) await this.render();
		})();
		if (force) await this.render();
		return state.loading;
	}

	/** Sections of the repository's grouping file for this kind, if it has one. */
	private async readGrouping(kind: RecordKind): Promise<GroupingSection[] | undefined> {
		const path = groupingFor(this.repo, kind);
		const file = path ? this.app.vault.getFileByPath(path) : null;
		return file ? parseGrouping(await this.app.vault.cachedRead(file), file.path, this.repo, kind) : undefined;
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
		const actions = item.createSpan({ cls: "gbr-actions" });
		const link = item.createEl("a", { text: record.title, cls: "internal-link", href: "#" });
		link.onclick = (event) => {
			event.preventDefault();
			void this.app.workspace.openLinkText(record.indexPath ?? record.dir, "", event.metaKey || event.ctrlKey);
		};
		if (record.title !== record.name) item.createSpan({ text: record.name, cls: "gbr-name" });
		item.createSpan({ text: timeAgo(record.mtime, Date.now()), cls: "gbr-time" });
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

	private canLaunch(record: RecordRef): boolean {
		return launchersFor(this.launchers, record).length > 0;
	}
}
