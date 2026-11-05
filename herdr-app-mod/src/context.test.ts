import { describe, expect, it } from "vitest";
import { agentContext, folderName, machineOf, promptFiles, recordRefs, reroot } from "./context";

describe("folderName", () => {
	it("is the last folder of the path, ~ at home", () => {
		expect(folderName("/Users/me/vault/agents/factory", "/Users/me")).toBe("factory");
		expect(folderName("/Users/me/vault/agents/factory/", "/Users/me")).toBe("factory");
		expect(folderName("/Users/me", "/Users/me")).toBe("~");
		expect(folderName("/Users/me/", "/Users/me")).toBe("~");
	});

	it("is / at the root and empty without a folder", () => {
		expect(folderName("/", "/Users/me")).toBe("/");
		expect(folderName(null, "/Users/me")).toBe("");
	});
});

describe("recordRefs", () => {
	it("is the labelled records, newest first, ignoring other labels", () => {
		const labels = { "gb.record.galaxy/branches/old": "100", where: "x", "gb.record.foundry/issues/735": "300", "gb.record.galaxy/reviews/24635": "200", "herdr.tab": "t" };
		expect(recordRefs(labels)).toEqual(["foundry/issues/735", "galaxy/reviews/24635", "galaxy/branches/old"]);
	});

	it("puts values that aren't timestamps last and keeps the newest when capped", () => {
		expect(recordRefs({ "gb.record.a/b/old": "1", "gb.record.a/b/new": "2" }, 1)).toEqual(["a/b/new"]);
		expect(recordRefs({ "gb.record.a/b/bad": "soon", "gb.record.a/b/new": "2" })).toEqual(["a/b/new", "a/b/bad"]);
		expect(recordRefs(undefined)).toEqual([]);
	});
});

describe("agentContext", () => {
	it("finds the vault root and agent dir of a galaxy-brain agent folder", () => {
		expect(agentContext("/home/u/galaxy-brain/vault/agents/gx_branches")).toEqual({ vaultRoot: "/home/u/galaxy-brain/vault", agentDir: "gx_branches" });
		expect(agentContext("/home/u/galaxy-brain/vault/agents/factory/")).toEqual({ vaultRoot: "/home/u/galaxy-brain/vault", agentDir: "factory" });
	});

	it("skips shared dirs, nested folders and other places", () => {
		expect(agentContext("/v/agents/_shared")).toBeNull();
		expect(agentContext("/v/agents/factory/sessions")).toBeNull();
		expect(agentContext("/Users/me/projects/galaxy")).toBeNull();
		expect(agentContext(null)).toBeNull();
	});
});

describe("promptFiles", () => {
	it("is the folder's file, then the shared one beside it", () => {
		expect(promptFiles("/v/agents/factory/")).toEqual(["/v/agents/factory/SUGGESTED_PROMPTS.md", "/v/agents/_shared/SUGGESTED_PROMPTS.md"]);
	});
});

describe("reroot", () => {
	it("swaps one vault root for another, only at path boundaries", () => {
		expect(reroot("see /Users/me/vault/repositories/x and /Users/me/vault/", "/Users/me/vault", "/home/u/vault")).toBe(
			"see /home/u/vault/repositories/x and /home/u/vault/",
		);
		expect(reroot("/Users/me/vaulted", "/Users/me/vault", "/home/u/vault")).toBe("/Users/me/vaulted");
		expect(reroot("same", "/a", "/a")).toBe("same");
	});
});

describe("machineOf", () => {
	it("is the machine of the space holding the tab, null for this one", () => {
		const spaces = [
			{ machine: null, tabs: [{ id: "tb1" }] },
			{ machine: "box", tabs: [{ id: "box/tb2" }] },
		];
		expect(machineOf("box/tb2", spaces)).toBe("box");
		expect(machineOf("tb1", spaces)).toBeNull();
		expect(machineOf("gone", spaces)).toBeNull();
	});
});
