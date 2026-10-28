import { Component, debounce, ItemView, MarkdownRenderer, Platform, setIcon, type ViewStateResult, type WorkspaceLeaf } from "obsidian";
import { type GroupingSection, groupingFor, isReviewableRecordKind, KIND_LABELS, parseGrouping, RECORD_KINDS, type RecordKind, recordTitle, statusLabel } from "../../site/src/lib/records";
import { type GithubTab, githubListTitle, githubListUrl, REPOSITORY_TABS as TABS, type RepositoryTab as Tab, upstreamOwner } from "../../site/src/lib/repository-tabs";
import { type Launcher, launchersFor, type RecordRef, untrackedRecord } from "./launchers";
import { type FeedItem, type FeedList, type Feeds, feedArgs, matchRecords, parseFeeds } from "./github-feed";
import { hasDifferentialReview, openDifferentialReview } from "./diff-review-view";
import { compareUrl, githubUrl } from "./record-links";
import { SYNC_PROCESSES, SYNC_PROFILE } from "./record-agents";
import { groupRecords } from "./record-groups";
import { collectRecords, type RecentBy, recentRecords, type RecordSummary, repositoryNames, timeAgo } from "./repository";

export const REPOSITORY_VIEW = "galaxy-brain-repository";
/** `repo` state for the view across every tracked repository. */
export const ALL_REPOS = "*";

export interface RecordHost {
	loadLaunchers(): Promise<Launcher[]>;
	pickLauncher(record: RecordRef): Promise<void>;
	worktreeFor(record: RecordRef, body: string): string | null;
	openInCode(path: string): void;
	runGh(args: string[]): Promise<string>;
	/** Agent dir that syncs the repo's records of this kind, if mapped. */
	syncAgent(repo: string, kind: RecordKind): Promise<string | undefined>;
	launchSync(repo: string, kind: RecordKind, agentDir: string): Promise<void>;
}


// Plugin-only; the site's tab list doesn't have it.
const RECENT = "recent";
type ViewTab = Tab | typeof RECENT;
const RECENT_TAB = { id: RECENT, label: "Recent" } as const;

const isRecordTab = (tab: ViewTab): tab is RecordKind => (RECORD_KINDS as readonly string[]).includes(tab);
const isMine = (tab: GithubTab) => tab === "my-drafts" || tab === "conflicting";

const RECENT_BY: Record<RecentBy, string> = { created: "Newest", updated: "Recently updated" };

const RECORD_ICONS: Record<RecordKind, string> = { branches: "git-branch", reviews: "file-search", issues: "file-text", issues_incubator: "sprout" };
const RECORD_NOUNS: Record<RecordKind, string> = { branches: "branch", reviews: "review", issues: "issue", issues_incubator: "issue draft" };

const FEED_KEYS: Record<GithubTab, FeedList> = {
	"new-prs": "newPrs",
	"undrafted-prs": "undraftedPrs",
	"new-issues": "issues",
	"my-drafts": "myDrafts",
	conflicting: "conflicting",
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

/** A repository's queue file for a kind, e.g. MY_BRANCHES.md. */
interface QueueFile {
	path: string;
	text: string;
	sections: GroupingSection[];
}

interface RepositoryViewState extends Record<string, unknown> {
	repo?: string;
	tab?: ViewTab;
	recentBy?: RecentBy;
	/** Kind the Recent tab lists; every kind when unset. */
	recentKind?: RecordKind;
}

/** Live landing page for one repository's branches, issues and reviews, or every repository's recent records. */
export class RepositoryView extends ItemView {
	private repo = "galaxy";
	private tab: ViewTab = "branches";
	private recentBy: RecentBy = "created";
	private recentKind: RecordKind | undefined;
	/** GitHub feeds by repository, fetched on first view and on refresh. */
	private feeds = new Map<string, FeedState>();
	private launchers: Launcher[] = [];
	/** Status groups toggled away from their default, kept across re-renders. */
	private toggled = new Set<string>();
	/** Owns the rendered queue file's children; replaced on every render. */
	private embed: Component | undefined;
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
		return this.repo === ALL_REPOS ? "Recent records" : `${this.repo} records`;
	}

	getIcon() {
		return "library";
	}

	getState(): RepositoryViewState {
		return { repo: this.repo, tab: this.tab, recentBy: this.recentBy, ...(this.recentKind ? { recentKind: this.recentKind } : {}) };
	}

	async setState(state: RepositoryViewState, result: ViewStateResult) {
		if (state.repo && state.repo !== this.repo) {
			this.repo = state.repo;
			this.toggled.clear();
		}
		if (state.tab && (state.tab === RECENT || TABS.some((tab) => tab.id === state.tab))) this.tab = state.tab;
		else if ((state.tab as string) === "records") this.tab = "branches";
		if (state.recentBy && state.recentBy in RECENT_BY) this.recentBy = state.recentBy;
		if ("recentKind" in state) this.recentKind = RECORD_KINDS.find((kind) => kind === state.recentKind);
		await super.setState(state, result);
		await this.render();
	}

	async onOpen() {
		const onChange = (file: { path: string }) => {
			const grouped = isRecordTab(this.tab) && file.path === groupingFor(this.repo, this.tab);
			if (grouped || file.path.startsWith(this.prefix())) this.scheduleRender();
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
		const files = this.app.vault.getMarkdownFiles().map(({ path, stat }) => ({ path, mtime: stat.mtime, ctime: stat.ctime }));
		const all = this.repo === ALL_REPOS;
		// Across every repository only the Recent tab's records get read, after they're picked.
		const bodies = all ? new Map<string, string>() : await this.readIndexes(files.map((file) => file.path));
		const records = collectRecords(files, all ? undefined : this.repo, (path) => bodies.get(path));
		this.launchers = Platform.isDesktopApp ? await this.host.loadLaunchers() : [];
		const launchable = new Set(records.filter((record) => this.canLaunch(record)).map((record) => record.dir));

		if (this.embed) this.removeChild(this.embed);
		this.embed = this.addChild(new Component());
		const root = this.contentEl;
		root.empty();
		root.addClass("galaxy-brain-repository");

		const header = root.createDiv({ cls: "gbr-header" });
		header.createEl("h1", { text: all ? "All repositories" : this.repo });
		const select = header.createEl("select", { cls: "dropdown" });
		select.createEl("option", { text: "All repositories", value: ALL_REPOS }).selected = all;
		for (const name of repositoryNames(files)) {
			select.createEl("option", { text: name, value: name }).selected = name === this.repo;
		}
		select.onchange = () => void this.leaf.setViewState({ type: REPOSITORY_VIEW, state: { repo: select.value, tab: this.tab } });

		// GitHub tabs shell out to `gh`, so they're desktop only.
		const recordTabs = TABS.filter((tab) => isRecordTab(tab.id));
		const githubTabs = Platform.isDesktopApp ? TABS.filter((tab) => !isRecordTab(tab.id)) : [];
		const tabs: Array<{ id: ViewTab; label: string }> = all ? [RECENT_TAB] : [...recordTabs, RECENT_TAB, ...githubTabs];
		const current = tabs.some((tab) => tab.id === this.tab) ? this.tab : tabs[0]!.id;
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

		if (current === RECENT) await this.renderRecent(root, records, bodies, launchable, all);
		else if (isRecordTab(current)) {
			await this.renderSync(root, current);
			this.renderRecords(root, current, records, bodies, launchable, await this.readQueue(current));
		}
		else this.renderFeed(root, current, records, bodies, launchable, header);
	}

	private async renderRecent(root: HTMLElement, records: RecordSummary[], bodies: Map<string, string>, launchable: Set<string>, all: boolean) {
		const controls = root.createDiv({ cls: "gbr-tabs" });
		const choose = <T extends string>(options: Record<T, string>, value: T, onChange: (value: T) => void) => {
			const select = controls.createEl("select", { cls: "dropdown" });
			for (const [key, label] of Object.entries(options) as [T, string][]) {
				select.createEl("option", { text: label, value: key }).selected = key === value;
			}
			select.onchange = () => {
				onChange(select.value as T);
				this.app.workspace.requestSaveLayout();
				void this.render();
			};
		};
		choose(RECENT_BY, this.recentBy, (by) => (this.recentBy = by));
		const kinds = { all: "All kinds", ...KIND_LABELS } as Record<RecordKind | "all", string>;
		choose(kinds, this.recentKind ?? "all", (kind) => (this.recentKind = kind === "all" ? undefined : kind));

		const recent = recentRecords(records, { by: this.recentBy, kind: this.recentKind });
		const unread = recent.flatMap((record) => (record.indexPath && !bodies.has(record.indexPath) ? [record.indexPath] : []));
		for (const [path, body] of await this.readIndexes(unread)) bodies.set(path, body);
		if (recent.length === 0) root.createEl("p", { text: "No records.", cls: "gbr-empty" });
		const list = root.createEl("ul");
		for (const record of recent) {
			const body = (record.indexPath && bodies.get(record.indexPath)) || "";
			const tags = [...(all ? [record.repo] : []), ...(this.recentKind ? [] : [RECORD_NOUNS[record.kind]]), statusLabel(record.status)];
			this.renderRecord(list, { ...record, title: recordTitle(body) ?? record.title }, body, launchable.has(record.dir), {
				time: this.recentBy === "created" ? record.created : record.indexMtime!,
				tags,
			});
		}
	}

	private renderRecords(
		root: HTMLElement,
		kind: RecordKind,
		records: RecordSummary[],
		bodies: Map<string, string>,
		launchable: Set<string>,
		queue: QueueFile | undefined,
	) {
		const groups = groupRecords(records, kind, queue?.sections);
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
		if (queue) void this.renderQueue(root, queue);
	}

	/** 🔄 Sync button and the last SYNC_REPORT.md, above an issues or reviews tab. */
	private async renderSync(root: HTMLElement, kind: RecordKind) {
		if (!SYNC_PROCESSES[kind]) return;
		const agent = Platform.isDesktopApp ? await this.host.syncAgent(this.repo, kind) : undefined;
		if (agent) {
			const bar = root.createDiv({ cls: "gbr-sync" });
			const button = bar.createEl("button", { text: `🔄 Sync ${kind}`, attr: { "aria-label": `Launch ${agent} to sync ${kind}` } });
			button.onclick = () => void this.host.launchSync(this.repo, kind, agent);
			bar.createSpan({ cls: "gbr-time", text: `${agent} · ${SYNC_PROFILE}` });
		}
		const report = this.app.vault.getFileByPath(`repositories/${this.repo}/${kind}/SYNC_REPORT.md`);
		if (report) void this.renderQueue(root, { path: report.path, text: await this.app.vault.cachedRead(report), sections: [] });
	}

	/** A note rendered inline: the queue file below its groups, or the sync report. */
	private async renderQueue(root: HTMLElement, queue: QueueFile) {
		const section = root.createDiv({ cls: "gbr-queue" });
		const heading = section.createDiv({ cls: "gbr-queue-heading" });
		heading.createSpan({ text: queue.path.split("/").pop() });
		const open = heading.createEl("a", { text: "Open note", cls: "internal-link", href: "#" });
		const body = section.createDiv({ cls: "gbr-queue-body markdown-rendered" });
		const openLink = (event: MouseEvent, link: string) => {
			event.preventDefault();
			void this.app.workspace.openLinkText(link, queue.path, event.metaKey || event.ctrlKey);
		};
		open.onclick = (event) => openLink(event, queue.path);
		// Rendered internal links don't navigate inside a custom view on their own.
		body.onclick = (event) => {
			const link = (event.target as HTMLElement).closest("a.internal-link");
			const href = link?.getAttribute("data-href") ?? link?.getAttribute("href");
			if (href) openLink(event, href);
		};
		await MarkdownRenderer.render(this.app, queue.text, body, queue.path, this.embed!);
	}

	private renderFeed(
		root: HTMLElement,
		tab: GithubTab,
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
			text: githubListTitle(tab),
			href: githubListUrl(owner, this.repo, tab),
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
			const kind = RECORD_NOUNS[record.kind];
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

	/** The repository's queue file for this kind, if it has one. */
	private async readQueue(kind: RecordKind): Promise<QueueFile | undefined> {
		const path = groupingFor(this.repo, kind);
		const file = path ? this.app.vault.getFileByPath(path) : null;
		if (!file) return undefined;
		const text = await this.app.vault.cachedRead(file);
		return { path: file.path, text, sections: parseGrouping(text, file.path, this.repo, kind) };
	}

	/** Vault path prefix of the records this view shows. */
	private prefix(): string {
		return this.repo === ALL_REPOS ? "repositories/" : `repositories/${this.repo}/`;
	}

	private async readIndexes(paths: string[]): Promise<Map<string, string>> {
		const prefix = this.prefix();
		const indexes = paths.filter((path) => path.startsWith(prefix) && path.endsWith("/index.md"));
		const bodies = new Map<string, string>();
		await Promise.all(indexes.map(async (path) => {
			const file = this.app.vault.getFileByPath(path);
			if (file) bodies.set(path, await this.app.vault.cachedRead(file));
		}));
		return bodies;
	}

	private renderRecord(
		list: HTMLElement,
		record: RecordSummary,
		body: string,
		launchable: boolean,
		{ time = record.mtime, tags = [] }: { time?: number; tags?: string[] } = {},
	) {
		const item = list.createEl("li", { cls: "gbr-record" });
		const actions = item.createSpan({ cls: "gbr-actions" });
		const link = item.createEl("a", { text: record.title, cls: "internal-link", href: "#" });
		link.onclick = (event) => {
			event.preventDefault();
			void this.app.workspace.openLinkText(record.indexPath ?? record.dir, "", event.metaKey || event.ctrlKey);
		};
		if (record.title !== record.name) item.createSpan({ text: record.name, cls: "gbr-name" });
		for (const tag of tags) item.createSpan({ text: tag, cls: "gbr-tag" });
		item.createSpan({ text: timeAgo(time, Date.now()), cls: "gbr-time" });
		const action = (icon: string, label: string, onClick: () => void) => {
			const button = actions.createEl("button", { cls: "clickable-icon", attr: { "aria-label": label } });
			setIcon(button, icon);
			button.onclick = onClick;
		};
		if (launchable) action("bot", "Launch agent", () => void this.host.pickLauncher(record));
		const github = githubUrl(record, body);
		if (github) action("github", "Open on GitHub", () => window.open(github));
		const compare = compareUrl(record, body);
		if (compare) action("git-compare-arrows", "Compare to upstream base", () => window.open(compare));
		const worktree = Platform.isDesktopApp ? this.host.worktreeFor(record, body) : null;
		if (worktree) action("code", "Open with Code", () => this.host.openInCode(worktree));
		if (isReviewableRecordKind(record.kind) && hasDifferentialReview(this.app, record.dir)) action("git-compare", "Differential review", () => void openDifferentialReview(this.app, record.dir));
	}

	private canLaunch(record: RecordRef): boolean {
		return launchersFor(this.launchers, record).length > 0;
	}
}
