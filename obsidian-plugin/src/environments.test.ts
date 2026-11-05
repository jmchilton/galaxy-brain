import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { defaultEnvironment, LOCAL_ENVIRONMENT, launchArgv, parseEnvironments } from "./environments";

const SCRIPT = "agents/_shared/scripts/launch_agent.sh";

describe("parseEnvironments", () => {
	it("reads environments, skipping unnamed ones and hosts without a safe host or absolute vault", () => {
		const data = parse(`environments:
  - name: Local
  - name: Box
    host: box
    vault: /home/me/galaxy-brain/vault
  - host: nameless
    vault: /v
  - name: No vault
    host: box
  - name: Relative
    host: box
    vault: galaxy-brain/vault
  - name: Option
    host: -oProxyCommand=x
    vault: /v
`);
		expect(parseEnvironments(data)).toEqual([{ name: "Local" }, { name: "Box", host: "box", vault: "/home/me/galaxy-brain/vault" }]);
	});

	it("returns nothing for a missing or malformed file", () => {
		expect(parseEnvironments(null)).toEqual([]);
		expect(parseEnvironments({ environments: "nope" })).toEqual([]);
	});

	it("parses the vault environments, Local first", () => {
		const yaml = readFileSync(new URL("../../vault/agents/_shared/ENVIRONMENTS.yml", import.meta.url), "utf8");
		const data = parse(yaml);
		const environments = parseEnvironments(data);
		expect(environments).toHaveLength(data.environments.length);
		expect(environments[0]).toEqual(LOCAL_ENVIRONMENT);
	});
});

describe("defaultEnvironment", () => {
	it("is the first, else Local", () => {
		expect(defaultEnvironment([{ name: "Box", host: "box", vault: "/v" }]).name).toBe("Box");
		expect(defaultEnvironment([])).toEqual(LOCAL_ENVIRONMENT);
	});
});

describe("launchArgv", () => {
	const args = ["gx_branches", "claude", "br-note", "Read /Users/me/vault/agents/gx_branches/TICK.md", "--model", "opus"];

	it("runs the local script directly", () => {
		expect(launchArgv(LOCAL_ENVIRONMENT, "/Users/me/vault", args)).toEqual([`/Users/me/vault/${SCRIPT}`, ...args]);
	});

	it("passes a remote host and vault to the local script, with vault paths re-rooted", () => {
		const box = { name: "Box", host: "box", vault: "/home/me/vault" };
		expect(launchArgv(box, "/Users/me/vault", args)).toEqual([
			`/Users/me/vault/${SCRIPT}`,
			"--host",
			"box",
			"--vault",
			"/home/me/vault",
			"gx_branches",
			"claude",
			"br-note",
			"Read /home/me/vault/agents/gx_branches/TICK.md",
			"--model",
			"opus",
		]);
	});
});

describe("launch_agent.sh", () => {
	const prompt = `Read it's "x" '''\nthen $(echo no) \`x\` $HOME\n`;

	/** Runs a copy of the script under a stub agents tree; stub herdr-app (unless absent), hc and ssh log their argv. */
	function launch(mode: string, args: string[], { herdrApp = true } = {}): { stdout: string; calls: string[][] } {
		const root = mkdtempSync(join(tmpdir(), "launch-agent-"));
		const bin = join(root, "home/.local/bin");
		mkdirSync(bin, { recursive: true });
		mkdirSync(join(root, "agents/_shared/scripts"), { recursive: true });
		mkdirSync(join(root, "agents/gx_branches"));
		copyFileSync(new URL(`../../vault/${SCRIPT}`, import.meta.url), join(root, SCRIPT));
		writeFileSync(join(root, "agents/_shared/DISPATCH_CONFIG.yml"), `herdr: ${mode}\n`);
		const log = join(root, "calls.jsonl");
		const stubs: [string, string][] = [
			["hc", `case $1 in run) echo '{"address":"t7"}' ;; ls) echo '{"terminals":[{"name":"br-note"},{}]}' ;; esac`],
			["ssh", ""],
		];
		if (herdrApp) stubs.push(["herdr-app", ""]);
		for (const [cmd, reply] of stubs) {
			const stub = `#!/bin/sh\njq -nc '$ARGS.positional' --args -- ${cmd} "$@" >> '${log}'\n${reply}\n`;
			writeFileSync(join(bin, cmd), stub, { mode: 0o755 });
		}
		const env = { ...process.env, HOME: join(root, "home"), PATH: "/usr/bin:/bin", GB_HERDR: "" };
		const stdout = execFileSync(join(root, SCRIPT), args, { encoding: "utf8", env });
		const calls = existsSync(log) ? readFileSync(log, "utf8").trim().split("\n").map((line) => JSON.parse(line)) : [];
		return { stdout, calls: calls.map((call) => call.map((arg: string) => arg.split(root).join("<root>"))) };
	}

	const hcRun = (calls: string[][]) => calls.find((call) => call[0] === "hc" && call[1] === "run")!;
	const label = (run: string[], key: string) => run.find((arg) => arg.startsWith(`herdr.${key}=`))!.slice(`herdr.${key}=`.length);

	it("app: runs the agent with its prompt in a new space via hc, then names the space and tab", () => {
		const { stdout, calls } = launch("app", ["gx_branches", "claude", "br-note", prompt, "--model", "opus"]);
		const run = hcRun(calls);
		const space = label(run, "space");
		const tab = label(run, "tab");
		expect(space).toMatch(/^sp[0-9a-f]{32}$/);
		expect(tab).toMatch(/^tb[0-9a-f]{32}$/);
		expect(run).toEqual(["hc", "run", "--bg", "--json", "--no-parent", "--name", "br-note-2", "--label", `herdr.space=${space}`, "--label", `herdr.tab=${tab}`,
			"--cwd", "<root>/agents/gx_branches", "--", "claude", "--model", "opus", prompt]);
		expect(calls).toContainEqual(["herdr-app", "do", "space.rename", "--id", space, "--name", "gx_branches"]);
		expect(calls).toContainEqual(["herdr-app", "do", "tab.rename", "--id", tab, "--name", "br-note-2"]);
		expect(stdout).toContain("terminal t7");
	});

	it("app: passes no prompt argument for an empty prompt", () => {
		const run = hcRun(launch("app", ["gx_branches", "codex", "x", ""]).calls);
		expect(run.slice(run.indexOf("--"))).toEqual(["--", "codex"]);
	});

	it("app: still launches, unnamed, without herdr-app", () => {
		const { stdout, calls } = launch("app", ["gx_branches", "claude", "br-note", prompt], { herdrApp: false });
		expect(hcRun(calls)).toBeDefined();
		expect(calls.some((call) => call[0] === "herdr-app")).toBe(false);
		expect(stdout).toContain("terminal t7");
	});

	it("app: pulls the remote vault through hc, then runs on that machine with machine-prefixed renames", () => {
		const { calls } = launch("app", ["--host", "box", "--vault", "/v", "gx_branches", "claude", "br-note", prompt]);
		expect(calls).toContainEqual(["hc", "exec", "--on", "box", "git", "-C", "/v", "pull", "-q", "--no-rebase", "--no-edit"]);
		const run = hcRun(calls);
		expect(run.slice(run.indexOf("--cwd"), run.indexOf("--"))).toEqual(["--cwd", "/v/agents/gx_branches", "--on", "box"]);
		expect(calls).toContainEqual(["herdr-app", "do", "space.rename", "--id", `box/${label(run, "space")}`, "--name", "gx_branches"]);
		expect(calls.some((call) => call[0] === "ssh")).toBe(false);
	});

	it("tui: pulls then runs the remote vault's script over ssh in tui mode", () => {
		const { calls } = launch("tui", ["--host", "box", "--vault", "/home/me/vault", "gx_branches", "claude", "br-note", prompt, "--model", "opus"]);
		const [ssh, ...rest] = calls.find((call) => call[0] === "ssh")!;
		expect(ssh).toBe("ssh");
		expect(rest.slice(0, -2)).toEqual(["-o", "BatchMode=yes", "-o", "ConnectTimeout=10"]);
		expect(rest.at(-2)).toBe("box");
		const command = rest.at(-1)!;
		expect(command).toMatch(/^git -C '\/home\/me\/vault' pull /);
		// The remote command, run with the script and git stubbed, sees GB_HERDR=tui and the args unchanged.
		const stub = `git() { :; }; launch() { printf '%s\\n' "$GB_HERDR" "$@"; }; `;
		const run = command.replace(`'/home/me/vault/${SCRIPT}'`, "launch");
		expect(execFileSync("sh", ["-c", stub + run], { encoding: "utf8" })).toBe(
			["tui", "gx_branches", "claude", "br-note", prompt, "--model", "opus", ""].join("\n"),
		);
	});
});
