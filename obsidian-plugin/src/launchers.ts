// Agent launchers configured in vault/repositories/<repo>/<kind>/LAUNCHERS.md;
// format in vault/agents/_shared/LAUNCHERS.md.

import { DEFAULTS_REPO, parseRecordPath, RECORD_KINDS, type RecordKind } from "../../site/src/lib/records";

export type AgentKind = "claude" | "codex";

export interface Launcher {
	label: string;
	/** null for `_defaults` and agent launchers, which apply to every repo. */
	repo: string | null;
	/** null for agent launchers, which aren't tied to records. */
	kind: RecordKind | null;
	statuses: string[];
	agentDir: string;
	name: string;
	/** Profile preselected in the launch dialog; the first profile when unset. */
	profile?: string;
	prompt: string;
	/** Vault-relative executable and args, run directly instead of an agent; agentDir, name and prompt are empty. */
	command?: string;
}

export interface RecordRef {
	repo: string;
	kind: RecordKind;
	status: string;
	name: string;
	/** Vault-relative record directory. */
	dir: string;
}

const KEY_LINE = /^(status|agent_dir|name|profile|command):\s*(.*)$/;

const list = (value: string) =>
	value
		.split(",")
		.map((item) => item.trim())
		.filter(Boolean);

export type LauncherScope = Pick<Launcher, "repo" | "kind">;

/** Repo and kind a `repositories/<repo>/<kind>/LAUNCHERS.md` file configures. */
export function launcherScope(path: string): LauncherScope | null {
	const [root, repo, kind, file, ...rest] = path.split("/");
	if (root !== "repositories" || file !== "LAUNCHERS.md" || rest.length || !repo) return null;
	if (!(RECORD_KINDS as readonly string[]).includes(kind!)) return null;
	return { repo: repo === DEFAULTS_REPO ? null : repo, kind: kind as RecordKind };
}

/** Agent dir holding a file under `agents/<agent>/`; null for `_`-prefixed dirs. */
export function agentFromPath(path: string): string | null {
	const [root, agent, ...rest] = path.split("/");
	return root === "agents" && agent && !agent.startsWith("_") && rest.length ? agent : null;
}

export const agentLaunchersPath = (agent: string) => `agents/${agent}/LAUNCHERS.md`;

/** Launchers in `agents/<agent>/LAUNCHERS.md`; agent_dir defaults to that agent, command launchers are dropped. */
export function parseAgentLaunchers(markdown: string, agent: string): Launcher[] {
	return parseLaunchers(markdown, { repo: null, kind: null }, agent).filter((launcher) => !launcher.command);
}

/** Fills `{agent}` and `{file}` (absolute path of the open file) in an agent launcher's name or prompt. */
export function fillAgentTemplate(template: string, agent: string, file: string): string {
	const values: Record<string, string> = { agent, file };
	return template.replace(/\{(\w+)\}/g, (whole, key: string) => values[key] ?? whole);
}

export function parseLaunchers(markdown: string, scope: LauncherScope, defaultAgentDir?: string): Launcher[] {
	const launchers: Launcher[] = [];
	for (const section of markdown.split(/^## /m).slice(1)) {
		const [heading = "", ...lines] = section.split("\n");
		const fields: Record<string, string> = {};
		let i = 0;
		for (; i < lines.length; i++) {
			const match = KEY_LINE.exec(lines[i]!.trim());
			if (!match) break;
			fields[match[1]!] = match[2]!.trim();
		}
		const prompt = lines.slice(i).join("\n").trim();
		const label = heading.trim();
		if (!label) continue;
		if (fields.command) {
			launchers.push({ label, ...scope, statuses: list(fields.status ?? ""), agentDir: "", name: "", prompt: "", command: fields.command });
			continue;
		}
		const agentDir = fields.agent_dir || defaultAgentDir;
		if (!agentDir || !prompt) continue;
		launchers.push({
			label,
			...scope,
			statuses: list(fields.status ?? ""),
			agentDir,
			name: fields.name || agentDir,
			...(fields.profile ? { profile: fields.profile } : {}),
			prompt,
		});
	}
	return launchers;
}

/** The record holding a file, for any file inside a record directory. */
export function recordFromPath(path: string): RecordRef | null {
	const parsed = parseRecordPath(path);
	if (!parsed?.rest) return null;
	const { repo, kind, status, id: name } = parsed;
	return { repo, kind, status, name, dir: ["repositories", repo, kind, status, name].join("/") };
}

/** Status of a GitHub PR or issue with no record yet; launchers must list it explicitly. */
export const UNTRACKED = "untracked";

/** Stand-in record for an untracked PR (as a would-be review) or issue. */
export function untrackedRecord(repo: string, kind: "reviews" | "issues", number: number): RecordRef {
	return { repo, kind, status: UNTRACKED, name: String(number), dir: "" };
}

export function launchersFor(launchers: Launcher[], record: RecordRef): Launcher[] {
	return launchers.filter(
		(launcher) =>
			(launcher.repo ?? record.repo) === record.repo &&
			launcher.kind === record.kind &&
			(launcher.statuses.includes(record.status) || (launcher.statuses.length === 0 && record.status !== UNTRACKED)),
	);
}

export function fillTemplate(template: string, record: RecordRef, vaultRoot: string): string {
	const values: Record<string, string> = {
		repo: record.repo,
		kind: record.kind,
		status: record.status,
		name: record.name,
		record: record.dir ? `${vaultRoot}/${record.dir}` : "",
	};
	return template.replace(/\{(\w+)\}/g, (whole, key: string) => values[key] ?? whole);
}

/** A command launcher's argv: split on whitespace, then filled, so record paths with spaces stay one arg. */
export function commandArgs(launcher: Launcher, record: RecordRef, vaultRoot: string): string[] {
	const [executable = "", ...args] = (launcher.command ?? "").trim().split(/\s+/);
	return [`${vaultRoot}/${executable}`, ...args.map((arg) => fillTemplate(arg, record, vaultRoot))];
}
