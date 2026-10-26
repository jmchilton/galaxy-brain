import { describe, expect, it } from "vitest";
import { emptyReviewState, recordReviewStateStore, recordSnapshotReader } from "../../differential-review/src/core";
import { type VaultAdapter, vaultFileAdapter } from "./diff-review-storage";

/** In-memory DataAdapter: `list` throws for a missing dir, like Obsidian's. */
function fakeAdapter(files: Record<string, string>) {
	const dirs = new Set<string>();
	const adapter: VaultAdapter = {
		async exists(path) {
			return path in files || dirs.has(path) || Object.keys(files).some((f) => f.startsWith(`${path}/`));
		},
		async read(path) {
			if (!(path in files)) throw new Error(`ENOENT ${path}`);
			return files[path];
		},
		async write(path, data) {
			const parent = path.slice(0, path.lastIndexOf("/"));
			if (!(await adapter.exists(parent))) throw new Error(`ENOENT ${parent}`);
			files[path] = data;
		},
		async mkdir(path) {
			dirs.add(path);
		},
		async list(path) {
			if (!(await adapter.exists(path))) throw new Error(`ENOENT ${path}`);
			const children = Object.keys(files).filter((f) => f.startsWith(`${path}/`) && !f.slice(path.length + 1).includes("/"));
			return { files: children, folders: [] };
		},
	};
	return adapter;
}

const RECORD = "repositories/galaxy/branches/active/feature";

describe("vaultFileAdapter", () => {
	it("lists snapshot ids from vault paths, and [] when the dir is missing", async () => {
		const files = { [`${RECORD}/differential-review/snapshots/20261026T000000Z-hardening-abc.json`]: "{}" };
		expect(await recordSnapshotReader(vaultFileAdapter(fakeAdapter(files)), RECORD).listSnapshotIds()).toEqual([
			"20261026T000000Z-hardening-abc",
		]);
		expect(await recordSnapshotReader(vaultFileAdapter(fakeAdapter({})), RECORD).listSnapshotIds()).toEqual([]);
	});

	it("creates the review dir on the first review-state write and reports writes", async () => {
		const files: Record<string, string> = {};
		const writes: string[] = [];
		const store = recordReviewStateStore(vaultFileAdapter(fakeAdapter(files), (path) => writes.push(path)), RECORD);
		expect(await store.readReviewState()).toBeNull();
		await store.writeReviewState(emptyReviewState());
		expect(writes).toEqual([`${RECORD}/differential-review/review-state.json`]);
		expect(await store.readReviewState()).toEqual(emptyReviewState());
	});
});
