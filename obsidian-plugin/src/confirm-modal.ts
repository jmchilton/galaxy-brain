import { type App, Modal, Setting } from "obsidian";

/** Yes/no question; confirmed runs only on the warning button. */
export class ConfirmModal extends Modal {
	constructor(
		app: App,
		private title: string,
		private message: string,
		private confirmText: string,
		private confirmed: () => void,
	) {
		super(app);
	}

	onOpen() {
		this.setTitle(this.title);
		this.contentEl.createEl("p", { text: this.message });
		new Setting(this.contentEl)
			.addButton((button) =>
				button
					.setButtonText(this.confirmText)
					.setWarning()
					.onClick(() => {
						this.close();
						this.confirmed();
					}),
			)
			.addButton((button) => button.setButtonText("Keep").onClick(() => this.close()));
	}

	onClose() {
		this.contentEl.empty();
	}
}
