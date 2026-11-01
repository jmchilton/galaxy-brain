import { describe, expect, it } from "vitest";
import { parse, stringify } from "yaml";
import { appendReviewed, crackFiles, missedPrsLeft, parseMissedPrs, removeMissedPr, reviewedPath } from "./missed-prs";

const url = "https://github.com/galaxyproject/galaxy/pull/24561";

describe("parseMissedPrs", () => {
	it("reads a full entry", () => {
		const data = parse(`- pr: 24561
  title: Fix workflow invocation export
  author: someone
  url: ${url}
  merged_at: 2026-10-30T14:02:11Z
  merged_by: mvdbeek
  approvers: [mvdbeek, davelopez]
  summary: Fixes export of invocations with subworkflows.
  discussion_summary: One round of review on naming.
  details: |
    Paragraph one.

    Paragraph two.
  discussion: Reviewer asked for a test; author added one.
`);
		expect(parseMissedPrs(data)).toEqual([
			{
				pr: 24561,
				title: "Fix workflow invocation export",
				author: "someone",
				url,
				mergedAt: "2026-10-30T14:02:11Z",
				mergedBy: "mvdbeek",
				approvers: ["mvdbeek", "davelopez"],
				summary: "Fixes export of invocations with subworkflows.",
				discussionSummary: "One round of review on naming.",
				details: "Paragraph one.\n\nParagraph two.\n",
				discussion: "Reviewer asked for a test; author added one.",
			},
		]);
	});

	it("reads an entry with only pr, title and url", () => {
		expect(parseMissedPrs([{ pr: 1, title: "x", url }])).toEqual([{ pr: 1, title: "x", url, approvers: [] }]);
	});

	it("reads empty approvers", () => {
		expect(parseMissedPrs([{ pr: 1, title: "x", url, approvers: [] }])).toEqual([{ pr: 1, title: "x", url, approvers: [] }]);
	});

	it("normalizes a Date merged_at to ISO", () => {
		const [entry] = parseMissedPrs([{ pr: 1, title: "x", url, merged_at: new Date("2026-10-30T14:02:11Z") }]);
		expect(entry!.mergedAt).toBe("2026-10-30T14:02:11.000Z");
	});

	it("treats an empty block as no PRs", () => {
		expect(parseMissedPrs(null)).toEqual([]);
	});

	it("rejects a non-list block", () => {
		expect(() => parseMissedPrs({ pr: 1 })).toThrow("must be a list");
	});

	it("rejects unknown fields", () => {
		expect(() => parseMissedPrs([{ pr: 1, title: "x", url, discusion: "typo" }])).toThrow("entry 1: unknown field discusion");
	});

	it.each([
		[{ title: "x", url }, "missing pr"],
		[{ pr: "24561", title: "x", url }, "missing pr"],
		[{ pr: 1, url }, "missing title"],
		[{ pr: 1, title: "x" }, "url must be an http(s) URL"],
		[{ pr: 1, title: "x", url: "github.com/x" }, "url must be an http(s) URL"],
		[{ pr: 1, title: "x", url, approvers: "mvdbeek" }, "approvers must be a list of logins"],
		[{ pr: 1, title: "x", url, author: 7 }, "author must be text"],
		[{ pr: 1, title: "x", url, merged_at: 7 }, "merged_at must be a timestamp"],
	])("rejects %o", (entry, message) => {
		expect(() => parseMissedPrs([entry])).toThrow(message);
	});
});

const day = "# 2026-10-27\n```gb-missed-prs\n- pr: 1\n  title: a\n- pr: 2\n  title: b\n```\n";

describe("removeMissedPr", () => {
	it("drops the entry with that number", () => {
		expect(removeMissedPr(day, 1, parse, stringify)).toBe(day.replace("- pr: 1\n  title: a\n", ""));
	});

	it("returns undefined when no entry has that number", () => {
		expect(removeMissedPr(day, 3, parse, stringify)).toBeUndefined();
	});
});

describe("missedPrsLeft", () => {
	it("counts entries across blocks", () => {
		expect(missedPrsLeft(`${day}\n\`\`\`gb-missed-prs\n- pr: 3\n  title: c\n\`\`\`\n`, parse)).toBe(3);
	});

	it("is zero once every block is empty", () => {
		expect(missedPrsLeft("```gb-missed-prs\n```\n", parse)).toBe(0);
	});
});

describe("appendReviewed", () => {
	const pr = { pr: 24425, title: "Document state", url: "https://github.com/galaxyproject/galaxy/pull/24425", approvers: [] };

	it("starts a ledger", () => {
		expect(appendReviewed("", pr)).toBe(
			"PRs John checked off in the gb-missed-prs view.\n\n- [#24425](https://github.com/galaxyproject/galaxy/pull/24425) Document state\n",
		);
	});

	it("appends to a ledger missing its final newline", () => {
		expect(appendReviewed("intro\n\n- [#1](u) x", pr)).toBe("intro\n\n- [#1](u) x\n- [#24425](https://github.com/galaxyproject/galaxy/pull/24425) Document state\n");
	});

	it("leaves a ledger already listing the PR alone", () => {
		const ledger = appendReviewed("", pr);
		expect(appendReviewed(ledger, pr)).toBe(ledger);
	});
});

describe("reviewedPath", () => {
	it("puts the ledger beside the date file", () => {
		expect(reviewedPath("agents/gx_reviews/the_cracks/2026-10-27.md")).toBe("agents/gx_reviews/the_cracks/REVIEWED.md");
	});
});

describe("crackFiles", () => {
	it("lists dated files in the directory, newest first", () => {
		const dir = "agents/gx_reviews/the_cracks";
		const paths = [
			`${dir}/2026-10-29.md`,
			`${dir}/FELL_THROUGH_THE_CRACKS_NOTE_FORMAT.md`,
			`${dir}/2026-10-31.md`,
			`${dir}/sub/2026-11-01.md`,
			"agents/gx_reviews/2026-10-30.md",
		];
		expect(crackFiles(paths, dir)).toEqual([
			{ path: `${dir}/2026-10-31.md`, date: "2026-10-31" },
			{ path: `${dir}/2026-10-29.md`, date: "2026-10-29" },
		]);
	});
});
