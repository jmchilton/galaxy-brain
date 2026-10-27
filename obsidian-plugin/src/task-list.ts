// ```gb-tasks blocks of agent tasks; format in vault/agents/_shared/TASK_LIST_YAML_FORMAT.md.

import { RECORD_KINDS, type RecordKind } from "../../site/src/lib/records";

export interface Task {
	prompt: string;
	agentDir: string;
	profile?: string;
	/** Context shown on the card; not sent to the agent. */
	description?: string;
	status?: TaskStatus;
	priority?: TaskPriority;
	/** `human`: prompt is an instruction for John; not launched. */
	kind?: TaskKind;
	/** URL shown on the card, e.g. the PR. */
	link?: string;
	/** Repository record the task is about, opened in Obsidian from the card. */
	record?: TaskRecord;
	/** SUGGESTED_TASKS.md section that produced the task, as `<path under vault/agents>#<heading>`. */
	suggestedBy?: string;
}

export interface TaskRecord {
	repo: string;
	kind: RecordKind;
	name: string;
}

const RECORD_REF = new RegExp(`^([^/\\s]+)/(${RECORD_KINDS.join("|")})/([^/\\s]+)$`);

export type TaskStatus = "recommended" | "idea";
export type TaskPriority = "high" | "low";
export type TaskKind = "human";

const FIELDS = ["prompt", "agent_dir", "profile", "description", "status", "priority", "kind", "link", "record", "suggested_by"];
const STATUSES: unknown[] = ["recommended", "idea"] satisfies TaskStatus[];
const PRIORITIES: unknown[] = ["high", "low"] satisfies TaskPriority[];
const KINDS: unknown[] = ["human"] satisfies TaskKind[];

/** Tasks from a block's parsed YAML; throws on anything the format rejects. */
export function parseTasks(data: unknown, known: { profiles: string[]; agentDirs: string[] }): Task[] {
	if (data === null || data === undefined) return [];
	if (!Array.isArray(data)) throw new Error("gb-tasks block must be a list of tasks");
	return data.map((entry: Record<string, unknown>, i) => {
		const fail = (message: string) => new Error(`task ${i + 1}: ${message}`);
		if (!entry || typeof entry !== "object") throw fail("not a mapping");
		const extra = Object.keys(entry).find((key) => !FIELDS.includes(key));
		if (extra) throw fail(`unknown field ${extra}`);
		const { prompt, agent_dir: agentDir, profile, description, status, priority, kind, link, record, suggested_by: suggestedBy } = entry;
		if (typeof prompt !== "string" || !prompt.trim()) throw fail("missing prompt");
		if (typeof agentDir !== "string" || !agentDir) throw fail("missing agent_dir");
		if (!known.agentDirs.includes(agentDir)) throw fail(`unknown agent_dir ${agentDir}`);
		if (profile !== undefined && (typeof profile !== "string" || !known.profiles.includes(profile))) throw fail(`unknown profile ${profile}`);
		if (description !== undefined && typeof description !== "string") throw fail("description must be text");
		if (status !== undefined && !STATUSES.includes(status)) throw fail(`unknown status ${status}`);
		if (priority !== undefined && !PRIORITIES.includes(priority)) throw fail(`unknown priority ${priority}`);
		if (kind !== undefined && !KINDS.includes(kind)) throw fail(`unknown kind ${kind}`);
		if (kind === "human" && profile !== undefined) throw fail("human task with a profile");
		if (link !== undefined && (typeof link !== "string" || !/^https?:\/\/\S+$/.test(link))) throw fail("link must be an http(s) URL");
		const recordMatch = record === undefined ? undefined : typeof record === "string" ? RECORD_REF.exec(record) : null;
		if (recordMatch === null) throw fail(`record must be <repo>/<${RECORD_KINDS.join("|")}>/<name>`);
		if (suggestedBy !== undefined && (typeof suggestedBy !== "string" || !/^[^\s#]+\.md(#.+)?$/.test(suggestedBy))) throw fail("suggested_by must be <path>.md#<heading>");
		return {
			prompt,
			agentDir,
			...(profile ? { profile } : {}),
			...(description ? { description } : {}),
			...(status ? { status: status as TaskStatus } : {}),
			...(priority ? { priority: priority as TaskPriority } : {}),
			...(kind ? { kind: kind as TaskKind } : {}),
			...(link ? { link } : {}),
			...(recordMatch ? { record: { repo: recordMatch[1]!, kind: recordMatch[2] as RecordKind, name: recordMatch[3]! } } : {}),
			...(suggestedBy ? { suggestedBy } : {}),
		};
	});
}

/** Each ```gb-tasks block's fence lines (0-based) and YAML source; unclosed blocks are skipped. */
export function taskBlocks(note: string): Array<{ start: number; end: number; source: string }> {
	const lines = note.split("\n");
	const blocks = [];
	for (let start = 0; start < lines.length; start++) {
		if (lines[start]!.trim() !== "```gb-tasks") continue;
		const end = lines.findIndex((line, i) => i > start && line.trim() === "```");
		if (end < 0) break;
		blocks.push({ start, end, source: lines.slice(start + 1, end).join("\n") });
		start = end;
	}
	return blocks;
}

/** The note without the first entry matching task's prompt and agent dir, or undefined if none does. */
export function removeTask(
	note: string,
	task: Pick<Task, "prompt" | "agentDir">,
	parse: (source: string) => unknown,
	stringify: (data: unknown) => string,
): string | undefined {
	for (const block of taskBlocks(note)) {
		const entries = parse(block.source);
		if (!Array.isArray(entries)) continue;
		const index = entries.findIndex((entry) => entry?.prompt === task.prompt && entry?.agent_dir === task.agentDir);
		if (index < 0) continue;
		const rest = entries.filter((_, i) => i !== index);
		return replaceBlockBody(note, block.start, block.end, rest.length ? stringify(rest) : "");
	}
	return undefined;
}

const PRIORITY_ORDER = { high: 0, none: 1, low: 2 };
const STATUS_ORDER = { recommended: 0, none: 1, idea: 2 };

/** High priority first and low last, then recommended before ideas; stable otherwise. */
export function byPriority<T extends Task>(tasks: T[]): T[] {
	return [...tasks].sort(
		(a, b) =>
			PRIORITY_ORDER[a.priority ?? "none"] - PRIORITY_ORDER[b.priority ?? "none"] ||
			STATUS_ORDER[a.status ?? "none"] - STATUS_ORDER[b.status ?? "none"],
	);
}

/** The note with the lines between a block's fences (0-based lines) replaced by body. */
export function replaceBlockBody(note: string, fenceStart: number, fenceEnd: number, body: string): string {
	const lines = note.split("\n");
	const bodyLines = body ? body.replace(/\n$/, "").split("\n") : [];
	lines.splice(fenceStart + 1, fenceEnd - fenceStart - 1, ...bodyLines);
	return lines.join("\n");
}

/** The record's `index.md` among vault paths, in whichever status directory it is. */
export function recordIndexPath(record: TaskRecord, paths: string[]): string | undefined {
	const prefix = `repositories/${record.repo}/${record.kind}/`;
	const suffix = `/${record.name}/index.md`;
	return paths.find((path) => path.startsWith(prefix) && path.endsWith(suffix) && !path.slice(prefix.length, -suffix.length).includes("/"));
}

/** Prompt asking the factory agent to discuss refining a task and the SUGGESTED_TASKS.md section behind it. */
export function refinementPrompt(task: Task): string {
	const lines = [
		"Let's discuss refining this task and, where it came from a SUGGESTED_TASKS.md section, that section. Don't edit anything until we agree.",
		"",
		`Agent: ${task.agentDir}`,
		`Suggested by: ${task.suggestedBy ? `vault/agents/${task.suggestedBy}` : "unknown (hand-written?)"}`,
	];
	if (task.description) lines.push("", "Description:", task.description.trim());
	lines.push("", "Prompt:", task.prompt.trim());
	return lines.join("\n");
}
