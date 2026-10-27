# Phase 2 review debrief

Verdict: no blocking bugs. Acting on all findings in the next phase's fix pass: strengthen the mapped-batch state and `include_workflow_jobs=False` tests, add admin and per-item access-helper parity tests, move `accessible_history_ids` onto `SharableModelManager`, fold `datasets_are_public`/`can_access_datasets` onto the new batch helper where clean, extract shared count/sort/page and column-spec helpers, and fix the mode 2 nits (filter `io` before loading, `present_in_versions` seeding, stale description, assert instead of skip). `output_labels` will filter output columns only, keeping inputs (matches its name).

Not acted on:
- Mode 3 batch mapped over an empty list — recorded as a known gap (no job → no row).
- `/api/jobs?tool_version=` singular vs `tool_runs?tool_versions=` plural — left for John (design question).

<details><summary>Full review</summary>

# Phase 2 review (raw): `d17debf6d68..28475abda1d`

Reviewed in `/Users/jxc755/projects/worktrees/galaxy/branch/compare_runs` at HEAD `28475abda1d`. Nothing in the worktree was changed. The unit tests rerun here passed (`test_ComparisonsManager.py` plus `test_accessible_history_ids`: 11 passed). I did not rerun the API tests.

## Verdict

**No blocking correctness bugs. Mergeable for the phase after test hardening.**

- The batched access helpers match the existing show rules exactly:
  - `accessible_dataset_ids` matches `can_access_dataset` = `dataset_is_public or allow_action(DATASET_ACCESS)`, where every access role is required.
  - `accessible_history_ids` matches `SharableModelManager.is_accessible` (owner, importable or shared), which is what `__get_history_collection_instance` uses for HDCA show.
- The owner filter is explicit in every mode:
  - `History.user_id` in the pager;
  - `Job.user_id` in mode 3, also with `history_id`, and admins aren't special-cased.
- `total_matches` is counted after filtering.
- `copied_from_job_id` doesn't leak as a raw integer anywhere I could find.

The real gaps:
1. **Tests that can't fail.** The tests for three of the trickiest SQL branches pass under an obvious mutation, and the admin path is never exercised.
2. **Reuse.** The access helper is generic code, but it sits on `HistoryManager`; it belongs on `SharableModelManager`. The paging block is duplicated in two places.

## Real bugs

None found. A few correctness edges are listed under "Behaviour edges" below; none of them blocks.

## Access findings

None of these is a gap in behaviour; each is a **missing test** on an access-relevant path.

1. **The admin path for mode 3 `history_id` is untested.**
   - D4 exists because `JobManager.index_query` gives admins every user's jobs. `tool_runs` always adds `Job.user_id == me` (`managers/comparisons.py:659`), so the code is right. But no test calls it as an admin, and `ComparisonAccess.is_admin=True` is never exercised: every unit `_access()` hardcodes `False` (`test_ComparisonsManager.py:395`).
   - **Fix:** in `test_tool_runs_owner_filter_and_access`, add `self._get("tool_runs", data={"tool_id": "cat1", "history_id": owner_history_id}, admin=True)`, which must return `total_matches == "0"`. Optionally add a unit case where `is_admin=True` turns the `input:foreign` cell into a dataset cell, to pin the bypass (design question 1 in the debrief).
2. **No test checks that the access helpers agree with the per-item rules.** Both tests assert hand-computed sets (`test_galaxy_mapping.py::test_accessible_dataset_ids`, `test_HistoryManager.py::test_accessible_history_ids`). The "matches `can_access_dataset` exactly" claim is only argued.
   - **Fix:** in each test, add a per-user and per-item parity loop:
     - datasets: `assert (d.id in accessible(u)) == security_agent.can_access_dataset(u.all_roles(), d)`;
     - histories: `assert (h.id in ids) == history_manager.is_accessible(h, non_owner)`.

     A future change to either side then fails the test.

Cells I checked and found correct:
- The `via` workflow name and step label, and mode 2 parameter and output values: these all come from the caller's own invocations and jobs.
- Expression inlining: it runs only after the access check (`comparison_cells.py:120-125`).
- `metadata_keys`: only accessible HDAs contribute to it.
- `CollectionCell` exposes the same fields as HDCA show.

No issue in already-released code calls for a private security note.

## Tests that pass without the behaviour

1. **The ICJ branch of `_submission_state_predicate`** (`managers/comparisons.py:662-673`).
   - In `test_tool_runs_mapped_batch_is_one_row` all three member jobs are `ok`. A mutation that filters only the outer representative `Job.state` still gives 2 for `states=ok` and 0 for `states=error`.
   - **Fix:** add a unit test reusing `_mapped_step`. Set the second member job's state to `error`, call `tool_runs(states=["error"])`, and expect exactly 1 row, an ICJ row with `states == {"ok": 1, "error": 1}` and row state `error`.
   - The same gap exists for the mode 1 `_step_state_predicate` ICJ arm: every mapped fixture is all `ok`.
2. **The ICJ arm of `include_workflow_jobs=False`** (`managers/comparisons.py:322`, `wis.implicit_collection_jobs_id == icjja.implicit_collection_jobs_id`).
   - `test_tool_runs_workflow_jobs` runs only unmapped `cat1` steps, and the mapped unit fixture always passes `include_workflow_jobs=True`. Dropping the ICJ arm passes every test.
   - **Fix:** in `_tool_runs_statement_count`, or in a new small unit test, call `tool_runs(include_workflow_jobs=False)` on the mapped fixture and assert `total == 0`. Then add one plain job outside the workflow and assert `total == 1`.
3. **The `%` wildcard in Tool Shed matching** (`_tool_predicates`). `test_tool_runs_matches_tool_shed_versions_without_wildcards` covers `_`, through `myXtool` and `my_tool_extra`, but not `%`. It's cheap to add, though `autoescape` covers both. Nit.

## Reuse and abstraction (John's priority)

1. **`HistoryManager.accessible_history_ids` belongs on `SharableModelManager`** (`managers/histories.py:537-551`).
   - The rule is the generic sharable one: owner, `importable`, or a row in `user_share_model`. `SharableModelManager` already has `self.model_class` and `self.user_share_model` (`sharable.py:70`), and `is_accessible` is right there (`sharable.py:101`).
   - **Fix:** make it `SharableModelManager.accessible_ids(user_id, ids)`, using `self.model_class.id`, `.user_id`, `.importable` and `self.user_share_model`. Pages, visualizations and StoredWorkflows then get it for free, and it sits next to the per-item rule it batches.
2. **`GalaxyRBACAgent.accessible_dataset_ids` is close to existing helpers** (`model/security.py:1192`).
   - It sits next to `datasets_are_public`, the same query without the role test, and `can_access_datasets(user_roles, action_tuples)`, the same "all roles required" loop.
   - It's acceptable as a new batched primitive. Ideally `datasets_are_public`, which takes `trans` only to reach `sa_session`, and `dataset_access_mapping` would become thin wrappers over it, or the PR body would say why not.
   - Placement alternative: `DatasetManager.has_access_permission`/`is_accessible` (`managers/datasets.py:125-140`) is the manager-level home for this rule. Putting the batched version there would avoid the new DI registration in `app/__init__.py:865`.
   - That registration is harmless as written, since `_register_singleton` returns the instance, but it's an app-wide change made for one consumer.
3. **The paging block is duplicated.** `_page_invocations` (`comparisons.py:465-471`) and `tool_runs` (`:326-332`) repeat the same steps:
   - `get_count`;
   - `[id]`, with `update_time` prepended for `sort_by=update_time`;
   - the comment "create_time is unindexed";
   - `desc`/`asc`;
   - limit and offset.

   **Fix:** `_count_and_page(stmt, id_column, update_time_column, query) -> (rows, total)`.
4. **`role, name = key.split(":", 1)` plus `ColumnSpec(... role="input" if role == "input" else "output")` appears twice**, in `_step_rows:505-509` and `_tool_rows:367-369`. Have `_keyed` return `ColumnSpec`s, or add a `_specs_for(io)` helper.
5. **Good reuse, which should stay:** `get_count`, `parse_tool_version`, `versionless_tool_id`, `Job.non_ready_states`, and `ImplicitCollectionJobsStateSummary` as the base of `ImplicitCollectionJobsRunRef`. The shared `_cells`/`item_cells` choke point is a good abstraction: all three modes go through one access-checked path.

## Behaviour edges (nits / design questions)

- **`output_labels` filters columns, but every item is still loaded** (`_output_rows:178-184`).
  - `_invocation_io` returns every labelled input and output, and `item_cells` loads the HDAs and HDCAs, runs the access queries, and reads every `expression.json` file (≤4 KiB) for columns the caller filtered out.
  - **Fix:** restrict `io` to `{c.key for c in columns}` before calling `item_cells`.
- **`output_labels` also filters inputs and parameters.** The test passes `["n", "min_quality"]`, and the API description says "inputs and outputs". A parameter named `output_labels` that selects input labels is a naming mismatch.
  - Rename it to `labels`, or filter only `output:` keys. This is a design question for John (D6 picked the name).
- **Mode 2 `present_in_versions` can overclaim.** A Workflow version on the page with no labelled inputs or outputs is absent from `declared_by_version` (`_declared_workflow_io` only creates entries for workflows that have specs).
  - `all_versions` then excludes that version, so a column present in every other version gets `None` ("every version on the page").
  - That version's own cells are still correct (`not_in_version`).
  - With `output_labels`, a version keeps an empty list and *is* counted, so the two paths are inconsistent.
  - **Fix:** seed `declared_by_version` with every page version (`{version_map[i.workflow_id]: [] for i in page}`) before merging.
- **Mode 3 never lists a batch mapped over an empty list.** It is driven by `Job` rows, so an ICJ with no jobs has no representative. Mode 1 handles that case explicitly. Record it as a known gap.
- **`_tool_rows`: `if run is None: continue`** (`:384-386`) can make `rows` shorter than the counted `total_matches`. It's unreachable in practice, since `load_jobs` and `load_implicit_collection_jobs` always return the paged ids. Turn it into an assertion, or drop it.
- **Mode 2 missing reason after scheduling is always `no_output`** (`run_terminal=True`, `:192`). A `cancelling` invocation gets `no_output` rather than `not_run_yet`. Minor.
- **Stale field description.** `ComparisonColumn.metadata_keys` still says "seen in this column's datasets", but since `28475abda1d` the keys come from the datatype's declared spec, including elements that aren't set (`schema/comparisons.py`). Update the description.
- **Singular vs plural parameter.** `/api/jobs?tool_version=` is singular, while `/api/tool_runs?tool_versions=` is plural. The debrief calls this out: the singular form matches the sibling `tool_id`/`tool_id_like`. This is for John to decide; it isn't a bug, but it's the kind of naming inconsistency he wants surfaced.
- **Raw integer ids in the legacy library upload response.** `api/library_datasets.py:583`'s `job.to_dict()` now also emits `copied_from_job_id` unencoded. It's always None there, as the debrief notes. The same dict already emits a raw `history_id`; that is pre-existing and not a security issue. Optional hardening: `encode_all_ids(job_dict)`.

## Checked and OK

- **Job response fields.**
  - `tool_version` is on `JobBaseModel`.
  - `copied_from_job_id` moved up to `JobSummary`, as an `EncodedDatabaseIdField`, and was added to `Job.dict_collection_visible_keys`.
  - Every caller encodes it or drops it through Pydantic: `services/jobs.py:170`, `services/tools.py:451` (`encode_all_ids`), `services/histories.py:304` (`JobImportHistoryResponse` ignores extras), invocation step `get_jobs_dict` (`list[JobBaseModel]`) and `managers/jobs.py:1577` (element view).
  - B1 is updated to the intended key-set change, and the red-first test is recorded.
- **`/api/jobs` `tool_version` filter.** It's one `build_and_apply_filters` line next to `tool_ids_like`. `test_index_tool_version_filter` pins the exact id sets, including the comma form and a no-match case.
- **Tool id matching.**
  - `versionless_tool_id` only strips a 4-segment shed suffix.
  - `startswith(base + "/", autoescape=True)` escapes `_`, `%` and `/`.
  - The unit test covers the `_` wildcard and the `my_tool_extra` prefix.
- **ICJ rows.**
  - The SQL representative (`NOT EXISTS` an earlier `(order_index, job_id)` sibling) matches the Python representative (`ORDER BY icj.id, order_index, job_id`, first row). `order_index` is non-null, so the `NOT EXISTS` can't return two rows per batch.
  - Sorting and times come from the representative job.
  - `reused` is computed from `copied_count / job_count`, so `partial` works.
  - `total_matches` counts a batch once, which `test_tool_runs_mapped_batch_is_one_row` pins.
- **expression.json inlining.**
  - It requires state `ok`, the HDA not purged, a known `file_size` and `get_size(calculate_size=False) <= 4096`, with the read wrapped in `try`/`except`.
  - It runs only after the access check.
- **Duplicate output labels.**
  - `_declared_workflow_io` keeps duplicates, and `align_columns` flags them.
  - The first `WorkflowOutput.id` wins the cell.
  - The ORM fixture test pins both.
- **Mode 2 inputs are keyed by `WorkflowStep.label`**, through `assoc.workflow_step_id`, not by `order_index` or the association `name`. Unlabelled inputs are skipped.
- **`NoReplacement`** becomes `Missing(skipped)`, pinned in the statement-count fixture.
- **Query count.** The statement count is flat between N=1 and N=5 for all three modes, with metadata on and off. The `28475abda1d` N+1 fix is right: `hda.metadata.spec` is the datatype spec, and reading it through `hda.metadata` forced the deferred `_metadata` load.
- **Imports** are at module top. Docstrings are one line, except `_cells` (two lines, acceptable).
- **Schema regen.** `a2de1bf2bf8` touches only `client/packages/api-client/src/schema/schema.ts`.
- **JobInformation.vue** uses the typed `job.value?.tool_version ?? null`, and the `traceback` hack is kept with a short comment.

</details>
