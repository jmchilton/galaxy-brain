import { describe, expect, it } from "vitest";
import { goIndex, goRows, type GoRow, scrollWindow } from "./go-model";

const record = (repo: string, kind: string, name: string, title = name, status = "active") => ({ ref: `${repo}/${kind}/${name}`, repo, kind, status, name, title });

const INDEX = goIndex({
	repositories: ["galaxy", "gxformat2", "pulsar"],
	records: [
		record("galaxy", "branches", "follow_up", "Follow-up to 24719"),
		record("galaxy", "reviews", "24719", "Fix the Tool Form"),
		record("pulsar", "issues", "12", "Pulsar staging", "queued"),
	],
});

const labels = (rows: GoRow[]) => rows.map((row) => (row.type === "repository" ? `repo:${row.repo}` : row.record.ref));

describe("goRows", () => {
	it("is every record, in the index's order, with no query", () => {
		expect(labels(goRows(INDEX, ""))).toEqual(["galaxy/branches/follow_up", "galaxy/reviews/24719", "pulsar/issues/12"]);
		expect(labels(goRows(INDEX, "   "))).toEqual(labels(goRows(INDEX, "")));
	});

	it("needs every word, in any order and case, across ref, title and status", () => {
		expect(labels(goRows(INDEX, "TOOL form"))).toEqual(["galaxy/reviews/24719"]);
		expect(labels(goRows(INDEX, "reviews galaxy"))).toEqual(["galaxy/reviews/24719"]);
		expect(labels(goRows(INDEX, "queued pulsar"))).toEqual(["pulsar/issues/12"]);
		expect(labels(goRows(INDEX, "nothing like this"))).toEqual([]);
	});

	it("lists matching repositories before records", () => {
		expect(labels(goRows(INDEX, "pulsar"))).toEqual(["repo:pulsar", "pulsar/issues/12"]);
	});

	it("puts a record named exactly the query first", () => {
		expect(labels(goRows(INDEX, "24719"))).toEqual(["galaxy/reviews/24719", "galaxy/branches/follow_up"]);
	});
});

describe("scrollWindow", () => {
	it("keeps the selection in view, moving as little as it can", () => {
		expect(scrollWindow(0, 3, 10, 50)).toBe(0);
		expect(scrollWindow(0, 12, 10, 50)).toBe(3);
		expect(scrollWindow(20, 5, 10, 50)).toBe(5);
	});

	it("doesn't scroll past the end", () => {
		expect(scrollWindow(45, 46, 10, 50)).toBe(40);
		expect(scrollWindow(9, 0, 10, 4)).toBe(0);
	});
});
