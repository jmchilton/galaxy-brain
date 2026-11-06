import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it } from "vitest";
import { reviewRecordDir, reviewRequest } from "./review-host";

const FIXTURES = join(fileURLToPath(import.meta.url), "../../../differential-review-lib/src/core/fixtures/view-fixtures");
const REF = "galaxy/branches/b";
const RECORD = "repositories/galaxy/branches/active/b";

function vault(fixtures: number) {
	const root = mkdtempSync(join(tmpdir(), "gb-review-"));
	const snapshots = join(root, RECORD, "differential-review/snapshots");
	mkdirSync(snapshots, { recursive: true });
	for (const name of readdirSync(FIXTURES).sort().slice(0, fixtures)) writeFileSync(join(snapshots, name), readFileSync(join(FIXTURES, name)));
	return root;
}

describe("reviewRecordDir", () => {
	it("finds a reviewable record's status directory and refuses anything else", () => {
		const root = vault(1);
		expect(reviewRecordDir(root, REF)).toBe(RECORD);
		expect(reviewRecordDir(root, "galaxy/branches/missing")).toBeNull();
		expect(reviewRecordDir(root, "galaxy/issues/b")).toBeNull();
		expect(reviewRecordDir(root, "galaxy/branches/..")).toBeNull();
		expect(reviewRecordDir(root, "../branches/b")).toBeNull();
		expect(reviewRecordDir(root, "galaxy/branches/b/c")).toBeNull();
	});
});

describe("reviewRequest", () => {
	let root: string;
	beforeEach(() => {
		root = vault(1);
	});
	const state = () => JSON.parse(readFileSync(join(root, RECORD, "differential-review/review-state.json"), "utf8"));
	const humanReview = (r: string) => join(r, RECORD, "human_review.md");

	it("gives what the tab draws, without whole snapshots", async () => {
		const model = (await reviewRequest(root, { ref: REF, hideReviewed: true }))!;
		expect(model.title).toMatch(/^Review /);
		expect(model.meta).toMatch(/ vs .*merge-base .*1 snapshot\(s\)$/);
		const app = model.files.find((f) => f.path === "app.py")!;
		expect(app.hunks[0]!.lines.length).toBeGreaterThan(0);
		expect(app.hunks[0]!.newStart).toBeGreaterThan(0);
		expect(model).not.toHaveProperty("snapshot");
		expect(model).not.toHaveProperty("snapshots");
		expect(model.commits[0]!.files.length).toBeGreaterThan(0);
	});

	it("is null without snapshots and refuses an unknown record", async () => {
		const empty = vault(0);
		expect(await reviewRequest(empty, { ref: REF, hideReviewed: true })).toBeNull();
		await expect(reviewRequest(empty, { ref: "galaxy/branches/nope", hideReviewed: true })).rejects.toThrow("no reviewable record");
	});

	it("toggles a hunk, a file and a commit, in the state Obsidian reads", async () => {
		const first = (await reviewRequest(root, { ref: REF, hideReviewed: false }))!;
		const file = first.files.find((f) => f.path === "app.py")!;
		const hunk = file.hunks[0]!;
		const marked = (await reviewRequest(root, { ref: REF, hideReviewed: false, act: { kind: "hunk", id: hunk.id } }))!;
		expect(marked.files.find((f) => f.path === "app.py")!.hunks[0]!.state).toBe("reviewed");
		expect(Object.keys(state().hunks)).toContain(hunk.id);
		const unmarked = (await reviewRequest(root, { ref: REF, hideReviewed: false, act: { kind: "hunk", id: hunk.id } }))!;
		expect(unmarked.files.find((f) => f.path === "app.py")!.hunks[0]!.state).not.toBe("reviewed");

		const whole = (await reviewRequest(root, { ref: REF, hideReviewed: false, act: { kind: "file", path: "app.py" } }))!;
		expect(whole.files.find((f) => f.path === "app.py")!.state).toBe("reviewed");

		const sha = first.commits[0]!.sha;
		const signed = (await reviewRequest(root, { ref: REF, hideReviewed: false, act: { kind: "commit", sha } }))!;
		expect(signed.commits[0]!.state).toBe("reviewed");
	});

	it("writes human_review.md once everything is checked off, and removes it after", async () => {
		const first = (await reviewRequest(root, { ref: REF, hideReviewed: false }))!;
		for (const file of first.files) await reviewRequest(root, { ref: REF, hideReviewed: false, act: { kind: "file", path: file.path } });
		expect(readFileSync(humanReview(root), "utf8")).toMatch(/has reviewed all diffs using .* at sha1 /);
		await reviewRequest(root, { ref: REF, hideReviewed: false, act: { kind: "file", path: first.files[0]!.path } });
		expect(existsSync(humanReview(root))).toBe(false);
	});

	it("comments, replies and resolves through the shared stores", async () => {
		const first = (await reviewRequest(root, { ref: REF, hideReviewed: false }))!;
		const file = first.files.find((f) => f.path === "app.py")!;
		const hunk = file.hunks[0]!;
		const added = hunk.lines.findIndex((line) => line.startsWith("+"));
		const line = hunk.newStart + hunk.lines.slice(0, added).filter((l) => !l.startsWith("-")).length;
		const target = { path: "app.py", hunkId: hunk.id, side: "new" as const, range: [line, line] as [number, number] };

		const commented = (await reviewRequest(root, { ref: REF, hideReviewed: false, act: { kind: "comment", target, body: "Why?" } }))!;
		const thread = commented.threads[0]!;
		expect(thread.thread).toMatchObject({ body: "Why?", author: "John", status: "open" });
		expect(thread.thread.origin.quote).toBe(hunk.lines[added]!.slice(1));

		const replied = (await reviewRequest(root, { ref: REF, hideReviewed: false, act: { kind: "reply", threadId: thread.thread.id, body: "Because." } }))!;
		expect(replied.threads[0]!.replies.map((r) => [r.body, r.source, r.snapshotId])).toEqual([["Because.", "human", first.snapshotId]]);

		const resolved = (await reviewRequest(root, { ref: REF, hideReviewed: false, act: { kind: "resolve", threadId: thread.thread.id, resolved: true } }))!;
		expect(resolved.threads[0]!.thread.status).toBe("resolved");
	});

	it("sends an interdiff for a hunk changed since it was reviewed", async () => {
		const one = vault(1);
		await reviewRequest(one, { ref: REF, hideReviewed: false, act: { kind: "file", path: "app.py" } });
		const second = readdirSync(FIXTURES).sort()[1]!;
		writeFileSync(join(one, RECORD, "differential-review/snapshots", second), readFileSync(join(FIXTURES, second)));
		const model = (await reviewRequest(one, { ref: REF, hideReviewed: true }))!;
		const hunk = model.files.find((f) => f.path === "app.py")!.hunks.find((h) => h.state === "changed")!;
		expect(hunk.interdiff.reviewed).toContain("print(greeting)");
		expect(model.baselineOptions.length).toBeGreaterThan(0);
	});

	it("narrows to a baseline snapshot", async () => {
		const both = vault(2);
		const first = (await reviewRequest(both, { ref: REF, hideReviewed: true }))!;
		const narrowed = (await reviewRequest(both, { ref: REF, hideReviewed: true, baseline: first.baselineOptions[0]!.id }))!;
		expect(narrowed.baseline).toEqual({ kind: "snapshot", snapshotId: first.baselineOptions[0]!.id });
		expect(narrowed.files.filter((f) => f.visible).length).toBeLessThanOrEqual(first.files.filter((f) => f.visible).length);
	});
});
