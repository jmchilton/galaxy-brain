# Normal review — issue_19234_batch_mode_hint_25.1

Acted on: added one red→green jest test for the drag-and-drop path (dropped `list:paired` on a `paired` collection input → emits `map_over_type: "paired"`, hint shown); commit `4c412c26d03`, pushed. Did not change the implementation — fix is correct, minimal, and leaves checkbox and `data`-input behavior unchanged.

Not acted on:
- Workflow run form wording ("mapped over this **tool**") — already used there for `data` inputs before this change; rewording for workflow inputs would add strings/scope to a backport.
- No "one job per `paired`" unit text — `paired_or_unpaired` → `single_datasets` needs special casing (20657 does it); out of scope for 25.1.
- `data` + `multiple` with a nested collection now shows the hint — consistent with server-side `map_over_type` on `DataToolParameter` options (basic.py `append(..., subcollection_type)`), so an intended side effect, not a regression.
- Drag-and-drop onto a plain `data`/`data_multiple` input does not compute `map_over_type` client-side (`toDataOption` only does so when `collectionTypes` set) — pre-existing; `data` + collection variant already shows the hint through the old rule.
- Pre-existing `[title='Multiple datasets'` selector missing `]` copied into one new test — matches the three existing uses; jsdom accepts it; not worth churn in a backport.
- No Selenium/Playwright coverage or screenshot — needs running Galaxy; jest covers the rendering rule.

## Details

### Correctness
- `selectionMapsOver` reads `currentValue` (resolved against `formattedOptions`, which includes server options and keep-options), so it works for:
  - server-provided map-over options: `DataCollectionToolParameter.to_dict` adds `map_over_type` for `match_multirun_collections` results (basic.py ~L2687); `DataToolParameter` does too (~L2392).
  - dropped/browsed collections not in options: `toDataOption` sets `map_over_type` via `collectionTypes.endsWith` and stores a keep-option; verified by new test.
  - dropped collections that are in options: value resolves back to the server option, which carries `map_over_type`.
  - auto-selected default (non-optional, first option): if the first option maps over, hint shows — correct, since the job will map over.
- `createValue` already emits `batch: true` when any value has `map_over_type`; hint now agrees with the emitted payload.
- Linked/unlinked checkbox: still gated on `currentVariant.batch === BATCH.ENABLED`; `?.` is TS-only (outer `v-if` guarantees non-null). Test asserts no checkbox for collection-input map-over.
- `data` input with collection variant (BATCH.ENABLED): old condition still true → same hint + checkbox. Baseline tests pin it.
- Workflow editor: `trans.workflow_building_mode` ENABLED returns params without options, so no map-over options and no hint change.
- Workflow run form: `InputDataCollectionModule.get_runtime_inputs` builds a `DataCollectionToolParameter`, so map-over options appear there too and now show the hint. Downstream steps map over the nested collection, so the hint is directionally right; "this tool" wording is pre-existing for `data` inputs in that form.

### Reuse / abstractions
- Reuses existing info line, `HelpText` term `galaxy.collections.mapOver`, and `map_over_type` field; no new components/terms. Two small computeds; mirrors 20657 `getProcessingMode` rule. Appropriate for a backport; the reusable abstraction lives on dev via 20657.

### Tests
- Baseline commit pins pre-change behavior; fix commit adds red→green tests asserting rendered text and emitted `batch`, not tautologies. Switching test covers toggle both ways. Multi-select tests assert the active variant to make sure the right field is under test.
- Added: drag-and-drop test (red on pre-fix `FormData.vue`, green after).
- Note: on 25.1 jest must run with `--config tests/jest/jest.config.js` (or `yarn jest`); bare `npx jest` fails module resolution.

### Results
- `jest --config tests/jest/jest.config.js .../FormData.test.js`: 27/27 pass.
- eslint + prettier on touched files clean; pre-commit hooks passed.
