# extract_next_followups — implementation debrief (re-harden, 2026-10-17)

**STATUS: BLOCKED — scope decision.** The second scope evaluation recommends expanding again (E6/E7, optional E8). Per process, a second scope change parks for John instead of re-scoping again.

Head `9330c4c8feb` on `jmchilton/extract_next_followups` (63 commits on dev `5ff1e46b8c3`, 35 files, +2585/-1153). Original scope kept as `extract_next_followups_alt_original_scope` (`d4d504fb3c1`, [alt](alts/original_scope.md)). The pre-re-harden debrief is [earlier_drafts/1](earlier_drafts/1/implementation_debrief.md).

## What happened

1. **Rebase.** Onto dev `5ff1e46b8c3`. The GCard conflict was mechanical: dev re-indented the header; kept dev's markup plus `icon-only color="red"`.
2. **First hardening pass** ([earlier_drafts/2](earlier_drafts/2/)):
   - Test challenges: 9 redundant unit/vitest tests dropped, shared API helpers added, report reconcile de-mocked. 3 tests that pass on dev moved into 2 "Baseline tests" commits at the front (John approved `rebase -i`).
   - Codex: 3 confirmed and fixed. The input card with copies was unextractable from the form; indented galaxy fences leaked instance ids; a copied map output seeded its source collection.
   - E2E polish: sleeps replaced with waits; raw selectors moved to `navigation.yml`.
   - Thermo-nuclear: `IdKey` replaced by `ContentRef`; one `HistoryBoundary`.
   - Refactor baseline: 4 refactors moved right after the baselines (boundary `3d0a94fe38e`).
   - Scope evaluation: expand E1–E4.
3. **Re-scope E1–E4** ([debrief](implementation_rescope_debrief.md)):
   - E1: names not parallel to ids now give 400, not a 500.
   - E2: one input card per original, with one grouping rule (`group_inputs_by_original`).
   - E3: quoted labels in `invocation_inputs()`/`invocation_outputs()` expansion.
   - E4: `HistoryBoundary` covers hidden collection elements.
   - Two phases, each reviewed.
4. **Second hardening pass** (this directory):
   - [Test challenges](test_challenges_debrief.md): nothing dropped, tests tightened. Every E1–E4 test fails on pre-re-scope code.
   - [E2E polish](polish_e2e_tests_debrief.md): no changes.
   - [Codex](codex_review.md): F1 confirmed as a dev bug and fixed (a copied collection's card carried the inaccessible source id). F2 needs a decision.
   - [Thermo-nuclear](thermo_nuclear_review.md): one small cleanup.
   - [Refactor baseline](baseline_refactor.md): no further changes.
   - [Scope evaluation](scope_evaluation.md): expand again. This is where it parks.

## What the second scope evaluation wants (John decides)

- **E6:** expanded `invocation_inputs()`/`invocation_outputs()` sections should emit invocation object ids, so PDF export renders them instead of raw directives.
- **E7:** legacy HID `extract_steps` (used by bioblend's `extract_workflow_from_history`) should get the same "copies of one original are one input" rule. Today it wires to the last-seen copy's hid and can leave a tool input unconnected. Inferred, not reproduced.
- **E8 (optional):** build synthesized boundary rows from the in-history copy (the remaining half of Codex F1). Only if a cheap red test reproduces it.

Separate decisions, not scope:

- **Codex F2:** zero-input cross-history producers stay boundaries (the agent suggests keeping that).
- **E5:** the pages `workflow_extraction_summary` route and `report_title` are new in 26.2 and are fixed once 26.2.0 ships. The histories route already shipped in 26.1.
- **Retarget to `release_26.2`.** #22860 is in 26.2 (still rc1), so these fixes otherwise ship in 26.2.1 or later. Retargeting conflicts only in `GCard.test.ts` and `navigation.yml`.

Smaller calls for John:

- Dev test `test_referenced_copied_collection_normalizes_to_original` was re-pinned. It now expects the local copy id, not the source id, as part of the F1 fix.
- `test_twice_copied_output_seeds_one_input` was restated: one seeded row holding both copies, instead of two rows.
- New 400s: copies of one original sent with different names, and extra input names. 26.1 silently ignored extra names.
- `test_extract_button_visible_in_notebook_editor` is redundant; the agents suggest dropping it.
- Upstream `cfae9a44940` partly fixed label embeds, so the "do not render yet" wording in `_drop_instance_references` is stale for image embeds.

## Which reviews and tests still apply

- Any E6/E7/E8 work touches `markdown_util.py` and the legacy HID path in `workflow/extract.py`. Everything else is unaffected.
- The second-pass reviews (Codex, thermo, test challenges) cover the head as it stands. Only the new commits would need review.

## Validation done and remaining

**Done at head or near it** (API runs had the tool conf set and `GALAXY_TEST_REQUIRE_ALL_NEEDED_TOOLS=1`):

| Suite | Result |
|---|---|
| Extraction unit tests | 280 passed, 1 skipped |
| `test_workflow_extraction.py` | 113 passed, 1 skipped (the existing dev skip for copied-collection mapping) |
| `test_pages_history_attached.py` | 57 passed |
| Extraction vitest + vue-tsc | Clean, at E2 |
| Playwright E2E (`test_workflow_extraction.py` 13, `test_notebook_workflow_extraction.py` 7) | Passed, at E2 `df78226dea9`; later commits are server/test-only |

**Remaining:**
- **Screenshots step not run.** Hardening stops at the scope evaluation; run it on the next harden.
- **Fork CI not refreshed** since the rebase. The old green was at `113a63bb692`.
- **Selenium backend not run locally.**
- **mypy** has one unrelated `notification.py:862` error.
