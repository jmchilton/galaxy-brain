Run via Claude Opus at high effort.

# PR checklist — staging_workflow_parameter_lists

Head `a812cad3` on `origin/release_26.2` (`0902830b`), 3 commits, `git diff origin/release_26.2...HEAD`. 9 passed, 0 failed.

## General

- [x] What does the user see when it fails? Without opt-in, a server-side 400 with misleading wording. With the keyword, misuse still fails on the server, and no new client-side error path is added.
  <details>

  - Without `parameter_input_keys`, staging turns a list into `{"src": "hdca", ...}`. The server then rejects it at `lib/galaxy/workflow/run_request.py:443` with "workflow parameter inputs cannot be dictionaries. Pass the parameter value directly in 'inputs', without a 'parameter_value' wrapper." The user never wrote a wrapper, so the hint misleads. That wording is pre-existing and not touched here.
  - With the keyword, values for the listed keys pass through as given (`lib/galaxy/tool_util/cwl/util.py:407`) and reach the parameter's own `validate` (`run_request.py:450`). If a data input's key is listed by mistake, the raw value goes to the server and is rejected there.
  - `Set[str]` (`util.py:154`, `staging.py:88`) makes mypy reject a bare `str`, which would otherwise do substring membership (commit `57c30924` message).
  </details>
- [x] Is the diff free of unrelated or stale generated changes? Yes!
  <details>

  4 files, 60 insertions and 17 deletions: `staging.py`, `cwl/util.py`, `populators.py` and `test_cwl_util.py`. Nothing generated.
  </details>
- [x] Are unit tests not just testing the literal implementation? Yes. The unit test checks observable output, and framework tests show the server accepts the result.
  <details>

  - `test/unit/tool_util/test_cwl_util.py:101-125` asserts the whole result dict, in both `tool` and `workflow` modes. It mixes a string list, an int list, an empty list and a scalar with a `class: File` list that still becomes an HDCA, and it checks `len(datasets) == 1`.
  - Red check from `test_challenges_debrief.md`: with the `continue` guard removed, both cases fail on the dict assertion.
  - End to end: framework `multiple_text` and `multiple_integer_into_data_column` passed at `a812cad3` (`retarget_release_26_2.md`). Dropping the kwarg forwarding makes `multiple_text` fail with the 400.
  </details>
- [x] Are baseline tests in their own leading commits (if applicable)? N/A. The new test needs the new kwarg, so it can't pass on base. The base refactor leads on its own as `8d8a842b`.
  <details>

  - The existing framework tests `multiple_text` and `multiple_integer_into_data_column` act as the baseline for the `populators.py` change. They passed at the refactor commit (`baseline_refactor.md`) and again at `a812cad3`.
  - The default-behavior characterization test was dropped on purpose (`test_challenges_debrief.md`), because it pinned the quirk being worked around.
  </details>
- [x] Are the comments free of excess archeology? Yes.
  <details>

  The only new comment is the two-line docstring addition at `util.py:164-165`, which says what the keyword does. The `populators.py` comment "Copy because galactic_job_json() mutates the dict in-place" was already there.
  </details>
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A.

## Workflow-related

Includes everything in General above, plus:

- [x] Which existing workflows change behavior (if any)? None. The default `None` is a no-op, and no server or invocation code changes.
  <details>

  - `util.py:407` only skips keys when the caller passes a non-empty set. `staging.py:292` and `populators.py:4659` only forward it.
  - `WorkflowPopulator.run_workflow` (`populators.py:3144-3167`) keeps the same shape heuristic (`_is_scalar_or_scalar_list`, `populators.py:4494`) and the same inputs. Only dict key order in `inputs`/`label_map` differs.
  - Framework `multiple_text` and `multiple_integer_into_data_column`, plus API `test_run_subworkflow_with_boolean_parameter_in_when_condition` (the `type: raw` unwrap path), passed at `a812cad3`.
  </details>
- [x] Who hits this in practice and what is the evidence? Clients such as planemo running workflows with multiple-value text or integer parameter inputs. IDC's build hit the 400 and worked around it in galaxyproject/idc#103; planemo#1744 is the planemo-side fix.
  <details>

  - galaxyproject/idc#103 (merged): IDC's `repeatmasker_famdb` data manager build failed with `components: workflow parameter inputs cannot be dictionaries`, and IDC baked multiple-select params into `tool_state` to avoid it. Its body says the underlying behavior "is worth fixing upstream separately." planemo#1744 cites it.
  - Planemo#1744 by mvdbeek works around the same staging behavior, and the workaround is still in planemo. This branch lets planemo drop it on galaxy-tool-util 26.2+ behind a version check (`planemo_adoption_proof.md`).
  - Galaxy's own `cwl_style` populators carried a second copy of the workaround (`raw_params`), which `a812cad3` replaces.
  - In 26.2, `8ab23c05c36` (#23802) lets multiple integer workflow parameters feed `data_column` inputs. Integer lists already invoke on 26.1 (planemo's Galaxy-backed `int_list` run, `planemo_adoption_proof.md`), so this adds a use, not the input type.
  - Repro: without forwarding, `multiple_text` fails with the `run_request.py:443` 400 (`test_challenges_debrief.md`).
  </details>
- [x] Were simpler or existing approaches considered? If yes, describe which and why they weren't pursued. If no, why not? Yes. Each alternative either breaks something, hits a known bug, or adds a classifier with no failing case to fix (`scope_evaluation.md` scopes 3–8).
  <details>

  - **Fix the default** (pass flat scalar lists through in tool mode): this would silently break CWL tool arrays, which `representation.py` maps to dataset lists. No test on dev would catch it.
  - **Derive keys inside staging**: staging never sees the workflow, and gxformat2 normalization fails on `color` / `directory_uri` (gxformat2#202) in a layer that can't gate it.
  - **Type-aware shared classifier**: it would be a third classifier, it would add workflow downloads to the `cwl_style` framework tests, and there is no failing case to fix.
  - **API only, no `populators.py` adoption**: the new public API would have no in-tree caller, and the duplicate emulation would stay.
  - **Reuse what exists**: the `populators.py` adoption deletes the existing `raw_params` pop/update emulation rather than adding a parallel path. No other in-tree `stage_inputs` caller holds back parameter values.
  </details>
