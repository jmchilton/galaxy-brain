# Initial implementation debrief

```
created .../tool_security_runtime/differential-review/snapshots/20261126T160200Z-implementation-882a9878cd3d.json
  implementation @ 882a9878cd3d vs tool_security_static_findings (merge-base d4e4f68dd259)
  first snapshot: 3 commits, 25 files, 92 hunks
```

Head `882a9878cd3` on `jmchilton/tool_security_runtime`, 3 commits on the squashed parent `d4e4f68dd25`. Source pin: `tool_security_review_spec` at `d5f7cb05e91`. Its ref and worktree were not touched.

## Commits

1. `09877fc98d1` (John) **Split `classify()`'s reasons from its gate.**
   - Adds `uncheckable_evidence()`, `uncheckable_reasons(report, why=WHY)` and a public `unchecked_locations()`.
   - `classify()` output is unchanged.
2. `2a84ff16f14` (author mvdbeek, Co-authored-by John) **Runtime.** Ported from the source's net diff (`git diff 89a8ba1d4 d5f7cb05e91`, applied with `git apply -3`):
   - `galaxy.tools.security_review`
   - `ToolEvaluator` and `PartialToolEvaluator` checks
   - `Tool.security_review()`
   - app, `structured_app` and `MockApp` wiring
   - config schema (regenerated sample, rst and attributes)
   - runner and Pulsar handling, `codes.py`
   - the unit, integration and API test changes
3. `882a9878cd3` (John, Co-authored-by mvdbeek) **Spec jobs.**
   - Job models, sweep and `SpecCase` `code`/`known_bypass`/`red`/`green` restored into the parent's `spec/__init__.py`, in 3.11 typing.
   - `cases.yml` merged at text level: source docs and jobs, parent review blocks.
   - `security_review_spec.py` and `test_security_review_spec.py`.
   - Restored spec-structure tests.
   - Docs: a "Checking jobs" section, plus generated jobs and refusal codes.

## Adaptations to the parent (no old code brought back)

- **`_no_plain_value`** is now `uncheckable_reasons(report, _JOB_WHY)`. That call is ungated, because the check-error path and stricter levels need reasons when no code-level location is unchecked. `_JOB_WHY` keeps the user-facing "the job does not carry" wording that the tests pin.
  - Red to green: `test_strict_when_unsure_refuses_plain_values_when_the_check_fails_on_a_rewriting_tool` failed with a naive `classify().reasons` swap and passes now.
- **Unchecked locations** come from `classify.unchecked_locations()` (code level, including reflection) unioned with `unchecked_at(level)`. This equals the source at every level.
- **`RefusalCode`** (`codes.py`) takes its values from `Rule`/`Uncheckable`, and reuses their descriptions where the text matched or only gained an "enforce_data" note. Only the 6 runtime-only codes are new. A test pins all 17 values.
- **Job-check helpers.** The parent removed `enforced`, `enforced_findings`, `Report.added_by_rewrites` and `SourceRef.param_path`. They are now private functions in `security_review.py`, so the static modules stay as the parent has them. `REFLECTION_RULE` became `Rule.TEMPLATE_REFLECTION`.
- **Runners.** `ToolInputRejected` joins dev's existing `(ParameterValueError, ExpressionTemplateError, InsufficientPermissionsException)` rejection path, and the Pulsar `ParameterValueError` branch. It does not get its own `except`.
- **Dev drift.**
  - `app.py` and `structured_app.py` are now packages.
  - `ComputeEnvironment.input_metadata_rewrite` takes `(dataset, metadata_name, metadata_file)`.
  - Strict mypy defaults mean the new modules are fully typed.
  - Lint follows the 3.11 floor.
- **`server_python_command`** (a parent-only case) gets red and green jobs. Its `word` is `/dev/null`, because log mode runs the template's `head -n1`.

## Gates

- Unit: `test/unit/tool_util/security`, `test_security_review.py` (116), `test_security_review_spec.py`, `test_evaluation.py` and `test/unit/app/jobs`: 3224 passed.
- Integration: `test/integration/test_tool_security_review.py`, 7 passed.
- Refusal outcomes match the source: the 43 source cases' `code`/`red`/`green`/`doc` are identical to the source's `cases.yml` (94 jobs), and every job, log-mode, harm and sweep test passes with only import paths changed.
- Diff against the pin:
  - `evaluation.py`, `tools/__init__.py`, `jobs/__init__.py`, `config_schema.yml` and `api/test_tools.py`: patch-identical to the source's, except `Optional[...]` → `| None`.
  - `security_review.py`: the adaptations above plus pyupgrade.
  - `tool_util/security`: parent additions (rules, classify, CLI, lint, framing) plus the classify split, `codes.py` reuse and the spec/docs merge.
- ruff, black and isort are clean. mypy from `lib/`: 0 errors in changed modules; the 22 in 11 unrelated modules match the parent.

## Known CI fallout (decision for John)

With the default `enforce_code` and `strict`, Galaxy's own test tools are refused:
- **API** `test_tools.py::test_model_attributes_sanitization` fails. `model_attributes` writes `$__user__.addresses[0].desc` (untraced), so every job is refused (`uncheckable-untraced-value`), not only the quoted name the test expects.
  - The cause is source behaviour, not this port: John's "refuse untraced values" commit came after mvdbeek's test update, and `_no_plain_value` and `classify` share the logic. Not verified by running the source on its base.
- **Framework** `config_vars` (fails at the source too) and `command_reads_configfile` (new on dev) are refused: `uncheckable-template-code`, plus untraced for the latter.
- Other tools may fail the strict check only for non-plain test values. Only CI will show the full set.
