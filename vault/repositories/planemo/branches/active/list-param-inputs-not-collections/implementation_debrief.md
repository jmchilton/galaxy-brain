# Implementation debrief — list-param-inputs-not-collections

This takes over planemo#1744. The branch starts at PR head `d3b58601` plus the six review-branch commits (`pr_1744_review_0`, `5a205ab3`) and is not rebased, so it can still be pushed into #1744. It adds two commits. It's pushed to `jmchilton/list-param-inputs-not-collections`.

```
created /Users/jxc755/projects/repositories/galaxy-brain/vault/repositories/planemo/branches/active/list-param-inputs-not-collections/differential-review/snapshots/20261027T013256Z-implementation-1e9956a59411.json
  implementation @ 1e9956a59411 vs origin/master (merge-base b1ac9ac53f8e)
  first snapshot: 11 commits, 9 files, 23 hunks
```

## Commits

- `52f877b4` Share one input_kind classifier across workflow input checks.
  - `planemo/galaxy/workflows.py` gains `input_kind(input_type)`, which returns `DATA_INPUT`, `COLLECTION_INPUT` or `PARAMETER_INPUT`. An untyped input counts as data, and a list type takes the first data or collection type it contains.
  - The two lists of nine scalar types now share one `SCALAR_PARAMETER_TYPES` constant.
  - `parameter_input_labels`, `job_template` and `_build_template_and_metadata_from_inputs` all use the classifier. The template builders go through `_template_input_kind`, which returns None for a list type or an unknown parameter type, so those still fall through to `{"TODO"}`.
  - `DATA_INPUT_TYPES` is gone.
  - Template output is unchanged. A new characterization test (`test_job_template_input_kinds`, on `wf_native_param_inputs.ga`) passes before and after the change. A probe of `wf1`, `wf_multiple_param_inputs` and `wf_param_types` gave the same output too.
- `1e9956a5` Test parameter lists next to color and directory_uri inputs.
  - `tests/data/wf_color_param_input.ga` gains a `directory_uri_param` step and a multiple-value `text_list` step.
  - New test `test_stage_in_passes_parameter_lists_next_to_color_and_directory_uri_inputs` is a strict `xfail(raises=ValidationError)`. It applies when a module-level capability probe fails: `inputs_normalized` on a tiny native dict with `color` and `directory_uri` parameter inputs. The probe checks capability, not a version string.

Other data-vs-parameter checks I looked at and left alone:
- `training/tool_input.py` checks tool params, not normalized workflow inputs.
- `_has_parameter_list` classifies job values, not workflow inputs.
- The invocation-based template path (`_job_inputs_template_from_invocation`) reads a different source.

## Test results

- **Real Galaxy run** of `test_run_multiple_value_parameter_inputs`, run alone: **PASSED** twice (145s and 102s), not skipped.
  - Galaxy was the default test branch `master`, which reports `version_major` 26.1 and `version_minor` 2.dev0. It was cloned from `~/.planemo/gx_repo` master `b18269a10f8`, which doesn't contain the integer-multiple commit `8ab23c05c36`.
  - A manual `planemo --verbose run` of the same fixture and job showed what happened:
    - one `tools/fetch` upload (`hello.txt` only);
    - `POST /api/workflows/.../invocations` returned 200;
    - the final invocation state was `ok`;
    - exit code 0.
  - So `int_list` (`[int]`) is accepted on Galaxy 26.1. Neither fallback was needed: `int_list` stays in the job and the skip floor stays at 24.2. The inputs-only workflow (`steps: {}`) invokes cleanly.
- `make lint` is green, and so is `tox -e mypy` (276 files).
- Non-Galaxy tests, all green:
  - `tests/test_galaxy_workflow_utils.py`, `tests/test_galaxy_activity.py`, `tests/test_cmd_workflow_job_init.py`, `tests/test_cmd_workflow_test_init.py`: 33 passed, 1 xfailed.
  - `tests/test_workflow_lint.py`, `tests/test_cmd_workflow_lint.py`: 24 passed.

## gxformat2 main (#202, PR #281)

I tested gxformat2 main in a scratch venv, using a temp worktree of gxformat2 `origin/main` `da85588` (0.29.0.dev0). Both the worktree and the venv were outside the checkout, and the worktree has been removed.

- Main normalizes native `color` to `color` and `directory_uri` to `directory_uri`.
- The new test passes on main and xfails on 0.28.0.
- **Can `_has_parameter_list` be dropped?** I checked by monkeypatching the gate to always return True, without editing code, and running all of `test_galaxy_activity.py` plus an extra case (empty-list collection next to `color`).
  - On gxformat2 main, all 14 passed.
  - On 0.28.0, 3 failed: the two color cases and the empty-list case.
  - So the gate can go for #202 once a gxformat2 release with PR #281 ships and planemo requires it. Any other native construct gxformat2 can't normalize would still abort staging, because errors aren't swallowed since `9c009f00`. Dropping the gate is John's call. Pin not bumped.

## Not run

- The Galaxy test on other branches. The tox `release_23.1` run should skip it via the 24.2 floor.
- The full `make test` suite (it's Galaxy-heavy; CI covers it).
- Fork CI (Python CI run 40433207575) was queued at handoff; result not seen.

## Open decisions

1. In job templates, an untyped gxformat2 input (`a: {}`) still raises `KeyError: 'type'` in `job_template` and `job_template_with_metadata`, even though `input_kind` treats it as data. Should the templates use `input_kind(step.get("type"))` and emit a File template? That's a one-line fix plus a test.
2. List types still get `{"TODO"}`, a Python set that doesn't serialize to YAML. This covers multiple-value parameters (`[string]`) and `[File]`/`[collection]`. Should they get a list template?
3. When gxformat2 > 0.28.0 is released, raise the pin and drop `_has_parameter_list`? Or keep it as a cheap guard against other normalization failures?
4. How should this reach upstream: push into #1744 or open a new PR?

## Nits

- `input_kind` could return `Literal["data", "collection", "parameter"]` for narrower typing.
