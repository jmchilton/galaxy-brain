# Alt: original_scope

Branch `issue_24411_job_cache_identifier_25.1_alt_original_scope` at `9159432b81e` (pushed to `jmchilton`).

This is the branch as it stood after the first round of hardening. It has the baseline tests plus the #24411 fix:
- the NOT EXISTS guard for plain requests;
- `element_identifier` sets `consumes_names`.

It lacks the re-scope commit (`988e8350b07`), so it differs from the parent in three ways:
- **No name match for mapped requests:** a mapped rerun of a `$input.name` tool can still reuse a job after the element's dataset was renamed.
- **No `tool_evaluator` on fallback wrappers:** `__populate_input_dataset_wrappers` still builds them without it.
- **Old comment kept:** the `Job.copy_from` comment still says the branch is "unreachable".

Choose this alt if the extra name condition on mapped requests turns out to cost cache hits that matter.
