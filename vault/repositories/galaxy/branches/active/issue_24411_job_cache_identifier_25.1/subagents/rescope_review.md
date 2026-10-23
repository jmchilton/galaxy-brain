# Re-scope review debrief

The review approved the re-scope commit with no bugs. Its main concern was that the new name condition for mapped requests would lose cross-history workflow-rerun cache hits for tools that read identifiers. I tested that and **refuted it**.

New test `test_workflow_rerun_mapped_identifier_step_with_use_cached_job` (`test_workflows.py`), now in the baseline commit:
- The workflow maps `cat1` over a list, then maps `identifier_single` over the result.
- It is rerun in a second history whose hids are shifted by an extra upload.
- The `identifier_single` step is still a cache copy on base, on the alt, and on the re-scope head.
- Implicit element outputs are named without `on data N`. Both histories show `Concatenate multiple datasets or collections` for the element HDA, so the names match. Only HDCA names carry `on collection N`, and HDA matching doesn't look at them.

Nits applied, folded into the re-scope commit (new head `83965daea00`):
- Reworded the `Job.copy_from` comment as the reviewer suggested.
- The rename test picks `out_file1` by `output_name` rather than by position.

I confirmed the rename test is red on the original-scope code (`9159432b81e`): `copied_from_job_id` was set.

Not acted on:
- **Copy-then-rename case (`b.name == c.name` half) for mapped requests.** Optional; the in-place rename covers the `e` half.
- **The test adds an address to the shared test user.** `test_model_attributes_sanitization` already does the same.
- **A plain cached run of a name-agnostic tool with a collection output, after a mapped run, may raise `NotImplementedError` in `Job.copy_from` (HDCA vs DatasetCollection).** Unverified, and it predates this branch. Recorded as a follow-up candidate that needs a red test.

<details><summary>Full review</summary>

**Verdict:** approve, no real bugs.

**Main finding (non-blocking):** `HDA.copy_from` doesn't copy `name`, so cached outputs keep default names (`<tool> on data N`), which differ between histories. A cross-history workflow rerun with a mapped step that reads identifiers would then miss the cache: previously it matched on the identifier alone, and now the job reruns. The reviewer called this acceptable on 25.1 but asked for it to be documented. The precise dev fix it suggested is to split `consumes_names` into separate name and identifier flags and add `require_identifier_match`. *(Refuted above: mapped element outputs have no `on data N`.)*

**Checked OK:**
- SQL placement: `e.name` is in the outer-join ON clause and `b.name` is in the first OR arm. An in-place rename bumps `version`, so the test goes from red to green via `e`.
- `tool_evaluator=self` only sets `consumes_names`, so it can only remove late-search hits. Safe for data_source tools.
- `model_attributes` is the only test tool that echoes `$input.name`, so reusing it is acceptable.
- No imports added; comments are short.

**Nits:**
1. Comment wording.
2. Select the output by name.
3. Copy-case test is optional.
4. Shared test user state.

**Pre-existing follow-up:** the collection-output `NotImplementedError` described above.

</details>
