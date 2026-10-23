import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { collectRecords } from "./repository";
import { groupingFor, groupRecords, parseGrouping } from "./record-groups";

const QUEUE_PATH = "agents/gx_branches/MY_BRANCHES.md";

const QUEUE = `# Open PR and branch queue

Snapshot: 2026-10-22 ([\`fix_a\`](../../repositories/galaxy/branches/active/fix_a/index.md) mentioned).

## Open Galaxy PRs — ready from our side (\`ready\`)

- [\`fix_b\`](../../repositories/galaxy/branches/active/fix_b/index.md) — B. [#2](https://github.com/galaxyproject/galaxy/pull/2).
- [\`moved\`](../../repositories/galaxy/branches/active/moved/index.md) — now merged.

## Draft Galaxy PRs — waiting for CI (\`ci_wait\`)

None yet.

## Galaxy branches — reference only (\`branches_reference\`)
- [\`fix_a\`](../../repositories/galaxy/branches/active/fix_a/index.md) — A.
- [\`elsewhere\`](../../repositories/pulsar/branches/active/elsewhere/index.md) — other repo.
`;

const FILES = ["active/fix_a", "active/fix_b", "active/fix_c", "merged/moved", "merged/old"].map((dir, i) => ({
	path: `repositories/galaxy/branches/${dir}/index.md`,
	mtime: i,
}));
const RECORDS = collectRecords(FILES, "galaxy", () => undefined);

describe("parseGrouping", () => {
	it("reads sections in order with the record names they link", () => {
		expect(parseGrouping(QUEUE, QUEUE_PATH, "galaxy", "branches")).toEqual([
			{ key: "ready", label: "Open Galaxy PRs — ready from our side", names: ["fix_b", "moved"] },
			{ key: "ci_wait", label: "Draft Galaxy PRs — waiting for CI", names: [] },
			{ key: "branches_reference", label: "Galaxy branches — reference only", names: ["fix_a"] },
		]);
	});

	it("parses the vault's MY_BRANCHES.md", () => {
		const text = readFileSync(new URL(`../../vault/${QUEUE_PATH}`, import.meta.url), "utf8");
		const sections = parseGrouping(text, QUEUE_PATH, "galaxy", "branches");
		expect(sections.map((section) => section.key)).toContain("branches_need_polish");
		expect(sections.reduce((n, section) => n + section.names.length, 0)).toBeGreaterThan(0);
	});
});

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

describe("groupingFor", () => {
	it("names the grouping file for galaxy branches only", () => {
		expect(groupingFor("galaxy", "branches")).toBe(QUEUE_PATH);
		expect(groupingFor("galaxy", "issues")).toBeUndefined();
		expect(groupingFor("pulsar", "branches")).toBeUndefined();
	});
});
