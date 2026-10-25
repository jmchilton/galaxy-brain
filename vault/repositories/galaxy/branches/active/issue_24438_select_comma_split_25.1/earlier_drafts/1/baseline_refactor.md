No refactoring of the base branch was performed.

The only candidate was extracting `_test_value_as_list` in `lib/galaxy/tool_util/verify/parse.py` ahead of the fix as a pass-through to `split_if_str`. That base-preserving version would ignore its `input_source` argument and change only two call sites, so it would add a commit with nothing to review on its own. The helper's whole body is the fix. The branch stays as is: `4b8173d90ec` (select fix) followed by `6caf89ba51d` (ftpfile follow-up). History is unchanged and no backup branch was needed.
