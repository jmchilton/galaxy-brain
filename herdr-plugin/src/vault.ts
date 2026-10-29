// Vault reads from disk: the Node counterpart of the Obsidian plugin's app.vault calls.

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { parse } from "yaml";
import { type Launcher, launcherScope, parseLaunchers } from "../../obsidian-plugin/src/launchers";
import { type Environment, LOCAL_ENVIRONMENT, parseEnvironments } from "../../obsidian-plugin/src/environments";
import { FALLBACK_PROFILES, type Profile, parseProfiles } from "../../obsidian-plugin/src/profiles";
import { collectRecords, type RecordSummary, type VaultFile } from "../../obsidian-plugin/src/repository";

const PROFILES_PATH = "agents/_shared/AGENT_PROFILES.yml";
const ENVIRONMENTS_PATH = "agents/_shared/ENVIRONMENTS.yml";

/** Markdown files under `repositories/`, with vault-relative paths. */
export function vaultFiles(vaultRoot: string): VaultFile[] {
	const files: VaultFile[] = [];
	const walk = (dir: string) => {
		for (const entry of readdirSync(dir, { withFileTypes: true })) {
			const path = join(dir, entry.name);
			if (entry.isDirectory()) walk(path);
			else if (entry.name.endsWith(".md")) {
				const stat = statSync(path);
				files.push({ path: relative(vaultRoot, path), mtime: stat.mtimeMs, ctime: stat.birthtimeMs });
			}
		}
	};
	walk(join(vaultRoot, "repositories"));
	return files;
}

export const readVault = (vaultRoot: string, path: string): string => {
	const full = join(vaultRoot, path);
	return existsSync(full) ? readFileSync(full, "utf8") : "";
};

export function loadLaunchers(vaultRoot: string, files = vaultFiles(vaultRoot)): Launcher[] {
	// Repo files sort before `_defaults`, so a repo's own launchers list first. Command launchers are Obsidian-only.
	return files
		.flatMap((file) => {
			const scope = launcherScope(file.path);
			return scope ? [{ file, scope }] : [];
		})
		.sort((a, b) => Number(a.scope.repo === null) - Number(b.scope.repo === null))
		.flatMap(({ file, scope }) => parseLaunchers(readVault(vaultRoot, file.path), scope))
		.filter((launcher) => !launcher.command);
}

export function loadRecords(vaultRoot: string, files = vaultFiles(vaultRoot)): RecordSummary[] {
	return collectRecords(files, undefined, (path) => readVault(vaultRoot, path));
}

export function loadProfiles(vaultRoot: string): Profile[] {
	try {
		const profiles = parseProfiles(parse(readVault(vaultRoot, PROFILES_PATH)));
		if (profiles.length > 0) return profiles;
	} catch {
		// Fall through to the defaults, as Obsidian does.
	}
	return FALLBACK_PROFILES;
}

export function loadEnvironments(vaultRoot: string): Environment[] {
	try {
		const environments = parseEnvironments(parse(readVault(vaultRoot, ENVIRONMENTS_PATH)));
		if (environments.length > 0) return environments;
	} catch {
		// Fall through to this machine only, as Obsidian does.
	}
	return [LOCAL_ENVIRONMENT];
}
