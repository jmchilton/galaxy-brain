# issue_20657_input_processing_mode — implementation debrief (re-harden 2026-10-17)

**STATUS: BLOCKED — scope decision.** Second [scope evaluation](scope_evaluation.md) (after a re-scope) again recommends modest expansion → parked per process. Branch head `10ae420a663` is **local only**: history was rebuilt (baseline/refactor reordering) and the `--force-with-lease` push to `jmchilton` was denied by the permission classifier; fork still has old tip `c97aecb4181`. Prior debrief: [earlier_drafts/1](earlier_drafts/1/implementation_debrief.md).

## Decision needed

1. **Expand again?** Scope eval #2: pin a selected visible HDCA that sits outside the current option page in `_carry_selected_hdca` (emit `_classify_hdca` direct + map-over entries with `keep=True` into `pinned["hdca"]`, like `_pin_live_hda_inputs` for HDAs) so a form refresh doesn't silently drop/de-batch the selection; ~15–25 server lines + 1 API test. Plus one-token drop-alert fix (param side through `collectionTypeToText`). Pre-existing on base. Precondition unverified: refresh's `other_values` must hold the selected HDCA; if only the batch wrapper, it's cross-layer → keep scope and make it the first follow-up PR.
2. **Split?** ~1700 added lines; scope eval lists decompositions A–D.
3. Approve force-push of rebuilt history to `jmchilton`.

## Re-harden summary

Round 1 (archived [earlier_drafts/2](earlier_drafts/2/)): test challenge (baseline-tests commit first; tool-form multiselect tag-close selector fix — real bug), E2E polish (shared hint helper, dropdown fade waits, sleep removed), Codex (3 confirmed + fixed: DCE drop map-over, paginated merge keyed by `itemUniqueKey` via new `mergeDataOptions`, nesting hint judged by selected type), thermo-nuclear (`FormDataOptionLabel.vue`, `collectionMatch.ts`, `isSameItem`), baseline refactor (4 refactor commits ahead of feature), scope eval → expand.

[Re-scope](implementation_rescope_debrief.md): alt `issue_20657_input_processing_mode_alt_original_scope` ([alts/original_scope.md](alts/original_scope.md), pushed); added `list:list`/`list:list:paired` labels and five admin `remove_selected_*` selector fixes (red→green Playwright); [review](subagents/rescope_review.md) clean.

Round 2 (current debriefs): [test challenge](test_challenges_debrief.md) (paging API baseline test, canNest helper), [E2E polish](polish_e2e_tests_debrief.md) (dropdown-close wait folded into helper), [Codex](codex_review.md) (2 confirmed: `accumulate_with_filter` now keeps a row's direct + map-over entries on one page, fixing `has_more` false on split final row — reverses the baseline API test deliberately; refresh-loss residual → scope eval), [thermo-nuclear](thermo_nuclear_review.md) (FormData.test.ts split into 3 files, `describeProcessingMode()`, import direction fixes), [baseline refactor](baseline_refactor.md) (two baseline commits first, tree identical).

## Still applies / remaining validation

- All reviews/tests above apply to `10ae420a663`; an expansion would touch only server `basic.py` + API test, so client reviews hold.
- Last green: vitest 366 (Form/, ToolForm, Workflow/Run, collectionTypeDescription, Collections); pagination unit 3/3; 12 `build_collection_options`/`build_data_options` API tests; E2E `test_data_input_map_over_hint`, `test_data_input_reduction_hint`, `test_admin_role_and_user_forms.py` on Playwright + Selenium (round 2; E2E not rerun after round-2 thermo refactor — no selectors/text changed).
- **Not run:** screenshots step (`GX_PROCESS_SCREENSHOTS.md`) — process stops at the scope decision; old screenshots in earlier_drafts/1. Fork CI on new head. Known rebase conflict vs current `origin/dev` in `FormData.vue`.
- Follow-ups: NodeOutput.vue label map, fragment `localize()` of hint text (all new strings — cheap to fix), FormData.vue `useKeepOptions` decomposition, NestTool on mapped DCE, tag chip close-x overlap.
- Local backup branches `issue_20657_pre_refactor_baseline_backup`, `issue_20657_pre_baseline2_backup` can be deleted.
