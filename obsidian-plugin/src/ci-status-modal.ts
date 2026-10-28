import { type App, Modal, setIcon } from "obsidian";
import type { CiSource, CiSummary } from "./ci-status";

const REFRESH_MS = 30_000;

/** Failed and running checks per source, passed and skipped as counts; refreshes while open. */
export class CiStatusModal extends Modal {
	private timer?: number;

	constructor(
		app: App,
		private title: string,
		private sources: CiSource[],
		private fetch: (source: CiSource) => Promise<CiSummary>,
		/** Opens the record's Fix CI launcher; omitted when it has none. */
		private fixCi?: () => void,
	) {
		super(app);
	}

	onOpen() {
		this.setTitle(this.title);
		void this.render();
		this.timer = window.setInterval(() => void this.render(), REFRESH_MS);
	}

	onClose() {
		window.clearInterval(this.timer);
		this.contentEl.empty();
	}

	private async render() {
		const results = await Promise.all(this.sources.map((source) => this.fetch(source).then((summary) => ({ summary }), (error: Error) => ({ error }))));
		const el = this.contentEl;
		el.empty();
		el.addClass("gb-ci");
		const bar = el.createDiv({ cls: "gb-ci-bar" });
		bar.createSpan({ cls: "gb-ci-updated", text: `Updated ${new Date().toLocaleTimeString()} · refreshes every 30s` });
		const refresh = bar.createEl("button", { attr: { "aria-label": "Refresh" } });
		setIcon(refresh, "refresh-cw");
		refresh.onclick = () => void this.render();
		this.sources.forEach((source, i) => {
			const section = el.createDiv({ cls: "gb-ci-source" });
			const heading = section.createEl("h4");
			heading.createEl("a", { text: source.label, href: source.url });
			const result = results[i]!;
			if ("error" in result) return void section.createDiv({ cls: "gb-ci-error", text: result.error.message });
			const { failed, running, passed, skipped } = result.summary;
			if (!failed.length && !running.length && !passed && !skipped) return void section.createDiv({ text: "No checks." });
			if (failed.length) {
				const head = section.createDiv({ cls: "gb-ci-group-head", text: `✗ ${failed.length} failed` });
				if (this.fixCi) {
					const fix = head.createEl("button", { text: "🚦 Fix CI" });
					fix.onclick = () => {
						this.close();
						this.fixCi!();
					};
				}
				checkList(section, failed, "gb-ci-failed");
			}
			if (running.length) {
				section.createDiv({ cls: "gb-ci-group-head", text: `● ${running.length} running` });
				checkList(section, running, "gb-ci-running");
			}
			section.createDiv({ cls: "gb-ci-counts", text: `✓ ${passed} passed${skipped ? ` · ${skipped} skipped` : ""}` });
		});
	}
}

function checkList(el: HTMLElement, checks: CiSummary["failed"], cls: string) {
	const list = el.createEl("ul", { cls });
	for (const check of checks) {
		const item = list.createEl("li");
		item.createEl("a", { text: check.name, href: check.url });
		if (check.workflow) item.createSpan({ cls: "gb-ci-workflow", text: ` · ${check.workflow}` });
	}
}
