// Chrome extension requests: look up a GitHub page's records and launch agents for them.
// Launches name records, launchers, profiles and environments by reference, re-resolved here; only the prompt is free text.

import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fillTemplate, launchersFor, type RecordRef } from "../../obsidian-plugin/src/launchers";
import { defaultEnvironment, type Environment, launchArgv } from "../../obsidian-plugin/src/environments";
import { defaultProfile, type Profile, profileArgs } from "../../obsidian-plugin/src/profiles";
import { FORK_OWNER } from "../../site/src/lib/repository-tabs";
import { branchRecordsForUrl, type GithubRef, parseBranchUrl, parseGithubRef, recordsForRef } from "./github-ref";
import { openLinks } from "./open-links";
import { loadEnvironments, loadLaunchers, loadProfiles, loadRecords, readVault, vaultFiles } from "./vault";

export type Request =
	| { type: "lookup"; url?: string }
	| { type: "launch"; url: string; record: string; launcher: number; profile: string; environment?: string; prompt: string }
	| { type: "newAgent"; dir: string; profile?: string; environment?: string }
	| { type: "open"; url: string };

export interface HostDeps {
	vaultRoot: string;
	/** Runs a command; its exit code and output. */
	run: (argv: string[]) => { status: number; stdout: string; stderr: string };
}

export interface LookupRecord {
	key: string;
	repo: string;
	kind: string;
	status: string;
	name: string;
	title: string;
	github?: string;
	obsidian?: string;
	launchers: Array<{ label: string; agentDir: string; name: string; prompt: string; profile: string }>;
}

export interface LookupResult {
	/** Set when the URL is a PR, issue or branch of a galaxy-brain repository. */
	ref?: { repo: string; kind: string; name: string };
	records: LookupRecord[];
	profiles: Array<{ name: string; agent: string; args: string[] }>;
	/** Names; the first is the default. */
	environments: string[];
	agentDirs: string[];
}

/** A PR's head branch when it's on the fork, so its branch record matches. */
export type HeadBranch = (ref: GithubRef) => string | undefined;

/** HeadBranch via `gh pr view`; undefined on any failure. */
export function ghHeadBranch(run: HostDeps["run"]): HeadBranch {
	return (ref) => {
		if (ref.kind !== "reviews") return undefined;
		const result = run(["gh", "pr", "view", String(ref.number), "-R", `${ref.owner}/${ref.repo}`, "--json", "headRefName,headRepositoryOwner"]);
		if (result.status !== 0) return undefined;
		try {
			const pr = JSON.parse(result.stdout) as { headRefName?: string; headRepositoryOwner?: { login?: string } };
			return pr.headRepositoryOwner?.login === FORK_OWNER ? pr.headRefName : undefined;
		} catch {
			return undefined;
		}
	};
}

const recordKey = (record: RecordRef) => record.dir || `untracked:${record.repo}/${record.kind}/${record.name}`;

/** Agent dirs with a CLAUDE.md, not `_`-prefixed. */
export function agentDirs(vaultRoot: string): string[] {
	const root = join(vaultRoot, "agents");
	return readdirSync(root, { withFileTypes: true })
		.filter((entry) => entry.isDirectory() && !entry.name.startsWith("_") && existsSync(join(root, entry.name, "CLAUDE.md")))
		.map((entry) => entry.name)
		.sort();
}

/** A PR or issue's records (or an untracked stand-in), or a branch page's branch records. */
function recordsFor(vaultRoot: string, url: string | undefined, headBranch?: HeadBranch) {
	const pr = url ? parseGithubRef(url) : null;
	const branch = url && !pr ? parseBranchUrl(url) : null;
	const repo = pr?.repo ?? branch?.repo;
	if (!url || !repo) return null;
	const files = vaultFiles(vaultRoot);
	const all = loadRecords(vaultRoot, files);
	if (!all.some((r) => r.repo === repo)) return null;
	const body = (r: RecordRef) => (r.dir ? readVault(vaultRoot, `${r.dir}/index.md`) : "");
	const titles = new Map(all.map((r) => [r.dir, r.title]));
	const records = pr ? recordsForRef(pr, all, body, headBranch?.(pr)) : branchRecordsForUrl(url, all)!;
	const name = pr ? String(pr.number) : (records[0]?.name ?? branch!.path);
	return { ref: { repo, kind: pr?.kind ?? "branches", name }, files, body, titles, records };
}

export function lookup(vaultRoot: string, url?: string, headBranch?: HeadBranch): LookupResult {
	const profiles = loadProfiles(vaultRoot);
	const result: LookupResult = {
		records: [],
		profiles: profiles.map((p) => ({ name: p.name, agent: p.agent, args: profileArgs(p) })),
		environments: loadEnvironments(vaultRoot).map((e) => e.name),
		agentDirs: agentDirs(vaultRoot),
	};
	const found = recordsFor(vaultRoot, url, headBranch);
	if (!found) return result;
	const launchers = loadLaunchers(vaultRoot, found.files);
	result.ref = found.ref;
	result.records = found.records.map((record) => {
		const links = openLinks(record, found.body(record), vaultRoot, found.ref.kind !== "branches" && record.kind === found.ref.kind ? url : undefined);
		return {
			key: recordKey(record),
			repo: record.repo,
			kind: record.kind,
			status: record.status,
			name: record.name,
			title: found.titles.get(record.dir) ?? record.name,
			...(links.github ? { github: links.github } : {}),
			...(links.obsidian ? { obsidian: links.obsidian } : {}),
			launchers: launchersFor(launchers, record).map((l) => ({
				label: l.label,
				agentDir: l.agentDir,
				name: fillTemplate(l.name, record, vaultRoot),
				prompt: fillTemplate(l.prompt, record, vaultRoot),
				profile: defaultProfile(profiles, l).name,
			})),
		};
	});
	return result;
}

function findProfile(vaultRoot: string, name: string): Profile {
	const profile = loadProfiles(vaultRoot).find((p) => p.name === name);
	if (!profile) throw new Error(`unknown profile: ${name}`);
	return profile;
}

/** The named environment, else the default. */
function findEnvironment(vaultRoot: string, name: string | undefined): Environment {
	const environments = loadEnvironments(vaultRoot);
	if (name === undefined) return defaultEnvironment(environments);
	const environment = environments.find((e) => e.name === name);
	if (!environment) throw new Error(`unknown environment: ${name}`);
	return environment;
}

function launch(deps: HostDeps, agentDir: string, profile: Profile | undefined, environment: Environment, name: string, prompt: string) {
	const kind = profile?.agent ?? "claude";
	const args = profile ? profileArgs(profile) : [];
	const result = deps.run(launchArgv(environment, deps.vaultRoot, [agentDir, kind, name, prompt, ...args]));
	if (result.status !== 0) throw new Error((result.stderr || result.stdout).trim() || `launch exited ${result.status}`);
	return { message: result.stdout.trim() };
}

export function handle(request: Request, deps: HostDeps): unknown {
	switch (request.type) {
		case "lookup":
			return lookup(deps.vaultRoot, request.url, ghHeadBranch(deps.run));
		case "launch": {
			const found = recordsFor(deps.vaultRoot, request.url, ghHeadBranch(deps.run));
			const record = found?.records.find((r) => recordKey(r) === request.record);
			if (!found || !record) throw new Error(`no record ${request.record} for ${request.url}`);
			const launcher = launchersFor(loadLaunchers(deps.vaultRoot, found.files), record)[request.launcher];
			if (!launcher) throw new Error(`no launcher ${request.launcher} for ${request.record}`);
			const profile = findProfile(deps.vaultRoot, request.profile);
			const environment = findEnvironment(deps.vaultRoot, request.environment);
			return launch(deps, launcher.agentDir, profile, environment, fillTemplate(launcher.name, record, deps.vaultRoot), request.prompt);
		}
		case "newAgent": {
			if (!agentDirs(deps.vaultRoot).includes(request.dir)) throw new Error(`unknown agent dir: ${request.dir}`);
			const profile = request.profile ? findProfile(deps.vaultRoot, request.profile) : undefined;
			const environment = findEnvironment(deps.vaultRoot, request.environment);
			return launch(deps, request.dir, profile, environment, request.dir, "");
		}
		case "open": {
			if (!/^(https:\/\/github\.com\/|obsidian:\/\/open\?)/.test(request.url)) throw new Error(`refusing to open ${request.url}`);
			deps.run(["open", request.url]);
			return { message: `Opened ${request.url}` };
		}
		default:
			throw new Error(`unknown request: ${JSON.stringify(request)}`);
	}
}
