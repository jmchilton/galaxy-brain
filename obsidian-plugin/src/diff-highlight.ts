// Syntax tokens for diff lines, per line and free of DOM and Obsidian APIs; the Herdr app's review tab shares it.
import hljs from "highlight.js/lib/core";
import bash from "highlight.js/lib/languages/bash";
import css from "highlight.js/lib/languages/css";
import ini from "highlight.js/lib/languages/ini";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import markdown from "highlight.js/lib/languages/markdown";
import python from "highlight.js/lib/languages/python";
import scss from "highlight.js/lib/languages/scss";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";
import yaml from "highlight.js/lib/languages/yaml";

const LANGUAGES = { bash, css, ini, javascript, json, markdown, python, scss, typescript, xml, yaml };
for (const [name, language] of Object.entries(LANGUAGES)) hljs.registerLanguage(name, language);

const BY_EXTENSION: Record<string, keyof typeof LANGUAGES> = {
	bash: "bash",
	sh: "bash",
	cfg: "ini",
	ini: "ini",
	toml: "ini",
	css: "css",
	scss: "scss",
	cjs: "javascript",
	js: "javascript",
	jsx: "javascript",
	mjs: "javascript",
	ga: "json",
	json: "json",
	md: "markdown",
	py: "python",
	cts: "typescript",
	mts: "typescript",
	ts: "typescript",
	tsx: "typescript",
	html: "xml",
	svg: "xml",
	vue: "xml",
	xml: "xml",
	xsd: "xml",
	cwl: "yaml",
	yaml: "yaml",
	yml: "yaml",
};

/** Past this, a hunk shows plain: generated or minified text isn't worth the frame. */
const MAX_CHARS = 200_000;

export interface CodeToken {
	text: string;
	/** highlight.js's class for the text, e.g. `hljs-keyword` or `hljs-title function_`; absent for plain text. */
	scope?: string;
}

export type DiffLineKind = "context" | "add" | "del";

export interface DiffLine {
	kind: DiffLineKind;
	text: string;
}

/** The highlighter for these lines of `path`, or null; a `.vue` hunk without markup is taken to be its script. */
export function languageForPath(path: string, lines: readonly string[] = []): keyof typeof LANGUAGES | null {
	const name = path.slice(path.lastIndexOf("/") + 1).replace(/\.sample$/, "");
	const dot = name.lastIndexOf(".");
	if (dot < 1) return null;
	const extension = name.slice(dot + 1).toLowerCase();
	if (extension === "vue" && !lines.some((line) => line.trimStart().startsWith("<"))) return "typescript";
	return BY_EXTENSION[extension] ?? null;
}

const ENTITIES: Record<string, string> = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#x27;": "'" };
const decode = (text: string) => text.replace(/&(?:amp|lt|gt|quot|#x27);/g, (entity) => ENTITIES[entity]!);

/** highlight.js's markup as tokens per line; the innermost scope wins. */
function tokensByLine(markup: string): CodeToken[][] {
	const lines: CodeToken[][] = [[]];
	const open: string[] = [];
	for (const part of markup.split(/(<span class="[^"]*">|<\/span>)/)) {
		if (part.startsWith("<span")) open.push(part.slice('<span class="'.length, -2));
		else if (part === "</span>") open.pop();
		else if (part) {
			decode(part)
				.split("\n")
				.forEach((text, i) => {
					if (i) lines.push([]);
					if (text) lines[lines.length - 1]!.push(open.length ? { text, scope: open[open.length - 1]! } : { text });
				});
		}
	}
	return lines;
}

/** True when highlighting stopped inside a string or comment, as a hunk starting mid-docstring does. */
function runsOn(top: unknown): boolean {
	for (let mode = top as { scope?: unknown; parent?: unknown } | undefined; mode; mode = mode.parent as typeof mode) {
		if (mode.scope === "string" || mode.scope === "comment") return true;
	}
	return false;
}

const highlight = (language: string, code: string) => hljs.highlight(code, { language, ignoreIllegals: true });

/** A `.vue` hunk that closes a script it never opened needs the opener for its script part to highlight. */
function vueOpener(path: string, lines: readonly string[]): string[] {
	if (!path.endsWith(".vue")) return [];
	const close = lines.findIndex((line) => line.trim() === "</script>");
	const open = lines.findIndex((line) => line.trimStart().startsWith("<script"));
	return close >= 0 && (open < 0 || open > close) ? ["<script>"] : [];
}

/** One token list per line; lines highlight as one block so multi-line strings stay right, or singly if that runs on. */
export function highlightLines(language: string, lines: readonly string[], before: readonly string[] = []): CodeToken[][] {
	const whole = highlight(language, [...before, ...lines].join("\n"));
	if (!runsOn(whole._top)) return tokensByLine(whole.value).slice(before.length);
	return lines.map((line) => tokensByLine(highlight(language, line).value)[0]!);
}

/**
 * Tokens per diff line, or null for an unknown language or an oversized hunk.
 * The old and new sides highlight separately, since each is valid code and their mix isn't.
 */
export function highlightDiff(path: string, rows: readonly DiffLine[], maxChars = MAX_CHARS): CodeToken[][] | null {
	if (!rows.length || rows.reduce((n, row) => n + row.text.length, 0) > maxChars) return null;
	const language = languageForPath(path, rows.map((row) => row.text));
	if (!language) return null;
	const side = (kind: DiffLineKind) => {
		const lines = rows.filter((row) => row.kind === kind || row.kind === "context").map((row) => row.text);
		return highlightLines(language, lines, vueOpener(path, lines));
	};
	const after = side("add");
	const before = rows.some((row) => row.kind === "del") ? side("del") : [];
	let oldLine = 0;
	let newLine = 0;
	return rows.map((row) => {
		if (row.kind === "del") return before[oldLine++] ?? [];
		if (row.kind === "context") oldLine++;
		return after[newLine++] ?? [];
	});
}

/** `@@ -1,2 +3,4 @@ def f():` as its range and the enclosing scope git named, if any. */
export function splitHunkHeader(header: string): { range: string; context: string } {
	const end = header.indexOf("@@", 2);
	if (!header.startsWith("@@") || end < 0) return { range: header, context: "" };
	return { range: header.slice(0, end + 2), context: header.slice(end + 2).trim() };
}

export type SyntaxGroup = "keyword" | "string" | "comment" | "function" | "type" | "number" | "tag" | "attribute" | "meta";

const GROUPS: Record<string, SyntaxGroup> = {
	keyword: "keyword",
	"selector-tag": "keyword",
	doctag: "keyword",
	literal: "number",
	number: "number",
	string: "string",
	regexp: "string",
	symbol: "string",
	comment: "comment",
	quote: "comment",
	title: "function",
	section: "function",
	built_in: "type",
	type: "type",
	"selector-class": "type",
	"selector-id": "type",
	name: "tag",
	tag: "tag",
	attr: "attribute",
	attribute: "attribute",
	property: "attribute",
	params: "attribute",
	variable: "attribute",
	meta: "meta",
	bullet: "meta",
	link: "string",
	code: "string",
};

/** A token's color family, for a surface that has no highlight.js stylesheet. */
export function syntaxGroup(scope: string | undefined): SyntaxGroup | null {
	const name = scope?.split(" ")[0]?.replace(/^hljs-/, "");
	return (name && GROUPS[name]) || null;
}
