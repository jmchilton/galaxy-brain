// Frontmatter of a record's index.md; fields in vault/agents/_shared/REPOSITORY_BRANCHES.md.

export interface RecordFrontmatter {
	upstream_base_branch?: string;
	parent_branch?: string;
	/** `<agent_dir>/<short_name>`, per vault/agents/_shared/BLOCKERS.md. */
	blocker?: string;
	/** Upstream PR number for a branch. */
	pr?: number;
}

const STRING_FIELDS = ["upstream_base_branch", "parent_branch", "blocker"] as const;

/** Flat `key: value` lines of a leading `---` block; unknown keys and nested YAML are ignored. */
export function recordFrontmatter(body: string): RecordFrontmatter {
	const block = /^---\n([\s\S]*?)^---$/m.exec(body);
	if (!block || block.index !== 0) return {};
	const raw: Record<string, string> = {};
	for (const line of block[1]!.split("\n")) {
		const m = /^(\w+):\s*["']?([^"']*?)["']?\s*$/.exec(line);
		if (m && m[2]) raw[m[1]!] = m[2];
	}
	const fields: RecordFrontmatter = {};
	for (const key of STRING_FIELDS) if (raw[key]) fields[key] = raw[key];
	if (raw.pr && /^\d+$/.test(raw.pr)) fields.pr = Number(raw.pr);
	return fields;
}
