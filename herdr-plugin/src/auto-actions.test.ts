import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";
import { type AutoDeps, autoActionsPanel, editAutoAction, parseAutoActions, startAutoAction } from "./auto-actions";

const RECORD = "repositories/galaxy/issues_incubator/incubating/foo";
const CONFIG = "agents/_shared/DISPATCH_CONFIG.yml";

const config = (action: string) => `# How agents start.\n\nherdr: app\n\nauto_actions:\n  prepare_to_file:\n${action}`;
const ON = config("    enabled: true\n    launcher: Prepare to file\n");

function setup(dispatch = ON, extra: Record<string, string> = {}) {
	const vaultRoot = mkdtempSync(join(tmpdir(), "gb-auto-vault-"));
	const files: Record<string, string> = {
		"agents/gx_issues/AGENTS.md": "",
		"agents/_shared/AGENT_PROFILES.yml": "profiles:\n  - name: Opus (high)\n    agent: claude\n    model: opus\n    effort: high\n  - name: Opus (low)\n    agent: claude\n    model: opus\n    effort: low\n",
		"agents/_shared/ENVIRONMENTS.yml": "environments:\n  - name: Local\n    icon: 🏠\n  - name: box\n    host: box\n    vault: /remote/vault\n    icon: 📦\n",
		[CONFIG]: dispatch,
		"repositories/galaxy/issues_incubator/LAUNCHERS.md": "## ❯ Prepare to file\nstatus: incubating\nagent_dir: gx_issues\nname: ptf-{name}\nprofile: Opus (low)\n\nPrepare to file issue at {record} with ./PREPARE_TO_FILE.md\n",
		[`${RECORD}/index.md`]: "# Foo\n\nA bug.\n",
		[`${RECORD}/raw.md`]: "raw",
		"repositories/galaxy/issues_incubator/rejected/bar/index.md": "# Bar\n",
		...extra,
	};
	for (const [path, text] of Object.entries(files)) {
		mkdirSync(dirname(join(vaultRoot, path)), { recursive: true });
		writeFileSync(join(vaultRoot, path), text);
	}
	const runs: string[][] = [];
	const queries: string[][] = [];
	const git = { status: "", unpushed: "" };
	const deps: AutoDeps = {
		vaultRoot,
		hostname: "laptop",
		run: (argv) => (runs.push(argv), { status: 0, stdout: "Launched\n", stderr: "" }),
		query: (argv) => (queries.push(argv), { status: 0, stdout: argv.includes("status") ? git.status : git.unpushed, stderr: "" }),
	};
	const launches = () => runs;
	return { vaultRoot, deps, runs, queries, launches, git };
}

describe("parseAutoActions", () => {
	it("reads each action; only `enabled: true` is on", () => {
		const data = { auto_actions: { a: { enabled: true, launcher: "L", environment: "box", profile: "P" }, b: { enabled: "yes", launcher: "L" }, c: { enabled: true } } };
		expect(parseAutoActions(data)).toEqual([
			{ name: "a", enabled: true, launcher: "L", environment: "box", profile: "P" },
			{ name: "b", enabled: false, launcher: "L" },
		]);
		expect(parseAutoActions({ herdr: "app" })).toEqual([]);
	});
});

describe("startAutoAction", () => {
	it("starts nothing when the action is off", () => {
		const { deps, runs } = setup(config("    enabled: false\n    launcher: Prepare to file\n"));
		expect(startAutoAction(deps, "prepare_to_file", RECORD)).toEqual({ launched: false, message: "prepare_to_file is off in DISPATCH_CONFIG.yml" });
		expect(runs).toEqual([]);
	});

	it("runs the launcher here with its own profile, requiring the record", () => {
		const { deps, launches, queries, vaultRoot } = setup();
		expect(startAutoAction(deps, "prepare_to_file", RECORD)).toEqual({ launched: true, message: "Launched" });
		expect(launches()).toEqual([
			[`${vaultRoot}/agents/_shared/scripts/launch_agent.sh`, "--require", RECORD, "gx_issues", "claude", "ptf-foo", `Prepare to file issue at ${vaultRoot}/${RECORD} with ./PREPARE_TO_FILE.md`, "--model", "opus", "--effort", "low"],
		]);
		expect(queries).toEqual([]);
	});

	it("takes the record as a directory or a file in it, absolute or repo-relative", () => {
		const { deps, launches, vaultRoot } = setup();
		startAutoAction(deps, "prepare_to_file", `${vaultRoot}/${RECORD}/raw.md`);
		startAutoAction(deps, "prepare_to_file", `vault/${RECORD}/`);
		expect(launches().map((argv) => argv[2])).toEqual([RECORD, RECORD]);
	});

	it("uses the configured profile over the launcher's", () => {
		const { deps, launches } = setup(config("    enabled: true\n    launcher: Prepare to file\n    profile: Opus (high)\n"));
		startAutoAction(deps, "prepare_to_file", RECORD);
		expect(launches()[0]!.slice(-4)).toEqual(["--model", "opus", "--effort", "high"]);
	});

	it("refuses unknown actions, profiles, environments and launchers", () => {
		expect(() => startAutoAction(setup().deps, "nope", RECORD)).toThrow(/unknown auto action: nope/);
		expect(() => startAutoAction(setup(config("    enabled: true\n    launcher: Prepare to file\n    profile: Fable\n")).deps, "prepare_to_file", RECORD)).toThrow(/unknown profile: Fable/);
		expect(() => startAutoAction(setup(config("    enabled: true\n    launcher: Prepare to file\n    environment: moon\n")).deps, "prepare_to_file", RECORD)).toThrow(/unknown environment: moon/);
		expect(() => startAutoAction(setup().deps, "prepare_to_file", "repositories/galaxy/issues_incubator/rejected/bar")).toThrow(/no launcher "Prepare to file" for repositories\/galaxy\/issues_incubator\/rejected\/bar/);
		expect(() => startAutoAction(setup().deps, "prepare_to_file", "repositories/galaxy/issues_incubator/incubating/gone")).toThrow(/no record at repositories\/galaxy\/issues_incubator\/incubating\/gone/);
	});

	it("runs here when the environment is this machine", () => {
		const { deps, launches, queries } = setup(config("    enabled: true\n    launcher: Prepare to file\n    environment: box\n"));
		startAutoAction({ ...deps, hostname: "box.example.org" }, "prepare_to_file", RECORD);
		expect(launches()[0]).not.toContain("--host");
		expect(queries).toEqual([]);
	});

	it("needs the record pushed for another machine, then launches there with paths re-rooted", () => {
		const { deps, launches, queries, git, vaultRoot } = setup(config("    enabled: true\n    launcher: Prepare to file\n    environment: box\n"));
		git.status = `?? ${RECORD}/raw.md\n`;
		expect(() => startAutoAction(deps, "prepare_to_file", RECORD)).toThrow(`commit and push ${RECORD} first: box pulls before it starts the agent`);
		expect(launches()).toEqual([]);
		expect(queries).toEqual([
			["git", "-C", vaultRoot, "status", "--porcelain", "--", RECORD],
			["git", "-C", vaultRoot, "log", "--oneline", "@{u}..", "--", RECORD],
		]);
		git.status = "";
		git.unpushed = "abc123 queue foo\n";
		expect(() => startAutoAction(deps, "prepare_to_file", RECORD)).toThrow(/commit and push/);
		git.unpushed = "";
		startAutoAction(deps, "prepare_to_file", RECORD);
		const argv = launches()[0]!;
		expect(argv.slice(1, 7)).toEqual(["--host", "box", "--vault", "/remote/vault", "--require", RECORD]);
		expect(argv).toContain(`Prepare to file issue at /remote/vault/${RECORD} with ./PREPARE_TO_FILE.md`);
	});
});

describe("the control panel", () => {
	it("lists each action with the launcher's profile and the choices", () => {
		const { vaultRoot } = setup();
		expect(autoActionsPanel(vaultRoot)).toEqual({
			actions: [{ name: "prepare_to_file", enabled: true, launcher: "Prepare to file", launcherLabel: "❯ Prepare to file", launcherProfile: "Opus (low)", environment: "Local" }],
			profiles: ["Opus (high)", "Opus (low)"],
			environments: [
				{ name: "Local", icon: "🏠" },
				{ name: "box", icon: "📦" },
			],
		});
	});

	it("flags a launcher that doesn't exist", () => {
		const { vaultRoot } = setup(config("    enabled: true\n    launcher: Nope\n"));
		expect(autoActionsPanel(vaultRoot).actions[0]).toMatchObject({ name: "prepare_to_file", error: 'no launcher "Nope"' });
	});

	it("edits one action and keeps the file's comments", () => {
		const { vaultRoot } = setup();
		const choices = autoActionsPanel(vaultRoot);
		const off = editAutoAction(ON, { name: "prepare_to_file", enabled: false }, choices)!;
		expect(off).toContain("# How agents start.");
		expect(off).toContain("herdr: app");
		expect(parseAutoActions(parseYaml(off))[0]).toMatchObject({ enabled: false, launcher: "Prepare to file" });
		const moved = editAutoAction(off, { name: "prepare_to_file", environment: "box", profile: "Opus (high)" }, choices)!;
		expect(parseAutoActions(parseYaml(moved))[0]).toEqual({ name: "prepare_to_file", enabled: false, launcher: "Prepare to file", environment: "box", profile: "Opus (high)" });
		const reset = editAutoAction(moved, { name: "prepare_to_file", profile: null }, choices)!;
		expect(parseAutoActions(parseYaml(reset))[0]).not.toHaveProperty("profile");
	});

	it("refuses unknown names and missing actions", () => {
		const { vaultRoot } = setup();
		const choices = autoActionsPanel(vaultRoot);
		expect(() => editAutoAction(ON, { name: "prepare_to_file", environment: "moon" }, choices)).toThrow(/unknown environment: moon/);
		expect(() => editAutoAction(ON, { name: "prepare_to_file", profile: "Fable" }, choices)).toThrow(/unknown profile: Fable/);
		expect(editAutoAction(ON, { name: "nope", enabled: true }, choices)).toBeUndefined();
	});
});
