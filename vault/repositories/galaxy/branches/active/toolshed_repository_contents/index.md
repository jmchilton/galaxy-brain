# toolshed_repository_contents

Status: `branches_ready_for_final_review`. Base: `release_26.2`. Head `f4b0af72e73`.

Adds a bounded repository-files API and Tool Shed contents browser (#22598).

**Final review:** [PR description](pr_description.md) · [titles](pr_titles.md) · [polish debrief](polish_debrief.md) (open questions at the bottom) · [checklist evaluation](checklist_evaluation.md)

[Implementation](implementation_debrief.md) · [initial implementation](initial_implementation_debrief.md) · [plan](plan.md) · [Tracking history](tracking_history.md)

Process: [test challenges](test_challenges_debrief.md) · [E2E polish](polish_e2e_tests_debrief.md) · [Codex review](codex_review.md) · [thermo-nuclear review](thermo_nuclear_review.md) · [scope](scope_evaluation.md) · [screenshots](screenshot_debrief.md)

## TICK — 2026-10-11

Live fork head `682b8a68fbf51e5405d3cf84ceaf4818d6523305`: Tool Shed/API/unit/lint and Playwright/integration-Selenium checks pass. The sole red Selenium workflow failed pulling its job container (`toomanyrequests`), before tests; [run 37950058968](https://github.com/jmchilton/galaxy/actions/runs/37950058968) failed jobs rerun. Relevant Tool Shed coverage ran; promoted on diagnosed unrelated CI red.

## TICK — 2026-10-13 evening

Requested failed-job reruns for recorded unrelated failures: [run 37950058968](https://github.com/jmchilton/galaxy/actions/runs/37950058968). All requests accepted. These reruns are pending coverage, not passing results; branch classification is unchanged.

## Recovery — 2026-10-15

Ran the missing after-plan steps. Scope kept as implemented. Pushed 10 fast-forward commits, `682b8a68fbf..8da4d6854a9`, including a fix for the `RepositoryPage` revision regression Codex found. The TICK CI evidence above covers `682b8a68fbf` only, so the branch is back in `branches_implemented_needs_ci` until the new head's CI runs.

## Retarget to release_26.2 — 2026-10-15

Rebased the 26 commits cleanly onto `origin/release_26.2` and force-pushed with lease (`8da4d6854a9` → `2effc539aff`). Added `6521d02fde2` (`Vary: Origin` from `APICorsRoute`), because the files routes are the first ones that are both CORS-enabled and publicly cacheable. After the [review](subagents/vary_origin_review.md), the head is `7fe3b228ee7`. No CI has run on it yet. Details: [implementation debrief](implementation_debrief.md).

## Polish — 2026-10-15

Polished, and pushed 3 fast-forward commits (`7fe3b228ee7..f4b0af72e73`):
- a stale comment fix;
- a test that unbounded revisions 404 without opening hg;
- an hgweb comment correction.

John decided to keep the install-count icon swap and call it out in the description. Fork CI hadn't reported on either head when polishing ended. See the [polish debrief](polish_debrief.md).
