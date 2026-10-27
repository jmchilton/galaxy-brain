import { describe, expect, it } from "vitest";
import type { Launcher } from "../../obsidian-plugin/src/launchers";
import { agentActions } from "./agent-actions";

const launcher = (fields: Partial<Launcher>): Launcher => ({
	label: "💬 Respond",
	repo: "galaxy",
	kind: "reviews",
	statuses: [],
	agentDir: "gx_reviews",
	name: "rr-{name}",
	prompt: "Respond to galaxyproject/{repo}#{name} ({kind}). Record: {record}",
	...fields,
});

describe("agentActions", () => {
	it("keeps the agent dir's launchers, fills repo and kind, and leaves record slots to Claude", () => {
		const actions = agentActions([launcher({ statuses: ["active"] }), launcher({ agentDir: "gx_issues" })], "gx_reviews", "/v");
		expect(actions).toHaveLength(1);
		expect(actions[0]!.label).toBe("💬 Respond");
		const { prompt } = actions[0]!;
		expect(prompt).toContain("galaxy reviews record (status active)");
		expect(prompt).toContain("Respond to galaxyproject/galaxy#{name} (reviews). Record: {record}");
		expect(prompt).toContain("/v/repositories/galaxy/reviews/<status>/<name>");
		expect(prompt).toMatch(/ask me which one/);
	});

	it("leaves {repo} for `_defaults` launchers and notes untracked items have no record dir", () => {
		const [action] = agentActions([launcher({ repo: null, statuses: ["untracked"] })], "gx_reviews", "/v");
		expect(action!.prompt).toContain("any repo's reviews record (status untracked)");
		expect(action!.prompt).toContain("galaxyproject/{repo}#{name}");
		expect(action!.prompt).toContain("{record} is empty for an untracked");
	});
});
