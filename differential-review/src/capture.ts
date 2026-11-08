// Snapshots a record from what its index.md and GitHub say, with no worktree or flags: the plugins' snapshot buttons.
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { type BaseChoice, createSnapshot, nodeReadAdapter, type Io, type SnapshotResult, UsageError } from "../../differential-review-lib/src/cli/index.js";
import { remotes, revParse, tryGit } from "../../differential-review-lib/src/cli/git.js";
import { type Phase, readAllSnapshots, snapshotReader } from "../../differential-review-lib/src/core/index.js";
import { worktreeCandidates } from "../../obsidian-plugin/src/record-links";
import { recordReviewDir } from "../../site/src/lib/records";
import { escapeRegExp, FORK_OWNER, githubLinks, upstreamOwner } from "../../site/src/lib/repository-tabs";
import { chooseBase, readRecord, type RecordInfo } from "./record";

export interface CaptureEnv {
  home: string;
  /** Runs `gh`; its stdout, or a thrown error. */
  gh(args: string[]): string;
}

const realEnv = (): CaptureEnv => ({
  home: homedir(),
  gh(args) {
    try {
      return execFileSync("gh", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 60_000 });
    } catch (e) {
      const err = e as { stderr?: string; message: string };
      throw new Error(`gh ${args.slice(0, 2).join(" ")} failed: ${err.stderr?.trim() || err.message}`);
    }
  },
});

/** The git branch of a record; a record's name can't hold the `/` of one, so its View on GitHub link can name it. */
export function recordBranchName(name: string, repo: string, body: string): string {
  const tree = new RegExp(`^https://github\\.com/[^/]+/${escapeRegExp(repo)}/tree/(.+)$`);
  const link = githubLinks(body).find((one) => /^View on GitHub$/i.test(one.label) && tree.test(one.url));
  return link ? tree.exec(link.url)![1]! : name;
}

/** A parent's git branch, from its record in any status. */
function parentBranchName(recordDir: string, repo: string, parent: string): string {
  const statuses = dirname(dirname(recordDir));
  for (const status of readdirSync(statuses)) {
    const index = join(statuses, status, parent, "index.md");
    if (existsSync(index)) return recordBranchName(parent, repo, readFileSync(index, "utf8"));
  }
  return parent;
}

/** The record's worktree if it has one, else the repository's clone. */
export function checkout(record: RecordInfo & { kind: "branches" | "reviews"; repo: string }, body: string, home: string): string {
  const clone = join(home, "projects/repositories", record.repo);
  const candidates = [...worktreeCandidates({ repo: record.repo, kind: record.kind, name: record.branch }, body, home), clone];
  const found = candidates.find((path) => existsSync(path) && tryGit(path, ["rev-parse", "--git-dir"]) !== null);
  if (!found) throw new Error(`no clone of ${record.repo} at ${clone}`);
  return found;
}

/** The commit fetched; null if the remote doesn't have it. */
export function fetched(cwd: string, remote: string, ref: string): string | null {
  return tryGit(cwd, ["fetch", "--quiet", remote, ref]) === null ? null : revParse(cwd, "FETCH_HEAD");
}

function forkRemotes(cwd: string): string[] {
  const known = remotes(cwd);
  return [FORK_OWNER, "origin"].filter((remote) => known.includes(remote));
}

export function fetchedFromFork(cwd: string, branch: string): string | null {
  for (const remote of forkRemotes(cwd)) {
    const sha = fetched(cwd, remote, branch);
    if (sha) return sha;
  }
  return null;
}

/** The local branch, unless the fork has moved past it; work can be pushed from another machine. */
function branchHead(cwd: string, branch: string): string {
  const local = revParse(cwd, `refs/heads/${branch}`);
  const pushed = fetchedFromFork(cwd, branch);
  if (!local && !pushed) throw new Error(`no branch ${branch} here or on ${forkRemotes(cwd).join(" or ")}`);
  if (!local) return pushed!;
  return pushed && tryGit(cwd, ["merge-base", "--is-ancestor", local, pushed]) !== null ? pushed : local;
}

/** Warnings; a stale base still gives a review, though one that may show the base's newer commits. */
function refreshBase(cwd: string, choice: BaseChoice): string[] {
  if (choice.localFirst) {
    if (!revParse(cwd, `refs/heads/${choice.name}`)) fetchedFromFork(cwd, choice.name);
    return [];
  }
  return fetched(cwd, "origin", choice.name) ? [] : [`could not fetch ${choice.name} from origin; comparing with the copy here`];
}

function branchBase(record: RecordInfo, recordDir: string): BaseChoice {
  const choice = chooseBase(record, undefined);
  return choice.source === "parent_branch" ? { ...choice, name: parentBranchName(recordDir, record.repo!, choice.name) } : choice;
}

export async function captureRecord(recordDir: string, env: CaptureEnv): Promise<SnapshotResult> {
  const dir = resolve(recordDir);
  const record = readRecord(dir);
  const { repo, kind } = record;
  if (!repo || !kind) throw new Error(`${dir} isn't a branch or review record`);
  const body = readFileSync(join(dir, "index.md"), "utf8");
  const review = kind === "reviews";
  if (review && !/^\d+$/.test(record.branch)) throw new Error(`${record.branch} isn't a PR number, so its head can't be fetched; use \`differential-review snapshot\` with --head and --base`);
  const base = review
    ? chooseBase(record, JSON.parse(env.gh(["pr", "view", record.branch, "-R", `${upstreamOwner(repo, [body])}/${repo}`, "--json", "baseRefName"])).baseRefName as string)
    : branchBase(record, dir);
  const worktree = checkout({ ...record, repo, kind }, body, env.home);
  const warnings = refreshBase(worktree, base);
  const branch = review ? record.branch : recordBranchName(record.branch, repo, body);
  const head = review ? fetched(worktree, "origin", `pull/${record.branch}/head`) : branchHead(worktree, branch);
  if (!head) throw new Error(`could not fetch PR #${record.branch} from origin in ${worktree}`);
  const reviewDir = recordReviewDir(dir);
  const latest = (await readAllSnapshots(snapshotReader(nodeReadAdapter, reviewDir))).at(-1);
  const phase: Phase = latest?.head === head ? latest.phase : review ? "review" : "revision";
  const result = await createSnapshot({ worktree, dir: reviewDir, phase, branch, repo, base, head });
  return { ...result, warnings: [...warnings, ...result.warnings] };
}

export function captureMessage({ status, snapshot, warnings }: SnapshotResult): string {
  const at = snapshot.head.slice(0, 12);
  const message = status === "created" ? `Snapshot taken of ${snapshot.branch} at ${at}, against ${snapshot.base.ref}` : `Already snapshotted ${snapshot.branch} at ${at}`;
  return [message, ...warnings].join("\n");
}

const USAGE = `usage: differential-review capture --record <dir>

Snapshots a branch or review record from what its index.md and GitHub say, with no worktree or flags.
Fetches the base and the head; never touches a checkout. Plugins' snapshot buttons run this.

  --record <dir>    record dir: vault/repositories/<repo>/{branches,reviews}/<status>/<name>`;

export const CAPTURE_SUMMARY = "  capture   snapshot a record from what it says, with no worktree or flags";

export async function captureCommand(argv: string[], io: Io): Promise<number> {
  try {
    let values: { record?: string; help?: boolean };
    try {
      ({ values } = parseArgs({ args: argv, options: { record: { type: "string" }, help: { type: "boolean", short: "h" } }, allowPositionals: false }));
    } catch (e) {
      throw new UsageError((e as Error).message);
    }
    if (values.help) {
      io.out(USAGE);
      return 0;
    }
    if (!values.record) throw new UsageError("--record is required");
    io.out(captureMessage(await captureRecord(values.record, realEnv())));
    return 0;
  } catch (e) {
    if (e instanceof UsageError) {
      io.err(`usage error: ${e.message}\n${USAGE}`);
      return 2;
    }
    io.err(`error: ${(e as Error).message}`);
    return 1;
  }
}

export const captureRecordHere = (recordDir: string): Promise<SnapshotResult> => captureRecord(recordDir, realEnv());
