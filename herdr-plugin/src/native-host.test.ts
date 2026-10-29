import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { agentDirs, ghHeadBranch, handle, type HostDeps, lookup } from "./native-host";

const VAULT = fileURLToPath(new URL("../../vault", import.meta.url));
const PR = "https://github.com/galaxyproject/galaxy/pull/24413";

function deps() {
	const runs: string[][] = [];
	// gh head-branch lookups fail, as offline; everything else is a recorded launch.
	const run: HostDeps["run"] = (argv) => (argv[0] === "gh" ? { status: 1, stdout: "", stderr: "offline" } : (runs.push(argv), { status: 0, stdout: "Launched\n", stderr: "" }));
	const host: HostDeps = { vaultRoot: VAULT, run };
	return { runs, host };
}

describe("lookup", () => {
	it("finds a PR's review record with filled launchers and Obsidian link", () => {
		const result = lookup(VAULT, `${PR}/files`);
		expect(result.ref).toEqual({ repo: "galaxy", kind: "reviews", name: "24413" });
		const review = result.records.find((r) => r.kind === "reviews")!;
		expect(review.key).toBe(`repositories/galaxy/reviews/${review.status}/24413`);
		expect(review.obsidian).toMatch(/^obsidian:\/\/open\?path=.*24413%2Findex\.md$/);
		expect(review.launchers.length).toBeGreaterThan(0);
		expect(review.launchers.every((l) => !l.prompt.includes("{name}"))).toBe(true);
		expect(result.profiles.map((p) => p.name)).toContain("Sonnet (medium)");
	});

	it("finds the branch record for a fork branch page, with its launchers", () => {
		const result = lookup(VAULT, "https://github.com/jmchilton/galaxy/tree/ag_grid_36/client");
		expect(result.ref).toEqual({ repo: "galaxy", kind: "branches", name: "ag_grid_36" });
		expect(result.records.map((r) => r.key)).toEqual(["repositories/galaxy/branches/active/ag_grid_36"]);
		expect(result.records[0]!.launchers.length).toBeGreaterThan(0);
		expect(lookup(VAULT, "https://github.com/jmchilton/galaxy/tree/not_a_tracked_branch").records).toEqual([]);
	});

	it("finds my branch record on a PR opened from it", () => {
		const result = lookup(VAULT, "https://github.com/galaxyproject/galaxy/pull/24452", () => "selenium_upload_data_library");
		expect(result.records.map((r) => r.key)).toContain("repositories/galaxy/branches/active/selenium_upload_data_library");
	});

	it("reads the head branch from gh only for PRs from the fork", () => {
		const ref = { owner: "galaxyproject", repo: "galaxy", kind: "reviews" as const, number: 24452 };
		const reply = (login: string) => () => ({ status: 0, stdout: JSON.stringify({ headRefName: "b", headRepositoryOwner: { login } }), stderr: "" });
		expect(ghHeadBranch(reply("jmchilton"))(ref)).toBe("b");
		expect(ghHeadBranch(reply("someone"))(ref)).toBeUndefined();
		expect(ghHeadBranch(() => ({ status: 1, stdout: "", stderr: "no" }))(ref)).toBeUndefined();
	});

	it("gives untracked PRs a stand-in and unknown pages only profiles and agent dirs", () => {
		const untracked = lookup(VAULT, "https://github.com/galaxyproject/galaxy/pull/1").records;
		expect(untracked.map((r) => r.key)).toEqual(["untracked:galaxy/reviews/1"]);
		const other = lookup(VAULT, "https://github.com/someone/elsewhere/pull/1");
		expect(other.ref).toBeUndefined();
		expect(other.records).toEqual([]);
		expect(other.agentDirs).toContain("gx_reviews");
	});
});

describe("handle", () => {
	it("launches a record's launcher by reference with the profile's args and edited prompt", () => {
		const { runs, host } = deps();
		const review = lookup(VAULT, PR).records.find((r) => r.kind === "reviews")!;
		expect(handle({ type: "launch", url: PR, record: review.key, launcher: 0, profile: "Opus (high)", prompt: "edited" }, host)).toEqual({
			message: "Launched",
		});
		const [script, dir, kind, name, prompt, ...args] = runs[0]!;
		expect(script).toMatch(/agents\/_shared\/scripts\/launch_agent\.sh$/);
		expect([dir, kind, name, prompt, args]).toEqual([review.launchers[0]!.agentDir, "claude", review.launchers[0]!.name, "edited", ["--model", "opus", "--effort", "high"]]);
	});

	it("launches over ssh in a named environment, Local by default", () => {
		const { runs, host } = deps();
		expect(lookup(VAULT).environments[0]).toBe("Local");
		handle({ type: "newAgent", dir: "gx_reviews", environment: "chickenstraws" }, host);
		expect([runs[0]![0], runs[0]!.at(-2)]).toEqual(["ssh", "chickenstraws"]);
		expect(runs[0]!.at(-1)).toContain("'/home/ubuntu/projects/repositories/galaxy-brain/vault/agents/_shared/scripts/launch_agent.sh' 'gx_reviews'");
		handle({ type: "newAgent", dir: "gx_reviews" }, host);
		expect(runs[1]![0]).toMatch(/launch_agent\.sh$/);
		expect(() => handle({ type: "newAgent", dir: "gx_reviews", environment: "Nope" }, host)).toThrow(/unknown environment/);
		expect(runs).toHaveLength(2);
	});

	it("starts a blank agent in a known dir and rejects unknown dirs, profiles and URLs", () => {
		const { runs, host } = deps();
		handle({ type: "newAgent", dir: "gx_reviews" }, host);
		expect(runs[0]!.slice(1)).toEqual(["gx_reviews", "claude", "gx_reviews", ""]);
		expect(() => handle({ type: "newAgent", dir: "../etc" }, host)).toThrow(/unknown agent dir/);
		expect(() => handle({ type: "newAgent", dir: "gx_reviews", profile: "Nope" }, host)).toThrow(/unknown profile/);
		expect(() => handle({ type: "open", url: "file:///etc/passwd" }, host)).toThrow(/refusing/);
		expect(runs).toHaveLength(1);
	});

	it("lists agent dirs with a CLAUDE.md", () => {
		expect(agentDirs(VAULT)).toEqual(expect.arrayContaining(["gx_branches", "gx_reviews", "wf_foundry"]));
		expect(agentDirs(VAULT)).not.toContain("_shared");
	});
});
