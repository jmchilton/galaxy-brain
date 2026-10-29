import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { defaultEnvironment, LOCAL_ENVIRONMENT, launchArgv, parseEnvironments, shellQuote } from "./environments";

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

describe("shellQuote", () => {
	it("survives a POSIX shell unchanged", () => {
		for (const value of ["plain", "", "it's", "a\nb", "$(rm -rf /) `x` $HOME", "'''", "-n"]) {
			expect(execFileSync("sh", ["-c", `printf %s ${shellQuote(value)}`], { encoding: "utf8" })).toBe(value);
		}
	});
});

describe("launchArgv", () => {
	const args = ["gx_branches", "claude", "br-note", "Read /Users/me/vault/agents/gx_branches/TICK.md", "--model", "opus"];

	it("runs the local script directly", () => {
		expect(launchArgv(LOCAL_ENVIRONMENT, "/Users/me/vault", args)).toEqual([`/Users/me/vault/${SCRIPT}`, ...args]);
	});

	it("pulls then runs the remote vault's script over ssh, with vault paths re-rooted", () => {
		const box = { name: "Box", host: "box", vault: "/home/me/vault" };
		const [ssh, ...rest] = launchArgv(box, "/Users/me/vault", args);
		expect(ssh).toBe("ssh");
		expect(rest.slice(0, -2)).toEqual(["-o", "BatchMode=yes", "-o", "ConnectTimeout=10"]);
		expect(rest.at(-2)).toBe("box");
		const command = rest.at(-1)!;
		expect(command).toMatch(/^git -C '\/home\/me\/vault' pull /);
		expect(command).not.toContain("/Users/me");
		// The remote command, run with the script and git stubbed, sees the re-rooted args.
		const stub = `git() { :; }; launch() { printf '%s\\n' "$@"; }; `;
		const run = command.replace(`'/home/me/vault/${SCRIPT}'`, "launch");
		expect(execFileSync("sh", ["-c", stub + run], { encoding: "utf8" })).toBe(
			["gx_branches", "claude", "br-note", "Read /home/me/vault/agents/gx_branches/TICK.md", "--model", "opus", ""].join("\n"),
		);
	});
});
