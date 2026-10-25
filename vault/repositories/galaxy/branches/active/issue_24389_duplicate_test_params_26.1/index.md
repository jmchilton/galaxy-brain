# issue_24389_duplicate_test_params_26.1

- [Open PR](https://github.com/jmchilton/galaxy/pull/new/issue_24389_duplicate_test_params_26.1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/issue_24389_duplicate_test_params_26.1)

## Status

Implemented; hardening in progress.

No PR.

Fork CI not checked.

Base: `release_26.1` (`df713519127`). Head: `60607462357`. Fork: `jmchilton/issue_24389_duplicate_test_params_26.1`. Worktree: `~/projects/worktrees/galaxy/branch/issue_24389_duplicate_test_params_26.1`. Issue: [#24389](https://github.com/galaxyproject/galaxy/issues/24389) (assigned to John; root-cause comment posted).

## Decisions

- Base `release_26.1`: John's instruction (reporter on 26.1).
- Conflicting duplicate qualified test params raise the existing "Ambiguous" error; identical ones stay tolerated (matches 5a443294512 for unqualified).
- No XSD constraint: `xs:unique` per test container broke a working legacy (≤24.1) elided-outer-repeat idiom and XSD can't be profile-gated (normal review).
- PR body must name IUC sourmash sketch (25.0) and isoformswitchanalyzer (25.1): their tests error at load after this.

## Dependencies

- Merge-forward to dev conflicts: `case.py` (`test_case_validation` refactored on dev by `262e080dfe0`, already builds state inside `try` - take dev's; keep this branch's `input_for` and `_inputs_by_name` changes) and `test_tool_linters.py` (EOF appends - keep both).
