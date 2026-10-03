import { App, PluginSettingTab, Setting } from "obsidian";
import type GalaxyBrainPlugin from "./main";

export interface GalaxyBrainSettings {
	/** "owner/name" that bare #123 references link to in the GitHub preview. */
	defaultRepo: string;
}

export const DEFAULT_SETTINGS: GalaxyBrainSettings = {
	defaultRepo: "galaxyproject/galaxy",
};

export class GalaxyBrainSettingTab extends PluginSettingTab {
	constructor(
		app: App,
		private plugin: GalaxyBrainPlugin,
	) {
		super(app, plugin);
	}

	display() {
		this.containerEl.empty();
		new Setting(this.containerEl)
			.setName("Default repository")
			.setDesc("owner/name used to link bare #123 references in the GitHub preview. Empty disables them.")
			.addText((text) =>
				text
					.setPlaceholder("galaxyproject/galaxy")
					.setValue(this.plugin.settings.defaultRepo)
					.onChange(async (value) => {
						this.plugin.settings.defaultRepo = value.trim();
						await this.plugin.saveSettings();
					}),
			);
	}
}
