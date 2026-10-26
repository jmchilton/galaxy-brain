import { describe, expect, it } from "vitest";
import { fzfLine, fzfKey } from "./fzf-lines";

describe("fzfLine", () => {
	it("puts the key first, tab-separated, and replaces tabs and newlines in the columns", () => {
		const line = fzfLine("repositories/galaxy/reviews/active/1", ["galaxy", "reviews\tactive", "Fix\nit"]);
		expect(line).toBe("repositories/galaxy/reviews/active/1\tgalaxy  reviews active  Fix it");
		expect(fzfKey(line)).toBe("repositories/galaxy/reviews/active/1");
	});

	it("reads the key of an fzf selection with a trailing newline", () => {
		expect(fzfKey("3\t🔎 Review\n")).toBe("3");
		expect(fzfKey("")).toBeNull();
	});
});
