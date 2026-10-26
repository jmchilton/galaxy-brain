// Agent responsible for each repository's record kind, from vault/agents/_shared/RECORD_AGENTS.yml.

import { RECORD_KINDS, type RecordKind } from "../../site/src/lib/records";

export type RecordAgents = Record<string, Partial<Record<RecordKind, string>>>;

/** Process doc each kind's sync agent follows. */
export const SYNC_PROCESSES: Partial<Record<RecordKind, string>> = {
	issues: "PROCESS_SYNC_ISSUE_STATE.md",
	reviews: "PROCESS_SYNC_REVIEW_STATE.md",
};

export const SYNC_PROFILE = "Sonnet (medium)";

/** Repo → kind → agent dir; unknown kinds and non-text values are skipped. */
export function parseRecordAgents(data: unknown): RecordAgents {
	if (!data || typeof data !== "object" || Array.isArray(data)) return {};
	const map: RecordAgents = {};
	for (const [repo, kinds] of Object.entries(data as Record<string, unknown>)) {
		map[repo] = {};
		if (!kinds || typeof kinds !== "object") continue;
		for (const [kind, agent] of Object.entries(kinds as Record<string, unknown>)) {
			if ((RECORD_KINDS as readonly string[]).includes(kind) && typeof agent === "string") map[repo]![kind as RecordKind] = agent;
		}
	}
	return map;
}
