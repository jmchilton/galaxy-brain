# Implementation debrief

**STATUS: READY.** Head `4352a0f4ff6`, 6 commits on `release_26.2`. Needs CI: Selenium has not run locally (no chromedriver), and the fork runs no Selenium E2E workflow.

## What happened

- John asked for a retarget (`dev` → `release_26.2`) and a hardening pass, since the branch never got one. The rebase was clean, and no caller of the dropped selectors exists on 26.2.
- Hardening pass 1 ([earlier_drafts/1](earlier_drafts/1/)): the test challenge found a Multiview bug. In `historyDragDrop.ts`, `&&` needed to be `||`: after a drop of only datasets, or only collections, the copy succeeded on the server but the target column didn't refresh. The scope evaluation recommended expanding, so this was re-scoped per [implementation_rescope_debrief.md](implementation_rescope_debrief.md). The original scope is kept as [alt](alts/original_scope.md) `selenium_multiview_copy_alt_original_scope`.
- Re-harden pass 2, all steps fresh:
  - [Test challenge](test_challenges_debrief.md): vitest moved to MSW, and one vitest case that duplicated the E2E test was dropped.
  - [E2E polish](polish_e2e_tests_debrief.md): added a shared `_wait_for_text` helper.
  - [Codex](codex_review.md): no findings.
  - [Thermo-nuclear](thermo_nuclear_review.md): no code change.
  - [Baseline refactor](baseline_refactor.md): no change, since the selector drop is already split out.
  - [Scope](scope_evaluation.md): keep.
  - [Screenshots](screenshot_debrief.md): before and after of the fix.

## Final shape

1. Baseline tests for `useHistoryDragDrop` (4 cases, pass on unfixed code)
2. Drop unused Multiview selectors
3. Point Multiview selectors at real per-history hooks
4. `multi_history_copy_item` helper + copy E2E test
5. Switch-from-column E2E test
6. Fix `&&` → `||`, plus 2 vitest cases and the target-column E2E check

Tests: vitest 6/6, and the 2 fix-commit cases fail under `&&`. Playwright `test_history_multi_view.py` 6/6. The strengthened copy E2E test times out under `&&`.

## Decisions for John

- **Base:** `release_26.2` as asked, but the bug exists back to `release_25.1`, where the fix line is identical, so a cherry-pick there is possible after merge.
- **Size:** +177 lines. `scope_evaluation.md` lists split options (fix first, hooks first, or three PRs) without picking one.
- **Dev follow-ups, out of scope here:**
  - Delete the always-true guard.
  - Reuse `copyHistoryItems`.
  - Add a SmartTarget "text equals" helper.
  - Nest/rename the column selectors (gxui drift).
- No `initial_implementation_debrief.md`: the branch predates that process (polish happened in gx_branches; see [polish_debrief.md](polish_debrief.md)).
