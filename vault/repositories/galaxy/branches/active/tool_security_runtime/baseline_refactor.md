Run via Claude Opus 5.5 at high effort.

The base is refactored by one commit at the bottom of the branch, `09877fc98d1` (the classify split), and history is unchanged. That commit only refactors the parent's code and leaves `classify()` and the CLI output identical. Nothing else on the branch counts as a refactor, so no commit was added or moved.

## Bottom commit `09877fc98d1`: Split classify()'s uncheckable reasons from its unchecked gate

- It changes only `lib/galaxy/tool_util/security/classify.py`, and no other commit on the branch touches that file (`git log d4e4f68dd25..HEAD -- classify.py`). Private `_unchecked_locations` becomes public `unchecked_locations`. The reason-building code moves into `uncheckable_evidence()`, which gathers the evidence and is not gated on unchecked locations, and `uncheckable_reasons(report, why=WHY)`, which formats it. The `WHY` template map is public. `classify()` still returns `Classification()` when no location is unchecked, and otherwise `Classification(uncheckable_reasons(report), unchecked)`.
- The reason strings are the same as before: each `WHY` template is filled with the same `", ".join(sorted(...))` as the old f-strings.
- Checked at `09877fc98d1`, in a detached temp worktree, against the parent `d4e4f68dd25`:
  - The CLI output (`python -m galaxy.tool_util.security`) for `spec/tools`, `test/functional/tools` and `tools/` is byte-identical between the two commits, in both `--json` (865 KB, 717 `uncheckable` hits) and text modes. The exit codes match.
  - `test/unit/tool_util/security` passes: 590 tests.
  - ruff is clean. mypy shows only the known 22-error baseline.
- New API surface with no caller inside the commit: the `why` parameter and the public `WHY`/`unchecked_locations`. Its consumer is the job check in the very next commit (`lib/galaxy/tools/security_review.py`: `_JOB_WHY`, `uncheckable_reasons(report, _JOB_WHY)`, `unchecked_locations(review.report)`). For a refactor that sets up the next commit, that is acceptable.

## Candidates looked at and left in the feature commits

- `lib/galaxy/tool_util/security/codes.py`: a new module. `RefusalCode` and its descriptions exist only for refusing jobs, so it is feature code. It only reads the parent's `Rule`/`Uncheckable` catalogs and changes neither.
- `spec/__init__.py`: the job models (`DatasetContext`, `JobCase`, `ReviewConfig`, ...), `expected_codes`, `iter_jobs` and the sweep helpers are all purely additive. The `SpecCase` fields `code`, `red`, `green` and `known_bypass` are additive too. Nothing in the parent's existing code is restructured.
- `spec/docs.py`: adds the `_refusals` section and the job rendering in `_case`. It reuses the parent's `_described` unchanged.
- `spec/cases.yml`: some existing case `doc` text was reworded, but every change describes job-check behaviour ("the job check reads it as the template does", "every job is refused", "With `enforce_data`, a slash in it is refused"). Moving those rewrites below the feature would make the docs describe behaviour that does not exist yet. The `review` expectations are not touched.
- `test_spec.py`: the `faults_only` relaxation in `test_every_case_expects_something` is needed only by the new fault-only cases, which have no review expectation. It belongs with the feature, so it stays there. It does not loosen the check for any case the parent has.
- `lib/galaxy/tools/security_review.py` and `app_unittest_utils/security_review_spec.py` (`SpecJobRunner`) are new feature modules. The existing Galaxy files the branch changes contain only additions or feature behaviour. None of their removed lines is a restructure:
  - `tools/evaluation.py`: the `security_reviewer` kwarg on `ToolEvaluator.__init__` and the `_check_input_values()` hook called from `build()` and `PartialToolEvaluator.build()`. The constructor's signature is only reflowed to fit the new kwarg.
  - `jobs/runners/__init__.py`: `ToolInputRejected` is added to the `except` tuple, which is only reflowed.
  - `jobs/runners/pulsar.py`: `ToolInputRejected` is added to the `isinstance` check, and the log message changes to "rejected while preparing". That message change is feature behaviour.
  - `jobs/__init__.py`, `app/__init__.py`, `structured_app/__init__.py`, `app_unittest_utils/galaxy_mock.py`, `tools/__init__.py` (`Tool.security_review()`), and the config schema, sample and docs: purely additive wiring.
  - `galaxy_test/api/test_tools.py` (`test_model_attributes_sanitization`): rewritten because the default refuses the quoted dataset name, which makes it feature-driven. The brief has this test parked for John, so it was not touched. Its old `sanitized_dataset_name == cool_name_without_quote` check is replaced by a refusal check, which is a feature-level change rather than a refactor.

## State

- The branch is unchanged: HEAD is `9b8b1099b1f`, still 6 commits on `d4e4f68dd25`. Nothing was rebased or pushed, and the parent was not touched.
- At HEAD, `test/unit/tool_util/security`, `test/unit/app/tools/test_security_review.py` and `test_security_review_spec.py` pass: 2422 tests.
