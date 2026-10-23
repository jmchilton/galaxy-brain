// Agent launchers configured in vault/repositories/<repo>/<kind>/LAUNCHERS.md;
// format in vault/agents/_shared/LAUNCHERS.md.

import { DEFAULTS_REPO, parseRecordPath, RECORD_KINDS, type RecordKind } from "../../site/src/lib/records";

export type AgentKind = "claude" | "codex";

export interface Launcher {
	label: string;
	/** null for `_defaults` launchers, which apply to every repo. */
	repo: string | null;
	kind: RecordKind;
	statuses: string[];
	agentDir: string;
	name: string;
	/** Profile preselected in the launch dialog; the first profile when unset. */
	profile?: string;
	prompt: string;
}

export interface RecordRef {
	repo: string;
	kind: RecordKind;
	status: string;
	name: string;
	/** Vault-relative record directory. */
	dir: string;
}

const KEY_LINE = /^(status|agent_dir|name|profile):\s*(.*)$/;

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

export function parseLaunchers(markdown: string, scope: LauncherScope): Launcher[] {
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
		if (!label || !fields.agent_dir || !prompt) continue;
		launchers.push({
			label,
			...scope,
			statuses: list(fields.status ?? ""),
			agentDir: fields.agent_dir,
			name: fields.name || fields.agent_dir,
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
