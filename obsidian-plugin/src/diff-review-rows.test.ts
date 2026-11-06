import { describe, expect, it } from "vitest";
import { hunkRows } from "./diff-review-rows";

describe("hunkRows", () => {
	it("numbers each side and drops no-newline notes", () => {
		const rows = hunkRows({ oldStart: 10, newStart: 20, lines: [" a", "-b", "+c", "\\ No newline at end of file", "+d", " e"] });
		expect(rows).toEqual([
			{ kind: "context", text: "a", oldLine: 10, newLine: 20 },
			{ kind: "del", text: "b", oldLine: 11 },
			{ kind: "add", text: "c", newLine: 21 },
			{ kind: "add", text: "d", newLine: 22 },
			{ kind: "context", text: "e", oldLine: 12, newLine: 23 },
		]);
	});
});
