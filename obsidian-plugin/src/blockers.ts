// Shelved work in agent dirs' blockers/, and record-to-record blockers (vault/agents/_shared/BLOCKERS.md).

import { parseRecordPath, RECORD_KINDS, type RecordKind } from "../../site/src/lib/records";
import { recordFrontmatter } from "./record-frontmatter";

export interface BlockerRef {
	agentDir: string;
	name: string;
}

export interface Blocker extends BlockerRef {
	/** condition.md, trimmed; empty when missing. */
	condition: string;
}

/** A `<repo>/<kind>/<name>` record reference. */
export interface RecordId {
	repo: string;
	kind: RecordKind;
	name: string;
}

export const blockersPath = (agentDir: string) => `agents/${agentDir}/blockers`;

export const isAgentBlocker = (blocker: BlockerRef | RecordId): blocker is BlockerRef => "agentDir" in blocker;

export const recordIdLabel = ({ repo, kind, name }: RecordId) => `${repo}/${kind}/${name}`;

/** The blocker for `agents/<dir>/blockers/<name>` or any file inside it; null for anything else. */
export function blockerFromPath(path: string): BlockerRef | null {
	const m = path.match(/^agents\/([^/]+)\/blockers\/([^/]+)(?:\/|$)/);
	return m ? { agentDir: m[1]!, name: m[2]! } : null;
}

function recordId(ref: string): RecordId | null {
	const m = /^([^\s/]+)\/([^\s/]+)\/([^\s/]+)$/.exec(ref);
	return m && (RECORD_KINDS as readonly string[]).includes(m[2]!) ? { repo: m[1]!, kind: m[2] as RecordKind, name: m[3]! } : null;
}

/** Blockers a record's index.md names in its `blockers:` frontmatter; malformed entries are skipped. */
export function recordBlockers(body: string): Array<BlockerRef | RecordId> {
	return (recordFrontmatter(body).blockers ?? []).flatMap((ref) => {
		const agent = /^([^\s/]+)\/([^\s/]+)$/.exec(ref);
		const blocker = agent ? { agentDir: agent[1]!, name: agent[2]! } : recordId(ref);
		return blocker ? [blocker] : [];
	});
}

/** Records a record's index.md names in a record-reference frontmatter field; malformed entries are skipped. */
export function recordRefs(body: string, field: "blocking" | "related_records"): RecordId[] {
	return (recordFrontmatter(body)[field] ?? []).flatMap((ref) => recordId(ref) ?? []);
}

/** A branch record's `parent_branch` and `child_branches`, as branch records in `repo`. */
export function relatedBranches(body: string, repo: string): { parents: RecordId[]; children: RecordId[] } {
	const { parent_branch, child_branches = [] } = recordFrontmatter(body);
	const branch = (name: string): RecordId => ({ repo, kind: "branches", name });
	return { parents: parent_branch ? [branch(parent_branch)] : [], children: child_branches.map(branch) };
}

/** One record frontmatter reference, as shown on a record's row or landing page. */
export interface RecordLink {
	target: BlockerRef | RecordId;
	/** Emoji and name, for a chip. */
	text: string;
	/** What it means, for a tooltip. */
	label: string;
	/** Obsidian icon id. */
	icon: string;
}

/** A record's blockers, the records it blocks, related records, then parent and child branches. */
export function recordLinks(body: string, repo: string): RecordLink[] {
	const { parents, children } = relatedBranches(body, repo);
	return [
		...recordBlockers(body).map((target) => {
			const name = isAgentBlocker(target) ? `${target.agentDir}/${target.name}` : recordIdLabel(target);
			return { target, text: `🔒 ${name}`, label: isAgentBlocker(target) ? `Blocked: ${name}` : `Blocked by ${name}`, icon: "lock" };
		}),
		...recordRefs(body, "blocking").map((target) => ({ target, text: `🚫 ${recordIdLabel(target)}`, label: `Blocking ${recordIdLabel(target)}`, icon: "ban" })),
		...recordRefs(body, "related_records").map((target) => ({ target, text: `🔗 ${recordIdLabel(target)}`, label: `Related: ${recordIdLabel(target)}`, icon: "link" })),
		...parents.map((target) => ({ target, text: `↑ ${target.name}`, label: `Parent branch: ${target.name}`, icon: "arrow-up" })),
		...children.map((target) => ({ target, text: `↓ ${target.name}`, label: `Child branch: ${target.name}`, icon: "arrow-down" })),
	];
}

/** The vault path of a referenced record's index.md, under whichever status it has. */
export function recordIndexPath(paths: string[], { repo, kind, name }: RecordId): string | undefined {
	return paths.find((path) => {
		const parsed = parseRecordPath(path);
		return parsed?.repo === repo && parsed.kind === kind && parsed.id === name && parsed.rest === "index.md";
	});
}
