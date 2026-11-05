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

	/** Runs a copy of the script under a stub agents tree; stub herdr-app, hc and ssh log their argv. */
	function launch(mode: string, args: string[]): { stdout: string; calls: string[][] } {
		const root = mkdtempSync(join(tmpdir(), "launch-agent-"));
		const bin = join(root, "home/.local/bin");
		mkdirSync(bin, { recursive: true });
		mkdirSync(join(root, "agents/_shared/scripts"), { recursive: true });
		mkdirSync(join(root, "agents/gx_branches"));
		copyFileSync(new URL(`../../vault/${SCRIPT}`, import.meta.url), join(root, SCRIPT));
		writeFileSync(join(root, "agents/_shared/DISPATCH_CONFIG.yml"), `herdr: ${mode}\n`);
		const log = join(root, "calls.jsonl");
		for (const [cmd, reply] of [
			["herdr-app", `if [ "$1" = do ]; then echo '{"pane":"p1","terminal":"t7"}'; fi`],
			["hc", ""],
			["ssh", ""],
		]) {
			const stub = `#!/bin/sh\njq -nc '$ARGS.positional' --args -- ${cmd} "$@" >> '${log}'\n${reply}\n`;
			writeFileSync(join(bin, cmd), stub, { mode: 0o755 });
		}
		const stdout = execFileSync(join(root, SCRIPT), args, { encoding: "utf8", env: { ...process.env, HOME: join(root, "home"), GB_HERDR: "" } });
		const calls = existsSync(log) ? readFileSync(log, "utf8").trim().split("\n").map((line) => JSON.parse(line)) : [];
		return { stdout, calls: calls.map((call) => call.map((arg: string) => arg.split(root).join("<root>"))) };
	}

	it("app: creates a space for the agent dir with the agent and its task", () => {
		const { stdout, calls } = launch("app", ["gx_branches", "claude", "br-note", prompt, "--model", "opus"]);
		const [, , command, json] = calls.find((call) => call[1] === "do")!;
		expect(command).toBe("space.new");
		expect(JSON.parse(json)).toEqual({
			name: "gx_branches",
			tab: "br-note",
			folder: "<root>/agents/gx_branches",
			argv: ["claude", "--model", "opus"],
			task: prompt,
			machine: "",
		});
		expect(stdout).toContain("terminal t7");
	});

	it("app: omits the task for an empty prompt", () => {
		const { calls } = launch("app", ["gx_branches", "codex", "x", ""]);
		expect(JSON.parse(calls.find((call) => call[1] === "do")![3])).not.toHaveProperty("task");
	});

	it("app: pulls the remote vault through hc, then creates the space on that machine", () => {
		const { calls } = launch("app", ["--host", "box", "--vault", "/v", "gx_branches", "claude", "br-note", prompt]);
		expect(calls).toContainEqual(["hc", "exec", "--on", "box", "git", "-C", "/v", "pull", "-q", "--no-rebase", "--no-edit"]);
		const space = JSON.parse(calls.find((call) => call[1] === "do")![3]);
		expect(space).toMatchObject({ machine: "box", folder: "/v/agents/gx_branches", task: prompt });
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
