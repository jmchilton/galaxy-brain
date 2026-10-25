# Initial implementation debrief

**Change.** `lib/galaxy/tool_util/verify/parse.py`: new `_test_value_as_list(input_source, value)` replaces `split_if_str` at the two sites in `_process_raw_inputs` (plain params, conditional discriminator). Splits on commas only for `data` or `multiple="true"` inputs; otherwise wraps a string as `[value]` - the shape the legacy submit path already flattens.

**Tests.**
- Baseline commit: `test_multiple_select_value_split_on_commas` pins `multi_select.xml` parsing (`--ex1,ex2,--ex3` splits; label `Ex1` maps).
- New framework tool `test/functional/tools/select_comma_value.xml` (profile 24.2): single select with comma option values via `value=` and `value_json=`, conditional with comma `when` values. Registered in `sample_tool_conf.xml`.
- `test_single_select_value_not_split_on_commas` unit test on that tool.

**Red to green.**
- Unit test failed before fix (`['relax', '150', '100'] != ['relax,150,100']`).
- Framework test `select_comma_value` failed before fix with the issue's exact error for `rep` and `mode`; passes after.
- 86 select/conditional/section/simple_constructs framework tests pass with fix.

**Notes.**
- Multiple selects whose option values have commas stay ambiguous in `value=`; `value_json` list works.
- Single `data` keeps splitting (unchanged behavior).
- Dev-only `value_state_representation` / `hidden_data` don't exist on 25.1; forward-merge to dev needs `hidden_data` added to the split condition (dev's site checks `param_type in ("data", "hidden_data")`).
- Worktree `.venv` is a symlink to the `issue_24411_job_cache_identifier_25.1` worktree venv.
