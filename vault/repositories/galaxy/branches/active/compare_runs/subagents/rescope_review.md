# Re-scope review debrief

Verdict: approve with small follow-ups; no bugs, no released-behaviour regressions (`totalMatches`, `useMappingJobs`, `keys=metadata_<name>` all checked). Acting on: drop the three untested `UNION` arms in `_defined_step_io` (plain select; avoids SQLite-only SQL); role-aware "not supplied" text for empty `input:` cells; drop the unrelated `@onOk` rename hunk; move `useExecutionJobs` to `@/composables` with an `orderBy` option and drop the unused export; `versions_available` lists only invoked versions in both modes; hide "Other runs of this tool" for internal `__…__` tools (uploads etc.); drop the duplicate metadata-keys unit test; shorten the docstring; fold history (squash `ca889b89628`, baselines to the front).

Not acted on:
- Skipped-subworkflow test that pins a known gap — kept as documentation of the limit; noted in design questions.

<details><summary>Full review</summary>

# Re-scope review (raw): `548c8bebcc3..9aa33beef03`

**Verdict: approve with small follow-ups.** I found no regressions in released behaviour and no bugs. The released-code refactors (`totalMatches`, `useMappingJobs`, the `keys=metadata_<name>` serializer change) are behaviour-preserving or purely additive. The one place the outcome depends on edge semantics is 7b: `_defined_step_io` has three output branches, and none is covered by a test that fails without it. They are close to dead code. Everything else is a nit or a design question.

Checked by reading the code, plus a read-only unit run: `test_ComparisonsManager.py` and `test_HDAManager.py` with `-k "statement or prefixed or metadata"` gave 19 passed. I didn't re-run the API or vitest suites; the debrief lists those runs.

## Bugs

None found.

## Should fix / decide

1. **7b output branches have no red-to-green test, and are nearly unreachable.** `_defined_step_io` (`lib/galaxy/managers/comparisons.py:633-658`) unions four selects:
   - `WorkflowStepInput`;
   - `WorkflowOutput.output_name`;
   - outgoing `WorkflowStepConnection.output_name`;
   - the subworkflow's labelled `WorkflowOutput`s.

   Only the input branch is exercised red to green (`test_step_runs_unsupplied_optional_input_is_in_version`). By the debrief's own probe, outputs are recorded even for skipped and errored jobs and for skipped subworkflows. So a defined but unobserved output column arises only for a `filter`-excluded tool output, or a subworkflow output built from one. `test_step_runs_skipped_subworkflow_step` passes before and after, so it doesn't test 7b. Pick one:
   - (a) Add an API test with `output_filter` (in `sample_tool_conf.xml`). Version 0 filters the output out and version 1 produces it, with the output connected or marked in both. Version 0's cell should then read `no_output`, not `not_in_version`.
   - (b) Drop the three output selects. The method becomes one plain `select` with no `UNION`/`literal_column`, which also removes the "PostgreSQL never run" risk below.

   I lean (b), unless John wants filtered outputs handled.
2. **Unsupplied optional input reads "no output".** `MISSING_TITLES.no_output` is "This run produced nothing here" (`client/src/components/Comparison/comparisonUtils.ts:127`), which is wrong for an `input:` column. This is the debrief's Q3. A cheap fix that avoids a new `MissingReason`: make `missingText` and the title role-aware, so an `input` column reads "not supplied". The alternative is a `not_supplied` reason, which touches the schema, export and every renderer.
3. **`_defined_step_io` has only run on SQLite.** `literal_column("'input'")` in a `UNION ALL` should resolve to text on PostgreSQL, and `label` (varchar) unions fine with the text `name` / `output_name` columns. Still, CI's PostgreSQL job is the first real run. If the output branches go (item 1b), the risk goes too.

## Released-behaviour checks (John's list)

### `totalMatches`: safe
- The helper is `parseInt(h ?? "0", 10) || 0` (`client/src/api/index.ts:368`). It was added on this branch (`bcdce7b6a85`).
- For a missing header the old and new results are identical: 0.
- `NaN` was reachable at the 8 unguarded sites only from a non-numeric header. Every server emitter writes `str(int)`:
  - datasets, histories (2), visualizations, pages, workflows (2), remote_files and history_contents;
  - `remote_files` gets `count` from `file_source.list`, an int.
- So nothing a Galaxy server sends changes the result.
- The consumers (GridList pagination, `FilesDialog.totalItems`, `HistoryDatasetPicker.totalItems`, archived histories) would only have mis-rendered on `NaN`. Nothing tests `isNaN`.
- `workflows.ts` now imports `@/api`, but `api/index.ts` doesn't import `./workflows`, so there is no cycle.
- The only remaining hand parse, `getStorageOperationRunItemsWithTotal`, is correctly left alone because it returns null.

### `useMappingJobs` → `useExecutionJobs`: preserves the released order and label
- **Consumers:** `JobMetrics.vue`, `ToolStd.vue`, `JobParameters.vue` (via `JobSelection.vue`). Their signature and return shape are unchanged.
- **Request:**
  - The old request sent no `order_by`. The server default is `update_time` (`schema.py:1986`), and the new request sends `update_time` explicitly with no reverse.
  - The limit is unchanged: no `jobCount`, so the default 500 applies.
- **Differences, all minor:**
  - A fetch error now leaves the selector empty. It used to throw unhandled from the watcher.
  - Options clear while a new batch loads. The old selection stays until the batch arrives, the same staleness as before.
  - Options also clear when the icj id becomes undefined.
- **Baseline:** `8bb6da34019` pins the order, label, default selection and re-selection, and passes on the old code. Good.

### `keys=metadata_<name>`: additive, no access gap
- **Before:** `ModelSerializer.serialize` silently dropped unknown keys (`managers/base.py:707`). Nothing could rely on the key's absence.
- **Name clashes:** no registered serializer or serializable key starts with `metadata_`. I grepped the managers.
- **In-tree requesters:** none send a `metadata_<x>` key. I searched string literals in `client/src` (multi-line too), `config/plugins/visualizations`, `lib/galaxy_test/base/populators.py`, `templates` and `lib/galaxy`.
  - `DatasetInformation.vue:61` reads `dataset.metadata_dbkey` from the detailed view, not from `keys`.
  - The Libraries fixtures use the library API.
- **Other callers:** `_prefixed_metadata` and `serialize_metadata` have no other callers apart from `comparison_cells.py:341`, which already passes `included=`.
- **Access:** `HDASerializer.serialize` (`hdas.py:663`) swaps `keys` for the `inaccessible` view before `super().serialize`. `metadata_names` is therefore built from the reduced list and an inaccessible HDA leaks no element. `test_serializing_inaccessible` covers that path. `HDASerializer` is the only `DatasetAssociationSerializer` subclass.
- **`MetadataFile` paths:** still gated by `expose_dataset_path`, exactly as with `keys=metadata`.

## Nits

- **`HistoryDatasetPicker.vue`: unrelated event-name churn** in the `totalMatches` commit (`@onOk` → `@on-ok`, ×6), most likely `eslint --fix` (`vue/v-on-event-hyphenation`).
  - Vue 3's compiler camelizes both spellings to `onOnOk`, so it still works.
  - But it is noise in a refactor of released code. Sibling dialogs (`DataDialog`, `FilesDialog`, `MarkdownDialog`) still use `@onOk`, and nothing tests it.
  - Drop the hunk, or split it into its own lint commit.
- **`useExecutionJobs` placement and API:**
  - It now has a Markdown consumer, so `components/History/Graph/` is the wrong home; `@/composables/` fits better.
  - `recentlyUpdatedFirst: boolean` is a one-caller flag that only preserves an odd released order: numbering by update time with creation-time labels, which renumbers as jobs update. An `orderBy: "create_time" | "update_time"` option would read better.
  - `export interface ExecutionJob` has no importer, so drop the `export`.
  - `create_time?` is optional, yet `useMappingJobs` formats it unconditionally; `` `${undefined}Z` `` makes `format` throw `RangeError`. The batch path always has it, so this is not a bug. Narrowing the batch return type, or using the generated job summary type, would make that explicit.
- **`versions_available` for `output_runs`** (Q2): opinion below.
  - "Every version" matches `step_runs`. The sibling facet on the same table, `output_labels_available`, is invoked-only, though.
  - For a workflow with many versions and few runs, a checkbox per uninvoked version is noise, and each one gives an empty table.
  - Lean: make both kinds invoked-only, reusing the invoked-workflow query behind `_invoked_output_labels`. If John prefers fewer changes, keep it as is; it is consistent with `step_runs`.
- **DatasetDetails "Other runs of this tool"** appears on every uploaded dataset (`__DATA_FETCH__` / `upload1`) and for other `__*__` internal tools. The gate is only a registered user plus a `tool_id` (`JobInformation.vue:118`). The job page already behaves this way, so this is consistent but more visible now. Design question: should internal tools be excluded?
- **Duplicate tests for metadata keys.** `test_serialize_prefixed_metadata_keys` (unit) covers the same ground as the red-to-green API test `test_show_single_metadata_key`. Per REVIEW_FOCUS's preference for integration tests, the unit test could go. Low priority.
- **`test_step_runs_skipped_subworkflow_step`** pins a known gap (null value rather than skipped) and passes before and after. It went in with the 7b commit, but it is a characterization test. Either move it next to the baselines, or have its comment say it pins the current gap so a later fix flips it knowingly.
- **`_defined_step_io` docstring** is 2 lines of contrast and limits. Per John's comment rule, keep line 1; the limits belong in the commit message, which already has them.
- **History cleanup:** `ca889b89628` (`framework.__all__`) fixes the branch's own `0fa14c972ac`; squash it there. Move the two "Baseline tests" commits (`8bb6da34019`, `6106e77aa89`) into the baseline group, as the debrief notes.

## Domain answers (7a / 7b)

- **Connected inputs only.** These are `WorkflowStepInput` rows, which exist for connected (or step-`in:`) inputs. A tool input that a version doesn't wire, or a runtime data input, stays unknown.
- **Optional inputs.** Connected but unsupplied now reads `no_output` (see item 2).
- **Subworkflow outputs.** The inner `WorkflowOutput.label`, matching how outer steps record outputs. Unlabelled inner outputs are skipped by `if name`. Subworkflow steps observe no inputs, so their defined input keys are gated out by `observed`.
- **Tool version changes across workflow versions.** Handled naturally: each workflow version has its own step id, so each gets its own definition. Pages with several versions still make one statement.
- **`observed` gate.** It adds no empty columns. It is page-scoped, consistent with how columns are already derived per page.
- **Skipped (7a).**
  - Applied only to single jobs: mapped batches keep their collection cells, and output_runs workflow outputs and skipped subworkflows still show null (all recorded in the debrief).
  - Inputs of a skipped job stay real cells, which is correct.
  - `_cells` passes the ready-made `MissingCell` through, and `_item_refs` skips it, so the placeholders are never loaded.
- **Query count.** `_defined_step_io` is one statement per page, and runs only when the page is non-empty. The flatness tests (1 vs 5 rows) still hold and still mean something, but they can't catch a constant +1. That is fine: it is constant.

## Access findings

None. `_defined_step_io` reads only the definitions of steps in the already access-checked stored workflow. Labels surface only if they are observed in the caller's own rows. The `output_runs` `versions` filter goes through `_page_invocations`, so the owner filter is unchanged. The new DatasetDetails link points to the viewer's own tool runs.

## Python imports / comments

- **Imports:** all new imports are at module top (`CompoundSelect`, `literal_column`, `union_all`, `WorkflowStepConnection`, `WorkflowStepInput`), and none are buried in functions.
- **Comments:** short, except the docstring noted above.

</details>
