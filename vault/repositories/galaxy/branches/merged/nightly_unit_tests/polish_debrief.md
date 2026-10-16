# Nightly CI polish — 2026-10-14

Final head: `b2a792c206ded6040be900adef9b4b52f3819719`, pushed to the jmchilton fork. Base: dev (`36fe2ce8428`), current at fetch; no rebase needed. Status: `branches_ready_for_final_review`; no approval SHA is assigned and no PR was opened or GitHub comment/issue posted.

## Outcome

An independent GENERAL checklist review found no correctness blocker but required three tracking-issue text corrections: qualify PR behavior as targeting dev and acknowledge release/Tuesday coverage rather than calling nightlies the only coverage. Those fixes were committed and pushed, and the reviewer rechecked them successfully. WORKFLOW_RELATED does not apply to GitHub Actions changes.

The description makes the coverage tradeoff, performance CI removal, release exceptions, and upstream-only reporting explicit. Existing agentic review records are included with their original coverage limits. Four title choices are provided. One fresh strengthening round requested an additional highlighted release/reporting-scope sentence; it was applied. No additional development was requested. The human-read checklist item remains unchecked.

## Verification and CI

- Reporter harness: all seven cases pass before and after the fix.
- Commit-hook Validate GitHub Workflows and whitespace checks pass; final diff against dev is whitespace-clean.
- Fork zizmor on the final SHA is green: [run 38594196807](https://github.com/jmchilton/galaxy/actions/runs/38594196807).
- Final-head [unit](https://github.com/jmchilton/galaxy/actions/runs/38594197278), [Tool Shed](https://github.com/jmchilton/galaxy/actions/runs/38594196907), and [framework](https://github.com/jmchilton/galaxy/actions/runs/38594196658) CI remain in progress at the last refresh, with no reported failures. Earlier changed-suite jobs were executing the expected 3.14/both-client and 3.10/never matrices. This is not a claim of fully green CI.
- Vault `make validate`: 122 files, zero errors, 15 existing advisory warnings. Tracking artifacts are excluded from vault frontmatter validation. No frontmatter/config changes require index/dashboard regeneration.

## Remaining human/upstream checks

Read the tests/comments and choose a title. Wait for CI results before approving a PR-opening SHA. Check the first upstream fork-PR startup and dispatch all three suites on upstream dev after merge to exercise full matrices/reporting; these checks cannot be completed by local polishing.

[Checklist](polish_checklist.md) · [Strengthening](polish_strengthening.md) · [Description](pr_description.md) · [Titles](pr_titles.md)
