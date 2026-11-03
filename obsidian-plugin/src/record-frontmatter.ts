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
}

const STRING_FIELDS = ["upstream_base_branch", "parent_branch"] as const;
const LIST_FIELDS = ["blockers", "blocking", "related_records", "child_branches"] as const;

const unquote = (value: string) => value.trim().replace(/^(["'])(.*)\1$/, "$2");

/** `key: value`, `key: [a, b]` and `key:` + `  - a` lines of a leading `---` block; other YAML is ignored. */
export function recordFrontmatter(body: string): RecordFrontmatter {
	const block = /^---\n([\s\S]*?)^---$/m.exec(body);
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
		const flow = /^\[(.*)\]$/.exec(value);
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
