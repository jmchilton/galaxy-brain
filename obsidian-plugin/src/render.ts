import MarkdownIt, { type StateCore, type Token } from "markdown-it";

// GitHub follows CommonMark HTML-block rules: a blank line ends a <details>
// HTML block, so the markdown between <summary> and </details> is rendered.
// Obsidian's reading view does not, which is why this preview exists.
const md = new MarkdownIt({ html: true, linkify: true });

// GFM task list items: "[ ] " / "[x] " at the start of a list item.
md.core.ruler.after("inline", "github_task_lists", (state) => {
	const tokens = state.tokens;
	for (let i = 2; i < tokens.length; i++) {
		const inline = tokens[i];
		if (inline.type !== "inline" || tokens[i - 2].type !== "list_item_open") continue;
		const match = /^\[([ xX])\] /.exec(inline.content);
		const first = inline.children?.[0];
		if (!match || !first || first.type !== "text") continue;
		first.content = first.content.slice(match[0].length);
		const checkbox = new state.Token("html_inline", "", 0);
		const checked = match[1] === " " ? "" : " checked";
		checkbox.content = `<input type="checkbox" disabled${checked}> `;
		inline.children!.unshift(checkbox);
		tokens[i - 2].attrJoin("class", "task-list-item");
	}
});

// GitHub autolinks: owner/repo#123, #123 (needs a default repo), @user.
const GITHUB_REF =
	/(?<![\w/@.#])(?:([A-Za-z0-9][\w.-]*\/[\w.-]+)#(\d+)|#(\d+)|@([A-Za-z0-9][A-Za-z0-9-]*))\b/g;

function githubRefHref(match: RegExpExecArray, repo: string | undefined): string | null {
	const [, refRepo, refNumber, bareNumber, user] = match;
	if (refRepo) return `https://github.com/${refRepo}/issues/${refNumber}`;
	if (bareNumber) return repo ? `https://github.com/${repo}/issues/${bareNumber}` : null;
	return `https://github.com/${user}`;
}

md.core.ruler.after("linkify", "github_references", (state) => {
	const repo = (state.env as RenderOptions | undefined)?.repo;
	for (const block of state.tokens) {
		if (block.type !== "inline" || !block.children) continue;
		const out: Token[] = [];
		let linkDepth = 0;
		for (const token of block.children) {
			if (token.type === "link_open") linkDepth++;
			if (token.type === "link_close") linkDepth--;
			if (token.type !== "text" || linkDepth > 0) {
				out.push(token);
				continue;
			}
			let last = 0;
			for (const match of token.content.matchAll(GITHUB_REF)) {
				const href = githubRefHref(match, repo);
				if (!href) continue;
				const start = match.index!;
				if (start > last) out.push(textToken(state, token.content.slice(last, start)));
				const open = new state.Token("link_open", "a", 1);
				open.attrSet("href", href);
				out.push(open, textToken(state, match[0]), new state.Token("link_close", "a", -1));
				last = start + match[0].length;
			}
			if (last === 0) out.push(token);
			else if (last < token.content.length) out.push(textToken(state, token.content.slice(last)));
		}
		block.children = out;
	}
});

function textToken(state: StateCore, content: string): Token {
	const token = new state.Token("text", "", 0);
	token.content = content;
	return token;
}

export interface RenderOptions {
	/** "owner/name" that bare #123 references resolve against. */
	repo?: string;
}

const FRONTMATTER = /^---\r?\n[\s\S]*?\r?\n---\r?\n?/;
// Issue drafts start with "Title: ..." — the issue title, not body text.
const TITLE_LINE = /^Title:[ \t]*(.+)\r?\n?/;

export function renderGithubMarkdown(
	source: string,
	options: RenderOptions = {},
): { title: string | null; html: string } {
	let body = source.replace(FRONTMATTER, "");
	let title: string | null = null;
	const titleMatch = TITLE_LINE.exec(body);
	if (titleMatch) {
		title = titleMatch[1].trim();
		body = body.slice(titleMatch[0].length);
	}
	return { title, html: md.render(body, { repo: options.repo }) };
}
