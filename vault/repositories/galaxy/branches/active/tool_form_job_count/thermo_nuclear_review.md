# Thermo-nuclear review (second pass, post-rescope) — tool_form_job_count

Acted on three findings in two commits:
- `d075335f1cf` "Move job preview state out of ToolForm into useJobExpansion":
  - The job preview and the form data it was built from now live in one ref, inside a `useJobExpansion` composable in `jobCount.ts`.
  - The JSDoc contract on `findInputPathByDottedName` replaces the cast in `jobCount.ts`.
  - The remap message is now one shared constant.
- `3abe2da81cb` "Fold batch detection into summarize_meta_expansion": `Tool.to_json` no longer needs `incoming_has_batch`.

Not acted on: the `buildRequestId` guards, `split_count`'s own depth logic, and the duplicated identifier-key drop.

Scope: `git diff origin/dev...HEAD` at `69205139b0d`. This pass was done independently; the first pass is in `earlier_drafts/2/thermo_nuclear_review.md`. No security findings.

## Not acted on

- **`buildRequestId` guards in ToolForm.vue (5 checks across `onUpdate` and `requestTool`).**
  - `@/utils/lastQueue.ts` `LastQueue` is the closest canonical helper, but it doesn't fit. It *serializes* tasks with a throttle. It does not drop stale responses, and the running task still resolves.
  - Adopting it would still need a guard so a superseded `finally` can't clear `disabled`. It would also change load/update interplay that has E2E coverage.
  - The guards protect `formConfig`, which ToolForm owns, so they stay there. A `startBuild()` closure (`const isLatest = startBuild()`) would only rename the checks without removing any.
- **`split_count` duplicates the depth reasoning of `_split_dataset_collection` / `_is_a_subcollection_type`.**
  - Its check is deliberately stricter: `endswith(":<type>")` rather than `endswith(type)`.
  - Reusing `_is_a_subcollection_type` would accept shapes that the split itself later rejects. `test_split_count_agrees_with_split` pins the two together.
- **`summarize_meta_expansion` drops `|__identifier__` keys from a copy, while `expand_meta_parameters` pops them in place.**
  - A shared helper would have to be either in-place or copying. The in-place pop may be relied on by callers of the expansion path, which is pre-existing dev behaviour.
  - It is two lines with a comment pointing at the twin.
- **`element_count_at_depth` does per-level queries in Python rather than reusing `_build_nested_collection_attributes_stmt`.**
  - That builder walks leaf DCEs, which skips empty branches. Its PostgreSQL ARRAY path also avoids self-joins on purpose.
  - The weighted per-level walk counts shared children once per reference, which matches split semantics, and it follows the same index-friendly pattern as `_subcollection_ids_stmt`. Kept.
- **`count_collection` vs `__expand_collection_parameter`.** Both do load, add to match, then return values. They differ only in the access check and in returning `range(n)` instead of loading elements. Merging them would need a mode flag, which is worse. Kept.

## Details

### 1. ToolForm.vue carried preview state as two refs that were updated separately — ACTED
Before:
- `formConfig.job_expansion` held the preview, and `jobExpansionFormData` held the inputs it was built from.
- Those were written in three places, each a different way: assign both on update success, spread `{ ...formConfig, job_expansion: undefined }` on update failure, reset the snapshot on tool load.
- On top of that, a 12-line `jobExpansion` computed (staleness filter plus client-validation suppression), plus `runBlocked`.

This is feature logic leaking into ToolForm's request flow, and the state was not atomic.

Now `useJobExpansion(formData, invalidInput, remapping)` in `jobCount.ts` owns a single `preview = { expansion, builtFrom }` ref and returns `{ jobExpansion, runBlocked, setJobExpansion }`:
- Each of ToolForm's three sites is a single `setJobExpansion(...)` call.
- The `formConfig` spread is gone.
- `jobExpansionIsCurrent` is now module-private.

ToolForm's diff vs dev dropped from +88 to +58 lines (674 lines total). Behaviour is unchanged, and the existing ToolForm tests (stale response, failed update, non-refreshing conditional switch, validation suppression, blocking) all pass without changes.

### 2. Cast at the `Form/utilities.js` boundary — ACTED
`jobCount.ts` cast the untyped JS return as `{ node: FormInputNode; parents: EnclosingInput[] } | null` and declared its own `EnclosingInput`. Now `utilities.js` declares the contract itself:
- a JSDoc `@typedef EnclosingInput`
- `@returns {{ node: FormInputNode, parents: EnclosingInput[] } | null}`

`allowJs` makes TypeScript enforce it. I checked this with a probe that assigned `.node` to `number`; it raised TS2322 and the probe was removed afterwards. `jobCount.ts` now imports the type, so the cast and the duplicate interface are gone.

### 3. Remap message duplicated as two literals — ACTED
It is now the `REMAP_SEVERAL_JOBS` constant, passed through `localize()`. That matches `IMMUTABLE_HISTORY_MSG` and `usePaletteFooter.ts`.

### 4. `incoming_has_batch` was a separate public predicate the caller had to pair with `summarize_meta_expansion` — ACTED
`summarize_meta_expansion` now returns `None` when nothing is batched, so `Tool.to_json` is one line: `job_expansion = None if workflow_building_mode else summarize_meta_expansion(...)`. `incoming_has_batch` is deleted.

Tests:
- New `test_no_summary_without_a_batch` covers an unbatched `{"batch": false}` wrapper and a plain reference.
- The `_summary` helper now asserts the result is not `None`.

### 5. Reviewed and fine
- `meta.py` shared classifier and `_split_meta_inputs`: the sync, async and validator paths all go through one classifier factory. No new branching in dev's flows.
- `count_combos` sits next to `build_combos`.
- `visitInputs` `parents`: it is backward-compatible, and all callers were checked in the previous pass.
- `repeatTitle` is reused by `FormRepeat.vue`.
- `ToolFormJobCount.vue` is presentational. No file crosses 1k lines.

### Verification
- vitest `src/components/Tool/` + `Form/utilities.test.js`: 21 files, 162 tests pass.
- `vue-tsc`: nothing in the touched files. eslint: 0 errors; the 5 warnings are pre-existing hyphenation warnings. prettier: clean.
- Unit: `test_meta_expansion.py` + `test_misc.py`: 53 passed.
- black and ruff are clean. mypy (`cd lib`) reports no errors in `meta.py` or `tools/__init__.py`.
- API: `test_tools.py -k "test_build_job_expansion or test_build_request"`: 6 passed.
- Playwright headless, run one at a time (own Galaxy 8137 + Vite 5237, stopped afterwards, `config/galaxy.yml` restored): `test_run_disabled_for_mismatched_batches` and `test_job_count_for_batched_collection` both pass. Selenium was not rerun: the change is behaviour-preserving client state plumbing with no DOM changes.
- The Baseline tests commit `f0604e6d1d0` is untouched and still first.
