# Hardening 2: small expansion

**Top line.** All six items from the scope evaluation's recommendation are done, as six commits on `compare_runs` and none pushed. The Codex fixes `dfcca6a5918` and `3273c6ead22` come first; see [../codex_review.md](../codex_review.md). The tip is `b527b296a74`. Every touched test ran at its own layer. Two places depart from the plan:
- B2 uses `HDA.is_skipped` instead of a creating-job lookup, so it adds no SQL statement.
- B6 adds a small populator helper.

| Item | Commit | Tests |
|------|--------|-------|
| 1 Route meta flag matches #24307 | `1f31733e199` | `routerViewKey.test.ts` (3) |
| 2 Skipped outputs read `skipped` in every mode | `4679325c31b` | API: `test_step_runs_skipped_step` (extended), `test_step_runs_skipped_subworkflow_step` (flipped) |
| 3 Workflow editor entry point (#10039) | `13d7c32be07` | `NodeInspector.test.ts` (+4) |
| 4 `copied_from_job_id` gets a dev caller | `b527b296a74` | `ToolExecutionJobs.test.ts` (+1) |
| 5 Drop the dead defaulted-input fallback | `028ebf84224` | unit test removed; API `test_step_runs_defaulted_data_input` still passes |
| 6 Move the io names probe to `test_jobs.py` | `6e293474a9c` | API `test_jobs.py::test_show_io_association_names` |

## Items

### 1. `meta.keepMountedOnQueryChange` renamed to `meta.reuseOnQueryChange`
- I checked #24307 in the `issue_24173_invocation_selection_urls` worktree, read-only.
  - Its `Analysis.vue:56-61` keys the router-view by `route.path` when `route.meta.reuseOnQueryChange` is set, and by `fullPath` otherwise. `/galaxyai` is special-cased first.
  - Its `router.js:834` sets the flag on `workflows/invocations/:invocationId/:tab?`.
  - These are the same semantics as `centerRouterViewKey`.
- What changed here: the key name in `routerViewKey.ts` (code and doc comment), in its test, and on the `/comparisons` route in `router.js`. The helper is kept.
- Whichever PR lands second removes its own inline copy of the rule.

### 2. Skipped placeholders read `Missing(skipped)` in every mode
- `ComparisonCellBuilder.item_cells` now checks `hda.is_skipped`. That flag is on dev since `011f190ece9`: it is `expression.json` plus a `blurb == "skipped"` that only `set_skipped` writes.
  - The check runs after the access check and before the expression inline check, so both inline modes read `skipped`.
  - `blurb` isn't deferred and HDAs are already batch-loaded, so this adds **no statement**. That is cheaper than the scope evaluation's "one batched creating-job lookup". The statement-count unit tests still pass.
- Now covered:
  - `output_runs` workflow outputs of a skipped step;
  - a skipped subworkflow step's output, which is the inner step's placeholder;
  - a placeholder used as an input anywhere.
- `_mark_skipped_outputs` stays, because it also covers a skipped job's collection outputs.
- Tests:
  - `WORKFLOW_MAYBE_CAT` gets a labelled `cat_out` output. `test_step_runs_skipped_step` now asserts that `output_runs` gives `skipped` for both inline settings.
  - `test_step_runs_skipped_subworkflow_step` is flipped from `Value(null)` to `skipped`, as the scope evaluation said it would be, and also checks `inline_expression_values=False`.
  - Both were red before the change.
- Limit, unchanged: mapped batches still show their collection cell.

### 3. Workflow editor entry point (#10039)
- `NodeInspector` takes two new props, `storedWorkflowId` and `hasChanges`. It shows a "Compare runs of this step" `GButton` with `to=comparisonPath("step_runs", {workflow_id, step_label})`.
  - The button shows only for a labelled step, a saved workflow, and no unsaved changes.
- `Index.vue` passes `isNewTempWorkflow ? undefined : id` and `hasChanges`. `id` is the editor's stored workflow id; `WorkflowEditor.vue` resolves `workflow_id` to the stored id.
- Vitest:
  - the link renders with the expected href;
  - it is hidden for unsaved changes, an unlabelled step, and a never-saved workflow.
  - The test now mounts with `getLocalVue()`, because `GButton :to` needs the router.
  - The positive case was red against the HEAD component.

### 4. "reused" mark in the batch job pager
- `ExecutionJob` gets `copied_from_job_id?: string | null`.
- `ToolExecutionJobs` shows the comparison table's "reused" badge next to the pager when the paged job came from the job cache.
- The tool-request source never carries the field, which is fine.
- The vitest pages to a reused job in a batch. It was red against the HEAD component.
- The `tool_version` filter stays as it is, for #24288's filters (D8).

### 5. Dead defaulted-input fallback removed
- `run.py:701-706` records a defaulted input as an invocation input via `add_input`. That comes from `1e48e15ffb6`, which is in release_25.1 and later. So the fallback added in `008e81e5089` is unreachable for any invocation made since then.
- Removed: the three lines in `_step_rows` and `test_step_runs_data_input_without_request_input`. This was approved under the galaxy-brain process.
- Residual risk: an invocation made before that release, with a defaulted data input, now shows an empty input cell.

### 6. Baseline probe moved to `test_jobs.py`
- It is a pure job-API probe, so it moved and was renamed `test_show_io_association_names`. It now uses the `history_id` fixture.
- Its run-wait-show helper became `DatasetPopulator.run_tool_and_show_job`. `test_comparisons.py` dropped its private `_run_and_show` in favour of it.
- **Fold this into baseline `5f1ddb3fd99` at the next history fold**, together with the populator helper, so a baselines-only PR doesn't add `test_comparisons.py`.

## Checks
- **API:**
  - `test_comparisons.py`: 28 passed before the move and 27 passed at the tip `b527b296a74`, as one module.
  - `test_jobs.py -k test_show_io_association_names`: 1 passed.
  - `-k multiple_data_input`: passed after the move.
- **Unit:** `test_ComparisonsManager.py` and `test_comparison_columns.py` pass.
- **Vitest:** `Workflow/Editor`, `History/Graph`, `composables`, `Comparison`, `entry/analysis` and `Markdown/Sections/Elements`: 122 files, 1143 tests passed, on node 22.20.0.
- **Client static checks:**
  - `vue-tsc --noEmit`: 0 errors.
  - eslint: 0 errors. The warnings are the existing hyphenation warnings in `Index.vue` and `NodeInspector.vue`.
  - prettier: clean.
- **Python static checks:** black, isort, ruff and flake8 are clean through pre-commit. Per-file mypy shows only the known `warn_return_any` artifacts.
- **No schema change,** so no client API regen.
- **Not run:** E2E. The editor link has no Selenium/Playwright coverage.
