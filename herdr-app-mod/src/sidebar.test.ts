import { describe, expect, it } from "vitest";
import { groupPanes, machineIcon, rowText, type SidebarPane } from "./sidebar";

const CLAUDE = { key: "claude", name: "Claude Code", agent: true };
const ZSH = { key: "shell", name: "zsh", agent: false };

function pane(over: Partial<SidebarPane>): SidebarPane {
	return { pane: "p", terminal: "t1", cwd: "/v/agents/factory", status: "idle", title: "", program: CLAUDE, name: null, machine: null, ...over };
}

describe("groupPanes", () => {
	it("groups agents by agent dir, alphabetically, with shells and other folders under Other last", () => {
		const groups = groupPanes([
			pane({ pane: "a", cwd: "/v/agents/gx_branches" }),
			pane({ pane: "b", program: ZSH, status: null }),
			pane({ pane: "c" }),
			pane({ pane: "d", cwd: "/Users/me/projects/galaxy" }),
			pane({ pane: "e", cwd: "/home/u/vault/agents/factory/", machine: "box" }),
			pane({ pane: "f", terminal: null }),
		]);
		expect(groups.map((g) => [g.label, g.rows.map((r) => r.pane)])).toEqual([
			["factory", ["c", "e"]],
			["gx_branches", ["a"]],
			["Other", ["d", "b"]],
		]);
	});

	it("orders rows by status: needs you, done, working, idle, then no status", () => {
		const groups = groupPanes([
			pane({ pane: "idle", status: "idle" }),
			pane({ pane: "none", status: null }),
			pane({ pane: "working", status: "working" }),
			pane({ pane: "blocked", status: "blocked" }),
			pane({ pane: "done", status: "done" }),
			pane({ pane: "working2", status: "working" }),
		]);
		expect(groups[0]!.rows.map((r) => r.pane)).toEqual(["blocked", "done", "working", "working2", "idle", "none"]);
	});
});

describe("rowText", () => {
	it("is the launch name with the agent's title, its leading glyph dropped", () => {
		expect(rowText(pane({ name: "mod-test", title: "✳ Herdr sidebar mod" }))).toEqual({ name: "mod-test", detail: "Herdr sidebar mod" });
	});

	it("is the title alone without a launch name", () => {
		expect(rowText(pane({ title: "⠂ Herdr-core launch script dispatch" }))).toEqual({ name: "Herdr-core launch script dispatch", detail: null });
	});

	it("ignores titles that say nothing: paths, user@host, the program's name", () => {
		expect(rowText(pane({ name: "x", title: "~/projects" }))).toEqual({ name: "x", detail: null });
		expect(rowText(pane({ name: "x", title: "me@box: /v" }))).toEqual({ name: "x", detail: null });
		expect(rowText(pane({ title: "Claude Code" }))).toEqual({ name: "Claude Code", detail: null });
		expect(rowText(pane({ program: ZSH, title: "zsh" }))).toEqual({ name: "zsh", detail: null });
	});
});

describe("machineIcon", () => {
	const environments = [{ name: "Local", icon: "🏠" }, { name: "chickenstraws", host: "chickenstraws", icon: "🐔" }, { name: "Bare", host: "bare" }];

	it("is the icon of the environment for this machine or the host", () => {
		expect(machineIcon(null, environments)).toBe("🏠");
		expect(machineIcon("chickenstraws", environments)).toBe("🐔");
	});

	it("is null without an icon or environment", () => {
		expect(machineIcon("bare", environments)).toBeNull();
		expect(machineIcon("elsewhere", environments)).toBeNull();
		expect(machineIcon(null, [])).toBeNull();
	});
});
