import { ItemView, TFile, ViewStateResult, WorkspaceLeaf, loadPrism, sanitizeHTMLToDom } from "obsidian";
import type GalaxyBrainPlugin from "./main";
import { renderGithubMarkdown } from "./render";

export const GITHUB_PREVIEW_VIEW = "galaxy-brain-github-preview";

interface PreviewState {
	file?: string;
}

// Read-only, GitHub-flavored rendering of one markdown file; re-renders as the
// file changes so it can sit beside the editor.
export class GithubPreviewView extends ItemView {
	file: TFile | null = null;

	constructor(
		leaf: WorkspaceLeaf,
		private plugin: GalaxyBrainPlugin,
	) {
		super(leaf);
	}

	getViewType() {
		return GITHUB_PREVIEW_VIEW;
	}

	getDisplayText() {
		return this.file ? `GitHub: ${this.file.basename}` : "GitHub preview";
	}

	getIcon() {
		return "github";
	}

	async onOpen() {
		this.registerEvent(
			this.app.vault.on("modify", (file) => {
				if (file === this.file) void this.render();
			}),
		);
		this.registerEvent(
			this.app.vault.on("rename", (file) => {
				// Re-set state through the public API so the tab header refreshes.
				if (file === this.file) {
					void this.leaf.setViewState({ type: GITHUB_PREVIEW_VIEW, state: { file: file.path } });
				}
			}),
		);
		this.registerEvent(
			this.app.vault.on("delete", (file) => {
				if (file === this.file) this.leaf.detach();
			}),
		);
		this.registerDomEvent(this.contentEl, "click", (event) => {
			const anchor = (event.target as HTMLElement).closest("a");
			const href = anchor?.getAttribute("href");
			if (href && /^https?:/.test(href)) {
				event.preventDefault();
				window.open(href);
			}
		});
	}

	getState(): Record<string, unknown> {
		return { file: this.file?.path };
	}

	async setState(state: PreviewState, result: ViewStateResult) {
		const file = state.file ? this.app.vault.getAbstractFileByPath(state.file) : null;
		this.file = file instanceof TFile ? file : null;
		await this.render();
		await super.setState(state, result);
	}

	async render() {
		const el = this.contentEl;
		el.empty();
		el.addClass("galaxy-brain-github-preview");
		if (!this.file) {
			el.createEl("p", { text: "File not found." });
			return;
		}
		const { title, html } = renderGithubMarkdown(await this.app.vault.cachedRead(this.file), {
			repo: this.plugin.settings.defaultRepo || undefined,
		});
		if (title) el.createEl("h1", { text: title, cls: "gbp-issue-title" });
		const body = el.createDiv({ cls: "gbp-body" });
		body.append(sanitizeHTMLToDom(html));
		await highlightCode(body);
	}
}

// Obsidian bundles Prism; reuse it rather than shipping a highlighter.
async function highlightCode(root: HTMLElement) {
	const blocks = root.querySelectorAll<HTMLElement>('pre > code[class*="language-"]');
	if (blocks.length === 0) return;
	const prism = await loadPrism();
	blocks.forEach((block) => prism.highlightElement(block));
}
