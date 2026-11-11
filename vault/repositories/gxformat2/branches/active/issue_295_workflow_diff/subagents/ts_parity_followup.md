## TS port review follow-up (`729027d`)

Run via Claude Opus 5.5 at high effort.

Source: galaxy-tool-util-ts `issue_232_workflow_diff` `subagents/normal_review.md` ("For the Python side"). One commit on top of `4440404`, pushed to `jmchilton` (PR #296 head `729027d`).

1. **`_out_actions` extra keys: fixed, red-to-green.** Reproduced: `_plan_note` on an `out` entry came out as `out_actions.out_file1.after: {_plan_note: ...}`. Dump now uses `include=OUT_ACTION_FIELDS` (`WorkflowStepOutput.model_fields` minus `id`). Case `test_diff_undeclared_out_key_is_not_an_action` failed before, passes after; `diff.yml` header notes the rule.
2. **Parity cases added** (green on arrival in Python):
   - `test_diff_untyped_step_with_run_is_a_subworkflow`: removed inline-`run` step with no `type` → `type: subworkflow`.
   - `test_diff_removed_self_loop_lists_edge_once`: `connections` holds `loop/out_file1 -> loop/queries_0|input2` once.
3. **Alias pin:** `[inputs, 0, type_] → data` in `test_list_form_inputs_outputs_steps_normalized` (`normalized_format2.yml`).
4. **Contract wording:** `implementation_debrief.md` ordering bullet now says JS hoists integer-like keys ahead of all string keys; the `out_actions` bullet says undeclared keys are ignored.

New fixtures (all in `catalog.yml`, all diffed against `synthetic-diff-explicit-false-bare`): `synthetic-diff-out-extra-key`, `synthetic-diff-untyped-subworkflow`, `synthetic-diff-self-loop`. PR description counts: 23 cases, 21 fixtures; live body updated.

Gate green: ruff, flake8, black, mypy, pyrefly, flake8-docstrings, `make lint-docs`, pytest 994 passed / 8 skipped.

TS must re-sync: `expectations/diff.yml`, `expectations/normalized_format2.yml`, the three new fixtures.

## TS port codex + thermo follow-up (`570de0f`)

Run via Claude Opus 5.5 at high effort.

Source: galaxy-tool-util-ts `issue_232_workflow_diff` `codex_review.md` and `thermo_nuclear_review.md` ("For the Python side"). One commit on top of `729027d`, pushed to `jmchilton` (PR #296 head `570de0f`).

1. **Omitted nested input types:** case `test_diff_omitted_nested_type_equals_its_default` over new fixtures `synthetic-diff-nested-type-omitted` → `synthetic-diff-nested-type-explicit` (text input validator, `record` collection field, `sample_sheet` column; ids `pattern`, `pair`, `sheet`). Green on arrival in Python (pydantic defaults). Non-vacuity probed ad hoc: changing the validator expression, or field/column `type` to `int`, each shows up under `inputs.changed.<id>`. Validator `type` only allows `regex`, so no non-default type exists there.
2. **Key order: documented as not semantic** (simpler than a new harness token in both languages; `value:` equality ignores order and comparisons use `sort_keys`). One line in the `diff.yml` header (syncs to TS), one in `docs/cli_diff.rst`, a Result-shape bullet in `implementation_debrief.md`. Python model order unchanged; TS key-order unit test left as TS's own choice.

PR description counts: 24 cases, 23 fixtures; live body updated.

Gate green: ruff, flake8, black, mypy, pyrefly, flake8-docstrings, `make lint-docs`, pytest 995 passed / 8 skipped.

TS must re-sync: `expectations/diff.yml`, the two new fixtures.

TS re-synced in `3fd23149` (pushed to `origin`, #233 head). Pre-existing main drift (`synthetic-extra-field-output`, `validate_format2.yml`) reverted again. Dropping each `INPUT_MODEL_DEFAULTS` type entry turns the new case red; restored, green. TS gate green: `make check`, `pnpm lint:unused:ci`, build, test (schema 5214 passed / 5 expected fail).
