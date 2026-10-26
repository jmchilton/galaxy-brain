import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { parseRecordAgents, SYNC_PROCESSES } from "./record-agents";

describe("parseRecordAgents", () => {
	it("maps repo and kind to an agent dir, skipping unknown kinds and non-text", () => {
		const data = parse(`galaxy:
  issues: gx_issues
  reviews: gx_reviews
  bogus: nope
planemo:
  issues: 3
`);
		expect(parseRecordAgents(data)).toEqual({ galaxy: { issues: "gx_issues", reviews: "gx_reviews" }, planemo: {} });
	});

	it("returns nothing for a missing or malformed file", () => {
		expect(parseRecordAgents(null)).toEqual({});
		expect(parseRecordAgents(["galaxy"])).toEqual({});
	});

	it("covers galaxy with its per-kind agents in the vault's map", () => {
		const map = parseRecordAgents(parse(readFileSync(new URL("../../vault/agents/_shared/RECORD_AGENTS.yml", import.meta.url), "utf8")));
		expect(map.galaxy).toMatchObject({ issues: "gx_issues", reviews: "gx_reviews" });
	});

	it("names a sync process for issues and reviews", () => {
		expect(SYNC_PROCESSES).toEqual({ issues: "PROCESS_SYNC_ISSUE_STATE.md", reviews: "PROCESS_SYNC_REVIEW_STATE.md" });
	});
});
