# Normal review debrief

The review approved the branch and found no bugs. I acted on its one coverage gap: the new baseline test `test_cached_job_name_agnostic_plain_run_reuses_mapped_job` checks that a mapped `cat1` job is still reused for a cached plain run, which takes the late name-agnostic search after the guard. It passes before and after the fix. As part of this, the test helper was renamed to `_run_tool_and_wait(..., tool_id=...)`. The new head is `191bd2fda2e`; all 5 `test_cached_job_*` tests pass, and the 2 baseline tests pass on the baseline commit.

Not acted on, with the reason:
- **Mapped rerun after renaming the element's dataset (`$input.name` tools).** The identifier branch has no name condition, so this can still reuse a stale job. It predates this branch and is the sibling path, so it's a follow-up issue candidate.
- **`__populate_input_dataset_wrappers` (evaluation.py ~556) doesn't pass `tool_evaluator`.** It predates this branch and the fix doesn't change it. Follow-up.
- **Stale comment in `model/__init__.py` ~1771** saying relaxed matching never finds mapped jobs. It was already wrong before this branch; follow-up.
- **The NOT EXISTS is added once per value index on multi-value inputs.** The subqueries are identical, so this is harmless. Leaving it, to keep the diff minimal.

<details><summary>Full review</summary>

**Verdict:** approve. No blocking bugs; each case in #24411 has its own behavioural test.

**Checked:**
- **SQL correlation.** Compiled on sqlite and postgresql: the NOT EXISTS sits inside `job_ids_cte` as `job_parameter_1.job_id = job.id`, with `job` in that CTE's FROM, and `job_parameter.job_id` is indexed.
- **Placement under `require_name_match`.** Correct. The late search (`jobs/__init__.py:1303`) passes `False` only for tools that read neither name nor identifier. The `__when_value__ is False` case already passes `False`, so skipped jobs are unaffected.
- **Path keys.** `get_path_key` matches the `inp_data` prefixed names written in actions/__init__.py:504. The guard uses the same key as the identifier branch.
- **Multi-value inputs.** Only the first value's key is checked, the same as the existing identifier branch.
- **`consumes_names`.** The old fallback already set the flag via `__getattr__("name")`. Now reads with a real identifier also set it. `tool_evaluator` is propagated correctly. All identifier reads go through the property: `name_and_ext`, `get_staging_path`, `serialize`, `data_input_to_staging_path_and_source_path`, and Cheetah. `ElementIdentifierMapper` only feeds identifiers in.
- **Existing mapped search tests** re-search with the same mapped inputs, so they're unaffected. Unit tests for wrappers and evaluation pass.

**Should fix:** no test checks that name-agnostic tools still reuse a mapped job for a plain run. A `cat1` test was suggested.

**Follow-ups:**
- Rename + mapped rerun stale reuse for `$input.name` tools.
- `__populate_input_dataset_wrappers` omits `tool_evaluator`.
- Stale model comment at ~1771.

**Nits:**
- Duplicate NOT EXISTS per value index.
- The forward-compat helper comment is fine.
- Imports are fine.

</details>
