import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { crackFiles, parseMissedPrs } from "./missed-prs";

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
