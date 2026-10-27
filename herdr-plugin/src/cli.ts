// galaxy-brain herdr plugin: `open` (actions) pops up the picker pane; `pick` (the pane) runs the fzf launch flow;
// `actions <agent_dir>` prints that dir's launchers as prompts (JSON) for the suggested-prompts Claude plugin.

import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { isTerminalStatus } from "../../site/src/lib/records";
import { fillTemplate, type Launcher, launchersFor, type RecordRef } from "../../obsidian-plugin/src/launchers";
import { defaultProfile, type Profile, profileArgs } from "../../obsidian-plugin/src/profiles";
import type { RecordSummary } from "../../obsidian-plugin/src/repository";
import { agentActions } from "./agent-actions";
import { fzfKey, fzfLine } from "./fzf-lines";
import { parseGithubRef, recordsForRef } from "./github-ref";
import { type OpenLinks, openLinks } from "./open-links";
import { pickerEnv } from "./selection";
import { LAUNCH_SCRIPT, loadLaunchers, loadProfiles, loadRecords, readVault, vaultFiles } from "./vault";

const PLUGIN_ID = "galaxy-brain";
const vaultRoot = resolve(process.env.HERDR_PLUGIN_ROOT ?? join(__dirname, ".."), "../vault");
const herdr = process.env.HERDR_BIN_PATH ?? "herdr";
const dryRun = Boolean(process.env.GB_DRY_RUN);

/** Runs fzf over the lines; the chosen line's key, or null on Esc. */
function fzf(lines: string[], options: { prompt: string; header?: string; preview?: string; query?: string }): string | null {
	const args = ["--delimiter=\t", "--with-nth=2..", "--layout=reverse", "--no-sort", `--prompt=${options.prompt} > `];
	if (options.header) args.push(`--header=${options.header}`);
	if (options.query) args.push(`--query=${options.query}`);
	if (options.preview) args.push(`--preview=${options.preview}`, "--preview-window=down,60%,wrap");
	const result = spawnSync("fzf", args, { input: lines.join("\n"), encoding: "utf8", cwd: vaultRoot, stdio: ["pipe", "pipe", "inherit"] });
	return result.status === 0 ? fzfKey(result.stdout) : null;
}

function waitForEnter(message: string) {
	console.log(`\n${message}\nPress Enter to close.`);
	spawnSync("sh", ["-c", "read _"], { stdio: "inherit" });
}

const byRecent = (a: RecordSummary, b: RecordSummary) =>
	Number(isTerminalStatus(a.status)) - Number(isTerminalStatus(b.status)) || b.mtime - a.mtime;

function pickRecord(records: RecordRef[], titles: Map<string, string>, header?: string, query?: string): RecordRef | null {
	if (records.length === 1) return records[0]!;
	const byDir = new Map(records.map((r) => [r.dir, r]));
	const lines = records.map((r) => fzfLine(r.dir, [r.repo, r.kind, r.status, r.name, titles.get(r.dir) ?? ""]));
	const key = fzf(lines, { prompt: "Record", header, query, preview: "cat {1}/index.md 2>/dev/null" });
	return key ? (byDir.get(key) ?? null) : null;
}

/** A launcher, or a URL to open, from the record's launchers plus its open entries. */
function pickAction(launchers: Launcher[], record: RecordRef, links: OpenLinks, prompts: string): Launcher | string | null {
	launchers.forEach((launcher, i) => writeFileSync(join(prompts, `${i}.txt`), fillTemplate(launcher.prompt, record, vaultRoot)));
	const opens: Array<[string, string, string | undefined]> = [
		["github", "🌐 Open on GitHub", links.github],
		["obsidian", "📓 Open in Obsidian", links.obsidian],
	];
	const lines = launchers.map((l, i) => fzfLine(String(i), [l.label, `(${l.agentDir})`]));
	for (const [key, label, url] of opens) {
		if (!url) continue;
		writeFileSync(join(prompts, `${key}.txt`), url);
		lines.push(fzfLine(key, [label]));
	}
	const header = `${record.repo} ${record.kind} ${record.name} (${record.status})`;
	const key = fzf(lines, { prompt: "Launch", header, preview: `cat ${prompts}/{1}.txt` });
	if (key === null) return null;
	return opens.find(([k]) => k === key)?.[2] ?? launchers[Number(key)]!;
}

function pickProfile(profiles: Profile[], preferred: Profile): Profile | null {
	const ordered = [preferred, ...profiles.filter((p) => p !== preferred)];
	const lines = ordered.map((p, i) => fzfLine(String(i), [p.name, p.agent, ...profileArgs(p)]));
	const key = fzf(lines, { prompt: "Profile" });
	return key === null ? null : ordered[Number(key)]!;
}

/** Confirms the launch, letting the user edit the prompt; the final prompt, or null to cancel. */
function confirm(name: string, profile: Profile, prompt: string, prompts: string): string | null {
	const file = join(prompts, "final.txt");
	writeFileSync(file, prompt);
	for (;;) {
		const header = `${name} · ${profile.name}`;
		const key = fzf([fzfLine("launch", ["🚀 Launch"]), fzfLine("edit", ["✏️ Edit prompt"]), fzfLine("cancel", ["Cancel"])], {
			prompt: "Confirm",
			header,
			preview: `cat ${file}`,
		});
		if (key === "launch") return readFileSync(file, "utf8").trim();
		if (key !== "edit") return null;
		spawnSync(process.env.EDITOR || "vi", [file], { stdio: "inherit" });
	}
}

function openUrl(url: string) {
	if (dryRun) return waitForEnter(`Dry run: open ${url}`);
	spawnSync("open", [url]);
}

function launch(launcher: Launcher, profile: Profile, name: string, prompt: string) {
	const args = [launcher.agentDir, profile.agent, name, prompt, ...profileArgs(profile)];
	if (dryRun) return waitForEnter(`Dry run: ${LAUNCH_SCRIPT} ${JSON.stringify(args)}`);
	const result = spawnSync(join(vaultRoot, LAUNCH_SCRIPT), args, { encoding: "utf8" });
	waitForEnter(result.status === 0 ? result.stdout.trim() : `Launch failed: ${(result.stderr || result.error?.message || "").trim()}`);
}

function pick() {
	const files = vaultFiles(vaultRoot);
	const records = loadRecords(vaultRoot, files).sort(byRecent);
	const titles = new Map(records.map((r) => [r.dir, r.title]));
	const url = process.env.GB_URL;
	let record: RecordRef | null;
	if (url) {
		const ref = parseGithubRef(url);
		if (!ref || !records.some((r) => r.repo === ref.repo)) return waitForEnter(`No galaxy-brain repository for ${url}`);
		const body = (r: RecordRef) => readVault(vaultRoot, `${r.dir}/index.md`);
		record = pickRecord(recordsForRef(ref, records, body), titles, url);
	} else {
		record = pickRecord(records, titles, undefined, process.env.GB_QUERY);
	}
	if (!record) return;
	const launchers = launchersFor(loadLaunchers(vaultRoot, files), record);
	const links = openLinks(record, record.dir ? readVault(vaultRoot, `${record.dir}/index.md`) : "", vaultRoot, url);
	const prompts = mkdtempSync(join(tmpdir(), "galaxy-brain-"));
	try {
		chooseAndLaunch(launchers, record, links, prompts);
	} finally {
		rmSync(prompts, { recursive: true, force: true });
	}
}

function chooseAndLaunch(launchers: Launcher[], record: RecordRef, links: OpenLinks, prompts: string) {
	const launcher = pickAction(launchers, record, links, prompts);
	if (!launcher) return;
	if (typeof launcher === "string") return openUrl(launcher);
	const profiles = loadProfiles(vaultRoot);
	const profile = pickProfile(profiles, defaultProfile(profiles, launcher));
	if (!profile) return;
	const name = fillTemplate(launcher.name, record, vaultRoot);
	const prompt = confirm(name, profile, fillTemplate(launcher.prompt, record, vaultRoot), prompts);
	if (prompt) launch(launcher, profile, name, prompt);
}

/** Opens the picker as a popup, passing on a clicked or highlighted URL or a filter query. */
function open() {
	const args = ["plugin", "pane", "open", "--plugin", PLUGIN_ID, "--entrypoint", "picker", "--placement", "popup"];
	args.push("--width", "90%", "--height", "90%");
	for (const [key, value] of Object.entries(pickerEnv(process.env.HERDR_PLUGIN_CONTEXT_JSON))) args.push("--env", `${key}=${value}`);
	if (dryRun) args.push("--env", "GB_DRY_RUN=1");
	const result = spawnSync(herdr, args, { encoding: "utf8" });
	process.stdout.write(result.stdout);
	process.stderr.write(result.stderr);
	process.exit(result.status ?? 1);
}

const command = process.argv[2];
if (command === "pick") pick();
else if (command === "open") open();
else if (command === "actions" && process.argv[3]) console.log(JSON.stringify(agentActions(loadLaunchers(vaultRoot), process.argv[3], vaultRoot)));
else {
	console.error("usage: galaxy-brain.cjs pick|open|actions <agent_dir>");
	process.exit(2);
}
