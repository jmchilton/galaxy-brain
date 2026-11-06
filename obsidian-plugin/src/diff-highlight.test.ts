import { describe, expect, it } from "vitest";
import { type CodeToken, type DiffLine, highlightDiff, highlightLines, languageForPath, splitHunkHeader, syntaxGroup } from "./diff-highlight";

const text = (tokens: CodeToken[]) => tokens.map((t) => t.text).join("");
const scoped = (tokens: CodeToken[], scope: string) => tokens.filter((t) => t.scope === scope).map((t) => t.text);

describe("languageForPath", () => {
	it("maps extensions, config samples and unknowns", () => {
		expect(languageForPath("lib/galaxy/app.py")).toBe("python");
		expect(languageForPath("client/src/a.mts")).toBe("typescript");
		expect(languageForPath("lib/galaxy/config/sample/job_conf.yml.sample")).toBe("yaml");
		expect(languageForPath("workflow.ga")).toBe("json");
		expect(languageForPath("doc/source/index.rst")).toBeNull();
		expect(languageForPath("Makefile")).toBeNull();
		expect(languageForPath(".gitignore")).toBeNull();
	});

	it("takes a .vue hunk without markup to be its script", () => {
		expect(languageForPath("A.vue", ["const a = 1;"])).toBe("typescript");
		expect(languageForPath("A.vue", ["  <div>", "const a = 1;"])).toBe("xml");
	});
});

describe("highlightLines", () => {
	it("gives one token list per line, keeping blanks and decoding entities", () => {
		const lines = ["def f(a):", "", '    return a < "x" & 1'];
		const tokens = highlightLines("python", lines);
		expect(tokens.map(text)).toEqual(lines);
		expect(scoped(tokens[0]!, "hljs-keyword")).toEqual(["def"]);
		expect(scoped(tokens[0]!, "hljs-title function_")).toEqual(["f"]);
		expect(scoped(tokens[2]!, "hljs-string")).toEqual(['"x"']);
	});

	it("carries a docstring across lines", () => {
		const tokens = highlightLines("python", ['"""Summary', "return is prose here", '"""', "return 1"]);
		expect(scoped(tokens[1]!, "hljs-string")).toEqual(["return is prose here"]);
		expect(scoped(tokens[3]!, "hljs-keyword")).toEqual(["return"]);
	});

	it("highlights line by line when a hunk starts inside a docstring", () => {
		const tokens = highlightLines("python", ["prose ends here", '"""', "return 1", "x = 2"]);
		expect(scoped(tokens[2]!, "hljs-keyword")).toEqual(["return"]);
		expect(scoped(tokens[3]!, "hljs-string")).toEqual([]);
	});
});

describe("highlightDiff", () => {
	it("highlights each side as its own code, in row order", () => {
		const rows: DiffLine[] = [
			{ kind: "context", text: '"""Doc' },
			{ kind: "del", text: 'old is prose"""' },
			{ kind: "add", text: 'new is prose"""' },
			{ kind: "context", text: "return 1" },
		];
		const tokens = highlightDiff("a.py", rows)!;
		expect(tokens.map(text)).toEqual(rows.map((r) => r.text));
		expect(scoped(tokens[1]!, "hljs-string")).toEqual(['old is prose"""']);
		expect(scoped(tokens[2]!, "hljs-string")).toEqual(['new is prose"""']);
		expect(scoped(tokens[3]!, "hljs-keyword")).toEqual(["return"]);
	});

	it("treats a .vue hunk that closes its script as script before the close", () => {
		const rows: DiffLine[] = [
			{ kind: "context", text: "const a = 1;" },
			{ kind: "context", text: "</script>" },
			{ kind: "add", text: "<template>" },
		];
		const tokens = highlightDiff("A.vue", rows)!;
		expect(tokens.map(text)).toEqual(rows.map((r) => r.text));
		expect(scoped(tokens[0]!, "hljs-keyword")).toEqual(["const"]);
	});

	it("is null for unknown languages, empty and oversized hunks", () => {
		expect(highlightDiff("a.rst", [{ kind: "add", text: "x" }])).toBeNull();
		expect(highlightDiff("a.py", [])).toBeNull();
		expect(highlightDiff("a.py", [{ kind: "add", text: "x".repeat(200_001) }])).toBeNull();
	});
});

describe("splitHunkHeader", () => {
	it("separates the range from the named scope", () => {
		expect(splitHunkHeader("@@ -1,2 +3,4 @@ def f(a):")).toEqual({ range: "@@ -1,2 +3,4 @@", context: "def f(a):" });
		expect(splitHunkHeader("@@ -1 +1 @@")).toEqual({ range: "@@ -1 +1 @@", context: "" });
		expect(splitHunkHeader("mode change")).toEqual({ range: "mode change", context: "" });
	});
});

describe("syntaxGroup", () => {
	it("maps highlight.js classes to color families", () => {
		expect(syntaxGroup("hljs-keyword")).toBe("keyword");
		expect(syntaxGroup("hljs-title function_")).toBe("function");
		expect(syntaxGroup("hljs-subst")).toBeNull();
		expect(syntaxGroup(undefined)).toBeNull();
	});
});
