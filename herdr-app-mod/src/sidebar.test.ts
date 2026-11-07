import { describe, expect, it } from "vitest";
import { closePageCommand, groupPanes, machineIcon, pagePanes, rowText, type SidebarPane } from "./sidebar";

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

describe("pagePanes", () => {
	const tabs = [{ id: "t1", name: "📓 galaxy/reviews/7" }, { id: "t2", name: "🧠 Agents" }, { id: "t3", name: "shell" }];

	it("lists mod panes by their tab's name, sorted", () => {
		const pages = pagePanes(
			[
				{ pane: "a", terminal: null, mod: "gb-record", tab: "t1" },
				{ pane: "b", terminal: null, mod: "gb-board", tab: "t2" },
				{ pane: "c", terminal: "t9", tab: "t3" },
				{ pane: "d", terminal: null, mod: "files", tab: "t3" },
			],
			tabs,
		);
		expect(pages).toEqual([
			{ pane: "a", tab: "t1", name: "📓 galaxy/reviews/7", status: null },
			{ pane: "b", tab: "t2", name: "🧠 Agents", status: null },
		]);
	});

	it("falls back to the mod's name without a named tab", () => {
		expect(pagePanes([{ pane: "a", terminal: null, mod: "gb-board", tab: "gone" }], tabs)[0]!.name).toBe("gb-board");
	});
});

describe("closePageCommand", () => {
	const page = { pane: "p1", tab: "tab1" };
	const alone = [{ id: "sp1", tabs: [{ id: "tab1", panes: 1 }] }];
	const closesPane = ["pane.close", { pane: "p1" }];
	const closesSpace = ["space.close", { id: "sp1", confirmed: true }];
	const term = (over: object) => ({ address: "t1", state: "live", labels: {}, ...over });

	it("closes just the pane beside another tab or pane", () => {
		expect(closePageCommand(page, [{ id: "sp1", tabs: [{ id: "tab1", panes: 1 }, { id: "tab2", panes: 1 }] }], [])).toEqual(closesPane);
		expect(closePageCommand(page, [{ id: "sp1", tabs: [{ id: "tab1", panes: 2 }] }], [])).toEqual(closesPane);
	});

	it("closes a space holding only the page, unasked, past finished terminals", () => {
		const finished = term({ state: "finished", labels: { "herdr.space": "sp1" } });
		expect(closePageCommand(page, alone, [finished])).toEqual(closesSpace);
	});

	it("ignores live terminals of other spaces and other apps", () => {
		expect(closePageCommand(page, alone, [term({ labels: { "herdr.space": "sp2" } }), term({ address: "t2" })])).toEqual(closesSpace);
	});

	it("leaves the app's prompt when a live terminal has no pane there", () => {
		expect(closePageCommand(page, alone, [term({ labels: { "herdr.space": "sp1" } })])).toEqual(closesPane);
	});

	it("counts a live sub-agent by its finished parent's space", () => {
		const parent = term({ address: "t1", state: "finished", labels: { "herdr.space": "sp1" } });
		const child = term({ address: "t2", parent: "t1" });
		expect(closePageCommand(page, alone, [parent, child])).toEqual(closesPane);
	});

	it("counts a live sub-agent whose parent is gone", () => {
		expect(closePageCommand(page, alone, [term({ address: "t2", parent: "t9" })])).toEqual(closesPane);
	});

	it("matches a remote space's prefixed id to its terminals' local labels", () => {
		const remote = [{ id: "box/sp1", tabs: [{ id: "box/tab1", panes: 1 }] }];
		const remotePage = { pane: "box/p1", tab: "box/tab1" };
		expect(closePageCommand(remotePage, remote, [term({ address: "box/t1", labels: { "herdr.space": "sp1" } })])).toEqual(["pane.close", { pane: "box/p1" }]);
		expect(closePageCommand(remotePage, remote, [])).toEqual(["space.close", { id: "box/sp1", confirmed: true }]);
	});

	it("follows a remote sub-agent's parent on its own machine", () => {
		const remote = [{ id: "box/sp1", tabs: [{ id: "box/tab1", panes: 1 }] }];
		const remotePage = { pane: "box/p1", tab: "box/tab1" };
		const here = term({ address: "t1", state: "finished", labels: { "herdr.space": "other" } });
		const parent = term({ address: "box/t1", state: "finished", labels: { "herdr.space": "sp1" } });
		const child = term({ address: "box/t2", parent: "t1" });
		expect(closePageCommand(remotePage, remote, [here, parent, child])).toEqual(["pane.close", { pane: "box/p1" }]);
	});

	it("closes just the pane when its space isn't known", () => {
		expect(closePageCommand(page, [], [])).toEqual(closesPane);
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
