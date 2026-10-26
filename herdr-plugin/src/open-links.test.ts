import { describe, expect, it } from "vitest";
import { recordFromPath, untrackedRecord } from "../../obsidian-plugin/src/launchers";
import { openLinks } from "./open-links";

describe("openLinks", () => {
	it("links a record to GitHub and to its index.md in Obsidian", () => {
		const review = recordFromPath("repositories/galaxy/reviews/active/24413/index.md")!;
		expect(openLinks(review, "", "/v")).toEqual({
			github: "https://github.com/galaxyproject/galaxy/pull/24413",
			obsidian: "obsidian://open?path=%2Fv%2Frepositories%2Fgalaxy%2Freviews%2Factive%2F24413%2Findex.md",
		});
	});

	it("prefers the clicked URL, and gives untracked records no Obsidian link", () => {
		const untracked = untrackedRecord("galaxy-tool-util-ts", "reviews", 7);
		const clicked = "https://github.com/jmchilton/galaxy-tool-util-ts/pull/7";
		expect(openLinks(untracked, "", "/v", clicked)).toEqual({ github: clicked });
	});
});
