// A record's landing page for the Herdr app, a tab whose only pane is this mod: its files as links with
// File Docs hints, its launchers (through gb-pane's draft dialog), and index.md or the chosen file.

import { div, View } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { exec, openOverlay, props, readTextFile, theme, watchFolder } from "herdr";
import { withoutFrontmatter } from "../../obsidian-plugin/src/record-frontmatter";
import { type RecordFileLink, recordFileLabel, type RecordFileLinks } from "../../site/src/lib/file-docs";
import type { CommitDiff, CommitFile, FindingsChange, FindingsCheck, FindingsPanel } from "../../herdr-plugin/src/findings-types";
import { highlightDiff } from "../../obsidian-plugin/src/diff-highlight";
import { chip } from "./chip";
import { MAX_HIGHLIGHT_CHARS } from "./diff-lines";
import { commitKey, type FindingsUi, renderFindingsPanel, type ShownCommit } from "./findings-panel";
import { appHost, delay, host, logRenderFailures, obsidianUrl, openUrl } from "./host";
import { type MarkdownBlock, markdownBlocks } from "./markdown-blocks";
import { type MarkdownHost, renderMarkdown } from "./markdown-view";
import { editFindings } from "./note-edits";
import { isImagePath, linkTarget, withoutTitle } from "./record-page";
import { openRecordTab, openRepositoryTab, openReviewTab } from "./record-tab";
import { commitLines } from "./review-rows";

const VAULT = `${__GB_ROOT__}/vault`;
const INDEX = "index.md";
const OTHER = "other";
const POLL_MS = 30_000;
/** Seconds to wait for a check, which fetches from GitHub. */
const CHECK_POLLS = 180;
/** Diff lines per commit; the page isn't a virtual list. */
const MAX_COMMIT_ROWS = 200;

type Cx = any;
type El = any;

/** The native host's `recordPage` reply. */
interface Page {
	record: {
		key: string;
		repo: string;
		kind: string;
		status: string;
		name: string;
		title: string;
		github?: string;
		obsidian?: string;
		launchers: Array<{ label: string; prompt: string; profile: string }>;
	};
	review: boolean;
	findings: boolean;
	upstream: string;
	related: Array<{ text: string; label: string; ref?: string; condition?: string; obsidian?: string }>;
	links: RecordFileLinks;
	profiles: Array<{ name: string }>;
	environments: Array<{ name: string; icon?: string }>;
}

function shownCommit(files: CommitFile[]): ShownCommit {
	const { files: shown, hidden } = commitLines(files, MAX_COMMIT_ROWS);
	return { files: shown.map((file) => ({ ...file, tokens: highlightDiff(file.path, file.rows, MAX_HIGHLIGHT_CHARS) ?? [] })), hidden };
}

const allFiles = ({ documented, other }: RecordFileLinks): string[] => [INDEX, ...[...documented, ...other].flatMap((link) => link.files ?? [link.path])];

export default class GbRecord extends View {
	declare page: Page | null;
	declare error: string | null;
	declare file: string;
	/** The file's text, as blocks; null when it can't be read. */
	declare blocks: MarkdownBlock[] | null;
	/** `<details>` toggled by hand, by file and place, so a reload keeps them. */
	declare toggled: Map<string, boolean>;
	/** The folder link, or OTHER, whose files show. */
	declare unfolded: string | null;
	/** Null for records without findings YAML. */
	declare findings: FindingsPanel | null;
	/** The panel's parts opened by hand, kept across reloads. */
	declare findingsOpened: Set<string>;
	/** Parsed finding texts and previews, by source; cleared on each load. */
	declare findingsBlocks: Map<string, MarkdownBlock[]>;
	declare check: FindingsCheck | null;
	declare checking: boolean;
	/** Fixing commits' diffs by sha, kept across reloads; a sha's diff never changes. */
	declare commits: Map<string, ShownCommit | "loading">;

	init(_props: unknown, cx: Cx) {
		this.page = null;
		this.error = null;
		this.file = INDEX;
		this.blocks = null;
		this.toggled = new Map();
		this.unfolded = null;
		this.findings = null;
		this.findingsOpened = new Set();
		this.findingsBlocks = new Map();
		this.check = null;
		this.checking = false;
		this.commits = new Map();
		cx.spawn(async (cx: Cx) => {
			await this.load(cx);
			await this.watch(cx);
		});
	}

	async load(cx: Cx) {
		const ref = props()?.ref as string;
		try {
			this.page = await host({ type: "recordPage", ref });
			this.error = this.page ? null : `${ref} isn't in this vault; resync.`;
			if (this.page) await this.read();
			this.setFindings(this.page?.findings ? await appHost({ type: "findings", ref }) : null);
		} catch (error) {
			this.error = String(error);
		}
		cx.notify();
	}

	async read() {
		const path = `${VAULT}/${this.page!.record.key}/${this.file}`;
		const text: string | null = await readTextFile(path).catch(() => null);
		if (text === null) this.blocks = null;
		else this.blocks = markdownBlocks(this.file === INDEX ? withoutTitle(withoutFrontmatter(text)) : withoutFrontmatter(text), { repo: this.page!.upstream });
	}

	setFindings(panel: FindingsPanel | null) {
		this.findings = panel;
		this.findingsBlocks = new Map();
	}

	/** Opens or closes a fixing commit's diff, fetching it from the PR checkout on first open, or again if it was missing. */
	toggleCommit(sha: string, cx: Cx) {
		const key = commitKey(sha);
		const opening = !this.findingsOpened.delete(key);
		if (opening) this.findingsOpened.add(key);
		cx.notify();
		const cached = this.commits.get(sha);
		if (!opening || cached === "loading" || (cached && !("missing" in cached))) return;
		this.commits.set(sha, "loading");
		cx.spawn(async (cx: Cx) => {
			try {
				const diff: CommitDiff = await appHost({ type: "findingsCommit", ref: props()?.ref as string, sha });
				this.commits.set(sha, "missing" in diff ? diff : shownCommit(diff.files));
			} catch (error) {
				this.commits.set(sha, { missing: String(error) });
			}
			cx.notify();
		});
	}

	/** Sets one value in the findings YAML; the reply is the panel after it. */
	editFindings(cx: Cx, change: FindingsChange) {
		const { findings } = this;
		if (!findings) return;
		cx.spawn(async (cx: Cx) => {
			const panel = await editFindings(`${this.page!.record.key}/${findings.file}`, { ...change, ref: props()?.ref as string, round: findings.round });
			if (panel) this.setFindings(panel);
			cx.notify();
		});
	}

	/** Runs review-factory check in its own process, polling for its output. */
	runCheck(cx: Cx) {
		if (this.checking) return;
		const ref = props()?.ref as string;
		this.checking = true;
		this.check = null;
		cx.notify();
		cx.spawn(async (cx: Cx) => {
			try {
				await appHost({ type: "findingsCheck", ref, check: "start" });
				for (let i = 0; i < CHECK_POLLS && !this.check; i++) {
					await delay(cx, 1000);
					this.check = await appHost({ type: "findingsCheck", ref, check: "result" });
				}
				this.check ??= { ok: false, message: `⛔ no result after ${CHECK_POLLS} s; try again` };
			} catch (error) {
				this.check = { ok: false, message: `⛔ ${error}` };
			}
			this.checking = false;
			cx.notify();
		});
	}

	findingsUi(): FindingsUi {
		const { findingsBlocks: cache } = this;
		const { key } = this.page!.record;
		return {
			opened: this.findingsOpened,
			blocks: (text) => {
				let blocks = cache.get(text);
				if (!blocks) cache.set(text, (blocks = markdownBlocks(text, { repo: this.page!.upstream })));
				return blocks;
			},
			markdownHost: (scope) => this.markdownHost(scope),
			setInclude: (id, include, cx) => this.editFindings(cx, { id, include }),
			setAction: (action, checked, cx) => this.editFindings(cx, { action, checked }),
			openNote: (name, cx) => cx.spawn(async () => openUrl(obsidianUrl(`${key}/${name}`))),
			check: this.check,
			checking: this.checking,
			runCheck: (cx) => this.runCheck(cx),
			commit: (sha) => this.commits.get(sha),
			toggleCommit: (sha, cx) => this.toggleCommit(sha, cx),
		};
	}

	/** Opened outside the app: TextView can't load a file's image. */
	openImage(cx: Cx, path: string) {
		cx.spawn(async () => exec("open", [`${VAULT}/${path}`]));
	}

	/** Reloads on changes in the record; polls if its folder can't be watched, as after a status move. */
	async watch(cx: Cx) {
		for (;;) {
			try {
				await watchFolder(`${VAULT}/${this.page!.record.key}`);
				await delay(cx, 300);
			} catch {
				await delay(cx, POLL_MS);
			}
			await this.load(cx);
		}
	}

	show(cx: Cx, file: string) {
		this.file = file;
		cx.spawn(async (cx: Cx) => {
			await this.read();
			cx.notify();
		});
	}

	onLink(url: string, cx: Cx) {
		const { key } = this.page!.record;
		const target = linkTarget(url, { vault: VAULT, dir: key, current: this.file, files: allFiles(this.page!.links) });
		if (!target) return;
		if ("file" in target) this.show(cx, target.file);
		else if ("vault" in target && isImagePath(target.vault)) this.openImage(cx, target.vault);
		else if ("vault" in target) cx.spawn(async () => openUrl(obsidianUrl(target.vault)));
		else cx.spawn(async () => exec("open", [target.url]));
	}

	render(_cx: Cx): El {
		const t = theme();
		const root = v_flex().id("gb-record").size_full().min_h(0).bg(t.background).text_color(t.foreground).text_size(13);
		if (!this.page) return root.child(div().p(16).text_color(t.dim).child(this.error ?? "Loading…"));
		const { record, related, links } = this.page;
		return root.child(
			v_flex()
				.id("gb-record-scroll")
				.flex_1()
				.min_h(0)
				.p(16)
				.gap(10)
				.overflow_y_scrollbar()
				.child(this.renderHeader(t))
				.when(this.error !== null, (el: El) => el.child(div().text_color(t.blocked).child(this.error)))
				.when(related.length > 0, (el: El) => el.child(this.renderRelated(t)))
				.child(this.renderFiles(t, links))
				.when(record.launchers.length > 0, (el: El) => el.child(this.renderLaunchers(t)))
				.when(this.findings !== null, (el: El) => el.child(renderFindingsPanel(t, this.findings!, this.findingsUi())))
				.child(div().border_b(1).border_color(t.border))
				.child(this.blocks === null ? div().text_color(t.dim).child(`No ${this.file} in this record.`) : renderMarkdown(t, this.blocks, this.markdownHost())),
		);
	}

	/** For the shown file, or for a part of the findings panel. */
	markdownHost(scope = this.file): MarkdownHost {
		const { toggled } = this;
		return {
			id: `gb-rec-md-${scope}`,
			isOpen: (key, initial) => toggled.get(`${scope}#${key}`) ?? initial,
			setOpen: (key, open) => toggled.set(`${scope}#${key}`, open),
			onLink: (url, cx) => this.onLink(url, cx),
		};
	}

	renderHeader(t: any): El {
		const { record } = this.page!;
		const { github, obsidian } = record;
		return h_flex()
			.gap(8)
			.items_center()
			.child(div().flex_1().truncate().text_size(16).font_semibold().child(record.title))
			.child(div().flex_none().text_size(11.5).text_color(t.dim).child(`${record.kind} · ${record.status}`))
			.child(chip(t, "gb-rec-repo", `📚 ${record.repo}`, "This repository's records", false, () => openRepositoryTab(record.repo)))
			.when(Boolean(obsidian), (el: El) => el.child(chip(t, "gb-rec-obs", "Obsidian", "Open index.md in Obsidian", false, (cx) => cx.spawn(async () => openUrl(obsidian!)))))
			.when(Boolean(github), (el: El) => el.child(chip(t, "gb-rec-gh", "GitHub", github!, false, (cx) => cx.spawn(async () => openUrl(github!)))))
			.when(this.page!.review, (el: El) => el.child(chip(t, "gb-rec-review", "🔎 Review", "Differential review of this record", false, () => openReviewTab(props()?.ref))))
			.child(chip(t, "gb-rec-reload", "↻", "Reload", false, (cx) => cx.spawn(async (cx: Cx) => this.load(cx))));
	}

	// Records open their own page; agent blockers show their condition, and open in Obsidian.
	renderRelated(t: any): El {
		return h_flex()
			.flex_wrap()
			.gap(4)
			.children(
				this.page!.related.map((one, i) =>
					chip(t, `gb-rec-rel-${i}`, one.text, one.condition ? `${one.label}: ${one.condition}` : one.label, false, (cx) => {
						if (one.ref) openRecordTab(one.ref);
						else cx.spawn(async () => openUrl(one.obsidian!));
					}),
				),
			);
	}

	renderFiles(t: any, { documented, other }: RecordFileLinks): El {
		const fold = (key: string) => (cx: Cx) => {
			this.unfolded = this.unfolded === key ? null : key;
			cx.notify();
		};
		const link = (one: RecordFileLink, i: number) =>
			chip(t, `gb-rec-f-${i}`, recordFileLabel(one), one.hint, one.path === this.file || one.path === this.unfolded, (cx) => (one.files ? fold(one.path)(cx) : this.show(cx, one.path)));
		const open = this.unfolded === OTHER ? other.flatMap((one) => one.files ?? [one.path]) : documented.find((one) => one.path === this.unfolded)?.files;
		return v_flex()
			.gap(4)
			.child(
				h_flex()
					.flex_wrap()
					.gap(4)
					.child(chip(t, "gb-rec-index", "index", "The record's ongoing summary", this.file === INDEX, (cx) => this.show(cx, INDEX)))
					.children(documented.map(link))
					.when(other.length > 0, (el: El) => el.child(chip(t, "gb-rec-other", `Other (${other.length})`, "Files File Docs doesn't describe", this.unfolded === OTHER, fold(OTHER)))),
			)
			.when(Boolean(open), (el: El) =>
				el.child(
					h_flex()
						.flex_wrap()
						.gap(4)
						.pl(10)
						.border_l(2)
						.border_color(t.border)
						.children(
							open!.map((path, i) => chip(t, `gb-rec-o-${i}`, recordFileLabel({ path }), undefined, path === this.file, (cx) => this.show(cx, path))),
						),
				),
			);
	}

	renderLaunchers(t: any): El {
		const { record, profiles, environments } = this.page!;
		return h_flex()
			.flex_wrap()
			.gap(4)
			.children(
				record.launchers.map((one, n) =>
					chip(t, `gb-rec-l-${n}`, one.label, one.prompt, false, () =>
						openOverlay({
							mod: "gb-pane",
							kind: "dialog",
							width: 640,
							props: {
								view: "draft",
								label: `${one.label} · ${record.name}`,
								text: one.prompt,
								launch: { record: record.key, launcher: n, profile: one.profile, environment: environments[0]?.name },
								choices: { profiles, environments },
							},
						}),
					),
				),
			);
	}
}

logRenderFailures("gb-record", GbRecord);
