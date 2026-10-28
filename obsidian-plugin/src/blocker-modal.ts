import { type App, Component, MarkdownRenderer, Modal } from "obsidian";
import { type BlockerRef, blockersPath } from "./blockers";

/** A record's blocker: its condition.md and follow_up.md, with a link to its index.md. */
export class BlockerModal extends Modal {
	private markdown = new Component();

	constructor(
		app: App,
		private blocker: BlockerRef,
	) {
		super(app);
	}

	async onOpen() {
		const { agentDir, name } = this.blocker;
		const dir = `${blockersPath(agentDir)}/${name}`;
		this.setTitle(`🔒 ${agentDir}/${name}`);
		this.markdown.load();
		if (!this.app.vault.getFolderByPath(dir)) return void this.contentEl.createEl("p", { text: `${dir} not found.`, cls: "gbr-empty" });
		const open = this.contentEl.createEl("a", { text: "Open blocker", cls: "internal-link", href: "#" });
		open.onclick = (event) => {
			event.preventDefault();
			this.close();
			void this.app.workspace.openLinkText(`${dir}/index.md`, "", event.metaKey || event.ctrlKey);
		};
		for (const [file, heading] of [["condition.md", "Condition"], ["follow_up.md", "Follow up"]] as const) {
			const path = `${dir}/${file}`;
			const note = this.app.vault.getFileByPath(path);
			this.contentEl.createEl("h4", { text: heading });
			const body = this.contentEl.createDiv();
			if (note) await MarkdownRenderer.render(this.app, await this.app.vault.cachedRead(note), body, path, this.markdown);
			else body.createEl("p", { text: `No ${file}.`, cls: "gbr-empty" });
		}
	}

	onClose() {
		this.markdown.unload();
		this.contentEl.empty();
	}
}
