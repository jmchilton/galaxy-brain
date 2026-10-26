// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import { annotationStore, buildReviewView, captureReviewOrigin, createReviewThread, deriveThreads, emptyReviewState, markFileReviewed, setThreadResolved, type ReviewAnnotations } from "../../differential-review-lib/src/core";
import { fileDiff, snap } from "../../differential-review-lib/src/core/test-helpers";
import { handleReviewKey, newReviewUi, renderReview, type ReviewActions } from "./diff-review-render";
import { vaultFileAdapter } from "./diff-review-storage";

const first = snap({ at: "2026-10-26T01:00:00Z", phase: "implementation", head: "a", diff: fileDiff("a.py", [{ oldStart: 10, newStart: 10, lines: [" before", "-old", "+new", " after"] }]) });
const origin = captureReviewOrigin(first, { path: "a.py", hunkId: first.files[0].hunks[0].id, side: "new", range: [11, 11] });
const thread = createReviewThread({ id: "t-1", origin, body: "Handle empty input <script>", author: "John", createdAt: "2026-10-26T02:00:00Z" });
function setup(annotations: ReviewAnnotations = { threads: [], replies: [] }, reviewed = false) {
  const root = document.createElement("div"); document.body.replaceChildren(root);
  const view = buildReviewView([first], reviewed ? markFileReviewed(emptyReviewState(), first, "a.py", "now") : null, { hideReviewed: reviewed, annotations })!;
  const ui = newReviewUi(reviewed); ui.expanded.add("file:a.py");
  const actions: ReviewActions = { toggleFile: vi.fn(), toggleHunk: vi.fn(), toggleCommit: vi.fn(), setBaseline: vi.fn(), setHideReviewed: vi.fn(), annotations: { createThread: vi.fn().mockResolvedValue(undefined), reply: vi.fn().mockResolvedValue(undefined), resolve: vi.fn().mockResolvedValue(undefined), refresh: vi.fn() } };
  renderReview(root, view, ui, actions);
  return { root, view, ui, actions };
}
function line(root: HTMLElement, side: string, n: number) { return root.querySelector<HTMLButtonElement>(`button[data-side="${side}"][data-line="${n}"]`)!; }

describe("review conversation UI", () => {
  it("creates a source range by Shift-clicking line numbers and saves the original snapshot", async () => {
    const { root, actions } = setup();
    line(root, "new", 11).click();
    line(root, "new", 12).dispatchEvent(new MouseEvent("click", { bubbles: true, shiftKey: true }));
    const input = root.querySelector<HTMLTextAreaElement>(".gbdr-comment-draft textarea")!;
    expect(root.querySelector(".gbdr-comment-quote")!.textContent).toBe("new\nafter");
    input.value = "Handle this boundary"; input.dispatchEvent(new Event("input"));
    root.querySelector("form")!.dispatchEvent(new Event("submit", { cancelable: true }));
    await vi.waitFor(() => expect(actions.annotations!.refresh).toHaveBeenCalled());
    expect(actions.annotations!.createThread).toHaveBeenCalledWith(expect.objectContaining({ snapshotId: first.id, side: "new", range: [11, 12], quote: "new\nafter" }), "Handle this boundary");
  });

  it("keeps unresolved comments in reviewed hunks, renders safely inline and supports resolve/reopen", async () => {
    const { root, actions } = setup({ threads: [thread], replies: [] }, true);
    const card = root.querySelector(".gbdr-thread")!;
    expect(card.closest("tr")!.previousElementSibling!.textContent).toContain("new");
    expect(card.textContent).toContain("Handle empty input <script>");
    expect(card.querySelector("script")).toBeNull();
    const resolve = [...card.querySelectorAll("button")].find((b) => b.textContent === "Resolve")!;
    resolve.click();
    await vi.waitFor(() => expect(actions.annotations!.resolve).toHaveBeenCalledWith("t-1", true));
    const closed = setup({ threads: [setThreadResolved(thread, true, "now")], replies: [] });
    (closed.root.querySelector('input[aria-label="Show resolved threads"]') as HTMLInputElement).click();
    [...closed.root.querySelectorAll("button")].find((b) => b.textContent === "Reopen")!.click();
    expect(closed.actions.annotations!.resolve).toHaveBeenCalledWith("t-1", false);
  });

  it("keeps draft text on a failed save and across a new snapshot", async () => {
    const { root, view, ui, actions } = setup();
    line(root, "old", 11).click();
    const input = root.querySelector("textarea")!;
    input.value = "Please explain"; input.dispatchEvent(new Event("input"));
    (actions.annotations!.createThread as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("disk full"));
    root.querySelector("form")!.dispatchEvent(new Event("submit", { cancelable: true }));
    await vi.waitFor(() => expect(actions.annotations!.refresh).toHaveBeenCalled());
    const moved = snap({ at: "2026-10-26T03:00:00Z", phase: "revision", head: "b", diff: fileDiff("a.py", [{ oldStart: 20, newStart: 20, lines: [" before", "-old", "+new", " after"] }]), previous: first });
    const latest = buildReviewView([view.snapshot, moved], null)!;
    renderReview(root, latest, ui, actions);
    expect(root.querySelector<HTMLTextAreaElement>("textarea")!.value).toBe("Please explain");
    expect(root.querySelector(".gbdr-comment-draft")!.textContent).toContain(first.id);
    expect(root.querySelector(".gbdr-comment-error")!.textContent).toBe("disk full");
  });

  it("supports replies and next-thread navigation without consuming typing shortcuts", async () => {
    const { root, view, ui, actions } = setup({ threads: [thread], replies: [] });
    expect(handleReviewKey(root, new KeyboardEvent("keydown", { key: "]" }), view, ui, { setHideReviewed: vi.fn(), rerender: vi.fn() })).toBe(true);
    expect(document.activeElement?.getAttribute("data-thread-id")).toBe(thread.id);
    [...root.querySelectorAll(".gbdr-thread button")].find((b) => b.textContent === "Reply")!.dispatchEvent(new MouseEvent("click"));
    const input = root.querySelector("textarea")!; input.value = "Also handle None"; input.dispatchEvent(new Event("input"));
    const typed = new KeyboardEvent("keydown", { key: "x" }); Object.defineProperty(typed, "target", { value: input });
    expect(handleReviewKey(root, typed, view, ui, { setHideReviewed: vi.fn(), rerender: vi.fn() })).toBe(false);
    root.querySelector("form")!.dispatchEvent(new Event("submit", { cancelable: true }));
    await vi.waitFor(() => expect(actions.annotations!.reply).toHaveBeenCalledWith(thread.id, "Also handle None"));
  });

  it("annotates the source diff and leaves interdiff coordinates out of comment targets", () => {
    const { root, ui, actions } = setup();
    const changed = snap({ at: "2026-10-26T03:00:00Z", phase: "revision", head: "b", diff: fileDiff("a.py", [{ oldStart: 10, newStart: 10, lines: [" before", "-old", "+newer", " after"] }]), previous: first });
    const view = buildReviewView([first, changed], markFileReviewed(emptyReviewState(), first, "a.py", "now"))!;
    ui.interdiffs.add(`${view.files[0].hunks[0].id}:reviewed`);
    renderReview(root, view, ui, actions);
    expect(root.querySelector(".gbdr-interdiff .d2h-diff-table")).not.toBeNull();
    expect(root.querySelector(".gbdr-interdiff .gbdr-comment-line")).toBeNull();
    line(root, "new", 11).click();
    expect(ui.draft?.origin.quote).toBe("newer");
  });

  it("preserves independent replies when the reviewer resolves a thread", async () => {
    const files: Record<string, string> = {};
    const dirs = new Set<string>();
    const store = annotationStore(vaultFileAdapter({
      exists: async (p) => p in files || dirs.has(p),
      read: async (p) => files[p], write: async (p, data) => { files[p] = data; },
      mkdir: async (p) => { if (p.includes("/") && !dirs.has(p.slice(0, p.lastIndexOf("/")))) throw new Error("missing parent"); dirs.add(p); },
      list: async (p) => ({ files: Object.keys(files).filter((f) => f.startsWith(`${p}/`)), folders: [] }),
    }), "record/differential-review");
    await store.writeThread(thread);
    await store.writeReply({ schemaVersion: 1, kind: "differential-review-reply", id: "r-1", threadId: thread.id, author: "Agent", body: "Fixed", createdAt: "now", source: "agent", snapshotId: first.id });
    await store.writeThread(setThreadResolved(thread, true, "later"));
    const saved = await store.read();
    expect(saved.threads[0].status).toBe("resolved"); expect(saved.replies).toHaveLength(1);
    expect(deriveThreads(saved, first, [first])[0].replies[0].snapshotId).toBe(first.id);
    await expect(store.writeReply(saved.replies[0])).rejects.toThrow(/already exists/);
  });
});
