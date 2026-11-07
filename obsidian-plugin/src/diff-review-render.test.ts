// @vitest-environment happy-dom
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import {
	buildReviewView,
	emptyReviewState,
	markFileReviewed,
	parseSnapshot,
	type ReviewState,
	signOffCommit,
	type Snapshot,
} from "../../differential-review-lib/src/core";
import { summaryText } from "./diff-review-model";
import { handleReviewKey, newReviewUi, type ReviewActions, renderNoSnapshots, renderReview } from "./diff-review-render";

// happy-dom replaces URL, so resolve the fixture dir as a path.
const DIR = join(fileURLToPath(import.meta.url), "../../../differential-review-lib/src/core/fixtures/view-fixtures");
const [impl, hard, polish] = readdirSync(DIR)
	.sort()
	.map((name) => parseSnapshot(JSON.parse(readFileSync(join(DIR, name), "utf8"))));

function reviewAll(s: Snapshot): ReviewState {
	let state = emptyReviewState();
	for (const f of s.files) state = markFileReviewed(state, s, f.path, "t");
	for (const c of s.commits) state = signOffCommit(state, s, c.sha, "t");
	return state;
}

function actions(): ReviewActions {
	return { toggleHunk: vi.fn(), toggleFile: vi.fn(), toggleCommit: vi.fn(), setBaseline: vi.fn(), setHideReviewed: vi.fn() };
}

function mount() {
	const root = document.createElement("div");
	document.body.replaceChildren(root);
	return root;
}

const texts = (root: HTMLElement, selector: string) => [...root.querySelectorAll(selector)].map((n) => n.textContent);

describe("renderReview", () => {
	it("renders changed hunks with diff2html, badges and interdiff toggles after a rebase + amend", () => {
		const view = buildReviewView([impl, hard], reviewAll(impl), { hideReviewed: true })!;
		const ui = newReviewUi();
		ui.expanded.add("file:app.py");
		const root = mount();
		const act = actions();
		renderReview(root, view, ui, act);

		expect(texts(root, ".gbdr-section > summary .gbdr-path")).toEqual(["app.py", "util.py", "Add greeting helper", "Validate greeting name"]);
		expect(root.querySelector(".gbdr-callout")!.textContent).toMatch(/^1 commit\(s\) changed since you signed them off/);
		expect(root.querySelector(".gbdr-summary")!.textContent).toMatch(/^Since implementation @ [0-9a-f]{8} .*: commits 2 rebased, 1 changed, 1 new; hunks 3 carried, 2 changed\.$/);

		const app = root.querySelectorAll<HTMLDetailsElement>("details.gbdr-section")[0];
		expect(app.open).toBe(true);
		const hunks = app.querySelectorAll(".gbdr-hunk");
		expect(hunks).toHaveLength(1);
		expect(hunks[0].querySelector(".gbdr-badge")!.textContent).toBe("changed");
		expect(hunks[0].querySelector(".d2h-diff-table")!.textContent).toContain("print(greeting.upper())");
		expect(app.querySelector(".gbdr-hidden")!.textContent).toMatch(/^1 hunk\(s\) hidden/);

		// Closed sections render nothing until opened.
		const util = root.querySelectorAll<HTMLDetailsElement>("details.gbdr-section")[1];
		expect(util.querySelector(".d2h-wrapper")).toBeNull();
		util.open = true;
		util.dispatchEvent(new Event("toggle"));
		expect(util.querySelector(".d2h-diff-table")!.textContent).toContain("name required");
		expect(ui.expanded.has("file:util.py")).toBe(true);

		const delta = hunks[0].querySelector<HTMLButtonElement>(".gbdr-link")!;
		expect(delta.textContent).toBe("Δ since reviewed");
		delta.click();
		expect(hunks[0].querySelector(".gbdr-interdiff .d2h-diff-table")!.textContent).toContain("print(greeting)");
		expect(ui.interdiffs.size).toBe(1);

		hunks[0].querySelector<HTMLInputElement>(".gbdr-check")!.click();
		expect(act.toggleHunk).toHaveBeenCalledWith(expect.objectContaining({ path: "app.py" }), expect.objectContaining({ state: "changed" }));
	});

	it("colors code without losing word-diff marks, line-number buttons or text", () => {
		const view = buildReviewView([impl, hard], reviewAll(impl), { hideReviewed: true })!;
		const ui = newReviewUi();
		ui.expanded.add("file:app.py");
		const root = mount();
		renderReview(root, view, ui, { ...actions(), annotations: { createThread: vi.fn(), reply: vi.fn(), resolve: vi.fn(), refresh: vi.fn() } });
		const table = root.querySelector(".gbdr-hunk .d2h-diff-table")!;
		expect(table.querySelector(".hljs-built_in")!.textContent).toBe("print");
		const changed = [...table.querySelectorAll(".d2h-code-line-ctn")].find((line) => line.querySelector("ins, del"))!;
		expect(changed.querySelector("ins span[class^=hljs-], del span[class^=hljs-]")).not.toBeNull();
		expect(changed.querySelector("span[class^=hljs-] ins, span[class^=hljs-] del")).toBeNull();
		expect(table.textContent).toContain("print(greeting.upper())");
		expect(table.querySelector(".gbdr-comment-line")).not.toBeNull();

		const cached = [...ui.htmlCache.values()].join("");
		expect(cached).toContain("hljs-built_in");
	});

	it("dims the directory and totals a file's changes", () => {
		const view = buildReviewView([impl], null)!;
		const root = mount();
		renderReview(root, view, newReviewUi(false), actions());
		const summary = [...root.querySelectorAll<HTMLElement>(".gbdr-section > summary")].find((s) => s.dataset.key === "file:app.py")!;
		expect(summary.querySelector(".gbdr-name")!.textContent).toBe("app.py");
		expect(summary.querySelector(".gbdr-added")!.textContent).toMatch(/^\+\d+$/);
	});

	it("shows only differing hunks for a changed commit", () => {
		const view = buildReviewView([impl, hard], reviewAll(impl), { hideReviewed: true })!;
		const ui = newReviewUi();
		ui.expanded.add(`commit:${view.commits[0].sha}`);
		const root = mount();
		renderReview(root, view, ui, actions());
		const commit = [...root.querySelectorAll<HTMLDetailsElement>("details.gbdr-section")].find((d) => d.open)!;
		expect(texts(commit, ".gbdr-commit-file")).toEqual(["app.py"]);
		expect(commit.querySelectorAll(".d2h-diff-table")).toHaveLength(1);
		expect(commit.querySelector("summary .gbdr-tag")!.textContent).toBe("1 differing hunk(s)");
	});

	it("keeps a reviewed pure rebase quiet: no rebase summary, no callout, nothing listed", () => {
		const view = buildReviewView([impl, hard, polish], reviewAll(hard), { hideReviewed: true })!;
		const root = mount();
		renderReview(root, view, newReviewUi(), actions());
		expect(root.querySelector(".gbdr-summary")).toBeNull();
		expect(root.querySelector(".gbdr-callout")).toBeNull();
		expect(root.querySelectorAll("details.gbdr-section")).toHaveLength(0);
		expect(texts(root, ".gbdr-empty")).toEqual(["Nothing to review in the branch diff.", "No commits to sign off."]);
		expect(texts(root, ".gbdr-progress-item")).toEqual(["Hunks 5/5", "Files 4/4", "Commits 4/4"]);
	});

	it("offers earlier snapshots as baselines", () => {
		const view = buildReviewView([impl, hard, polish], null, { baseline: { kind: "snapshot", snapshotId: impl.id } })!;
		const root = mount();
		const act = actions();
		renderReview(root, view, newReviewUi(false), act);
		const select = root.querySelector<HTMLSelectElement>(".gbdr-baseline")!;
		expect([...select.options].map((o) => o.value)).toEqual(["", hard.id, impl.id]);
		expect(select.value).toBe(impl.id);
		select.value = "";
		select.dispatchEvent(new Event("change"));
		expect(act.setBaseline).toHaveBeenCalledWith({ kind: "review" });
	});
});

describe("handleReviewKey", () => {
	it("moves with j/k and checks off the focused item with x", () => {
		const view = buildReviewView([impl], null)!;
		const ui = newReviewUi(false);
		const root = mount();
		const act = actions();
		renderReview(root, view, ui, act);
		const key = (k: string) => handleReviewKey(root, new KeyboardEvent("keydown", { key: k }), view, ui, { setHideReviewed: act.setHideReviewed, rerender: vi.fn() });
		expect(key("j")).toBe(true);
		expect((document.activeElement as HTMLElement).dataset.key).toBe("file:README.md");
		key("j");
		expect((document.activeElement as HTMLElement).dataset.key).toBe("file:app.py");
		key("x");
		expect(act.toggleFile).toHaveBeenCalledWith(expect.objectContaining({ path: "app.py" }));
		key("k");
		expect((document.activeElement as HTMLElement).dataset.key).toBe("file:README.md");
		key("h");
		expect(act.setHideReviewed).toHaveBeenCalledWith(true);
	});
});

describe("snapshot buttons", () => {
	it("offers a new snapshot in the header, disabled while one runs", () => {
		const take = vi.fn();
		const view = buildReviewView([impl], null)!;
		const root = mount();
		renderReview(root, view, newReviewUi(), { ...actions(), snapshot: { busy: false, take } });
		const button = root.querySelector<HTMLButtonElement>(".gbdr-controls button")!;
		expect(button.textContent).toBe("New snapshot");
		button.click();
		expect(take).toHaveBeenCalledOnce();

		renderReview(root, view, newReviewUi(), { ...actions(), snapshot: { busy: true, take } });
		const busy = root.querySelector<HTMLButtonElement>(".gbdr-controls button")!;
		expect(busy.textContent).toBe("Taking snapshot…");
		expect(busy.disabled).toBe(true);
	});

	it("leaves the header without one where snapshots can't run", () => {
		const root = mount();
		renderReview(root, buildReviewView([impl], null)!, newReviewUi(), actions());
		expect(root.querySelector(".gbdr-controls button")).toBeNull();
	});

	it("offers the first snapshot on an empty review, replacing what was there", () => {
		const take = vi.fn();
		const root = mount();
		root.textContent = "old";
		renderNoSnapshots(root, { busy: false, take });
		expect(texts(root, ".gbdr-empty")).toEqual(["This record has no snapshot yet."]);
		root.querySelector("button")!.click();
		expect(take).toHaveBeenCalledOnce();
		expect(root.textContent).not.toContain("old");
	});

	it("points to the desktop app where snapshots can't run", () => {
		const root = mount();
		renderNoSnapshots(root, undefined);
		expect(texts(root, ".gbdr-empty")).toEqual(["This record has no snapshot yet. Take one from the desktop app."]);
		expect(root.querySelector("button")).toBeNull();
	});
});

describe("summaryText", () => {
	it("is null for a first snapshot and for a clean rebase", () => {
		expect(summaryText(buildReviewView([impl], null)!.summary, null)).toBeNull();
		expect(summaryText(buildReviewView([impl, hard, polish], null)!.summary, "x")).toBeNull();
	});
});
