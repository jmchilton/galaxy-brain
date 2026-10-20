# Initial review: galaxy#24272 (default profile)

- Profile: [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md)
- Model: claude-opus-5-5, effort medium
- Reviewed commit: `9a97db13b65324badad105f8e0139864ba1d14ba` (base `release_26.1`)

## Summary

Regression from #23785: `__module_from_dict` now runs `ToolModule.add_dummy_datasets` → `visit_input_values`, which materializes an absent conditional as `{}` (plus `__current_case__ = -1`). `Conditional.value_to_basic` then KeyErrors on the missing selector at `save_to_step`. Fix: after the selector callback, if the selector is still absent, seed it with `test_param.get_initial_value(None, context)`, so the conditional is well-formed, its default case is selected, and children are visited.

Right layer, in my view. The visitor already writes `{}` and `__current_case__` into state, so making what it writes well-formed beats teaching `value_to_basic` to accept a malformed conditional. The fix is also generic: it covers any tool conditional missing from imported state (e.g. a tool version that gained a conditional), not only `__job_resource`. Persisted result (`{"__job_resource__select": "no", "__current_case__": 0}`) matches what `fill_defaults=True` and the editor already store. No blockers. Verdict: approve. Nits below.

Local checks (borrowed venv, worktree has none): `visit_input_values` doctest + new `test/unit/app/tools/test_visit_input_values.py` pass. `test/unit/app/tools` + `test/unit/workflows`: 613 passed. 10 `test_metadata.py` failures come from the external-metadata subprocess in the borrowed env; they don't touch conditionals and are unrelated. Integration test not run (slow layer).

## Findings

### P3 1: Docstring/doctest not updated; new unit-test file duplicates what the doctest covers

`visit_input_values` documents its missing-state behavior in doctests. The case "Conditional parameter missing in state, value error" still describes the old contract, where children are not visited. It only passes unchanged because its test param `j` is a `TextToolParameter`, whose initial value `""` matches no case, so the doctest never reaches the new branch. The new 81-line unit file has to fake a conditional with `cast(ConditionalWhen, Bunch(...))` to test one branch of the visitor.

Suggested fix: add a doctest case next to the existing ones. Drop `f` entirely while `f.test_param = g` (the boolean), then show that `g` is seeded, case `true` is selected, `h` is visited with "No value found", and `params_to_strings` round-trips. Drop or shrink the separate unit file. The integration test already covers the real `__job_resource` path end to end, so the unit file adds little beyond the doctest (REVIEW_FOCUS: prefer integration over synthetic unit tests).

### P3 2: `allow_case_inference` is now mostly dead in the conditional branch

`get_current_case` runs twice. The first call (for `case_error`) still honors `allow_case_inference`. The second call comes after the new seed, and by then the selector is always present, so the inference branch can't fire. Every caller now effectively gets inference for case selection; the flag only changes the error passed to the selector callback. On a release branch that's acceptable, but it leaves two overlapping mechanisms for the same "missing selector → default case" idea.

Suggested fix: no change needed for the 26.1 fix. Say in the PR description, or a one-line comment, that seeding supersedes inference for case selection. Consider consolidating (drop the flag, or seed only through the same helper) as a dev follow-up.

### P3 3: Seed evaluates selector options with `trans=None`

`get_initial_value(None, context)` on a dynamic select test param can dereference `trans`. Examples: `from_url` options (`trans.user`, `trans.get_or_set_cache_value`) and data-table filters (`trans.app`) in `lib/galaxy/tools/parameters/dynamic_options.py`. Previously, callers without `allow_case_inference` never evaluated options for a missing selector. Now every caller does, including job-time `evaluation.py` visits and workflow-run paths. There is precedent: `meta.py` already calls `get_initial_value(None, ...)` through inference on every tool request. Conditionals keyed on such selects are also rare. Low risk, but this could turn a previously silent -1 case into an AttributeError.

Suggested fix: optional. Mirror `get_current_case` and tolerate failure: on exception, leave the selector unset, which falls back to the old behavior.

## Observations (not findings)

- `lib/galaxy/workflow/extract.py` strips `__job_resource` as "runtime-only" when extracting workflows. After this PR, imported workflows persist `__job_resource__select: "no"` instead. That matches `fill_defaults=True` and editor saves, so it's consistent with the other import routes. The integration test does enshrine it (`assert ... == "no"`).
- New `workflow_import_job_resources_job_conf.yml` is minimal. The existing resource job confs (`job_resource_error_recovery_job_conf.yml`, resubmission confs) use dynamic or exception-raising destinations and aren't suitable, so a new fixture is justified. Reusing `dummy_job_resource_parameters.xml` is good.
- Issue #24267 is titled `[26.2]`; the PR targets `release_26.1`. #23785 is in `release_26.1`, so targeting 26.1 and merging forward is correct.
