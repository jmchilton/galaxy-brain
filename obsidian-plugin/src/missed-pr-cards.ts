import type { MissedPr } from "./missed-prs";

/** Missed PR cards: linked number and title, author / merger / approvers, summaries, collapsed details and discussion. */
export function renderMissedPrCards(el: HTMLElement, prs: MissedPr[]) {
	const list = el.createDiv({ cls: "gb-missed-prs" });
	if (prs.length === 0) list.createDiv({ cls: "gb-missed-prs-empty", text: "No missed PRs." });
	for (const pr of prs) {
		const card = list.createDiv({ cls: "gb-missed-pr" });
		const head = card.createDiv({ cls: "gb-missed-pr-head" });
		head.createEl("a", { text: `#${pr.pr}`, href: pr.url, cls: "external-link", attr: { target: "_blank", rel: "noopener" } });
		head.createSpan({ cls: "gb-missed-pr-title", text: pr.title });
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
