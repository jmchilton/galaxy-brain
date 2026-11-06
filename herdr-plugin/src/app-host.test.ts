import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { type AppHostDeps, appRequest, editNote } from "./app-host";
import { newErrors } from "./error-log";

const TASKS = "agents/alpha/TASKS.md";
const CRACKS = "agents/alpha/the_cracks/2026-11-04.md";
const NOW = new Date("2026-11-06T14:00:00.000Z");

function deps(files: Record<string, string> = {}, status = '{"errors":[]}'): AppHostDeps & { status: { text: string; code: number } } {
	const vaultRoot = mkdtempSync(join(tmpdir(), "gb-app-vault-"));
	for (const [path, text] of Object.entries({ "agents/alpha/AGENTS.md": "", ...files })) {
		mkdirSync(dirname(join(vaultRoot, path)), { recursive: true });
		writeFileSync(join(vaultRoot, path), text);
	}
	const state = { text: status, code: 0 };
	return {
		vaultRoot,
		appHome: mkdtempSync(join(tmpdir(), "gb-app-home-")),
		run: () => ({ status: state.code, stdout: state.text, stderr: "no window" }),
		now: () => NOW,
		status: state,
	};
}

const tasks = (...lines: string[]) => `Before\n\n\`\`\`gb-tasks\n${lines.join("\n")}\n\`\`\`\n\nAfter\n`;
const task = (prompt: string) => ({ prompt, agentDir: "alpha", source: "alpha" });
const logged = (d: AppHostDeps) => readFileSync(join(d.appHome, "gb-errors.log"), "utf8");

describe("environments", () => {
	it("returns what machine icons and launch dialogs need", () => {
		const d = deps({ "agents/_shared/ENVIRONMENTS.yml": "environments:\n  - name: Local\n    icon: 💻\n  - name: Box\n    host: box\n    vault: /v\n    icon: 📦\n" });
		expect(appRequest({ type: "environments" }, d)).toEqual([
			{ name: "Local", icon: "💻" },
			{ name: "Box", host: "box", vault: "/v", icon: "📦" },
		]);
	});
});

describe("note edits", () => {
	const two = tasks("- prompt: one", "  agent_dir: alpha", "- prompt: two", "  agent_dir: alpha");

	it("removes the task and leaves the rest of the note", () => {
		const d = deps({ [TASKS]: two });
		expect(appRequest({ type: "removeTask", task: task("one") }, d)).toBe(true);
		const note = readFileSync(join(d.vaultRoot, TASKS), "utf8");
		expect(note).toContain("Before");
		expect(note).toContain("After");
		expect(note).not.toContain("prompt: one");
		expect(note).toContain("prompt: two");
	});

	it("says false when the task is already gone", () => {
		const d = deps({ [TASKS]: two });
		expect(appRequest({ type: "removeTask", task: task("three") }, d)).toBe(false);
		expect(readFileSync(join(d.vaultRoot, TASKS), "utf8")).toBe(two);
	});

	it("says false when the note is gone", () => {
		expect(appRequest({ type: "removeTask", task: task("one") }, deps())).toBe(false);
	});

	it("snoozes the task, keeping a long prompt on one line", () => {
		const long = "word ".repeat(40).trim();
		const d = deps({ [TASKS]: tasks(`- prompt: ${long}`, "  agent_dir: alpha") });
		expect(appRequest({ type: "snoozeTask", task: task(long), day: "2026-11-09" }, d)).toBe(true);
		const note = readFileSync(join(d.vaultRoot, TASKS), "utf8");
		expect(note).toContain("snoozed_until: 2026-11-09");
		expect(note).toContain(`prompt: ${long}\n`);
	});

	it("refuses a task from an unknown agent dir", () => {
		const d = deps({ "agents/other/TASKS.md": tasks("- prompt: one", "  agent_dir: other") });
		expect(() => appRequest({ type: "removeTask", task: { prompt: "one", agentDir: "other", source: "other" } }, d)).toThrow("unknown agent dir: other");
		expect(() => appRequest({ type: "removeTask", task: { prompt: "one", agentDir: "other", source: "../other" } }, d)).toThrow("unknown agent dir");
	});

	it("marks a missed PR reviewed", () => {
		const d = deps({ [CRACKS]: "```gb-missed-prs\n- pr: 1\n  title: t\n  url: https://github.com/o/r/pull/1\n```\n" });
		expect(appRequest({ type: "markPrReviewed", path: CRACKS, pr: 1 }, d)).toBe(true);
		expect(readFileSync(join(d.vaultRoot, CRACKS), "utf8")).toContain("reviewed: true");
		expect(appRequest({ type: "markPrReviewed", path: CRACKS, pr: 2 }, d)).toBe(false);
	});

	it("marks PRs only in the_cracks files", () => {
		const d = deps({ [TASKS]: two });
		expect(() => appRequest({ type: "markPrReviewed", path: TASKS, pr: 1 }, d)).toThrow("not a the_cracks file");
		expect(() => appRequest({ type: "markPrReviewed", path: "agents/alpha/the_cracks/../../../x/2026-11-04.md", pr: 1 }, d)).toThrow("not a the_cracks file");
	});

	it("loses to a change made since the read", () => {
		const d = deps({ [TASKS]: "first" });
		const file = join(d.vaultRoot, TASKS);
		const edit = () =>
			editNote(d.vaultRoot, TASKS, () => {
				writeFileSync(file, "theirs");
				return "mine";
			});
		expect(edit).toThrow("changed");
		expect(readFileSync(file, "utf8")).toBe("theirs");
	});
});

describe("newErrors", () => {
	it("counts identical errors and reports only increases", () => {
		expect(newErrors([], ["a", "a", "b"])).toEqual([
			{ message: "a", copies: 2 },
			{ message: "b", copies: 1 },
		]);
		expect(newErrors(["a", "a", "b"], ["a", "b"])).toEqual([]);
		expect(newErrors(["a"], ["a", "a", "a"])).toEqual([{ message: "a", copies: 2 }]);
	});
});

describe("error log", () => {
	it("appends a render failure with its time and mod, indenting the stack", () => {
		const d = deps();
		appRequest({ type: "logRenderFailure", mod: "gb-pane", message: "Error: boom\n  at render" }, d);
		appRequest({ type: "logRenderFailure", mod: "gb-board", message: "null" }, d);
		expect(logged(d)).toBe("2026-11-06T14:00:00.000Z render gb-pane: Error: boom\n    at render\n2026-11-06T14:00:00.000Z render gb-board: null\n");
	});

	it("logs status errors once, and again after they clear", () => {
		const d = deps({}, JSON.stringify({ errors: ['mod gb-pane: reloading: Null"null"', 'mod gb-pane: reloading: Null"null"'] }));
		expect(appRequest({ type: "logStatusErrors" }, d)).toBe(1);
		expect(logged(d)).toBe('2026-11-06T14:00:00.000Z status ×2 mod gb-pane: reloading: Null"null"\n');
		expect(appRequest({ type: "logStatusErrors" }, d)).toBe(0);
		const once = logged(d);
		d.status.text = '{"errors":[]}';
		expect(appRequest({ type: "logStatusErrors" }, d)).toBe(0);
		expect(logged(d)).toBe(once);
		d.status.text = JSON.stringify({ errors: ["mod gb-pane: again"] });
		expect(appRequest({ type: "logStatusErrors" }, d)).toBe(1);
		expect(logged(d)).toBe(`${once}2026-11-06T14:00:00.000Z status mod gb-pane: again\n`);
	});

	it("writes nothing while there's nothing to log", () => {
		const d = deps();
		expect(appRequest({ type: "logStatusErrors" }, d)).toBe(0);
		expect(existsSync(join(d.appHome, "gb-errors.log"))).toBe(false);
	});

	it("fails when the window can't report its status", () => {
		const d = deps();
		d.status.code = 1;
		expect(() => appRequest({ type: "logStatusErrors" }, d)).toThrow("no window");
	});

	it("starts a new file past 1 MiB, keeping one old one", () => {
		const d = deps();
		writeFileSync(join(d.appHome, "gb-errors.log"), "x".repeat(1 << 20));
		appRequest({ type: "logRenderFailure", mod: "gb-pane", message: "new" }, d);
		expect(logged(d)).toBe("2026-11-06T14:00:00.000Z render gb-pane: new\n");
		expect(readFileSync(join(d.appHome, "gb-errors.log.1"), "utf8")).toHaveLength(1 << 20);
	});
});

describe("appRequest", () => {
	it("refuses anything else", () => {
		expect(() => appRequest({ type: "launch" } as never, deps())).toThrow("unknown app request");
	});
});
