// Auto actions, from DISPATCH_CONFIG.yml's auto_actions: launchers agents start on their own, each on or off,
// with its environment and profile. `galaxy-brain.cjs auto` starts one; the Herdr app's control panel edits them.

import { parse, parseDocument } from "yaml";
import { type Environment, LOCAL_ENVIRONMENT } from "../../obsidian-plugin/src/environments";
import { fillTemplate, type Launcher, launchersFor } from "../../obsidian-plugin/src/launchers";
import { defaultProfile } from "../../obsidian-plugin/src/profiles";
import type { AutoAction, AutoActionChange, AutoActionsPanel } from "./auto-actions-types";
import { environmentChoices, findEnvironment, findProfile, type HostDeps, launch, vaultRecords } from "./native-host";
import { loadLaunchers, loadProfiles, readVault } from "./vault";

export type { AutoAction, AutoActionChange, AutoActionsPanel } from "./auto-actions-types";

export const DISPATCH_CONFIG_PATH = "agents/_shared/DISPATCH_CONFIG.yml";

export interface AutoDeps extends HostDeps {
	/** For commands that only read: these run in a dry run too. */
	query: HostDeps["run"];
	/** This machine's name, to tell an environment on it from one on another. */
	hostname: string;
}

/** Actions without a launcher are skipped. */
export function parseAutoActions(data: unknown): AutoAction[] {
	const entries = (data as { auto_actions?: unknown } | null)?.auto_actions;
	if (!entries || typeof entries !== "object") return [];
	return Object.entries(entries as Record<string, Record<string, unknown> | null>).flatMap(([name, entry]) => {
		if (typeof entry?.launcher !== "string") return [];
		const text = (key: string) => (typeof entry[key] === "string" ? { [key]: entry[key] as string } : {});
		return [{ name, enabled: entry.enabled === true, launcher: entry.launcher, ...text("environment"), ...text("profile") }];
	});
}

export const loadAutoActions = (vaultRoot: string) => parseAutoActions(parse(readVault(vaultRoot, DISPATCH_CONFIG_PATH)));

const matches = (launcher: Launcher, label: string) => launcher.label === label || launcher.label.replace(/^[^\p{L}\p{N}]+/u, "") === label;

const shortName = (host: string) => host.replace(/^.*@/, "").split(".")[0]!.toLowerCase();

/** No host, or the host is the machine named. */
export const onThisMachine = (environment: Environment, hostname: string) => !environment.host || shortName(environment.host) === shortName(hostname);

/** A vault-relative record dir, from it or a file in it, absolute or repo-relative. */
function recordDir(vaultRoot: string, path: string): string {
	let dir = path.replace(/\/+$/, "");
	if (dir.startsWith(`${vaultRoot}/`)) dir = dir.slice(vaultRoot.length + 1);
	else if (dir.startsWith("vault/")) dir = dir.slice("vault/".length);
	return dir.endsWith(".md") ? dir.slice(0, dir.lastIndexOf("/")) : dir;
}

/** Another machine pulls before it starts the agent, so the record must be pushed. */
function requirePushed(deps: AutoDeps, dir: string, environment: Environment) {
	const git = (...args: string[]) => deps.query(["git", "-C", deps.vaultRoot, ...args, "--", dir]);
	const dirty = git("status", "--porcelain");
	const unpushed = git("log", "--oneline", "@{u}..");
	if (dirty.status !== 0 || unpushed.status !== 0) throw new Error(`can't tell whether ${dir} is pushed: ${(dirty.stderr || unpushed.stderr).trim()}`);
	if (dirty.stdout.trim() || unpushed.stdout.trim()) throw new Error(`commit and push ${dir} first: ${environment.name} pulls before it starts the agent`);
}

/** Starts the action's launcher on the record if the action is on. */
export function startAutoAction(deps: AutoDeps, name: string, record: string, actions = loadAutoActions(deps.vaultRoot)): { launched: boolean; message: string } {
	const action = actions.find((one) => one.name === name);
	if (!action) throw new Error(`unknown auto action: ${name} (${DISPATCH_CONFIG_PATH} has: ${actions.map((one) => one.name).join(", ") || "none"})`);
	if (!action.enabled) return { launched: false, message: `${name} is off in DISPATCH_CONFIG.yml` };
	const { vaultRoot } = deps;
	const dir = recordDir(vaultRoot, record);
	const vault = vaultRecords(vaultRoot);
	const found = vault.records.find((r) => r.dir === dir);
	if (!found) throw new Error(`no record at ${dir}`);
	const launcher = launchersFor(loadLaunchers(vaultRoot, vault.files), found).find((one) => matches(one, action.launcher));
	if (!launcher) throw new Error(`no launcher "${action.launcher}" for ${dir}`);
	const profile = action.profile ? findProfile(vaultRoot, action.profile) : defaultProfile(loadProfiles(vaultRoot), launcher);
	const environment = findEnvironment(vaultRoot, action.environment);
	const here = onThisMachine(environment, deps.hostname);
	if (!here) requirePushed(deps, dir, environment);
	const { message } = launch(deps, launcher.agentDir, profile, here ? LOCAL_ENVIRONMENT : environment, fillTemplate(launcher.name, found, vaultRoot), fillTemplate(launcher.prompt, found, vaultRoot), ["--require", dir]);
	return { launched: true, message };
}

export function autoActionsPanel(vaultRoot: string): AutoActionsPanel {
	const launchers = loadLaunchers(vaultRoot);
	const profiles = loadProfiles(vaultRoot);
	const environments = environmentChoices(vaultRoot);
	const actions = loadAutoActions(vaultRoot).map((action) => {
		const launcher = launchers.find((one) => matches(one, action.launcher));
		const shown = { ...action, environment: action.environment ?? environments[0]?.name ?? LOCAL_ENVIRONMENT.name };
		if (!launcher) return { ...shown, error: `no launcher "${action.launcher}"` };
		return { ...shown, launcherLabel: launcher.label, launcherProfile: defaultProfile(profiles, launcher).name };
	});
	return { actions, profiles: profiles.map((p) => p.name), environments };
}

/** The config with one action changed, comments kept; undefined when it has no such action. */
export function editAutoAction(text: string, change: AutoActionChange, choices: Pick<AutoActionsPanel, "profiles" | "environments">): string | undefined {
	const doc = parseDocument(text);
	const path = ["auto_actions", change.name];
	if (!doc.hasIn(path)) return undefined;
	if (change.enabled !== undefined) doc.setIn([...path, "enabled"], change.enabled);
	const set = (key: "environment" | "profile", value: string | null | undefined, known: string[]) => {
		if (value === undefined) return;
		if (value === null) return void doc.deleteIn([...path, key]);
		if (!known.includes(value)) throw new Error(`unknown ${key}: ${value}`);
		doc.setIn([...path, key], value);
	};
	set("environment", change.environment, choices.environments.map((e) => e.name));
	set("profile", change.profile, choices.profiles);
	return doc.toString({ lineWidth: 0 });
}
