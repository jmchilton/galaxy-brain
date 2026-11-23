import { describe, expect, it } from "vitest";
import { type BranchFiles, branchPanel, prBody, setPrTitle } from "./branch-panel";

const PLACEHOLDER = "(PUBLISHING_AGENT: Please include the contents of BRANCH_DIRECTORY/human_review.md before publishing this.)";

const files = (over: Partial<BranchFiles> = {}): BranchFiles => ({
	index: "---\nupstream_base_branch: dev\n---\n# b\n",
	titles: "- First title\n- [26.0] Second: title\n",
	tags: "- kind/bug\n- `area/API`\n",
	checklist: "Run via X.\n\n- [x] One?\n  <details>\n  - [ ] nested, not counted\n  </details>\n- [x] Two?\n",
	description: `Opener.\n\n## Human Review\n\n${PLACEHOLDER}\n\n## Agentic Checks\n`,
	humanReview: "John reviewed all diffs at sha1 abc.\n",
	...over,
});

describe("branchPanel", () => {
	it("is null for a branch without PR files", () => {
		expect(branchPanel({ index: "# b\n", titles: null, tags: null, checklist: null, description: null, humanReview: "x" })).toBeNull();
	});

	it("is ready with a chosen title, and previews the body Open PR posts", () => {
		const panel = branchPanel(files({ index: '---\nupstream_base_branch: dev\npr_title: "[26.0] Second: title"\n---\n# b\n' }))!;
		expect(panel.status).toBe("✅ Ready to open the PR");
		expect(panel.warnings).toEqual([]);
		expect(panel.titles).toEqual([
			{ title: "First title", chosen: false, listed: true },
			{ title: "[26.0] Second: title", chosen: true, listed: true },
		]);
		expect(panel.tags).toEqual(["kind/bug", "area/API"]);
		expect(panel.checklist).toEqual({ done: 2, total: 2 });
		expect(panel.files.map((f) => f.name)).toEqual(["pr_description.md", "pr_titles.md", "pr_tags.md", "pr_checklist.md", "human_review.md"]);
		expect(panel.preview).toBe("# [26.0] Second: title\n\nOpener.\n\n## Human Review\n\nJohn reviewed all diffs at sha1 abc.\n\n## Agentic Checks\n");
	});

	it("warns that Open PR takes the first title when none is chosen", () => {
		const panel = branchPanel(files())!;
		expect(panel.chosen).toBeNull();
		expect(panel.warnings).toEqual(["⚠️ No title chosen; Open PR takes the first"]);
		expect(panel.preview!.startsWith("# First title\n\n")).toBe(true);
	});

	it("lists a chosen title missing from pr_titles.md first, and warns", () => {
		const panel = branchPanel(files({ index: "---\npr_title: Custom\n---\n" }))!;
		expect(panel.titles[0]).toEqual({ title: "Custom", chosen: true, listed: false });
		expect(panel.warnings).toEqual(["⚠️ The chosen title isn't in pr_titles.md"]);
	});

	it("is blocked without pr_description.md or human_review.md, and flags no labels and a no", () => {
		const panel = branchPanel(files({ description: null, humanReview: null, tags: null, checklist: "- [x] a\n- [ ] b\n" }))!;
		expect(panel.status).toBe("⛔ No pr_description.md; Open PR stops");
		expect(panel.warnings).toEqual([
			"⛔ No human_review.md; Open PR stops until you review the latest snapshot",
			"⚠️ No title chosen; Open PR takes the first",
			"⚠️ No pr_tags.md; the PR gets no labels",
			"⚠️ Checklist 1/2 answered yes",
		]);
		expect(panel.preview).toBeNull();
	});

	it("is blocked without human_review.md even when the description has no placeholder", () => {
		const panel = branchPanel(files({ index: "---\npr_title: First title\n---\n", description: "Body\n", humanReview: null }))!;
		expect(panel.status).toBe("⛔ No human_review.md; Open PR stops until you review the latest snapshot");
		expect(panel.warnings).toEqual([]);
		expect(panel.preview).toBe("# First title\n\nBody\n");
	});

	it("only reports the open PR once there is one", () => {
		const panel = branchPanel(files({ index: "---\npr: 25077\n---\n", humanReview: null, tags: null }))!;
		expect(panel.status).toBe("✅ PR #25077");
		expect(panel.pr).toBe(25077);
		expect(panel.warnings).toEqual([]);
	});
});

describe("prBody", () => {
	it("leaves a description without the placeholder, or without human_review.md, as it is", () => {
		expect(prBody("Body\n", "Reviewed.")).toBe("Body\n");
		expect(prBody(`${PLACEHOLDER}\n`, null)).toBe(`${PLACEHOLDER}\n`);
	});

	it("fills a review containing $ literally", () => {
		expect(prBody(`${PLACEHOLDER}\n`, "costs $& $1")).toBe("costs $& $1\n");
	});
});

describe("setPrTitle", () => {
	it("round-trips through the panel", () => {
		const index = setPrTitle("# b\n", "[26.0] Second: title");
		expect(branchPanel(files({ index }))!.chosen).toBe("[26.0] Second: title");
		expect(setPrTitle(index, null)).toBe("# b\n");
	});
});
