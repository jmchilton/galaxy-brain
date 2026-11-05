import { setIcon } from "obsidian";
import type { MissedPr } from "./missed-prs";

export interface MissedPrCardOptions {
	/** Check / undo icon; resolves true once the file is updated. */
	setReviewed?: (pr: MissedPr, reviewed: boolean) => Promise<boolean>;
	/** Skip reviewed PRs, and drop cards once marked. */
	hideReviewed?: boolean;
}

/** Missed PR cards: linked number and title, reviewed toggle, author / merger / approvers, summaries, collapsed details and discussion. */
export function renderMissedPrCards(el: HTMLElement, prs: MissedPr[], options: MissedPrCardOptions = {}) {
	const list = el.createDiv({ cls: "gb-missed-prs" });
	const empty = (text: string) => list.createDiv({ cls: "gb-missed-prs-empty", text });
	const shown = options.hideReviewed ? prs.filter((pr) => !pr.reviewed) : prs;
	if (prs.length === 0) empty("No missed PRs.");
	else if (shown.length === 0) empty("All reviewed.");
	for (const pr of shown) {
		let reviewed = pr.reviewed;
		const card = list.createDiv({ cls: "gb-missed-pr" });
		card.toggleClass("gb-missed-pr-reviewed", reviewed);
		const head = card.createDiv({ cls: "gb-missed-pr-head" });
		head.createEl("a", { text: `#${pr.pr}`, href: pr.url, cls: "external-link", attr: { target: "_blank", rel: "noopener" } });
		head.createSpan({ cls: "gb-missed-pr-title", text: pr.title });
		const { setReviewed } = options;
		if (setReviewed) {
			const button = head.createEl("button", { cls: "clickable-icon" });
			const label = () => {
				setIcon(button, reviewed ? "rotate-ccw" : "check");
				button.setAttr("aria-label", reviewed ? "Mark unreviewed" : "Mark reviewed");
			};
			label();
			button.onclick = async () => {
				card.addClass("gb-missed-pr-pending");
				const ok = await setReviewed(pr, !reviewed);
				card.removeClass("gb-missed-pr-pending");
				if (!ok) return;
				reviewed = !reviewed;
				if (options.hideReviewed && reviewed) {
					card.remove();
					if (!list.querySelector(".gb-missed-pr")) empty("All reviewed.");
					return;
				}
				card.toggleClass("gb-missed-pr-reviewed", reviewed);
				label();
			};
		}
		const meta = [
			pr.author && `by ${pr.author}`,
			pr.mergedBy && `merged by ${pr.mergedBy}`,
			pr.approvers.length ? `approved by ${pr.approvers.join(", ")}` : "no approvals",
			pr.mergedAt?.slice(0, 10),
		];
		card.createDiv({ cls: "gb-missed-pr-meta", text: meta.filter(Boolean).join(" · ") });
		if (pr.summary) card.createDiv({ cls: "gb-missed-pr-summary", text: pr.summary.trim() });
		if (pr.discussionSummary) card.createDiv({ cls: "gb-missed-pr-discussion-summary", text: `💬 ${pr.discussionSummary.trim()}` });
		for (const [label, text] of [["Details", pr.details], ["Discussion", pr.discussion]] as const) {
			if (!text) continue;
			const details = card.createEl("details", { cls: "gb-missed-pr-more" });
			details.createEl("summary", { text: label });
			details.createDiv({ cls: "gb-missed-pr-text", text: text.trim() });
		}
	}
}
