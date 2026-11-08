// Posted review text, composed from findings YAML and John's notes. No Node imports.
import { FORK_OWNER } from "../../site/src/lib/repository-tabs";
import { type ComposeContext, composeGates, type GateResult, type Mode, noteText } from "./gates";
import { type Branch, type Discovery, type Finding, type FindingsFile, includedFindings, latestBranch } from "./model";

export const GITHUB_BODY_LIMIT = 65536;

const AGENTS_URL = "https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents";
const PROCESS_URL = `${AGENTS_URL}/_shared/PROCESS_INITIAL_REVIEW.md`;
const FACTORY_LINE = "Reviewed with [John's Galaxy Brain Review Factory](https://galaxy-brain.jmchilton.net/factory/galaxy-reviews/).";

const ABOUT_FINDINGS = `<details><summary>About findings</summary>

These are broken into P1 (must fix), P2 (should fix), and P3 (smaller nits). These ratings are agent defined and the priority to John may be different and called out above. If anything is rated P3 and not called out as important by John above - please don't feel compelled to act on them or respond to them.

You're contributing to a repository John cares about and you deserve a human response. If any of these don't make sense or are missing important context - please push back and accept John's apology.

</details>`;

const NO_FINDINGS = [
  "- What is this magic 🪄 - no findings! What a trick you pulled off here.",
  "- Exit 0 from these Unix-y agents 🐧 - everything must be okay.",
  "- Heroic effort 🦸 - none of the agents found issues.",
];

const details = (summary: string, body: string): string => `<details><summary>${summary}</summary>\n\n${body.trim()}\n\n</details>`;

const blocks = (parts: Array<string | null | undefined | false>): string => `${parts.filter(Boolean).join("\n\n")}\n`;

const list = (items: string[]): string =>
  items.length < 3 ? items.join(" and ") : `${items.slice(0, -1).join(", ")}, and ${items.at(-1)}`;

class Links {
  constructor(private readonly repo: string, private readonly file: FindingsFile) {}

  tree = (branch: string): string => `https://github.com/${FORK_OWNER}/${this.repo}/tree/${branch}`;
  commit = (sha: string): string => `https://github.com/${FORK_OWNER}/${this.repo}/commit/${sha}`;
  profile = (profile: string): string => {
    const path = this.file.agents.find((a) => a.profile === profile)?.path;
    return `[${profile}](${AGENTS_URL}/${path})`;
  };

  private knownSha(token: string): boolean {
    if (!/^[0-9a-f]{7,40}$/.test(token)) return false;
    const shas = [this.file.reviewed_commit, ...this.file.branches.flatMap((b) => [b.head, ...b.commits.map((c) => c.sha)])];
    return shas.some((sha) => sha.startsWith(token) || token.startsWith(sha));
  }

  /** Links backticked branch names and known commit SHAs that aren't links yet. */
  inline(text: string, branch: Branch): string {
    return text.replace(/(?<!\[)`([^`\n]+)`(?!\]\()/g, (span, token: string) => {
      if (token === branch.name) return `[${span}](${this.tree(token)})`;
      return this.knownSha(token) ? `[${span}](${this.commit(token)})` : span;
    });
  }
}

function agentDetails(ctx: ComposeContext): string {
  const { file } = ctx;
  const links = new Links(ctx.repo, file);
  const runs = file.agents.map((a) => `- Review profile ${links.profile(a.profile)} was run via ${a.model} at ${a.effort} effort.`);
  runs.push(`- Verification was run as documented [here](${PROCESS_URL}) via ${file.verification.model} at ${file.verification.effort} effort.`);
  return details("Automated Review Details", blocks([ctx.repo === "galaxy" && FACTORY_LINE, runs.join("\n")]));
}

function branchBlock(ctx: ComposeContext, branch: Branch): string {
  const links = new Links(ctx.repo, ctx.file);
  const commits = branch.commits.map((c) => `- [\`${c.sha}\`](${links.commit(c.sha)}) ${c.detail ? `${c.subject}: ${c.detail.trim()}` : c.subject}`);
  const inner = details("Branch and Commit Details", blocks([links.inline(branch.description!.trim(), branch), commits.join("\n")]));
  const intro = `This [review branch](${links.tree(branch.name)}) contains work the verification agent did to help verify findings and make sure suggestions make sense and are actionable. This doesn't necessarily represent production ready code. Feel free to include any commits in the PR but they should be reviewed by a human.`;
  return details("Review Verification Branch Details", blocks([intro, inner]));
}

const discovery = (links: Links, d: Discovery): string => `${links.profile(d.profile)} via ${d.model} at ${d.effort} effort`;

function findingBlock(ctx: ComposeContext, f: Finding, branch: Branch | undefined): string {
  const { file } = ctx;
  const links = new Links(ctx.repo, file);
  const fixes = (branch?.commits ?? []).filter((c) => c.findings.includes(f.id)).map((c) => `[\`${c.sha}\`](${links.commit(c.sha)})`);
  const verified = f.implementation_verified ? ` Verified via ${file.verification.model} at ${file.verification.effort} effort.` : "";
  const provenance = `Discovered by ${list(f.discovered_by.map((d) => discovery(links, d)))}.${verified}`;
  return blocks([
    `### ${f.id}: ${f.title}${f.implementation_verified ? " (implementation verified)" : ""}`,
    f.issue!.trim(),
    f.issue_details && details("Details", f.issue_details),
    f.evidence && details("Evidence", f.evidence),
    f.fix?.trim(),
    f.fix_details && details("Details", f.fix_details),
    fixes.length > 0 && `Fixed on the review branch in ${list(fixes)}.`,
    details("Discovery & Verification Agent Details", provenance),
  ]).trimEnd();
}

function fence(text: string): string {
  const longest = Math.max(2, ...(text.match(/`+/g) ?? []).map((run) => run.length));
  return "`".repeat(longest + 1);
}

function followup(ctx: ComposeContext): string | null {
  if (!ctx.followupIssue) return null;
  const issue = ctx.followupIssue.trim();
  const marks = fence(issue);
  return details(
    `Suggested Follow-Up Refactoring for ${ctx.file.followup_target}`,
    `Here's draft text for a follow-up issue covering refactorings this review recommends that don't fit this PR or its target branch. When creating the issue, feel free to assign John (jmchilton).\n\n${marks}markdown\n${issue}\n${marks}`,
  );
}

/** Agent details through the follow-up issue: everything but John's note and the human review. */
function reviewBlocks(ctx: ComposeContext): string[] {
  const findings = includedFindings(ctx.file);
  const branch = latestBranch(ctx.file);
  const withBranch = branch?.commits.length ? branch : undefined;
  const out = [agentDetails(ctx)];
  if (ctx.risks?.trim()) out.push(details("Risks", ctx.risks));
  if (!findings.length) out.push(NO_FINDINGS[ctx.pr % 3]!);
  else {
    out.push("## Automated Review Findings", ABOUT_FINDINGS);
    if (withBranch) out.push(branchBlock(ctx, withBranch));
    out.push(...findings.map((f) => findingBlock(ctx, f, withBranch)));
  }
  const issue = followup(ctx);
  if (issue) out.push(issue);
  return out;
}

const humanReview = (ctx: ComposeContext): string | null => (ctx.humanReview?.trim() ? `## Human Review\n\n${ctx.humanReview.trim()}` : null);

/** The comment or review on the reviewed PR; with Pull request checked, it only links the PR. */
export function composeComment(ctx: ComposeContext): string {
  const head = [noteText(ctx.commentNote), humanReview(ctx)];
  if (ctx.file.actions.pull_request) {
    return blocks([...head, `The automated review findings, and a branch with fixes for them, are in ${ctx.prUrl}.`]);
  }
  return blocks([...head, ...reviewBlocks(ctx)]);
}

/** The body of the PR from the review branch. */
export const composePrBody = (ctx: ComposeContext): string => blocks([noteText(ctx.prNote), ...reviewBlocks(ctx)]);

/** The body for a mode, or null with every reason it was refused. */
export function compose(ctx: ComposeContext, mode: Mode): GateResult & { body: string | null } {
  const gates = composeGates(ctx, mode);
  if (gates.errors.length) return { ...gates, body: null };
  const body = mode === "pr" ? composePrBody(ctx) : composeComment(ctx);
  if (body.length > GITHUB_BODY_LIMIT) {
    const what = mode === "pr" ? "the PR body" : "the comment";
    return { ...gates, errors: [`${what} is ${body.length} characters; GitHub allows ${GITHUB_BODY_LIMIT}`], body: null };
  }
  return { ...gates, body };
}
