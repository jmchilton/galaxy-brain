# Rescope debrief — issue_19234_batch_mode_hint_25.1

Took scope_evaluation.md option 2: the map over hint now names the job unit.

## What changed

New commit `617bb92f50f` "Name job unit in FormData map over hint" on top of `ad7c3fcc447`. Earlier commits unchanged, baseline tests still first. Pushed to `jmchilton`. Original scope stays on `issue_19234_batch_mode_hint_25.1_alt_original_scope`.

- `FormData.vue`: new `mapOverUnit` computed (+18 lines) and a template tail (+5/-1). Rendered text:
  - `...mapped over this tool: one job per <code>paired</code> collection.` when the single selected value has `map_over_type` X (not `single_datasets`).
  - `...mapped over this tool: one job per dataset.` for `map_over_type == "single_datasets"`, or for a collection on a plain `data` input with no `map_over_type` (the server sends none there unless the input is `multiple` and the collection is nested; see `basic.py` ~2460).
  - `...mapped over this tool.` (unchanged) for multiple selections. Same rule as dev's `getProcessingMode`: the server only splits a collection when it is the sole batch value.
- Wording follows dev's `processingMode.ts` (`this tool: one job per <unit>.`, "dataset" for `single_datasets`). 25.1 has no `collectionTypeLabel`, so a collection unit shows the raw type in `<code>` plus "collection" (dev would say "dataset pair"). Static fragments use `v-localize`. No help terms, components or dropdown markers added.
- At ~23 lines, `FormData.vue` runs a little over the 10–15 line target. Most of it is the readable early-return computed.

## Tests

`FormData.test.js`, red→green (5 failing before the fix, all passing after):
- Updated to exact unit text, which is stricter: collection on data input → "per dataset"; nested `list:paired` on `paired` input, toggle and drop cases → "per paired collection".
- New: `single_datasets` → "per dataset". Two mapped over `list:paired` selections → no unit (plain `MAPPED_OVER`, which stays end-anchored). Existing mixed multi-selection test still expects no unit. Batch mode text for multiple datasets is unchanged (exact `toBe`).

Runs:
- jest FormData.test.js: 29/29 passed.
- `npx vue-tsc --noEmit`: clean.
- eslint + prettier on touched files: clean. Pre-commit hooks passed.
