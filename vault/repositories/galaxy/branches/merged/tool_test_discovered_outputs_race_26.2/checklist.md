# PR checklist: tool_test_discovered_outputs_race_26.2

Evaluated head `fc70b831522` against `origin/release_26.2` `d2d1dcd883c` (merge-base `fe7b52529a0`). Checklist: `gx_pr_checklists/GENERAL.md`. `WORKFLOW_RELATED.md` doesn't apply: tool-test framework client code only.

## John's Checklist

- [ ] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? Unchanged: a real mismatch still raises `Incorrect number of outputs - expected N, found M (...)` (`interactor.py:2065-2071`); discovered names just no longer inflate the count.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. `test_interactor.py:506-515` feeds realistic job-output dicts and checks the split result.
- [x] Are baseline tests in their own leading commits (if applicable)? N/A for tests; the two refactor commits (`e7eda4a98db`, `9bae7a94ac5`) lead the fix.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A

## Fixes made

None.

## Validation

- `pytest test/unit/tool_util/verify/test_interactor.py`: 37 passed.
- Red-to-green: with the skip disabled the new test fails (`Left contains 1 more item: {'__new_primary_file_list_output|4__': ...}`).
