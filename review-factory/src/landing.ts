// The record landing page: its one-line status and the panel's model. No Node imports.
import { composeComment, composePrBody, findingBody, postedBranch } from "./compose";
import { type ComposeContext, commentNoteName, composeGates, type Mode, noteIsEmpty, prNoteName } from "./gates";
import { ACTIONS, type Action, byId, type Filtered, FILTERED_ID } from "./model";
import { trimLine } from "./status";

const label = (action: string): string => action.replace(/_/g, " ");

/** Pull request mode until the PR exists. */
const gateMode = (ctx: ComposeContext): Mode => (ctx.file.actions.pull_request && !ctx.prUrl ? "pr" : "comment");

export function statusLine(ctx: ComposeContext): string {
  const trim = trimLine(ctx.file);
  if (trim) return trim;
  const mode = gateMode(ctx);
  const { errors } = composeGates(ctx, mode);
  if (errors.length) return `⛔ ${errors[0]}${errors.length > 1 ? ` (+${errors.length - 1} more)` : ""}`;
  if (mode === "pr") return "✅ Ready to open the PR";
  return `✅ Ready to ${ACTIONS.filter((a) => ctx.file.actions[a]).map(label).join(", ")}`;
}

export const ACTION_LABELS: Record<Action, string> = {
  approve: "Approve",
  approve_and_merge: "Approve and merge",
  comment: "Comment",
  review_comment: "Review comment",
  request_changes: "Request changes",
  pull_request: "Pull request",
  push: "Push",
  issue_refactor: "Issue (refactor)",
  issue_galaxy_brain: "Issue (galaxy-brain)",
};

export interface LandingFinding {
  id: string;
  title: string;
  summary: string;
  include: boolean;
  filtered?: Filtered;
  /** Commits on the latest revision that fix it. */
  fixedIn: string[];
  /** Its posted text below the heading; F items have none. */
  text?: string;
}

export type NoteState = "missing" | "empty" | "written";

export interface Landing {
  status: string;
  errors: string[];
  warnings: string[];
  findings: LandingFinding[];
  filtered: LandingFinding[];
  notes: Array<{ name: string; state: NoteState }>;
  actions: Array<{ action: Action; label: string; checked: boolean }>;
  previews: { comment: string; pr: string | null };
}

const noteState = (note: string | null): NoteState => (note === null ? "missing" : noteIsEmpty(note) ? "empty" : "written");

export function landing(ctx: ComposeContext): Landing {
  const { file } = ctx;
  const branch = postedBranch(file);
  const applies: Partial<Record<Action, boolean>> = { pull_request: !!branch, push: !!branch, issue_refactor: !!ctx.followupIssue, issue_galaxy_brain: ctx.learningIssue };
  const items: LandingFinding[] = [...file.findings].sort(byId).map((f) => ({
    id: f.id,
    title: f.title,
    summary: f.summary,
    include: f.include,
    ...(f.filtered ? { filtered: f.filtered } : {}),
    fixedIn: (branch?.commits ?? []).filter((c) => c.findings.includes(f.id)).map((c) => c.sha),
    ...(f.issue ? { text: findingBody(ctx, f, branch) } : {}),
  }));
  const mode = gateMode(ctx);
  return {
    status: statusLine(ctx),
    ...composeGates(ctx, mode),
    findings: items.filter((f) => !FILTERED_ID.test(f.id)),
    filtered: items.filter((f) => FILTERED_ID.test(f.id)),
    notes: [
      { name: commentNoteName(file.round), state: noteState(ctx.commentNote) },
      { name: prNoteName(file.round), state: noteState(ctx.prNote) },
    ],
    actions: ACTIONS.filter((a) => applies[a] !== false || file.actions[a]).map((action) => ({ action, label: ACTION_LABELS[action], checked: file.actions[action] })),
    previews: {
      comment: composeComment(mode === "pr" ? { ...ctx, prUrl: "the review-branch PR" } : ctx),
      pr: branch ? composePrBody(ctx) : null,
    },
  };
}
