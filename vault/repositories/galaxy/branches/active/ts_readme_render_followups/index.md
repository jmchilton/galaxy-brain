# ts_readme_render_followups

Status: `branches_implemented_needs_ci`. Base: `dev`.

Base: `dev`. Branch: [`jmchilton:ts_readme_render_followups`](https://github.com/jmchilton/galaxy/tree/ts_readme_render_followups). Worktree: `~/projects/worktrees/galaxy/branch/ts_readme_render_followups`.

Merges [`ts_readme_render_fix_26.1`](../../merged/ts_readme_render_fix_26.1/index.md) into `dev`, then fixes old-revision READMEs (found when unchanged in that changeset; images served as of that revision via a `changeset_revision` option on the image route), makes revision permalinks load READMEs, and drops dead README code. Playwright test with screenshots.

[Implementation](implementation_debrief.md) · [Initial implementation](initial_implementation_debrief.md) · [Normal review](subagents/normal_review.md) · [Image route review](subagents/normal_review_image_route.md) · [Codex review](codex_review.md) · [Test challenges](test_challenges_debrief.md) · [E2E polish](polish_e2e_tests_debrief.md) · [Screenshots](screenshot_debrief.md) · [Thermo-nuclear review](thermo_nuclear_review.md) · [Scope evaluation](scope_evaluation.md) · [Earlier drafts](earlier_drafts/1/implementation_debrief.md)

Depends on `ts_readme_render_fix_26.1` (merged in as real history, so either order works and the release forward merge stays clean). Requested by John 2026-10-11. Replaces the local `ts_readme_render_fix_dev` sibling.

## TICK — 2026-10-11

Live fork tip `5abfc5c4aadf69c422a3b863a6a22b076d2b9aed` has queued/pending CI and no failures; retain needs CI. Its existing release-base dependency is now represented by draft #24053.

## TICK — 2026-10-12

Fork SHA `5abfc5c4aadf69c422a3b863a6a22b076d2b9aed` is settled. [Python lint](https://github.com/jmchilton/galaxy/actions/runs/38163420790) and [package tests](https://github.com/jmchilton/galaxy/actions/runs/38163420762) report a relevant `str | None` argument to `readmes()` at the new test_readme_util.py:97. [OpenAPI lint](https://github.com/jmchilton/galaxy/actions/runs/38163420657) also detects generated client schema drift; its relation to the changed route still needs diagnosis. [Integration](https://github.com/jmchilton/galaxy/actions/runs/38163420663) fails before tests downloading kubeadm (TLS handshake timeout), unrelated. Tool Shed, Playwright, integration-Selenium, API and unit workflows pass. Retain needs CI; the earlier “open after #24053” dependency remains. No code fixes inferred.

Requested failed-job reruns for the recorded unrelated failures: [run 38163420663](https://github.com/jmchilton/galaxy/actions/runs/38163420663). All requests were accepted; this does not claim a passing rerun or recover an evicted client cache/artifact.

## Morning refresh — 2026-10-16

Conflict preview against `origin/dev` at `5abfc5c4aadf69c422a3b863a6a22b076d2b9aed` found overlapping changes in 2 paths (`lib/tool_shed/util/readme_util.py`, `test/unit/tool_shed/test_readme_util.py`). These include behavior/schema/assertion changes beyond a small mechanical rebase; fork and development worktree left intact. Existing status/review holds remain.
