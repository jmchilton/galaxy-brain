import { Notice, Plugin, TFile } from "obsidian";
import { GITHUB_PREVIEW_VIEW, GithubPreviewView } from "./github-preview-view";
import { DEFAULT_SETTINGS, GalaxyBrainSettingTab, GalaxyBrainSettings } from "./settings";

export default class GalaxyBrainPlugin extends Plugin {
	settings: GalaxyBrainSettings = DEFAULT_SETTINGS;

	async onload() {
		this.settings = { ...DEFAULT_SETTINGS, ...(await this.loadData()) };
		this.addSettingTab(new GalaxyBrainSettingTab(this.app, this));
		this.registerView(GITHUB_PREVIEW_VIEW, (leaf) => new GithubPreviewView(leaf, this));

		this.registerEvent(
			this.app.workspace.on("file-menu", (menu, file) => {
				if (!(file instanceof TFile)) return;
				menu.addItem((item) =>
					item.setTitle("Copy contents").setIcon("copy").onClick(() => this.copyContents(file)),
				);
				if (file.extension === "md") {
					menu.addItem((item) =>
						item.setTitle("Preview as GitHub").setIcon("github").onClick(() => this.openGithubPreview(file)),
					);
				}
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

		this.addCommand({
			id: "preview-as-github",
			name: "Preview current file as GitHub",
			checkCallback: (checking) => {
				const file = this.app.workspace.getActiveFile();
				if (!file || file.extension !== "md") return false;
				if (!checking) void this.openGithubPreview(file);
				return true;
			},
		});
	}

	async saveSettings() {
		await this.saveData(this.settings);
		for (const leaf of this.app.workspace.getLeavesOfType(GITHUB_PREVIEW_VIEW)) {
			void (leaf.view as GithubPreviewView).render();
		}
	}

	async copyContents(file: TFile) {
		try {
			await navigator.clipboard.writeText(await this.app.vault.read(file));
			new Notice(`Copied ${file.name}`);
		} catch (error) {
			new Notice(`Could not copy ${file.name}: ${error}`);
		}
	}

	async openGithubPreview(file: TFile) {
		const existing = this.app.workspace
			.getLeavesOfType(GITHUB_PREVIEW_VIEW)
			.find((leaf) => (leaf.view as GithubPreviewView).file?.path === file.path);
		const leaf = existing ?? this.app.workspace.getLeaf("split", "vertical");
		if (!existing) {
			await leaf.setViewState({ type: GITHUB_PREVIEW_VIEW, active: true, state: { file: file.path } });
		}
		this.app.workspace.revealLeaf(leaf);
	}
}
