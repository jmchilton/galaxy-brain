import { describe, expect, it } from "vitest";
import { parse, stringify } from "yaml";
import { crackFiles, cracksPath, isCrackFile, parseMissedPrs, setMissedPrReviewed } from "./missed-prs";

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
  reviewed: true
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
				reviewed: true,
			},
		]);
	});

	it("reads an entry with only pr, title and url", () => {
		expect(parseMissedPrs([{ pr: 1, title: "x", url }])).toEqual([{ pr: 1, title: "x", url, approvers: [], reviewed: false }]);
	});

	it("reads empty approvers", () => {
		expect(parseMissedPrs([{ pr: 1, title: "x", url, approvers: [] }])).toEqual([{ pr: 1, title: "x", url, approvers: [], reviewed: false }]);
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
		[{ pr: 1, title: "x", url, reviewed: "yes" }, "reviewed must be true or false"],
	])("rejects %o", (entry, message) => {
		expect(() => parseMissedPrs([entry])).toThrow(message);
	});
});

const day = "# 2026-10-27\n```gb-missed-prs\n- pr: 1\n  title: a\n- pr: 2\n  title: b\n```\n";

describe("setMissedPrReviewed", () => {
	it("marks the entry with that number reviewed", () => {
		expect(setMissedPrReviewed(day, 2, true, parse, stringify)).toBe(day.replace("  title: b\n", "  title: b\n  reviewed: true\n"));
	});

	it("drops the field when unmarking", () => {
		const marked = setMissedPrReviewed(day, 2, true, parse, stringify)!;
		expect(setMissedPrReviewed(marked, 2, false, parse, stringify)).toBe(day);
	});

	it("returns undefined when no entry has that number", () => {
		expect(setMissedPrReviewed(day, 3, true, parse, stringify)).toBeUndefined();
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

describe("cracksPath", () => {
	it("is the agent dir's the_cracks", () => {
		expect(cracksPath("gx_reviews")).toBe("agents/gx_reviews/the_cracks");
	});
});

describe("isCrackFile", () => {
	it.each([
		["agents/gx_reviews/the_cracks/2026-10-27.md", true],
		["agents/gx_reviews/the_cracks/FELL_THROUGH_THE_CRACKS_NOTE_FORMAT.md", false],
		["agents/gx_reviews/the_cracks/sub/2026-10-27.md", false],
		["agents/gx_reviews/2026-10-27.md", false],
	])("%s → %s", (path, expected) => {
		expect(isCrackFile(path)).toBe(expected);
	});
});
