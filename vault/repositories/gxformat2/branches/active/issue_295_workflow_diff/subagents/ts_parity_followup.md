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
