// Pure parts of the gb-repository mod, a repository's records in a tab.

import { recordFromPath } from "../../obsidian-plugin/src/launchers";

export const repositoryTabName = (repo?: string) => `📚 ${repo ?? "All repositories"}`;

/** `<repo>/<kind>/<name>` of the record holding a vault path; null outside any record. */
export function recordRefOf(path: string): string | null {
	const record = recordFromPath(path);
	return record && `${record.repo}/${record.kind}/${record.name}`;
}

/** Whether a watched batch touches what the page shows; a batch holding the watched root means anything may have changed. */
export const repositoryChanged = (paths: string[], root: string): boolean => paths.some((path) => path === root || path.endsWith(".md"));
