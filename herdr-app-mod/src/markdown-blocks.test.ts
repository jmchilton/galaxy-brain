import { describe, expect, it } from "vitest";
import { type MarkdownBlock, markdownBlocks, summaryText } from "./markdown-blocks";

const md = (text: string): MarkdownBlock => ({ type: "markdown", text });
const details = (summary: string, blocks: MarkdownBlock[], open = false): MarkdownBlock => ({ type: "details", summary, open, blocks });

describe("details", () => {
	it("splits the text around a block, with its summary and body", () => {
		const text = "Before\n\n<details>\n<summary>More</summary>\n\n### Body\n\n</details>\n\nAfter\n";
		expect(markdownBlocks(text)).toEqual([md("Before"), details("More", [md("### Body")]), md("After")]);
	});

	it("takes a summary on the opening tag's line and the open attribute", () => {
		expect(markdownBlocks("<details open><summary>Shown</summary>\n\nBody\n</details>")).toEqual([details("Shown", [md("Body")], true)]);
	});

	it("nests", () => {
		const text = "<details><summary>A</summary>\n\none\n\n  <details><summary>B</summary>\n\n  two\n\n  </details>\n\nthree\n</details>";
		expect(markdownBlocks(text)).toEqual([details("A", [md("one"), details("B", [md("  two")]), md("three")])]);
	});

	it("defaults the summary, closes at the end of the text, and drops a stray close", () => {
		expect(markdownBlocks("<details>\n\nBody")).toEqual([details("Details", [md("Body")])]);
		expect(markdownBlocks("One\n</details>\nTwo")).toEqual([md("One"), md("Two")]);
	});

	it("leaves tags in code and comments alone", () => {
		for (const text of ["```html\n<details>\n<summary>x</summary>\n</details>\n```", "~~~\n<details>\n~~~", "Use `<details>` here", "<!-- <details> -->"]) {
			expect(markdownBlocks(text)).toEqual([md(text)]);
		}
	});

	it("opens only at the start of a line", () => {
		expect(markdownBlocks("Wrap it in <details> tags")).toEqual([md("Wrap it in <details> tags")]);
		expect(markdownBlocks("    <details>")).toEqual([md("    <details>")]);
	});

	it("keeps a fence that holds a closing tag in the body", () => {
		const fence = "```\n</details>\n```";
		expect(markdownBlocks(`<details>\n\n${fence}\n\n</details>`)).toEqual([details("Details", [md(fence)])]);
	});
});

describe("summaryText", () => {
	it("reduces a summary to plain text", () => {
		expect(summaryText(" Why <code>foo_bar</code> &amp; **`baz`**\n")).toBe("Why foo_bar & baz");
		expect(summaryText("  ")).toBe("Details");
	});
});

describe("alerts", () => {
	it("turns a marked quote into an alert with its body", () => {
		const text = "Before\n\n> [!WARNING]\n> Watch **this**\n>\n> And that\n\nAfter";
		expect(markdownBlocks(text)).toEqual([md("Before"), { type: "alert", kind: "warning", blocks: [md("Watch **this**\n\nAnd that")] }, md("After")]);
	});

	it("leaves other quotes and fenced examples alone", () => {
		expect(markdownBlocks("> [!NOPE]\n> x")).toEqual([md("> [!NOPE]\n> x")]);
		expect(markdownBlocks("> plain")).toEqual([md("> plain")]);
		const fence = "```\n> [!NOTE]\n> x\n```";
		expect(markdownBlocks(fence)).toEqual([md(fence)]);
	});
});

describe("references", () => {
	const repo = "galaxyproject/galaxy";
	const base = `https://github.com/${repo}`;
	const text = (input: string) => (markdownBlocks(input, { repo })[0] as { text: string }).text;

	it("links issue numbers to the record's repository, qualified ones to theirs, and users", () => {
		expect(text("See #123, (#45), galaxyproject/foundry#6 and @someone.")).toBe(`See [#123](${base}/issues/123), ([#45](${base}/issues/45)), [galaxyproject/foundry#6](https://github.com/galaxyproject/foundry/issues/6) and [@someone](https://github.com/someone).`);
	});

	it("leaves numbers alone without a repository, but still links qualified ones", () => {
		expect((markdownBlocks("#123 and a/b#6")[0] as { text: string }).text).toBe("#123 and [a/b#6](https://github.com/a/b/issues/6)");
	});

	it("skips code, links, URLs, tags, entities, paths and addresses", () => {
		for (const input of ["`#123`", "```\n#123\n```", "    #123", "[see #123](http://x)", "https://x.org/a#123", '<a href="#123">x</a>', "&#123;", "a/b/c#123", "word#123", "##123", "a@b.org"]) {
			expect(text(input)).toBe(input);
		}
	});
});

describe("inline HTML and images", () => {
	it("shows kbd as code", () => {
		expect(markdownBlocks("Press <kbd>Ctrl</kbd>+<kbd>C</kbd>")).toEqual([md("Press `Ctrl`+`C`")]);
	});

	it("turns local images into links, since the view can't load them, and keeps remote ones", () => {
		expect(markdownBlocks("![Shot](screenshots/a.png) and ![](b.png)")).toEqual([md("[🖼 Shot](screenshots/a.png) and [🖼 b.png](b.png)")]);
		const remote = "![Remote](https://x.org/a.png)";
		expect(markdownBlocks(remote)).toEqual([md(remote)]);
		const code = "`![Shot](a.png)`";
		expect(markdownBlocks(code)).toEqual([md(code)]);
	});
});

describe("plain text", () => {
	it("gives nothing for blank text and one block otherwise", () => {
		expect(markdownBlocks(" \n\n")).toEqual([]);
		expect(markdownBlocks("# Title\n\nBody\n")).toEqual([md("# Title\n\nBody")]);
	});
});
