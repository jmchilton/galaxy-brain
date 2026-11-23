// Frontmatter of a record's index.md; contract in meta_record_schema.yml.

export interface RecordFrontmatter {
	upstream_base_branch?: string;
	parent_branch?: string;
	/** Branch records in this repository naming this one as their `parent_branch`. */
	child_branches?: string[];
	/** `<agent_dir>/<short_name>` or `<repo>/<kind>/<name>` references, per vault/agents/_shared/BLOCKERS.md. */
	blockers?: string[];
	/** `<repo>/<kind>/<name>` records naming this one as their blocker. */
	blocking?: string[];
	/** `<repo>/<kind>/<name>` records related to this one, listing it back. */
	related_records?: string[];
	/** Upstream PR number for a branch. */
	pr?: number;
	/** The PR title John chose for a branch. */
	pr_title?: string;
}

const STRING_FIELDS = ["upstream_base_branch", "parent_branch", "pr_title"] as const;
const LIST_FIELDS = ["blockers", "blocking", "related_records", "child_branches"] as const;

/** A plain, single-quoted or double-quoted YAML scalar. */
function unquote(value: string): string {
	const v = value.trim();
	if (/^".*"$/.test(v)) {
		try {
			return JSON.parse(v);
		} catch {
			return v.slice(1, -1);
		}
	}
	return /^'.*'$/.test(v) ? v.slice(1, -1).replace(/''/g, "'") : v;
}

const FRONTMATTER = /^---\n([\s\S]*?)^---[ \t]*(\n|$)/m;

/** `key: value`, `key: [a, b]` and `key:` + `  - a` lines of a leading `---` block; other YAML is ignored. */
export function recordFrontmatter(body: string): RecordFrontmatter {
	const block = FRONTMATTER.exec(body);
	if (!block || block.index !== 0) return {};
	const raw: Record<string, string[]> = {};
	let listKey: string | undefined;
	for (const line of block[1]!.split("\n")) {
		const item = /^\s*-\s+(.+)$/.exec(line);
		if (item && listKey) {
			raw[listKey]!.push(unquote(item[1]!));
			continue;
		}
		listKey = undefined;
		const m = /^(\w+):\s*(.*?)\s*$/.exec(line);
		if (!m) continue;
		const key = m[1]!;
		const value = m[2]!;
		const flow = STRING_FIELDS.includes(key as never) ? null : /^\[(.*)\]$/.exec(value);
		if (flow) raw[key] = flow[1]!.split(",").map(unquote).filter(Boolean);
		else if (value) raw[key] = [unquote(value)];
		else raw[(listKey = key)] = [];
	}
	const fields: RecordFrontmatter = {};
	for (const key of STRING_FIELDS) if (raw[key]?.[0]) fields[key] = raw[key][0];
	for (const key of LIST_FIELDS) if (raw[key]?.length) fields[key] = raw[key];
	const pr = raw.pr?.[0];
	if (pr && /^\d+$/.test(pr)) fields.pr = Number(pr);
	return fields;
}

/** The note's text after a leading `---` block. */
export const withoutFrontmatter = (body: string): string => body.replace(/^---\n[\s\S]*?^---[ \t]*\n+/m, (block, index: number) => (index === 0 ? "" : block));

/** Sets one top-level scalar, quoted, in the leading `---` block, or removes it for null; other lines stay as they are. */
export function setFrontmatterScalar(body: string, key: string, value: string | null): string {
	const line = value === null ? null : `${key}: ${JSON.stringify(value)}`;
	const block = FRONTMATTER.exec(body);
	if (!block || block.index !== 0) return line === null ? body : `---\n${line}\n---\n${body}`;
	const lines = block[1]!.split("\n").slice(0, -1);
	const at = lines.findIndex((one) => new RegExp(`^${key}:`).test(one));
	// A value continued on indented lines goes with it.
	let end = at + 1;
	while (at >= 0 && end < lines.length && /^\s+\S/.test(lines[end]!) && !/^\s*-\s/.test(lines[end]!)) end++;
	if (at >= 0) lines.splice(at, end - at, ...(line === null ? [] : [line]));
	else if (line !== null) lines.push(line);
	const rest = body.slice(block[0].length);
	return lines.length ? `---\n${lines.join("\n")}\n---${block[2]}${rest}` : rest.replace(/^\n+/, "");
}
