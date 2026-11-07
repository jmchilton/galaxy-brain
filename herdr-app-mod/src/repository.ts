// A repository's records for the Herdr app, a tab whose only pane is this mod: kind tabs of queue sections and
// status groups, the queue file and sync report, and Recent; or every repository's Recent. Rows open their gb-record tab.

import { div, View } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { exec, props, readTextFile, theme, watchFolder } from "herdr";
import type { RepositoryGroup, RepositoryKind, RepositoryPage, RepositoryRow } from "../../herdr-plugin/src/repository-types";
import { withoutFrontmatter } from "../../obsidian-plugin/src/record-frontmatter";
import { type RecentBy, timeAgo } from "../../obsidian-plugin/src/repository";
import { KIND_LABELS, RECORD_KINDS, type RecordKind } from "../../site/src/lib/records";
import { chip, sectionTab } from "./chip";
import { appHost, delay, logRenderFailures, obsidianUrl, openUrl } from "./host";
import { type MarkdownBlock, markdownBlocks } from "./markdown-blocks";
import { type MarkdownHost, renderMarkdown } from "./markdown-view";
import { linkTarget } from "./record-page";
import { openRecordTab, openRepositoryTab } from "./record-tab";
import { recordRefOf, repositoryChanged } from "./repository-page";

const MOD = "gb-repository";
const VAULT = `${__GB_ROOT__}/vault`;
const REPOSITORIES = `${VAULT}/repositories`;
const RECENT = "recent";
/** Rows a group shows until asked for the rest: a render has 50 ms. */
const GROUP_LIMIT = 40;
/** Agents write here in bursts. */
const SETTLE_MS = 2_000;
const POLL_MS = 30_000;
const RECENT_BY: Record<RecentBy, string> = { created: "Newest", updated: "Recently updated" };

type Cx = any;
type El = any;

export default class GbRepository extends View {
	declare page: RepositoryPage | null;
	declare error: string | null;
	/** A kind, or RECENT. */
	declare tab: string;
	declare recentBy: RecentBy;
	declare recentKind: RecordKind | null;
	/** Groups toggled away from their default, and those showing every row. */
	declare toggled: Set<string>;
	declare unlimited: Set<string>;
	/** Open notes by vault path; null when one can't be read. */
	declare notes: Map<string, MarkdownBlock[] | null>;
	/** `<details>` toggled by hand, by note and place, so a reload keeps them. */
	declare details: Map<string, boolean>;

	init(_props: unknown, cx: Cx) {
		this.page = null;
		this.error = null;
		this.tab = props()?.repo ? RECORD_KINDS[0] : RECENT;
		this.recentBy = "created";
		this.recentKind = null;
		this.toggled = new Set();
		this.unlimited = new Set();
		this.notes = new Map();
		this.details = new Map();
		cx.spawn(async (cx: Cx) => {
			await this.load(cx);
			await this.watch(cx);
		});
	}

	async load(cx: Cx) {
		const repo = props()?.repo as string | undefined;
		try {
			const page: RepositoryPage | null = await appHost({ type: "repositoryPage", ...(repo ? { repo } : {}), by: this.recentBy, ...(this.recentKind ? { kind: this.recentKind } : {}) });
			this.page = page;
			this.error = page ? null : `${repo} has no records in this vault.`;
			if (page) await Promise.all([...this.notes.keys()].map((path) => this.read(path)));
		} catch (error) {
			this.error = String(error);
		}
		cx.notify();
	}

	async read(path: string) {
		const text: string | null = await readTextFile(`${VAULT}/${path}`).catch(() => null);
		this.notes.set(path, text === null ? null : markdownBlocks(withoutFrontmatter(text), { repo: this.page?.upstream ?? "" }));
	}

	/** Reloads on changes to its Markdown; polls if the folder can't be watched. */
	async watch(cx: Cx) {
		const root = props()?.repo ? `${REPOSITORIES}/${props().repo}` : REPOSITORIES;
		for (;;) {
			try {
				if (!repositoryChanged(await watchFolder(root), root)) continue;
				await delay(cx, SETTLE_MS);
			} catch {
				await delay(cx, POLL_MS);
			}
			await this.load(cx);
		}
	}

	reload(cx: Cx) {
		cx.spawn(async (cx: Cx) => this.load(cx));
	}

	render(_cx: Cx): El {
		const t = theme();
		const root = v_flex().id(MOD).size_full().min_h(0).bg(t.background).text_color(t.foreground).text_size(13);
		if (!this.page) return root.child(div().p(16).text_color(this.error ? t.blocked : t.dim).child(this.error ?? "Loading…"));
		const kind = this.page.kinds.find((one) => one.kind === this.tab);
		return root.child(
			v_flex()
				.id("gb-repo-scroll")
				.flex_1()
				.min_h(0)
				.p(16)
				.gap(10)
				.overflow_y_scrollbar()
				.child(this.renderHeader(t))
				.child(this.renderRepositories(t))
				.when(this.error !== null, (el: El) => el.child(div().text_color(t.blocked).child(this.error)))
				.child(this.renderTabs(t))
				.child(kind ? this.renderKind(t, kind) : this.renderRecent(t)),
		);
	}

	renderHeader(t: any): El {
		return h_flex()
			.gap(8)
			.items_center()
			.child(div().flex_1().truncate().text_size(16).font_semibold().child(this.page!.repo ?? "All repositories"))
			.child(chip(t, "gb-repo-reload", "↻", "Reload", false, (cx) => this.reload(cx)));
	}

	renderRepositories(t: any): El {
		const { repo, repositories } = this.page!;
		return h_flex()
			.flex_wrap()
			.gap(4)
			.child(chip(t, "gb-repo-all", "All", "Every repository's recent records", repo === null, () => openRepositoryTab()))
			.children(repositories.map((name) => chip(t, `gb-repo-to-${name}`, name, undefined, name === repo, () => openRepositoryTab(name))));
	}

	renderTabs(t: any): El {
		const { kinds } = this.page!;
		const choose = (tab: string) => () => {
			this.tab = tab;
		};
		return h_flex()
			.flex_wrap()
			.gap(16)
			.border_b(1)
			.border_color(t.border)
			.children(kinds.map((one) => sectionTab(t, `gb-repo-tab-${one.kind}`, one.label, one.count, this.tab === one.kind, choose(one.kind))))
			.child(sectionTab(t, "gb-repo-tab-recent", "Recent", null, this.tab === RECENT, choose(RECENT)));
	}

	renderKind(t: any, kind: RepositoryKind): El {
		const now = Date.now();
		return v_flex()
			.gap(10)
			.when(Boolean(kind.report), (el: El) => el.child(this.renderNote(t, kind.report!)))
			.when(!kind.groups.length, (el: El) => el.child(div().text_color(t.dim).child("No records.")))
			.children(kind.groups.map((group) => this.renderGroup(t, kind.kind, group, now)))
			.when(Boolean(kind.queue), (el: El) => el.child(this.renderNote(t, kind.queue!)));
	}

	renderGroup(t: any, kind: string, group: RepositoryGroup, now: number): El {
		const key = `${kind}/${group.key}`;
		const open = group.collapsed === this.toggled.has(key);
		const rows = this.unlimited.has(key) ? group.rows : group.rows.slice(0, GROUP_LIMIT);
		const hidden = group.rows.length - rows.length;
		return v_flex()
			.gap(2)
			.child(
				this.disclosure(t, `gb-repo-g-${key}`, open, `${group.label} (${group.rows.length})`, () => {
					if (!this.toggled.delete(key)) this.toggled.add(key);
				}),
			)
			.when(open, (el: El) =>
				el
					.children(rows.map((row) => this.renderRow(t, row, [], now)))
					.when(hidden > 0, (el: El) =>
						el.child(
							div()
								.pl(20)
								.child(
									chip(t, `gb-repo-more-${key}`, `Show ${hidden} more`, undefined, false, () => {
										this.unlimited.add(key);
									}),
								),
						),
					),
			);
	}

	disclosure(t: any, id: string, open: boolean, label: string, toggle: (cx: Cx) => void): El {
		return h_flex()
			.id(id)
			.gap(6)
			.px(6)
			.py(3)
			.rounded(6)
			.items_center()
			.cursor_pointer()
			.font_medium()
			.hover((s: El) => s.bg(t.hover))
			.on_click((_e: unknown, cx: Cx) => {
				toggle(cx);
				cx.notify();
			})
			.child(div().flex_none().text_color(t.dim).child(open ? "▾" : "▸"))
			.child(div().flex_1().min_w(0).truncate().child(label));
	}

	renderRow(t: any, row: RepositoryRow, tags: string[], now: number): El {
		return h_flex()
			.id(`gb-repo-r-${row.ref}`)
			.gap(8)
			.pl(20)
			.pr(6)
			.py(2)
			.rounded(6)
			.items_center()
			.cursor_pointer()
			.hover((s: El) => s.bg(t.hover))
			.on_click(() => openRecordTab(row.ref))
			.child(div().flex_1().min_w(0).truncate().child(row.title))
			.when(row.title !== row.name, (el: El) => el.child(div().flex_none().max_w(240).truncate().text_size(11.5).text_color(t.dim).child(row.name)))
			.children(tags.map((tag) => div().flex_none().px(6).rounded(4).text_size(11).bg(t.hover).text_color(t.muted).child(tag)))
			.child(div().flex_none().text_size(11.5).text_color(t.dim).child(timeAgo(row.time, now)))
			.when(Boolean(row.github), (el: El) =>
				el.child(
					div()
						.id(`gb-repo-gh-${row.ref}`)
						.flex_none()
						.tooltip("Open on GitHub")
						.on_click((_e: unknown, cx: Cx) => {
							cx.stop_propagation();
							cx.spawn(async () => openUrl(row.github!));
						})
						.child("🔗"),
				),
			);
	}

	renderRecent(t: any): El {
		const { repo, recent } = this.page!;
		const now = Date.now();
		const choose = (cx: Cx, change: () => void) => {
			change();
			this.reload(cx);
		};
		return v_flex()
			.gap(6)
			.child(
				h_flex()
					.flex_wrap()
					.gap(4)
					.children(
						(Object.keys(RECENT_BY) as RecentBy[]).map((by) =>
							chip(t, `gb-repo-by-${by}`, RECENT_BY[by], undefined, this.recentBy === by, (cx) =>
								choose(cx, () => {
									this.recentBy = by;
								}),
							),
						),
					)
					.child(div().w(8))
					.child(
						chip(t, "gb-repo-kind-all", "All kinds", undefined, this.recentKind === null, (cx) =>
							choose(cx, () => {
								this.recentKind = null;
							}),
						),
					)
					.children(
						RECORD_KINDS.map((kind) =>
							chip(t, `gb-repo-kind-${kind}`, KIND_LABELS[kind], undefined, this.recentKind === kind, (cx) =>
								choose(cx, () => {
									this.recentKind = kind;
								}),
							),
						),
					),
			)
			.when(!recent.length, (el: El) => el.child(div().text_color(t.dim).child("No records.")))
			.children(recent.map((row) => this.renderRow(t, row, [...(repo ? [] : [row.repo]), ...(this.recentKind ? [] : [row.kind]), row.status], now)));
	}

	// Shut until asked for: a queue file repeats the groups above it.
	renderNote(t: any, path: string): El {
		const open = this.notes.has(path);
		const blocks = this.notes.get(path);
		return v_flex()
			.gap(6)
			.child(
				h_flex()
					.gap(8)
					.items_center()
					.child(
						div()
							.flex_1()
							.min_w(0)
							.child(
								this.disclosure(t, `gb-repo-n-${path}`, open, path.split("/").pop()!, (cx) => {
									if (this.notes.delete(path)) return;
									this.notes.set(path, []);
									cx.spawn(async (cx: Cx) => {
										await this.read(path);
										cx.notify();
									});
								}),
							),
					)
					.child(chip(t, `gb-repo-n-o-${path}`, "Obsidian", "Open in Obsidian", false, (cx) => cx.spawn(async () => openUrl(obsidianUrl(path))))),
			)
			.when(open, (el: El) => el.child(blocks ? renderMarkdown(t, blocks, this.markdownHost(path)) : div().text_color(t.dim).child(`Can't read ${path}.`)));
	}

	markdownHost(path: string): MarkdownHost {
		const { details } = this;
		return {
			id: `gb-repo-md-${path}`,
			isOpen: (key, initial) => details.get(`${path}#${key}`) ?? initial,
			setOpen: (key, open) => details.set(`${path}#${key}`, open),
			onLink: (url, cx) => this.onLink(path, url, cx),
		};
	}

	/** Records open their own tab; other vault notes open in Obsidian. */
	onLink(note: string, url: string, cx: Cx) {
		const slash = note.lastIndexOf("/");
		const target = linkTarget(url, { vault: VAULT, dir: note.slice(0, slash), current: note.slice(slash + 1), files: [] });
		if (!target) return;
		if ("url" in target) cx.spawn(async () => exec("open", [target.url]));
		else if ("vault" in target) {
			const ref = recordRefOf(target.vault);
			if (ref) openRecordTab(ref);
			else cx.spawn(async () => openUrl(obsidianUrl(target.vault)));
		}
	}
}

logRenderFailures(MOD, GbRepository);
