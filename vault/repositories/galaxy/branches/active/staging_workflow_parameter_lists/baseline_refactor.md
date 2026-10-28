Run via Claude Opus at high effort.

Moved one refactor to the base. The two identical `cwl_style` scalar and scalar-list branches in `WorkflowPopulator.run_workflow` are now one `_is_scalar_or_scalar_list` predicate, applied on `dev` while the `raw_params` behavior stays. The six feature and review commits were squashed into one feature commit and one adoption commit. The final tree is identical to the old head `74afe81b`. The new head is `48aa65fb`, force-pushed to `jmchilton`.

## New history

The merge-base with `origin/dev` is unchanged (`fd43a3c6`). The branch was not rebased onto the current dev tip.

1. `4d0140f9` Collapse cwl_style scalar and scalar-list branches into one predicate. This is the refactor and it preserves behavior.
   - The bodies were already identical on `dev` (`raw_params[k] = v; del job_copy[k]`).
   - It keeps `list(job_copy.items())`, because base still `del`s during iteration.
2. `b6f94767` Let staging leave parameter input values unstaged. This is the feature: `util.py`, `staging.py` and the test in `test_cwl_util.py`.
   - It folds in old `ee5d92e9`, `d1592a31` (the `Set` typing rationale is now in the message), `2d859bda` and `1d9fe514`.
   - Net, `test_staging.py` is unchanged from `dev`, so this commit doesn't touch it.
3. `48aa65fb` Use parameter_input_keys in WorkflowPopulator cwl_style staging. This is the adoption: `stage_inputs` gets the kwarg, the `raw_params` pop/update goes away, the `type: raw` unwrap happens in place and `list()` is dropped.
   - It folds in old `05af7656` and the non-refactor rest of `74afe81b`.

## Decisions

- **The thermo review got one claim wrong.** It said the scalar/scalar-list duplication was "new on this branch". On `dev`, both branches already had the same body, so collapsing them is a pure base refactor.
- **Nothing else can be pre-applied.** The kwarg plumbing, the `stage_inputs` threading and the in-place unwrap all depend on the new keyword.
- **No "Baseline tests" commit.** The dropped default-behavior characterization test stays dropped, per the test challenges.

## Notes

- Restore point: local `backup/staging_workflow_parameter_lists_pre_baseline_refactor` at `74afe81b`.
- Old to new SHAs:
  - `ee5d92e9` + `d1592a31` + `2d859bda` + `1d9fe514` became `b6f94767`.
  - `05af7656` + `74afe81b` (non-refactor part) became `48aa65fb`.
  - The refactor part of `74afe81b` became `4d0140f9`.

## Validation

- `git diff 74afe81b 48aa65fb` is empty.
- At `4d0140f9`: framework workflows `multiple_text` and `multiple_integer_into_data_column` passed (2 tests, one server). ruff, black and isort are clean on `populators.py`.
- At `b6f94767`: unit tests `test_cwl_util.py` + `test_staging.py` passed (25). ruff, black and isort are clean on the 3 changed files.
- At `48aa65fb`: framework `multiple_text` passed. API `test_workflows.py::TestWorkflowsApi::test_run_subworkflow_with_boolean_parameter_in_when_condition` passed.
  - This was its first run since `74afe81b`. It covers the `type: raw` unwrap without the `list()` copy.
  - The first attempt failed only because `GALAXY_TEST_TOOL_CONF` wasn't set ("required tools are not installed"). With the `run_tests.sh -api` tool conf, it passed.
- Pre-commit hooks passed on all 3 commits.
