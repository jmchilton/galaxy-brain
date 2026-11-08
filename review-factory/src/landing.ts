// The record landing page's one-line status. No Node imports.
import { type ComposeContext, composeGates } from "./gates";
import { ACTIONS } from "./model";
import { trimLine } from "./status";

const label = (action: string): string => action.replace(/_/g, " ");

export function statusLine(ctx: ComposeContext): string {
  const trim = trimLine(ctx.file);
  if (trim) return trim;
  const pr = ctx.file.actions.pull_request && !ctx.prUrl;
  const { errors } = composeGates(ctx, pr ? "pr" : "comment");
  if (errors.length) return `⛔ ${errors[0]}${errors.length > 1 ? ` (+${errors.length - 1} more)` : ""}`;
  if (pr) return "✅ Ready to open the PR";
  return `✅ Ready to ${ACTIONS.filter((a) => ctx.file.actions[a]).map(label).join(", ")}`;
}
