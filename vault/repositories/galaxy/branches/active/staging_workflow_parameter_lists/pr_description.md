Follow-up to 🔀 galaxyproject/planemo#1744 - the galaxy-tool-util change it defers: staging can leave named parameter-input values unstaged.

***This is for galaxy-tool-util client authors such as planemo. galaxyproject/planemo#1744 fixes `planemo run` on its own and can merge without this; it defers this change:***

> A more general fix would let `galactic_job_json` / `StagingInterface.stage` know which keys are parameter inputs, which would need a galaxy-tool-util change. I'm happy to propose that separately, but planemo shouldn't have to wait for a Galaxy release for this.

***The real-world hit was IDC: its build failed with the 400 below, and 🔀 galaxyproject/idc#103 worked around it by baking multiple-select params into `tool_state`.***

`galactic_job_json` / `StagingInterface.stage` send every top-level list through the collection path, so a list meant for a multiple-value workflow parameter input is uploaded as a list collection. Staging succeeds; the server rejects the invocation that follows:

```python
job = {"texts": ["a", "b"], "reads": [{"class": "File", "path": "r.fq"}]}

job_dict, _ = stage(..., job)
# stage() succeeds: texts -> {"src": "hdca", ...}
# invoking the workflow with job_dict then fails:
# 400: texts: workflow parameter inputs cannot be dictionaries. Pass the parameter
#      value directly in 'inputs', without a 'parameter_value' wrapper.

job_dict, _ = stage(..., job, parameter_input_keys={"texts"})
# texts -> ["a", "b"]           reads -> {"src": "hdca", ...} as before
```

The new `parameter_input_keys` keyword names top-level keys whose values pass through exactly as given (scalar, list or empty list), in both `tool` and `workflow` mode. ***It is opt-in: the default `None` changes nothing, no server code changes, and callers that don't pass it stage exactly as before.***

***The default stays untouched by design: Galaxy maps CWL `array` inputs to dataset lists, and CWL tools are staged through this same function, so changing the default would break CWL tool arrays.*** Only the caller knows which inputs are parameters, so the caller supplies the keys; staging never sees the workflow.

***This targets `release_26.2` because the bug is already live: galaxyproject/idc#103 hit it, and multiple-value text parameter inputs have been supported since 24.2 (per galaxyproject/planemo#1744). With it in 26.2, planemo can use the keyword on galaxy-tool-util 26.2+ behind a version check.*** 🔀 #23802 also lets multiple integer workflow parameters feed `data_column` inputs in 26.2. 26.2.0 isn't tagged yet; if it ships first, this lands in a 26.2.x point release.

Galaxy's own test populators carried a second copy of planemo's workaround (holding scalar and scalar-list values back as `raw_params`, then merging them in after staging). `WorkflowPopulator.run_workflow`'s `cwl_style` path now passes those keys as `parameter_input_keys` instead. ***That change is test infrastructure only: same shape heuristic, same inputs sent to the server.***

<details><summary>What changed</summary>

- `8d8a842b` (refactor, behavior unchanged): the two identical `cwl_style` scalar and scalar-list branches in `run_workflow` become one `_is_scalar_or_scalar_list` predicate.
- `57c30924` (feature): `galactic_job_json` skips keys in `parameter_input_keys` at its single top-level dispatch loop (2 lines); `StagingInterface.stage` forwards the keyword. Typed `collections.abc.Set[str]` so mypy rejects a bare `str`, which would otherwise do substring membership. Not applied recursively.
- `a812cad3` (adoption): `stage_inputs` takes and forwards the keyword. `run_workflow` unwraps `type: raw` in place and collects scalar / scalar-list keys into a set, replacing the `raw_params` pop/`del`/`update`.

Planemo's adoption, behind a galaxy-tool-util 26.2+ version check, replaces its pop/update around `psi.stage` with `psi.stage(..., parameter_input_keys=...)` built from the workflow's parameter-input labels. `PlanemoStagingInterface` doesn't override `stage()`, so the keyword passes straight through.

</details>

## Risks

The lasting choice is a new public keyword on `galactic_job_json` / `StagingInterface.stage` that planemo will depend on; its default is a no-op, so the only lock-in is its name and set-of-top-level-keys semantics.

<details><summary>Risk Details</summary>

- Name and semantics (`parameter_input_keys`, top-level keys only, values left untouched) are hard to change once planemo adopts it.
- A new public keyword on a release branch.
- `collections.abc.Set` as the "set-like, not `str`" type has no other use in `lib/`.
- Listing a data input's key by mistake sends its raw value to the server, which rejects it; there's no client-side check.
- If 26.2.0 ships before this merges, planemo has to key its version check off the 26.2.x point release.
- `run_workflow` now unwraps `type: raw` without the `list()` copy of `job_copy.items()`; the loop only reassigns existing keys.

</details>

<details><summary>Risk Review Advice</summary>

Check the two-line guard in `galactic_job_json` (`lib/galaxy/tool_util/cwl/util.py`) and decide whether `parameter_input_keys` is the name to commit to for both workflow labels and tool input names.

In `lib/galaxy_test/base/populators.py`, confirm the rewritten `cwl_style` loop in `run_workflow` selects the same keys the old `raw_params` branches did, and that in-place unwrapping of `type: raw` sends the same values.

</details>

## Context

Lets 🔀 galaxyproject/planemo#1744 drop its pop/update workaround around staging. 🌿[list-param-inputs-not-collections](https://github.com/jmchilton/planemo/tree/list-param-inputs-not-collections) is John's takeover of #1744 (whether it goes into #1744 or a new PR is undecided); it keeps the workaround until it can use this keyword. [A scratch adoption on that branch](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/staging_workflow_parameter_lists/planemo_adoption_proof/) swaps the workaround for `parameter_input_keys` and passes planemo's staging tests and its Galaxy-backed `planemo run` test. Developed with [John's Galaxy Brain Branch Factory](https://galaxy-brain.jmchilton.net/factory/galaxy-branches/).

## Human Review

(PUBLISHING_AGENT: Please include the contents of BRANCH_DIRECTORY/human_review.md before publishing this. If that file doesn't exist please double check that this PR should be published - if user confirms yes publish without this section.)

## Agentic Checks

### ✅ [John's Checklist](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/gx_pr_checklists/GENERAL.md)

<details><summary>9 passed, 0 failed (General and Workflow-related).</summary>

- [x] What does the user see when it fails? Without opt-in, a server-side 400 with misleading wording. With the keyword, misuse still fails on the server, and no new client-side error path is added.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. The unit test checks observable output, and framework tests show the server accepts the result.
- [x] Are baseline tests in their own leading commits (if applicable)? N/A. The new test needs the new kwarg, so it can't pass on base. The base refactor leads on its own as `8d8a842b`.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A.
- [x] Which existing workflows change behavior (if any)? None. The default `None` is a no-op, and no server or invocation code changes.
- [x] Who hits this in practice and what is the evidence? Clients such as planemo running workflows with multiple-value text or integer parameter inputs. IDC's build hit the 400 and worked around it in galaxyproject/idc#103; galaxyproject/planemo#1744 is the planemo-side fix.
- [x] Were simpler or existing approaches considered? If yes, describe which and why they weren't pursued. If no, why not? Yes. Each alternative either breaks something, hits a known bug, or adds a classifier with no failing case to fix.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/staging_workflow_parameter_lists/pr_checklist/). Run via Claude Opus at high effort.

</details>

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>Modest expansion, applied: retargeted from <code>dev</code> to <code>release_26.2</code>, code kept as implemented.</summary>

The three commits applied to `release_26.2` without conflicts, and the bug is already live on released Galaxy (galaxyproject/idc#103). Rejected: changing the default (breaks CWL tool arrays, which map to dataset lists), deriving keys inside staging (staging never sees the workflow; gxformat2 normalization fails on `color` / `directory_uri` parameter inputs, galaxyproject/gxformat2#202, in a layer that can't gate it), a shared type-aware classifier (a third classifier with no failing case), nested/subworkflow values (no caller), and dropping the `populators.py` adoption (leaves the new API with no in-tree caller). Other in-tree `stage_inputs` callers stage data only, so there's nothing for them to adopt.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/staging_workflow_parameter_lists/scope_evaluation/). Run via Claude Opus at high effort.

</details>

### ✅ [Refactoring of base branch](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_REFACTOR_BASELINE.md)

<details><summary>Leading commit collapses two identical <code>cwl_style</code> branches into one predicate, behavior unchanged.</summary>

On base, the scalar and scalar-list branches in `run_workflow` already had the same body, so `_is_scalar_or_scalar_list` lands first as a pure refactor (`8d8a842b`). The feature and adoption follow as one commit each. Framework workflow tests `multiple_text` and `multiple_integer_into_data_column` passed on the refactor commit. Nothing else could move to the base: the plumbing and in-place unwrap depend on the new keyword.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/staging_workflow_parameter_lists/baseline_refactor/). Run via Claude Opus at high effort.

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>One unit test kept and strengthened; a default-pinning test and a forwarding-only test dropped.</summary>

- Kept `test_galactic_job_json_leaves_parameter_inputs_unstaged[tool|workflow]`, the only coverage of tool mode (planemo's path), the empty list, and a parameter key mixed with a staged `File` list. It now asserts the whole result dict and one upload. With the guard removed, both cases fail at that assertion.
- Dropped a test that pinned the scalar-list-to-collection default: it passes on base and pins the behavior planemo works around.
- Dropped a `StagingInterface.stage` forwarding test: the `multiple_text` framework workflow test covers forwarding end to end and fails with the 400 when forwarding is removed.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/staging_workflow_parameter_lists/test_challenges_debrief/). Run via Claude Opus at high effort.

</details>

### ✅ Second Frontier Model Review

<details><summary>No findings.</summary>

Reviewed the `dev` diff at `1d9fe514`, before the `_is_scalar_or_scalar_list` predicate collapse, the drop of the `list()` copy in `run_workflow` and the retarget. It covered the changed files plus `run_request.py`, the framework workflow test runner and `multiple_text` fixtures, `api/test_workflows.py`, `verify/interactor.py` and `selenium/framework.py`. No changes made.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/staging_workflow_parameter_lists/codex_review/). Run via gpt-6-sol at medium effort.

</details>

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>Right layer, no structural regression; duplicate <code>cwl_style</code> branches collapsed.</summary>

The core change is one guard in `galactic_job_json`'s single top-level dispatch loop plus keyword plumbing; the `populators.py` adoption deletes a mechanism rather than adding one. The duplicate scalar / scalar-list branches it flagged became the leading refactor commit. Considered and rejected: a non-optional `frozenset()` default (planemo's planned call passes `None`), a comprehension rewrite of the loop, and extracting the `cwl_style` job-prep loop.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/staging_workflow_parameter_lists/thermo_nuclear_review/). Run via Claude Opus at high effort.

</details>

### ✅ Planemo Adoption Proof

<details><summary>Planemo's pop/update workaround swapped for <code>parameter_input_keys</code>: staging and Galaxy-backed tests pass, and fail without the keyword.</summary>

On a local scratch branch off planemo's `list-param-inputs-not-collections` (`129b9a55`, never pushed), `stage_in` keeps its `_has_parameter_list` gate but passes `parameter_input_keys=set(<parameter-input labels>)` to `psi.stage` in place of the pop/update, using galaxy-tool-util built from this branch.

- `tests/test_galaxy_activity.py` + `tests/test_galaxy_workflow_utils.py`: 21 passed, 1 xfailed (the known gxformat2#202 xfail).
- `test_run.py::test_run_multiple_value_parameter_inputs` against a real Galaxy (planemo's default `master`, 26.1): passed.
- Without the keyword, 4 `stage_in` tests fail with lists staged as `hdca`, and the Galaxy-backed test fails with the invocation 400.
- With released galaxy-tool-util 26.1.2 the call raises `TypeError`, so planemo has to gate passing the keyword on the version.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/staging_workflow_parameter_lists/planemo_adoption_proof/). Run via Claude Opus at high effort.

</details>

## How to test the changes?

- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).
- [x] This is a refactoring of components with existing test coverage.

<details>

- Unit: `test/unit/tool_util/test_cwl_util.py::test_galactic_job_json_leaves_parameter_inputs_unstaged`, in `tool` and `workflow` mode.
- The `populators.py` refactor and adoption are covered by the existing framework workflow tests `multiple_text` and `multiple_integer_into_data_column`, and by `test_workflows.py::TestWorkflowsApi::test_run_subworkflow_with_boolean_parameter_in_when_condition` for the `type: raw` unwrap. All passed on this branch.

</details>

## License

- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
