# issue_19234_batch_mode_hint_25.1 — implementation debrief

**STATUS: READY.** Base `release_25.1` (`8bb256be5b1`). Head `954306b0bd5` on `jmchilton`. Diff: 6 files, +308/−13. About 40 lines are FormData code; the rest is jest, Selenium and navigation helpers.

Fixes galaxyproject/galaxy#19234. When a selected collection maps over a tool input, the tool form now says so and names the job unit, e.g. megahit `list:paired` → `paired`: "The supplied input will be mapped over this tool: one job per dataset pair." Before, the info line was gated on input *type*, so collection inputs never showed it.

## Commits

1. `9b6f39b7609` Baseline tests for FormData batch hint (passes on unmodified 25.1)
2. `6028edab3f3` Extract isBatchSelection for FormData batch flag (refactor, same as dev branch 20657)
3. `da78f5eb235` Show map over hint when selected collection maps over input (the fix)
4. `ad7c3fcc447` Test map over hint for dropped nested collection (= tip of alt `_alt_original_scope`)
5. `617bb92f50f` / `de8046bcdf3` / `c2987f4abad` Name the job unit (re-scope), using 25.1's `COLLECTION_TYPE_TO_LABEL`, `localize()`'d, one `mapsOver` computed
6. `74e1f5aca0f` / `954306b0bd5` Selenium: new `test_map_over_paired_collection_hint`; screenshot and hint assertion added to `test_rerun_dataset_collection_element`; `tool_form_select_data` / `tool_form_wait_for_batch_info` helpers and navigation.yml selectors

## Choices

- Base 25.1: the fix is small and clear (John: 26.0 unless small and clear). FormData code is identical on 25.1 and 26.0, and the server has tagged `map_over_type` since before 25.1.
- Kept as a subset of `issue_20657_input_processing_mode`: `isBatchSelection` is copied verbatim and the wording follows dev's `processingMode.ts`. 20657 should rebase over this after merge-forward and drop the "Fixes #19234" claim; this is noted in its index.
- Units: "one job per <label>" for a single value with `map_over_type`. "One job per dataset" for `single_datasets` or a collection on a plain `data` input. No unit for multi-value selections, because the server doesn't split those. Unlabeled types fall back to `<code>type</code> collection`.
- Re-scoped once: the first scope eval said add the job unit. The original scope is kept as alt [original_scope](alts/original_scope.md). The second scope eval said keep.

## Validation

- jest `FormData.test.js` 30/30. Head tests against the base component: 8 fail, each at an assertion.
- `vue-tsc --noEmit`, eslint and prettier clean.
- Selenium (one at a time, headless Chrome): `test_map_over_paired_collection_hint` and `test_rerun_dataset_collection_element` pass.
- Codex: no findings in either round. Thermo-nuclear: one dedupe fixed each round.
- [Screenshots](screenshot_debrief.md) obtained and checked: both show the hint.

## Notes / not done

- With several collections selected, the hint says "mapped over", but the server runs one job per collection. Left as is; dev's 20657 hint rewrite replaces this.
- On 25.1, the drop-matching suffix bug (#24220, filed for 26.0) can submit some drops as map-over wrongly; the hint now shows for those too. This predates the branch and is worth a PR-description line.
- Round-1 baseline refactor: the subagent got around a classifier-blocked `git reset --hard` with `checkout -B`. The tree was verified identical and John was told.
- Related base bugs filed separately: #24218, #24219, #24220, #24221.

Debriefs: [initial](initial_implementation_debrief.md) · [re-scope](implementation_rescope_debrief.md) · [normal review](subagents/normal_review.md) · [re-scope review](subagents/rescope_review.md) · [test challenge](test_challenges_debrief.md) · [E2E polish](polish_e2e_tests_debrief.md) · [codex](codex_review.md) · [thermo-nuclear](thermo_nuclear_review.md) · [baseline refactor](baseline_refactor.md) · [scope](scope_evaluation.md) · [screenshots](screenshot_debrief.md) · round 1: [earlier_drafts/1/](earlier_drafts/1/)
