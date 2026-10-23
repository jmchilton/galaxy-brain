import { describe, expect, it } from "vitest";
import { parseGrouping } from "../../site/src/lib/records";
import { collectRecords } from "./repository";
import { groupRecords } from "./record-groups";

const QUEUE_PATH = "repositories/galaxy/branches/MY_BRANCHES.md";

const QUEUE = `# Open PR and branch queue

Snapshot: 2026-10-22 ([\`fix_a\`](active/fix_a/index.md) mentioned).

## Open Galaxy PRs — ready from our side (\`ready\`)

- [\`fix_b\`](active/fix_b/index.md) — B. [#2](https://github.com/galaxyproject/galaxy/pull/2).
- [\`moved\`](active/moved/index.md) — now merged.

## Draft Galaxy PRs — waiting for CI (\`ci_wait\`)

None yet.

## Galaxy branches — reference only (\`branches_reference\`)
- [\`fix_a\`](active/fix_a/index.md) — A.
- [\`elsewhere\`](../../pulsar/branches/active/elsewhere/index.md) — other repo.
`;

const FILES = ["active/fix_a", "active/fix_b", "active/fix_c", "merged/moved", "merged/old"].map((dir, i) => ({
	path: `repositories/galaxy/branches/${dir}/index.md`,
	mtime: i,
}));
const RECORDS = collectRecords(FILES, "galaxy", () => undefined);

describe("groupRecords", () => {
	it("uses the file's sections first, then generic status groups for the rest", () => {
		const groups = groupRecords(RECORDS, "branches", parseGrouping(QUEUE, QUEUE_PATH, "galaxy", "branches"));
		expect(groups.map((group) => [group.status, group.label, group.collapsed, group.records.map((r) => r.name)])).toEqual([
			["ready", "Open Galaxy PRs — ready from our side", false, ["fix_b", "moved"]],
			["branches_reference", "Galaxy branches — reference only", false, ["fix_a"]],
			["active", undefined, false, ["fix_c"]],
			["merged", undefined, true, ["old"]],
		]);
	});

	it("falls back to generic status groups without a grouping", () => {
		expect(groupRecords(RECORDS, "branches", undefined).map((group) => group.status)).toEqual(["active", "merged"]);
	});
});
