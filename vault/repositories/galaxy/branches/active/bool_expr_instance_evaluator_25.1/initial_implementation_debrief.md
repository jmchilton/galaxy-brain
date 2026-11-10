STATUS: READY

Single commit `93ef0d45a71` on `release_25.1`. `BoolOperand` now takes the `TokenEvaluator` as a constructor argument; `BooleanExpressionEvaluator` binds it via a per-instance parse-action lambda. Removes the class-level `BoolOperand.evaluator` that let a newly built evaluator, or `is_valid_expression()`, change results of existing instances.

- Tests: two sequential regression tests in `test/unit/util/test_bool_expressions.py`; red on base (2 failed), green after (44 passed). `test/unit/files/test_posix.py` 28 passed. ruff/black/isort/mypy clean.
- No baseline-tests commit: existing tests already pin single-instance and `is_valid_expression` behavior.
- Review: [normal review](subagents/normal_review.md) approved, no changes.
- Forward merge to 26.0+: one conflict region (`setParseAction` + `infixNotation` lines); resolve to `set_parse_action(lambda token: BoolOperand(token, evaluator))` and `infix_notation(`.
- Hardening steps (test challenge, codex review, refactor baseline, scope evaluation, check branch) not run; ~15-line diff, John to decide if wanted.
- No issue report step (no public issue).

```
created .../differential-review/snapshots/20261110T095305Z-implementation-93ef0d45a719.json
  implementation @ 93ef0d45a719 vs origin/release_25.1 (merge-base de6cd44b8123)
  first snapshot: 1 commit, 2 files, 3 hunks
```
