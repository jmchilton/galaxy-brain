import { describe, expect, it } from "vitest";
import { isImagePath, linkTarget, recordTabName, withoutTitle } from "./record-page";

describe("isImagePath", () => {
	it("knows image files, in any case", () => {
		expect(["a.png", "s/b.JPG", "c.jpeg", "d.gif", "e.webp", "f.svg"].every(isImagePath)).toBe(true);
		expect(["a.md", "png", "a.png.md"].some(isImagePath)).toBe(false);
	});
});

describe("linkTarget", () => {
	const dir = "repositories/galaxy/reviews/active/7";
	const files = ["index.md", "review.md", "alts/one.md", "my notes.md"];
	const target = (url: string, current = "index.md") => linkTarget(url, { vault: "/v", dir, current, files });

	it("opens the record's own files, resolved against the current file", () => {
		expect(target("review.md")).toEqual({ file: "review.md" });
		expect(target("./alts/one.md#top")).toEqual({ file: "alts/one.md" });
		expect(target("../review.md", "alts/one.md")).toEqual({ file: "review.md" });
		expect(target("my%20notes.md")).toEqual({ file: "my notes.md" });
	});

	it("accepts absolute and file:// forms of the same path", () => {
		expect(target(`/v/${dir}/review.md`)).toEqual({ file: "review.md" });
		expect(target(`file:///v/${dir}/alts/one.md`)).toEqual({ file: "alts/one.md" });
	});

	it("sends other vault notes to Obsidian, and web links out", () => {
		expect(target("../8/index.md")).toEqual({ vault: "repositories/galaxy/reviews/active/8/index.md" });
		expect(target("https://github.com/o/r/pull/7")).toEqual({ url: "https://github.com/o/r/pull/7" });
	});

	it("ignores what leaves the vault, and anchors within the page", () => {
		expect(target("../../../../../../../etc/passwd")).toBeNull();
		expect(target("/etc/passwd")).toBeNull();
		expect(target("#top")).toBeNull();
		expect(target("mailto:a@b.c")).toBeNull();
	});
});

describe("recordTabName", () => {
	it("names the whole ref, which is unique across repositories and kinds", () => {
		expect(recordTabName("galaxy/reviews/7")).toBe("📓 galaxy/reviews/7");
	});
});

describe("withoutTitle", () => {
	it("drops a leading # heading only", () => {
		expect(withoutTitle("# Title\n\n## Status\n\nText\n")).toBe("## Status\n\nText\n");
		expect(withoutTitle("Intro\n\n# Later\n")).toBe("Intro\n\n# Later\n");
		expect(withoutTitle("## Status\n")).toBe("## Status\n");
	});
});
