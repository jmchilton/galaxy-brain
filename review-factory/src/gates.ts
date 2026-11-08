// Cross-field checks on findings YAML, and the refusals compose applies before writing anything. No Node imports.
import {
  COMMENT_ACTIONS,
  FINDING_TEXT_FIELDS,
  type FindingsFile,
  FILTERED_ID,
  includedFindings,
  latestBranch,
  POSTABLE_ID,
} from "./model";
import { trimLine } from "./status";

/** Everything compose reads, already loaded from the record. */
export interface ComposeContext {
  file: FindingsFile;
  repo: string;
  pr: number;
  commentNote: string | null;
  prNote: string | null;
  humanReview: string | null;
  risks: string | null;
  followupIssue: string | null;
  learningIssue: boolean;
  prUrl?: string;
}

export type Mode = "comment" | "pr";

export interface GateResult {
  errors: string[];
  warnings: string[];
}

export const commentNoteName = (round: number): string => `johns_review_${round}_comment_note.md`;
export const prNoteName = (round: number): string => `johns_review_${round}_pr_note.md`;

const PLACEHOLDER = /\(space for John's free style comments[^)]*\)/g;
const HTML_COMMENT = /<!--[\s\S]*?-->/g;

/** A note's posted text: HTML comments and the old placeholder removed. */
export const noteText = (note: string | null): string => (note ?? "").replace(HTML_COMMENT, "").replace(PLACEHOLDER, "").trim();
export const noteIsEmpty = (note: string | null): boolean => !noteText(note);

const label = (action: string): string => action.replace(/_/g, " ");

/** Shape rules JSON-style schemas can't express. */
export function fileGates(file: FindingsFile): string[] {
  const errors: string[] = [];
  const counts = new Map<string, number>();
  for (const f of file.findings) counts.set(f.id, (counts.get(f.id) ?? 0) + 1);
  for (const [id, n] of counts) if (n > 1) errors.push(`${id} is used by ${n} findings`);
  const profiles = new Set(file.agents.map((a) => a.profile));
  if (profiles.size !== file.agents.length) errors.push("agents lists a profile twice");
  for (const f of file.findings) {
    const filteredId = FILTERED_ID.test(f.id);
    if (!filteredId && f.filtered) errors.push(`${f.id}: only F items are filtered`);
    if (filteredId && !f.filtered) errors.push(`${f.id}: F items need filtered`);
    if (!filteredId && !f.issue) errors.push(`${f.id}: missing issue`);
    for (const d of f.discovered_by) if (!profiles.has(d.profile)) errors.push(`${f.id}: discovered by ${d.profile}, which isn't in agents`);
  }
  const names = new Set<string>();
  file.branches.forEach((branch, i) => {
    const at = `branches[${i}]`;
    if (names.has(branch.name)) errors.push(`${at}: ${branch.name} is listed twice`);
    names.add(branch.name);
    const previous = file.branches[i - 1];
    if (previous && branch.revision <= previous.revision) errors.push(`${at}: revision ${branch.revision} must be above the previous ${previous.revision}`);
    const shas = new Set<string>();
    for (const commit of branch.commits) {
      if (shas.has(commit.sha)) errors.push(`${at}: commit ${commit.sha} is listed twice`);
      shas.add(commit.sha);
      for (const id of commit.findings) {
        if (FILTERED_ID.test(id)) errors.push(`${at} commit ${commit.sha}: ${id} is filtered; trim gives a finding a P id before a commit can fix it`);
        else if (!counts.has(id)) errors.push(`${at} commit ${commit.sha}: no finding ${id}`);
      }
    }
  });
  const latest = latestBranch(file);
  if (latest?.commits.length && !latest.description) errors.push(`${latest.name}: missing description`);
  return errors;
}

const CODE = /```[\s\S]*?```|`[^`\n]*`/g;
const MENTION = /(?<![\w`@])@([A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)/g;

/** GitHub logins @-mentioned outside code. */
export function mentions(text: string): string[] {
  return [...text.replace(CODE, "").matchAll(MENTION)].map((m) => m[1]!);
}

const CITATION = /\bP[123] \d+\b/g;

/** Text agents wrote that compose would post, by where it came from. */
function agentText(ctx: ComposeContext): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  for (const f of includedFindings(ctx.file)) {
    out.push([f.id, [f.title, ...FINDING_TEXT_FIELDS.map((k) => f[k] ?? "")].join("\n")]);
  }
  const latest = latestBranch(ctx.file);
  if (latest) out.push([latest.name, [latest.pr_title, latest.description, ...latest.commits.flatMap((c) => [c.subject, c.detail])].join("\n")]);
  if (ctx.risks) out.push(["risks.md", ctx.risks]);
  if (ctx.followupIssue) out.push(["followup_refactor_issue.md", ctx.followupIssue]);
  return out;
}

const HUMAN_REVIEW_SHA = /\b[0-9a-f]{7,40}\b/g;

export function composeGates(ctx: ComposeContext, mode: Mode): GateResult {
  const { file } = ctx;
  const { actions } = file;
  const errors = fileGates(file);
  const warnings: string[] = [];
  const checked = COMMENT_ACTIONS.filter((a) => actions[a]);
  if (!checked.length) errors.push(`check one of ${COMMENT_ACTIONS.map(label).join(", ")}`);
  if (checked.length > 1) errors.push(`check only one of ${checked.map(label).join(", ")}`);
  if (noteIsEmpty(ctx.commentNote)) errors.push(`${commentNoteName(file.round)} is empty`);
  const included = new Set(includedFindings(file).map((f) => f.id));
  for (const [name, note] of [["comment note", ctx.commentNote], ["PR note", ctx.prNote]] as const) {
    for (const id of new Set(noteText(note).match(CITATION) ?? [])) if (!included.has(id)) errors.push(`the ${name} cites ${id}, which isn't included`);
  }
  for (const f of includedFindings(file)) if (!POSTABLE_ID.test(f.id)) errors.push(`${f.id} is included; trim must verify it and give it a P id`);
  const trim = trimLine(file);
  if (trim) errors.push(trim);
  for (const [where, text] of agentText(ctx)) for (const login of new Set(mentions(text))) errors.push(`${where} mentions @${login}; put it in backticks or drop the @`);
  const branchCommits = latestBranch(file)?.commits.length ?? 0;
  if (actions.pull_request) {
    if (noteIsEmpty(ctx.prNote)) errors.push(`${prNoteName(file.round)} is empty`);
    if (!branchCommits) errors.push("Pull request is checked but the review branch has no commits");
    else if (!latestBranch(file)!.pr_title) errors.push(`${latestBranch(file)!.name}: missing pr_title`);
    if (actions.push) errors.push("check Pull request or Push, not both");
    if (mode === "comment" && !ctx.prUrl) errors.push("Pull request is checked: run `compose pr`, open the PR, then `compose comment --pr-url <url>`");
  } else if (mode === "pr") errors.push("Pull request isn't checked");
  if (actions.push && !branchCommits) errors.push("Push is checked but the review branch has no commits");
  if (actions.issue_refactor && !ctx.followupIssue) errors.push("Issue (refactor) is checked but there's no followup_refactor_issue.md");
  if (actions.issue_galaxy_brain && !ctx.learningIssue) errors.push("Issue (galaxy-brain) is checked but there's no learning_galaxy_followup_issue.md");
  if (ctx.followupIssue && !file.followup_target) errors.push("followup_refactor_issue.md needs followup_target");
  if (ctx.humanReview) {
    const shas = ctx.humanReview.match(HUMAN_REVIEW_SHA) ?? [];
    const other = shas.find((sha) => !file.reviewed_commit.startsWith(sha));
    if (other && !shas.some((sha) => file.reviewed_commit.startsWith(sha))) warnings.push(`human_review.md names ${other}, not the reviewed commit ${file.reviewed_commit.slice(0, 11)}`);
  }
  return { errors, warnings };
}
