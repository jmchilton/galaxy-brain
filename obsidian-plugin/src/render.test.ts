import { describe, expect, it } from "vitest";
import { renderGithubMarkdown } from "./render";

describe("renderGithubMarkdown", () => {
	it("renders markdown inside details blocks, like GitHub", () => {
		const { html } = renderGithubMarkdown(
			"<details><summary>Why</summary>\n\nSome **bold** and `code`.\n\n</details>\n",
		);
		expect(html).toContain("<details><summary>Why</summary>");
		expect(html).toContain("<strong>bold</strong>");
		expect(html).toContain("<code>code</code>");
		expect(html).toContain("</details>");
	});

	it("keeps nested details nested", () => {
		const src = [
			"<details><summary>Outer</summary>",
			"",
			"### Heading",
			"",
			"<details><summary>Inner</summary>",
			"",
			"- item",
			"",
			"</details>",
			"",
			"</details>",
			"",
		].join("\n");
		const { html } = renderGithubMarkdown(src);
		const inner = html.indexOf("<summary>Inner</summary>");
		const outerEnd = html.lastIndexOf("</details>");
		expect(html.indexOf("<summary>Outer</summary>")).toBeLessThan(inner);
		expect(html).toContain("<h3>Heading</h3>");
		expect(html).toContain("<li>item</li>");
		expect(inner).toBeLessThan(outerEnd);
	});

	it("lifts a leading 'Title:' line into the title", () => {
		const { title, html } = renderGithubMarkdown("Title: Crash on import\n\nBody text\n");
		expect(title).toBe("Crash on import");
		expect(html).not.toContain("Title:");
		expect(html).toContain("<p>Body text</p>");
	});

	it("strips YAML frontmatter", () => {
		const { title, html } = renderGithubMarkdown("---\ntype: research\n---\n# Hi\n");
		expect(title).toBeNull();
		expect(html).not.toContain("type: research");
		expect(html).toContain("<h1>Hi</h1>");
	});

	it("renders GFM tables and task lists", () => {
		const { html } = renderGithubMarkdown("| a | b |\n|---|---|\n| 1 | 2 |\n\n- [x] done\n- [ ] todo\n");
		expect(html).toContain("<table>");
		expect(html).toMatch(/<input[^>]*type="checkbox"[^>]*checked/);
		expect(html).toMatch(/<input[^>]*type="checkbox"(?![^>]*checked)[^>]*>/);
	});
});

describe("GitHub references", () => {
	const opts = { repo: "galaxyproject/galaxy" };

	it("links bare #123 to the default repo", () => {
		const { html } = renderGithubMarkdown("See #23886 for details.\n", opts);
		expect(html).toContain('<a href="https://github.com/galaxyproject/galaxy/issues/23886">#23886</a>');
	});

	it("links owner/repo#123 to that repo", () => {
		const { html } = renderGithubMarkdown("Fixed in galaxyproject/planemo#1500.\n", opts);
		expect(html).toContain('<a href="https://github.com/galaxyproject/planemo/issues/1500">galaxyproject/planemo#1500</a>');
	});

	it("links @user mentions", () => {
		const { html } = renderGithubMarkdown("cc @mvdbeek please\n", opts);
		expect(html).toContain('<a href="https://github.com/mvdbeek">@mvdbeek</a>');
	});

	it("leaves code, links, emails and headings-like text alone", () => {
		const { html } = renderGithubMarkdown(
			"`#12` and [issue #34](https://x.test) and a@b.org and C#4\n",
			opts,
		);
		expect(html).toContain("<code>#12</code>");
		expect(html).toContain('<a href="https://x.test">issue #34</a>');
		expect(html).not.toContain("github.com/b");
		expect(html).not.toContain("issues/4");
	});

	it("does not link bare #123 without a default repo", () => {
		const { html } = renderGithubMarkdown("See #23886.\n");
		expect(html).not.toContain("<a");
	});

	it("tags fenced code with its language for highlighting", () => {
		const { html } = renderGithubMarkdown("```python\nx = 1\n```\n", opts);
		expect(html).toContain('<code class="language-python">');
	});
});
