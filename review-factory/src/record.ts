// Loads a review record's latest findings round and everything compose reads beside it.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { readRecord } from "../../differential-review/src/record";
import { type ComposeContext, commentNoteName, prNoteName } from "./gates";
import { parseFindings } from "./parse";

const FINDINGS_FILE = /^review_(\d+)_findings\.yml$/;

export const findingsName = (round: number): string => `review_${round}_findings.yml`;

/** The highest round with a findings file, or null for records on the Markdown flow. */
export function latestRound(dir: string): number | null {
  const rounds = readdirSync(dir).flatMap((name) => {
    const m = FINDINGS_FILE.exec(name);
    return m ? [Number(m[1])] : [];
  });
  return rounds.length ? Math.max(...rounds) : null;
}

const readIf = (path: string): string | null => (existsSync(path) ? readFileSync(path, "utf8") : null);

export interface LoadedRecord {
  dir: string;
  round: number;
  findingsPath: string;
  /** Null when the findings YAML has errors. */
  ctx: ComposeContext | null;
  errors: string[];
}

export function loadRecord(recordDir: string, prUrl?: string): LoadedRecord {
  const dir = resolve(recordDir);
  const record = readRecord(dir);
  if (record.kind !== "reviews" || !record.repo || !/^\d+$/.test(record.branch)) throw new Error(`${dir} isn't a PR review record`);
  const round = latestRound(dir);
  if (round === null) throw new Error(`${dir} has no review_<N>_findings.yml`);
  const findingsPath = join(dir, findingsName(round));
  const { file, errors } = parseFindings(readFileSync(findingsPath, "utf8"));
  if (file && file.round !== round) errors.push(`${findingsName(round)} says round ${file.round}`);
  if (!file || errors.length) return { dir, round, findingsPath, ctx: null, errors };
  const roundDir = round === 0 ? dir : join(dir, `round_${round}`);
  const ctx: ComposeContext = {
    file,
    repo: record.repo,
    pr: Number(record.branch),
    commentNote: readIf(join(dir, commentNoteName(round))),
    prNote: readIf(join(dir, prNoteName(round))),
    humanReview: readIf(join(dir, "human_review.md")),
    risks: readIf(join(roundDir, "risks.md")),
    followupIssue: readIf(join(roundDir, "followup_refactor_issue.md")),
    learningIssue: existsSync(join(roundDir, "learning_galaxy_followup_issue.md")),
    prUrl,
  };
  return { dir, round, findingsPath, ctx, errors: [] };
}
