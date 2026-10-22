// Agent launchers configured in vault/agents/_shared/LAUNCHERS.md.

import { parseRecordPath, type RecordKind } from "../../site/src/lib/records";

export type AgentKind = "claude" | "codex";

export interface Launcher {
	label: string;
	records: string[];
	statuses: string[];
	agentDir: string;
	name: string;
	agent: AgentKind;
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

const KEY_LINE = /^(records|status|agent_dir|name|agent):\s*(.*)$/;

const list = (value: string) =>
	value
		.split(",")
		.map((item) => item.trim())
		.filter(Boolean);

export function parseLaunchers(markdown: string): Launcher[] {
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
		if (!label || !fields.records || !fields.agent_dir || !prompt) continue;
		launchers.push({
			label,
			records: list(fields.records),
			statuses: list(fields.status ?? ""),
			agentDir: fields.agent_dir,
			name: fields.name || fields.agent_dir,
			agent: fields.agent === "codex" ? "codex" : "claude",
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

export function launchersFor(launchers: Launcher[], record: RecordRef): Launcher[] {
	return launchers.filter(
		(launcher) =>
			launcher.records.includes(`${record.repo}/${record.kind}`) &&
			(launcher.statuses.length === 0 || launcher.statuses.includes(record.status)),
	);
}

export function fillTemplate(template: string, record: RecordRef, vaultRoot: string): string {
	const values: Record<string, string> = {
		repo: record.repo,
		kind: record.kind,
		status: record.status,
		name: record.name,
		record: `${vaultRoot}/${record.dir}`,
	};
	return template.replace(/\{(\w+)\}/g, (whole, key: string) => values[key] ?? whole);
}
