No refactoring of the base branch was performed.

Fresh evaluation of the 4-commit branch at `386a1c925b0` (`82a6d15cf4e` baseline tests, `d5ad8013146` parse fix, `30baf371bf0` linter, `386a1c925b0` xsd docs). Candidates considered:

- **Extract `_test_value_as_list` in `verify/parse.py` first.** A version that keeps base behavior would just pass through to `split_if_str` and ignore `input_source`. The helper's body is the fix, so a separate commit would have nothing to review.
- **Move `inputs._iter_param` to `linters/_util.py` (or make it public) before the linter.** This would be a pure refactor, but it touches about 7 call sites in `inputs.py` on a release branch. Dev's copy has already diverged (`tuple` vs `Tuple`), so it would cause forward-merge conflicts. The cross-module import of a private name has no cycle and isn't picked up by lint discovery. The thermo-nuclear review declined it for the same reasons.
- **Share test-param name resolution with `TestsParamInInputs`.** That linter matches by xpath against `name`/`argument` variants. The new linter only needs a short-name lookup into a map. A shared helper would have one real consumer with different semantics.
- **Linter and xsd commits.** Both are additions only, with nothing to extract ahead of them.

History unchanged, no backup branch needed. Unit suite (`test_tool_linters.py`, `test_test_definition_parsing.py`, `test_parameter_test_cases.py`) at HEAD: 103 passed, 1 skipped.
