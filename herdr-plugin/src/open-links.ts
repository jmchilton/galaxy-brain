// Where the picker's "open" entries go for a record.

import type { RecordRef } from "../../obsidian-plugin/src/launchers";
import { githubUrl } from "../../obsidian-plugin/src/record-links";

export interface OpenLinks {
	github: string;
	/** Absent for untracked records, which have no files. */
	obsidian?: string;
}

/** `clicked` is the GitHub URL the picker was opened from, if any. */
export function openLinks(record: RecordRef, body: string, vaultRoot: string, clicked?: string): OpenLinks {
	const github = clicked ?? githubUrl(record, body);
	if (!record.dir) return { github };
	return { github, obsidian: `obsidian://open?path=${encodeURIComponent(`${vaultRoot}/${record.dir}/index.md`)}` };
}
