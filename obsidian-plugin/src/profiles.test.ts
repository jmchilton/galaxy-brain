import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { parseLaunchers } from "./launchers";
import { defaultProfile, parseProfiles, profileArgs, profileFlags } from "./profiles";

describe("parseProfiles", () => {
	it("reads profiles, skipping unnamed or unknown agents", () => {
		const data = parse(`profiles:
  - name: Opus
    agent: claude
    model: opus
    effort: xhigh
    args: [--verbose]
  - name: Bad
    agent: gemini
  - agent: codex
  - name: Codex
    agent: codex
`);
		expect(parseProfiles(data)).toEqual([
			{ name: "Opus", agent: "claude", model: "opus", effort: "xhigh", args: ["--verbose"] },
			{ name: "Codex", agent: "codex", args: [] },
		]);
	});

	it("returns nothing for a missing or malformed file", () => {
		expect(parseProfiles(null)).toEqual([]);
		expect(parseProfiles({ profiles: "nope" })).toEqual([]);
	});

	it("parses the vault profiles", () => {
		const yaml = readFileSync(new URL("../../vault/agents/_shared/AGENT_PROFILES.yml", import.meta.url), "utf8");
		const data = parse(yaml);
		const profiles = parseProfiles(data);
		expect(profiles).toHaveLength(data.profiles.length);
		expect(new Set(profiles.map((p) => p.agent))).toEqual(new Set(["claude", "codex"]));
	});
});

describe("profileArgs", () => {
	it("maps model and effort to each agent's flags, then extra args", () => {
		expect(profileArgs({ name: "a", agent: "claude", model: "opus", effort: "max", args: ["--x"] })).toEqual([
			"--model", "opus", "--effort", "max", "--x",
		]);
		expect(profileArgs({ name: "b", agent: "codex", model: "gpt", effort: "high", args: [] })).toEqual([
			"-m", "gpt", "-c", 'model_reasoning_effort="high"',
		]);
		expect(profileArgs({ name: "c", agent: "claude", args: [] })).toEqual([]);
	});
});

describe("profileFlags", () => {
	it("picks back the model and effort flags profileArgs writes", () => {
		for (const profile of [
			{ name: "a", agent: "claude" as const, model: "opus", effort: "max", args: [] },
			{ name: "b", agent: "codex" as const, model: "gpt", effort: "high", args: [] },
		]) {
			expect(profileFlags(profile.agent, ["/bin/x", ...profileArgs(profile), "the prompt"])).toEqual(profileArgs(profile));
		}
	});

	it("leaves out resume ids, other flags and prompts", () => {
		expect(profileFlags("claude", ["claude", "--resume", "d5c3", "--model", "opus", "--verbose", "go"])).toEqual(["--model", "opus"]);
		expect(profileFlags("codex", ["codex", "--no-daemon", "--model", "gpt", "-c", "x=1", "go"])).toEqual(["--model", "gpt", "-c", "x=1"]);
		expect(profileFlags("claude", ["claude", "--model"])).toEqual([]);
	});
});

describe("defaultProfile", () => {
	const profiles = parseProfiles({ profiles: [{ name: "A", agent: "claude" }, { name: "B", agent: "codex" }] });
	const [plain, named] = parseLaunchers("## X\nagent_dir: d\n\nGo\n## Y\nagent_dir: d\nprofile: B\n\nGo", { repo: "r", kind: "issues" });

	it("uses the launcher's profile, else the first", () => {
		expect(defaultProfile(profiles, named!).name).toBe("B");
		expect(defaultProfile(profiles, plain!).name).toBe("A");
		expect(defaultProfile(profiles, { ...named!, profile: "Missing" }).name).toBe("A");
	});
});
