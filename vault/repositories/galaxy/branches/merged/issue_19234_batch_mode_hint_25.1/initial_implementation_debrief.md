# issue_19234_batch_mode_hint_25.1 — initial implementation debrief

Base: `origin/release_25.1` @ `8bb256be5b1`. Pushed to `jmchilton/issue_19234_batch_mode_hint_25.1` (head `21919184c1c`).

## Commits

- `ee8945b3362` Baseline tests for FormData batch hint — pins current info-line behavior (data input + hdca → "mapped over"; single hda → none; multiple datasets → "batch mode input field"; data_collection + direct hdca → none). Passes on unmodified 25.1.
- `21919184c1c` Show map over hint when selected collection maps over input — fix + 4 red→green tests.

## What changed

`client/src/components/Form/Elements/FormData/FormData.vue` (+18/-3):
- `selectionMapsOver` computed: any selected value has `map_over_type` (single and multi-select).
- `showBatchInfo` computed: batch variant (old rule) **or** `selectionMapsOver`. Mirrors the selection-driven rule of 20657's `getProcessingMode` (`variant.batch !== DISABLED || mapped`).
- Info line shows the existing "The supplied input will be *mapped over* this tool." text when `selectionMapsOver` or (old rule) data input with collection variant. Linked/unlinked checkbox still gated on `BATCH.ENABLED` variant.
- No new help terms, components, dropdown markers, or FormSelect changes. No unit text ("one job per paired collection") — skipped since `map_over_type` can be `single_datasets` for `paired_or_unpaired`, which needs special casing (20657 handles it); not trivial enough.

Side effect: `data` + `multiple` input (data_multiple, collection variant is `BATCH.DISABLED`) with a selected collection that maps over (e.g. list:list into multi-data) now also shows the hint — consistent with the rule, covered by a test.

## Tests

Note: release_25.1 client uses **jest + yarn v1** (not vitest/pnpm); test file is `FormData.test.js`. Installed with `yarn@1.22.22 install --frozen-lockfile` under node 22.20.0 (~10 min).

New tests (describe "FormData batch hint"):
- data_collection `paired` input, `list:paired` option with `map_over_type: "paired"` → emits `batch: true`, hint shown, no linked checkbox (red before fix).
- switching selection direct ↔ map-over toggles hint (red before fix).
- multi-select data input, one of two selected collections maps over → hint shown (red before fix).
- multi-select data input, direct collection → no hint.

Results:
- `jest src/components/Form/Elements/FormData/` — 3 suites, 35 tests pass.
- eslint + prettier on both files — clean (pre-commit hooks also passed).
- `vue-tsc --noEmit` (full, ~30s) — clean.

## Left

- Screenshot of hint on a megahit-like tool (plan item) not done — needs a running Galaxy.
- No Selenium/Playwright coverage added.

## Proposed STATUS

READY.
