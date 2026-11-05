import { describe, expect, it, vi } from "vitest";

vi.mock("obsidian", () => ({
	debounce: (fn: unknown) => fn,
	ItemView: class {},
	Menu: class {},
	Notice: class {},
	parseYaml: () => undefined,
	Platform: {},
	setIcon: () => {},
	stringifyYaml: () => "",
	TFolder: class {},
}));

const { AgentsView } = await import("./agents-view");

describe("AgentsView", () => {
	// Obsidian starts and stops views through these; they aren't in its public typings.
	it("doesn't shadow the View lifecycle", () => {
		const own = Object.getOwnPropertyNames(AgentsView.prototype);
		for (const name of ["open", "close", "load", "unload"]) expect(own).not.toContain(name);
	});
});
