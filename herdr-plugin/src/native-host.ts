// Chrome extension and Herdr app requests: look up records and launch agents for them.
// Launches name records, launchers, profiles and environments by reference, re-resolved here; only the prompt is free text.

import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { type AgentCount, agentCounts, agentRoutines, type Routine, tasksPath } from "../../obsidian-plugin/src/agent-routines";
import { type Blocker, blockersPath, isAgentBlocker, recordIdLabel, recordLinks } from "../../obsidian-plugin/src/blockers";
import { agentLaunchersPath, fillTemplate, type Launcher, launchersFor, type RecordRef } from "../../obsidian-plugin/src/launchers";
import { defaultEnvironment, type Environment, launchArgv } from "../../obsidian-plugin/src/environments";
import { type CrackDay, crackFiles, cracksPath, parseCrackDay, unreviewedCount } from "../../obsidian-plugin/src/missed-prs";
import { defaultProfile, type Profile, profileArgs } from "../../obsidian-plugin/src/profiles";
import { type ListedTask, localDay, parseAgentTasks } from "../../obsidian-plugin/src/task-list";
import { latestRound } from "../../review-factory/src/record";
import { type RecordFileLinks, recordFileLinks } from "../../site/src/lib/file-docs";
import { loadFileDocs } from "../../site/src/lib/file-docs-load";
import { isReviewableRecordKind } from "../../site/src/lib/records";
import { FORK_OWNER, upstreamOwner } from "../../site/src/lib/repository-tabs";
import { branchRecordsForUrl, type GithubRef, parseBranchUrl, parseGithubRef, recordsForRef } from "./github-ref";
import { openLinks } from "./open-links";
import { loadEnvironments, loadLaunchers, loadProfiles, loadRecords, readVault, vaultFiles } from "./vault";

export type Request =
	| { type: "lookup"; url?: string }
	| { type: "records"; refs: string[] }
	/** A `<repo>/<kind>/<name>` record's landing page. */
	| { type: "recordPage"; ref: string }
	/** `url` narrows `record` (a key) to that page's records; without it, any record in the vault. */
	| { type: "launch"; url?: string; record: string; launcher: number; profile: string; environment?: string; prompt: string }
	/** Blank and named for its dir unless given a prompt and name. */
	| { type: "newAgent"; dir: string; profile?: string; environment?: string; name?: string; prompt?: string }
	| { type: "agents" }
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
	/** Per agent dir. */
	routines: Record<string, Routine[]>;
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

/** Agent dirs with an AGENTS.md, not `_`-prefixed. */
export function agentDirs(vaultRoot: string): string[] {
	const root = join(vaultRoot, "agents");
	return readdirSync(root, { withFileTypes: true })
		.filter((entry) => entry.isDirectory() && !entry.name.startsWith("_") && existsSync(join(root, entry.name, "AGENTS.md")))
		.map((entry) => entry.name)
		.sort();
}

export interface AgentOverview {
	dir: string;
	routines: Routine[];
	tasks: ListedTask[];
	blockers: Array<Blocker & { obsidian: string }>;
	/** Absent without a the_cracks/. */
	cracks?: Array<CrackDay & { obsidian: string }>;
	counts: AgentCount[];
	/** Why its TASKS.md didn't parse. */
	error?: string;
}

export interface AgentsOverview {
	agents: AgentOverview[];
	/** The first is the default. */
	profiles: Array<{ name: string }>;
	environments: Array<{ name: string; icon?: string }>;
}

const childNames = (dir: string, directories: boolean) =>
	existsSync(dir) ? readdirSync(dir, { withFileTypes: true }).filter((entry) => entry.isDirectory() === directories).map((entry) => entry.name).sort() : [];

const obsidianUrl = (vaultRoot: string, path: string) => `obsidian://open?path=${encodeURIComponent(`${vaultRoot}/${path}`)}`;

const routinesFor = (vaultRoot: string, dir: string) => agentRoutines(readVault(vaultRoot, agentLaunchersPath(dir)), dir);

/** The agent's the_cracks/ days, newest first; undefined without the directory. */
function crackDays(vaultRoot: string, dir: string): AgentOverview["cracks"] {
	const path = cracksPath(dir);
	if (!existsSync(join(vaultRoot, path))) return undefined;
	const files = crackFiles(childNames(join(vaultRoot, path), false).map((name) => `${path}/${name}`), path);
	return files.map((file) => ({ ...parseCrackDay(file, readVault(vaultRoot, file.path), parse, dir), obsidian: obsidianUrl(vaultRoot, file.path) }));
}

/** Each agent dir's routines, TASKS.md tasks, blockers and pending counts, as the Agents views show them. */
export function agentsOverview(vaultRoot: string, today = localDay()): AgentsOverview {
	const dirs = agentDirs(vaultRoot);
	const profiles = loadProfiles(vaultRoot).map(({ name }) => ({ name }));
	const known = { profiles: profiles.map((one) => one.name), agentDirs: dirs };
	const agents = dirs.map((dir): AgentOverview => {
		const note = existsSync(join(vaultRoot, tasksPath(dir))) ? readVault(vaultRoot, tasksPath(dir)) : null;
		const { tasks, error } = parseAgentTasks(dir, note, known, parse);
		const path = blockersPath(dir);
		const blockers = childNames(join(vaultRoot, path), true).map((name) => ({
			agentDir: dir,
			name,
			condition: readVault(vaultRoot, `${path}/${name}/condition.md`).trim(),
			obsidian: obsidianUrl(vaultRoot, `${path}/${name}/index.md`),
		}));
		const cracks = crackDays(vaultRoot, dir);
		return {
			dir,
			routines: routinesFor(vaultRoot, dir),
			tasks,
			blockers,
			...(cracks ? { cracks } : {}),
			counts: agentCounts(tasks, blockers.length, unreviewedCount(cracks ?? []), today),
			...(error ? { error } : {}),
		};
	});
	return { agents, profiles, environments: environmentChoices(vaultRoot) };
}

function vaultRecords(vaultRoot: string) {
	const files = vaultFiles(vaultRoot);
	const records = loadRecords(vaultRoot, files);
	const body = (r: RecordRef) => (r.dir ? readVault(vaultRoot, `${r.dir}/index.md`) : "");
	const titles = new Map(records.map((r) => [r.dir, r.title]));
	return { files, records, body, titles };
}

type VaultRecords = ReturnType<typeof vaultRecords>;

/** A PR or issue's records (or an untracked stand-in), or a branch page's branch records. */
function recordsFor(vaultRoot: string, url: string | undefined, headBranch?: HeadBranch) {
	const pr = url ? parseGithubRef(url) : null;
	const branch = url && !pr ? parseBranchUrl(url) : null;
	const repo = pr?.repo ?? branch?.repo;
	if (!url || !repo) return null;
	const vault = vaultRecords(vaultRoot);
	if (!vault.records.some((r) => r.repo === repo)) return null;
	const records = pr ? recordsForRef(pr, vault.records, vault.body, headBranch?.(pr)) : branchRecordsForUrl(url, vault.records)!;
	const name = pr ? String(pr.number) : (records[0]?.name ?? branch!.path);
	return { ...vault, ref: { repo, kind: pr?.kind ?? "branches", name }, records };
}

/** `clicked` is the GitHub URL it was found from, if any. */
function lookupRecord(vaultRoot: string, vault: Pick<VaultRecords, "body" | "titles">, launchers: Launcher[], profiles: Profile[], record: RecordRef, clicked?: string): LookupRecord {
	const links = openLinks(record, vault.body(record), vaultRoot, clicked);
	return {
		key: recordKey(record),
		repo: record.repo,
		kind: record.kind,
		status: record.status,
		name: record.name,
		title: vault.titles.get(record.dir) ?? record.name,
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
}

/** `<repo>/<kind>/<name>` refs to their records in any status; null when not in this vault. */
export function recordsByRef(vaultRoot: string, refs: string[]): Array<{ ref: string; record: LookupRecord | null }> {
	const vault = vaultRecords(vaultRoot);
	const launchers = loadLaunchers(vaultRoot, vault.files);
	const profiles = loadProfiles(vaultRoot);
	return refs.map((ref) => {
		const record = vault.records.find((r) => `${r.repo}/${r.kind}/${r.name}` === ref);
		return { ref, record: record ? lookupRecord(vaultRoot, vault, launchers, profiles, record) : null };
	});
}

/** A frontmatter reference: `ref` for a record, `condition` and `obsidian` for an agent blocker. */
export interface RelatedRecord {
	text: string;
	label: string;
	ref?: string;
	condition?: string;
	obsidian?: string;
}

export interface RecordPage {
	/** Its `key` is its vault-relative directory. */
	record: LookupRecord;
	related: RelatedRecord[];
	links: RecordFileLinks;
	/** It has a differential review to open. */
	review: boolean;
	/** A PR review with findings YAML, for the findings panel. */
	findings: boolean;
	/** "owner/name" of the upstream repository, whatever `record.github` points at. */
	upstream: string;
	/** The first is the default. */
	profiles: Array<{ name: string }>;
	environments: Array<{ name: string; icon?: string }>;
}

const environmentChoices = (vaultRoot: string) => loadEnvironments(vaultRoot).map(({ name, icon }) => ({ name, ...(icon ? { icon } : {}) }));

function relatedRecords(vaultRoot: string, body: string, repo: string): RelatedRecord[] {
	return recordLinks(body, repo).map(({ target, text, label }) => {
		if (!isAgentBlocker(target)) return { text, label, ref: recordIdLabel(target) };
		const dir = `${blockersPath(target.agentDir)}/${target.name}`;
		return { text, label, condition: readVault(vaultRoot, `${dir}/condition.md`).trim(), obsidian: obsidianUrl(vaultRoot, `${dir}/index.md`) };
	});
}

/** Null when the record isn't in this vault. */
export function recordPage(vaultRoot: string, ref: string): RecordPage | null {
	const vault = vaultRecords(vaultRoot);
	const record = vault.records.find((r) => `${r.repo}/${r.kind}/${r.name}` === ref);
	if (!record) return null;
	const profiles = loadProfiles(vaultRoot);
	const prefix = `${record.dir}/`;
	const files = vault.files.filter((file) => file.path.startsWith(prefix)).map((file) => file.path.slice(prefix.length));
	return {
		record: lookupRecord(vaultRoot, vault, loadLaunchers(vaultRoot, vault.files), profiles, record),
		related: relatedRecords(vaultRoot, vault.body(record), record.repo),
		links: recordFileLinks(files, loadFileDocs(vaultRoot, record.repo, record.kind)),
		review: isReviewableRecordKind(record.kind),
		findings: record.kind === "reviews" && latestRound(join(vaultRoot, record.dir)) !== null,
		upstream: `${upstreamOwner(record.repo, [vault.body(record)])}/${record.repo}`,
		profiles: profiles.map(({ name }) => ({ name })),
		environments: environmentChoices(vaultRoot),
	};
}

export function lookup(vaultRoot: string, url?: string, headBranch?: HeadBranch): LookupResult {
	const profiles = loadProfiles(vaultRoot);
	const dirs = agentDirs(vaultRoot);
	const result: LookupResult = {
		records: [],
		profiles: profiles.map((p) => ({ name: p.name, agent: p.agent, args: profileArgs(p) })),
		environments: loadEnvironments(vaultRoot).map((e) => e.name),
		agentDirs: dirs,
		routines: Object.fromEntries(dirs.map((dir) => [dir, routinesFor(vaultRoot, dir)])),
	};
	const found = recordsFor(vaultRoot, url, headBranch);
	if (!found) return result;
	const launchers = loadLaunchers(vaultRoot, found.files);
	result.ref = found.ref;
	result.records = found.records.map((record) =>
		lookupRecord(vaultRoot, found, launchers, profiles, record, found.ref.kind !== "branches" && record.kind === found.ref.kind ? url : undefined),
	);
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

/** handle()'s result as `{ ok, result }`, or `{ ok: false, error }`. */
export function reply(request: Request, deps: HostDeps): { ok: true; result: unknown } | { ok: false; error: string } {
	try {
		return { ok: true, result: handle(request, deps) };
	} catch (error) {
		return { ok: false, error: error instanceof Error ? error.message : String(error) };
	}
}

export function handle(request: Request, deps: HostDeps): unknown {
	switch (request.type) {
		case "lookup":
			return lookup(deps.vaultRoot, request.url, ghHeadBranch(deps.run));
		case "records":
			return recordsByRef(deps.vaultRoot, request.refs);
		case "recordPage":
			return recordPage(deps.vaultRoot, request.ref);
		case "launch": {
			const found = request.url ? recordsFor(deps.vaultRoot, request.url, ghHeadBranch(deps.run)) : vaultRecords(deps.vaultRoot);
			const record = found?.records.find((r) => recordKey(r) === request.record);
			if (!found || !record) throw new Error(`no record ${request.record}${request.url ? ` for ${request.url}` : ""}`);
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
			return launch(deps, request.dir, profile, environment, request.name ?? request.dir, request.prompt ?? "");
		}
		case "agents":
			return agentsOverview(deps.vaultRoot);
		case "open": {
			if (!/^(https:\/\/github\.com\/|obsidian:\/\/open\?)/.test(request.url)) throw new Error(`refusing to open ${request.url}`);
			deps.run(["open", request.url]);
			return { message: `Opened ${request.url}` };
		}
		default:
			throw new Error(`unknown request: ${JSON.stringify(request)}`);
	}
}
