import { Notice, Plugin, TFile } from "obsidian";

export default class GalaxyBrainPlugin extends Plugin {
	async onload() {
		this.registerEvent(
			this.app.workspace.on("file-menu", (menu, file) => {
				if (!(file instanceof TFile)) return;
				menu.addItem((item) =>
					item.setTitle("Copy contents").setIcon("copy").onClick(() => this.copyContents(file)),
				);
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
	}

	async copyContents(file: TFile) {
		try {
			await navigator.clipboard.writeText(await this.app.vault.read(file));
			new Notice(`Copied ${file.name}`);
		} catch (error) {
			new Notice(`Could not copy ${file.name}: ${error}`);
		}
	}
}
