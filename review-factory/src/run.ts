// review-factory CLI: validate findings YAML, report a record's status, and compose posted text.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { basename, join } from "node:path";
import { parseArgs } from "node:util";
import { checkout } from "../../differential-review/src/capture";
import { readRecord } from "../../differential-review/src/record";
import { branchGates } from "./branch-gates";
import { compose } from "./compose";
import { composeGates, fileGates, type Mode } from "./gates";
import { statusLine } from "./landing";
import { latestBranch } from "./model";
import { parseFindings } from "./parse";
import { loadRecord } from "./record";
import { trimWork } from "./status";

export interface Io {
  out(line: string): void;
  err(line: string): void;
}

class UsageError extends Error {}

const USAGE = `usage: review-factory <command> [options]

  validate [path...]                     check every review_<N>_findings.yml under the paths (default vault/repositories)
  status --record <dir> [--json]         the record's status, trim work and refusals, without git
  compose comment --record <dir> [--pr-url <url>] [--no-git]
                                         the comment or review for the reviewed PR
  compose pr --record <dir> [--title] [--no-git]
                                         the body (or title) of the PR from the review branch

compose prints to stdout and writes nothing; it prints nothing if any check refuses.`;

const FINDINGS_FILE = /^review_\d+_findings\.yml$/;

function findingsFiles(path: string): string[] {
  if (!statSync(path).isDirectory()) return [path];
  return readdirSync(path, { recursive: true, encoding: "utf8" })
    .filter((rel) => FINDINGS_FILE.test(basename(rel)) && !rel.split(/[\\/]/).includes("node_modules"))
    .map((rel) => join(path, rel))
    .sort();
}

function validate(paths: string[], io: Io): number {
  const files = (paths.length ? paths : ["vault/repositories"]).flatMap(findingsFiles);
  let bad = 0;
  for (const path of files) {
    const { file, errors } = parseFindings(readFileSync(path, "utf8"));
    const round = Number(/review_(\d+)_findings/.exec(basename(path))?.[1]);
    const all = file ? [...errors, ...fileGates(file), ...(file.round === round ? [] : [`says round ${file.round}`])] : errors;
    if (!all.length) continue;
    bad++;
    for (const error of all) io.err(`${path}: ${error}`);
  }
  io.out(`${files.length - bad} of ${files.length} findings files valid`);
  return bad ? 1 : 0;
}

type Options = Record<string, { type: "string" } | { type: "boolean" }>;

function parse<O extends Options>(argv: string[], options: O) {
  try {
    return parseArgs({ args: argv, options: { ...options, record: { type: "string" as const } }, allowPositionals: true });
  } catch (e) {
    throw new UsageError((e as Error).message);
  }
}

function status(argv: string[], io: Io): number {
  const { values } = parse(argv, { json: { type: "boolean" } });
  if (!values.record) throw new UsageError("--record is required");
  const loaded = loadRecord(values.record as string);
  if (!loaded.ctx) {
    if (values.json) io.out(JSON.stringify({ round: loaded.round, errors: loaded.errors }, null, 2));
    else for (const error of [`⚠️ ${basename(loaded.findingsPath)} has errors`, ...loaded.errors]) io.out(error);
    return 1;
  }
  const { ctx } = loaded;
  const gates = composeGates(ctx, ctx.file.actions.pull_request ? "pr" : "comment");
  const report = { round: loaded.round, status: statusLine(ctx), trim: trimWork(ctx.file), errors: gates.errors, warnings: gates.warnings };
  if (values.json) io.out(JSON.stringify(report, null, 2));
  else for (const line of [report.status, ...gates.errors.map((e) => `  ⛔ ${e}`), ...gates.warnings.map((w) => `  ⚠️ ${w}`)]) io.out(line);
  return 0;
}

function composeCommand(argv: string[], io: Io): number {
  const { values, positionals } = parse(argv, { "pr-url": { type: "string" }, title: { type: "boolean" }, "no-git": { type: "boolean" } });
  const mode = positionals[0] as Mode | undefined;
  if (mode !== "comment" && mode !== "pr") throw new UsageError("compose comment or compose pr");
  if (!values.record) throw new UsageError("--record is required");
  const loaded = loadRecord(values.record as string, values["pr-url"] as string | undefined);
  if (!loaded.ctx) {
    for (const error of loaded.errors) io.err(`error: ${error}`);
    return 1;
  }
  const result = compose(loaded.ctx, mode);
  if (!values["no-git"]) {
    const record = readRecord(loaded.dir);
    const body = readFileSync(join(loaded.dir, "index.md"), "utf8");
    const git = branchGates(loaded.ctx, checkout({ ...record, repo: record.repo!, kind: "reviews" }, body, homedir()));
    result.errors.push(...git.errors);
    result.warnings.push(...git.warnings);
  }
  for (const warning of result.warnings) io.err(`warning: ${warning}`);
  if (result.errors.length || !result.body) {
    for (const error of result.errors) io.err(`error: ${error}`);
    return 1;
  }
  io.out(mode === "pr" && values.title ? latestBranch(loaded.ctx.file)!.pr_title! : result.body.trimEnd());
  return 0;
}

export async function run(argv: string[], io: Io): Promise<number> {
  const [command, ...rest] = argv;
  try {
    if (!command || command === "--help" || command === "-h") {
      io.out(USAGE);
      return command ? 0 : 2;
    }
    if (command === "validate") {
      const missing = rest.filter((p) => !existsSync(p));
      if (missing.length) throw new UsageError(`no such path ${missing.join(", ")}`);
      return validate(rest, io);
    }
    if (command === "status") return status(rest, io);
    if (command === "compose") return composeCommand(rest, io);
    throw new UsageError(`unknown command ${command}`);
  } catch (e) {
    if (e instanceof UsageError) {
      io.err(`usage error: ${e.message}\n${USAGE}`);
      return 2;
    }
    io.err(`error: ${(e as Error).message}`);
    return 1;
  }
}
