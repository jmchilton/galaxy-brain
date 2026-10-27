# Thermo-nuclear review: hardening iteration 2

**Top line.** I acted on the structural findings with six new commits on `compare_runs` (f2b1accd6ad..1a9720d93dd). Nothing was pushed.

- Backend: `comparisons.py` was a new 969-line file, one edit away from 1k lines. It is now an orchestration-only manager of 501 lines. The `(job, mapped batch)` branching that ran through every row builder collapses into one submission record type. Record and io loading has its own loader. SQL predicates and state helpers have their own pure modules. The three row builders share one cell-assembly path.
- Client: one spec table replaces three switches over the run fields. Run selection is now its own unit with tests.
- UX nit: the known one is fixed. An expanded row's detail now stays pinned to the scroller's visible width.

No behaviour changes and no API or schema changes.

## Commits

| sha | what |
|---|---|
| 2ba18b789b4 | Decompose the comparisons manager around one submission record (backend split, `row_cells`/`fill_cells`, tests) |
| 77a15bad069 | Reuse `remove_version_from_guid` in `versionless_tool_id` |
| 2f51f4d938b | Describe comparison run fields in one spec table (`META_FIELD_SPECS`, `offeredOptions`, `urlList`, display composable owns the storage key fallback and metadata) |
| 646605b99c0 | Pull comparison run selection out of ComparisonTable (`useRunSelection` + vitest) |
| 7675514c32f | Pin an expanded comparison row's detail to the visible table width |
| 1a9720d93dd | Unit test comparison submission records (`test_comparison_records.py`, 10 tests) and `offeredOptions` (2 vitest cases) |

Caveat: 2f51f4d938b on its own leaves `ComparisonTable.vue` importing the removed `META_LABELS`. 646605b99c0 completes it. Squash the two if the branch is cut between them.

## Checks

- **API:** `test_comparisons.py` ran via `run_tests.sh`, 27 passed, on 2ba18b789b4. The commits after it don't touch the API path, except 77a15bad069, which is covered by a unit test.
- **Unit:** `test_ComparisonsManager.py`, `test_comparison_columns.py`, the new `test_comparison_states.py` and `test_comparison_cells.py`, and `test_tool_version.py`: 67 passed. Then `test_comparison_records.py`: 10 passed, and `comparisonUtils.test.ts`: 20 passed. The statement-count (N+1) tests are green.
- **Client:** vitest on `Comparison`, `JobParameters`, `History/Graph` and `ItemPopoverLink`: 231 passed. `vue-tsc` is clean, and so are eslint and prettier.
- **Python lint:** black, isort and ruff are clean.
- **mypy:** run from `lib/` on the changed files, there are no errors in comparison files. The 22 reported errors are all in unrelated, pulled-in modules. I also fixed a moved, pre-existing `rank_whens` arg-type error.
- **Playwright E2E:** `test_comparisons.py` reported 3 passed on 8091/5174 after the final commit, because 8080/5173 belonged to the `invocation_graph_embedded_outputs` worktree.
  - The fresh sqlite DB needed the test user registered first.
  - I checked the `mapped_step_reused_job` screenshot by eye: the pager and the reused badge are on screen in a narrow centre panel.
  - Both servers were killed by PID afterwards.
- **Sticky detail, measured** at a ~480px centre panel with the table scrolled fully right:
  - The pin spans 404.8–883.8 against a scroller of 405–884.
  - The pager (624–713) and the reused badge (729–770) both sit inside it.
  - The detail grid collapses to one column.

## Not acted on, and why

- **Service `_access` / `_empty` repeated in 3 methods (`services/comparisons.py`).** A helper would need a lambda per endpoint, which adds indirection for three 2-line guards.
- **Shared ComparisonView / StepRunsTab template scaffolding** (error + Retry, loading, table, pager). The two differ in the pager slot (page size), toolbar slot, filters and empty message. A results component would need about 4 slots and props for roughly 15 lines of template. The duplicated script logic (storage key fallback, requested metadata) did move into `useComparisonDisplay`.
- **Duplicated `<span :title=changed><ComparisonCell/></span>` in ComparisonTable's two orientations.** It is 7 lines. A wrapper component would only forward props.
- **`ComparisonRow(..., cells={})` then `row.cells = cells` in `_fill_cells`.** Rows are built before columns are known, because columns come from all rows' io. Assigning after the fact matches the existing `column.metadata_keys` pattern. The alternative, parallel lists of row kwargs, is looser typing.
- **`comparison_records.py` is 593 lines.** It is cohesive (records plus batch loaders), well under 1k, and split by section comments.
- **Test change, logged:** `missing_reason` lost its always-True `column_in_version` parameter, so its two `False` cases were removed. They tested a branch that no longer exists. `not_in_version` is now owned and unit-tested in `fill_cells` (`test_fill_cells_marks_columns_outside_the_row_version`), and the API tests still cover it.
- **Security:** nothing found; no report written.

<details>
<summary>Full review</summary>

### 1. Structural: `comparisons.py`, 969 lines, a grab bag (blocker → fixed)

The new file held four things:

- the three table orchestrators;
- SQL predicate builders for the state filters;
- io loaders for request inputs, invocation io, step outputs, subworkflow invocations, defined step inputs and the version map;
- pure row helpers.

It was 31 lines from the 1k bar, with the next feature certain to push it over.

**Fix:**

- `comparison_queries.py` holds the SQL statements and predicates.
- `comparison_states.py` holds the summary/reuse/missing state helpers plus `EMPTY_BATCH_STATES`, which previously lived in the manager.
- `comparison_records.py` holds the records and `ComparisonRecordLoader`.
- `comparisons.py` is left as orchestration (501 lines).

### 2. Code judo missed: job vs. mapped batch (blocker → fixed)

Every row builder carried a `(job, icj)` pair:

- `_step_state(step, job, icj)`, `_step_job_ref(job, icj)` and `_reused(job, icj)`;
- `representative = job or (icj.representative if icj else None)`, repeated, along with its `tool_version` lines;
- `via` keyed by `(is_batch, id)` and looked up as `via.get((icj_id is not None, icj_id if icj_id is not None else row.job_id))`;
- `_submission_inputs` returning two dicts, each picked by a ternary.

**Fix:** `JobRecord` and `ImplicitCollectionJobsRecord` share one interface: `key`, `state`, `tool_id`, `tool_version`, `reused`, `run_ref()` and `outputs_skipped`. That interface is the `Submission` alias. The loaders key everything by `SubmissionKey`, and the per-mode forks disappear. `WorkflowInvocationStep` sets either `job` or `implicit_collection_jobs`, never both (`tools/execute.py`), so the batch-first key order is behaviour-preserving.

### 3. Copy-pasted row assembly (fixed)

`item_cells(_item_refs(...), access, metadata_elements, inline...)`, the `metadata_keys` defaultdict, `_cells` per row and `_set_metadata_keys` were repeated across three builders. That is now `ComparisonCellBuilder.row_cells(columns, [RowIo], access, query)` over a pure `fill_cells`, which has new unit tests.

### 4. Magic (fixed)

- `_invocation_io` skipped null rows unless `to_value is not _output_value_cell`, which is an identity check on a callback. Sources now declare `keep_null` explicitly (`IoSource`), and nulls are filtered in SQL.
- `_step_outputs` was two copy-pasted queries; it is now one loop over the two association columns.
- `missing_reason(True, ...)` had a dead parameter, which is removed.

### 5. Boundary: `ComparisonCellBuilder` mixed record loading with cell building (fixed)

The manager called `cell_builder.load_jobs` and `cell_builder.job_inputs`. Job and batch loading has moved to `ComparisonRecordLoader`, which takes only the session and is auto-wired by lagom. `comparison_cells.py` is now only about cells. `comparison_columns.py` is now only about columns: `keyed_io` and `ColumnSpec.of_key` moved in, and the state helpers moved out.

### 6. Canonical helper (fixed)

`versionless_tool_id` re-implemented `remove_version_from_guid`'s last-slash strip.

### 7. Client: three switches over `MetaField` (fixed)

`META_LABELS`, the `metaText` switch in the export and the `metaIdentity` switch in changes are now one `META_FIELD_SPECS` table of `{label, text, identity?}`. `exportLines` uses the specs directly as its field descriptors.

### 8. Client: repeated "available plus selected" option building ×4, and URL list computed get/set ×3 (fixed)

These are now `offeredOptions` and `urlList`.

### 9. Client: the storage key fallback and requested metadata were duplicated in ComparisonView and StepRunsTab (fixed)

`useComparisonDisplay(knownKey, table)` now owns both.

### 10. Client: ComparisonTable owned selection state, export, and two layouts (partially fixed)

Selection, pruning and the diff toggle moved to `useRunSelection`, which has its own vitest. Export was already a module. The two GTable layouts stay, since they differ by orientation and share only cell rendering.

### 11. UX nit: row detail inside the horizontal scroller (fixed)

`.comparison-row-detail-pin` is `position: sticky; left: 0; width: 100cqi`. 100cqi resolves to GTable's own `container-type` box, which spans the scroller, so no new containment is added on the scroller.

- The details `td` padding is zeroed. That needs a selector that outranks GTable's compact padding, and it is commented.
- The pin is itself an inline-size container. `ComparisonRowDetail`'s one-column breakpoint is now a container query, so it collapses by its own width, not the window's.
- GTable semantics are unchanged: the detail stays in the `row-details` slot.

</details>
