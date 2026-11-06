// GitHub markdown that the app's TextView doesn't draw: <details> and alerts become blocks for the mod to draw,
// and references, <kbd> and local images are rewritten into markdown it does.

import { GITHUB_REF, githubRefHref } from "../../obsidian-plugin/src/github-refs";

export type AlertKind = "note" | "tip" | "important" | "warning" | "caution";

export type MarkdownBlock =
	| { type: "markdown"; text: string }
	| { type: "details"; summary: string; open: boolean; blocks: MarkdownBlock[] }
	| { type: "alert"; kind: AlertKind; blocks: MarkdownBlock[] };

export interface MarkdownOptions {
	/** "owner/name" that bare `#123` references resolve against. */
	repo?: string;
}

const blank = (text: string) => text.replace(/[^\n]/g, " ");

/** Blanks fenced code, comments and code spans, keeping every offset. */
function maskCode(text: string): string {
	let fence: string | null = null;
	const lines = text.split("\n").map((line) => {
		if (fence) {
			const closes = line.trim().startsWith(fence) && new RegExp(`^${fence[0]}+$`).test(line.trim());
			if (closes) fence = null;
			return blank(line);
		}
		const open = /^[ \t]*(`{3,}|~{3,})/.exec(line);
		if (!open) return line;
		fence = open[1]!;
		return blank(line);
	});
	return lines
		.join("\n")
		.replace(/<!--[\s\S]*?-->/g, blank)
		.replace(/(?<!`)(`+)(?!`)(?:(?!\n[ \t]*\n)[\s\S])*?(?<!`)\1(?!`)/g, blank);
}

/** Applies `replace` to the matches found in `mask`, a same-length copy of `text`. */
function replaceIn(text: string, mask: string, pattern: RegExp, replace: (match: RegExpExecArray | RegExpMatchArray) => string): string {
	let result = "";
	let cursor = 0;
	for (const match of mask.matchAll(pattern)) {
		result += text.slice(cursor, match.index) + replace(match);
		cursor = match.index + match[0].length;
	}
	return result + text.slice(cursor);
}

/** References, as GitHub links them; it would check they exist, which this can't. */
function linkReferences(text: string, repo: string | undefined): string {
	const mask = maskCode(text)
		.replace(/^(?: {4}|\t).*$/gm, blank)
		.replace(/\[[^\]\n]*\]\([^)\n]*\)/g, blank)
		.replace(/\b[a-z][a-z+.-]*:\/\/[^\s)>]+/gi, blank)
		.replace(/<[^>\n]+>/g, blank)
		.replace(/&#?\w+;/g, blank);
	return replaceIn(text, mask, GITHUB_REF, (match) => {
		const href = githubRefHref(match, repo);
		return href ? `[${match[0]}](${href})` : match[0];
	});
}

/** The view can't load files, so a local image becomes a link to it. */
function linkLocalImages(text: string): string {
	return replaceIn(text, maskCode(text), /!\[([^\]\n]*)\]\(([^)\s]+)(?:\s+"[^"\n]*")?\)/g, (match) => {
		const [whole, alt, url] = match as [string, string, string];
		return /^(?:[a-z][a-z+.-]*:|\/\/)/i.test(url) ? whole : `[🖼 ${alt || url.split("/").pop()}](${url})`;
	});
}

const showKeys = (text: string) => replaceIn(text, maskCode(text), /<kbd>([^<\n]*)<\/kbd>/gi, (match) => `\`${match[1]}\``);

function plainBlock(text: string, { repo }: MarkdownOptions): MarkdownBlock[] {
	const trimmed = text.replace(/^(?:[ \t]*\n)+/, "").trimEnd();
	return trimmed ? [{ type: "markdown", text: linkReferences(showKeys(linkLocalImages(trimmed)), repo) }] : [];
}

function withAlerts(text: string, options: MarkdownOptions): MarkdownBlock[] {
	const lines = text.split("\n");
	const masked = maskCode(text).split("\n");
	const blocks: MarkdownBlock[] = [];
	let start = 0;
	for (let i = 0; i < lines.length; i++) {
		const marker = /^ {0,3}> ?\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\][ \t]*$/i.exec(masked[i]!);
		if (!marker) continue;
		let end = i + 1;
		while (end < lines.length && /^ {0,3}>/.test(lines[end]!)) end++;
		const body = lines.slice(i + 1, end).map((line) => line.replace(/^ {0,3}> ?/, "")).join("\n");
		blocks.push(...plainBlock(lines.slice(start, i).join("\n"), options), { type: "alert", kind: marker[1]!.toLowerCase() as AlertKind, blocks: markdownBlocks(body, options) });
		start = end;
		i = end - 1;
	}
	return [...blocks, ...plainBlock(lines.slice(start).join("\n"), options)];
}

/** A `<summary>`'s text, without its markup. */
export function summaryText(summary: string): string {
	const text = summary
		.replace(/<[^>]+>/g, "")
		.replace(/\*\*|`/g, "")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&amp;/g, "&")
		.replace(/\s+/g, " ")
		.trim();
	return text || "Details";
}

/** The summary starting at `from`, skipping space before it, and where it ends. */
function readSummary(text: string, mask: string, from: number): { summary: string; end: number } | null {
	const open = /^\s*<summary\b[^>]*>/i.exec(mask.slice(from));
	if (!open) return null;
	const start = from + open[0].length;
	const close = /<\/summary\s*>/i.exec(mask.slice(start));
	return close ? { summary: text.slice(start, start + close.index), end: start + close.index + close[0].length } : null;
}

/** Splits text into what TextView draws and what the mod does; a `<details>` left open closes at the end, as in a browser. */
export function markdownBlocks(text: string, options: MarkdownOptions = {}): MarkdownBlock[] {
	const mask = maskCode(text);
	const root: MarkdownBlock[] = [];
	const stack: MarkdownBlock[][] = [root];
	let cursor = 0;
	const flush = (end: number) => stack[stack.length - 1]!.push(...withAlerts(text.slice(cursor, end), options));
	for (const match of mask.matchAll(/<(\/?)details\b[^>]*>/gi)) {
		const { index } = match;
		const closing = match[1] === "/";
		if (!closing && !/^ {0,3}$/.test(mask.slice(mask.lastIndexOf("\n", index - 1) + 1, index))) continue;
		flush(index);
		cursor = index + match[0].length;
		if (closing) {
			if (stack.length > 1) stack.pop();
			continue;
		}
		const summary = readSummary(text, mask, cursor);
		if (summary) cursor = summary.end;
		const blocks: MarkdownBlock[] = [];
		stack[stack.length - 1]!.push({ type: "details", summary: summaryText(summary?.summary ?? ""), open: /\bopen\b/i.test(match[0]), blocks });
		stack.push(blocks);
	}
	flush(text.length);
	return root;
}
