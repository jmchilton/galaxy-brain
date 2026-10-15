# PR #24155 — Let optional inputs consume filtered-out tool outputs

- PR: https://github.com/galaxyproject/galaxy/pull/24155
- Review date: 2026-10-15
- Reviewed head: `3b3d4b13e09bfe048391e562268b433a4f56f5ec`
- Verdict: **APPROVE**, no actionable findings.
- Delivery: **UNPOSTED**. No GitHub review or comments submitted.
- Worktree: `/Users/jxc755/projects/worktrees/galaxy/pr/24155`
- Supporting checks: [boundary_tests.py](boundary_tests.py)

## Review

The scheduler now recognizes an absent, explicitly declared, filtered tool output when the consuming input is optional. Returning the existing `NO_REPLACEMENT` sentinel reuses tool-default replacement and Pick parameter value's null behavior. Multiple data inputs remove absent members and preserve the existing single-collection unwrapping behavior after filtering.

Checked `WorkflowProgress.replacement_for_input` / `replacement_for_connection`, the tool module's optional-input descriptions and execution-state replacement, the shared `visit_input_values` default handling, Pick parameter value readiness/execution, subworkflow input descriptions, output-filter declarations, and `MapOverPlanner` collection discovery. The guard requires a real tool module, an installed tool, a declared output name, and nonempty filters. Required inputs and undeclared output names still fail. Missing producer steps and delayed outputs retain their existing behavior. A present collection retains its normal population/failure checks; the patch does not treat individual absent collection elements as absent step outputs.

No tests were weakened. The two added API regressions exercise the reported Pick parameter value failure and partial optional multiple-data replacement. Independent checks cover required filtered outputs, invalid names on optional consumers, and all-absent optional inputs sourced from either a dataset or a collection output.

## Validation

Used the `jmchilton:galaxy-backend-tests` skill and the existing shared Python 3.13 environment with this worktree's `PYTHONPATH=lib`. Set `GALAXY_CONFIG_OVERRIDE_CONDA_AUTO_INIT=false`, `GALAXY_CONFIG_ENABLE_BETA_WORKFLOW_MODULES=true`, `GALAXY_CONFIG_OVERRIDE_ENABLE_BETA_TOOL_FORMATS=true`, and `GALAXY_TEST_TOOL_CONF=lib/galaxy/config/sample/tool_conf.xml.sample,test/functional/tools/sample_tool_conf.xml`.

- **6 passed**, 399 deselected, in 51.11 seconds: both new regression tests, `test_pick_value_first_or_skip_all_null`, `test_pick_value_the_only_non_null`, `test_pick_value_the_only_non_null_error_multiple`, and `test_workflow_failed_output_not_found`.
- **4 passed** independent API cases in [boundary_tests.py](boundary_tests.py): required filtered dataset fails with `output_not_found`; optional undeclared output fails with the same reason; absent optional multiple dataset and absent filtered collection each run with `No input selected`. The supporting file was temporarily placed at `lib/galaxy_test/api/test_review_24155.py` and selected with `-k test_review_filtered_boundaries`, then removed. Its initial run used an overly narrow assertion expecting `scheduled`; the successful invocations were already `completed`. Corrected the harness to accept either successful state, then reran all four cases successfully.
- `git diff --check` passed; review worktree clean after removing the temporary test.
- Full local output: `/tmp/galaxy-24155-api.log` and `/tmp/galaxy-24155-boundaries.log` (temporary, not committed).

The `run_tests.sh` wrapper does not accept this direct `-k` argument form, so the initial wrapper attempt printed usage. Focused validation then ran through the skill's documented direct-pytest route.

## CI and discussion

At review time there were no posted comments or reviews. API, workflow framework, tool framework, unit, lint, and the workflow-relevant integration jobs passed. CI is not fully green:

- Package tests on Python 3.10 and 3.14 fail at unchanged `galaxy/security/ssh_util.py:18`, calling untyped `publickey` under mypy. [Run](https://github.com/galaxyproject/galaxy/actions/runs/38750684842).
- Installed startup fails building `packages/meta` because `egg_base` points to missing `src`. [Run](https://github.com/galaxyproject/galaxy/actions/runs/38750685125).
- Integration shard 3 has two failures in unchanged `TestCachedExplicitSingularityContainerResolverWithSingularityRequirement` (`test_tool_run` and `test_api_container_resolvers_toolbox_install`), involving the `shub:/GodloveD/lolcow-installer:latest` container. These exercise container resolution rather than workflow scheduling. [Run](https://github.com/galaxyproject/galaxy/actions/runs/38750684792).

These failures appear unrelated based on their locations and diagnostics; this review did not rerun or repair those CI environments.

## Risks

Low-to-moderate semantic risk: existing workflows that failed when an optional connection referenced a filtered-out tool output can now execute using defaults or fewer inputs, establishing behavior for workflow and tool artifacts.

<details><summary>Risk Details</summary>

- This is a small runtime change with no database migration, file-format change, or destructive operation.
- Optional scalar/collection inputs receive the existing missing-value sentinel; optional multiple dataset inputs omit absent members, and all-absent inputs use the normal tool default.
- Required missing filtered outputs and optional undeclared output names remain errors, checked with live API tests.
- Collection mapping reuses the existing planner; heterogeneous per-element output filtering was inspected but not independently exercised in the focused local runs.
- Reverting the code is straightforward, but workflows authored to rely on the new behavior would fail again. The developer-artifact behavior is the one-way-door aspect.

</details>

<details><summary>Risk Review Advice</summary>

Maintainers should agree that a deliberately filtered-out output means an absent optional connection, including dropping missing members of optional multiple inputs. Keep the required-input and invalid-name boundaries intact. The focused API regressions and independent boundary checks support this behavior; the unrelated CI failures still need normal merge-time triage.

</details>

## Approval draft — unposted

Looks good to me. This uses the existing missing-value/default handling and keeps the exception limited to optional connections to declared, filtered tool outputs. Both new API tests and eight surrounding/boundary checks pass locally, including required-input failure, undeclared-output failure, and all-absent optional dataset/collection inputs.

The scheduling change establishes an observable workflow behavior: optional consumers can now run with defaults or fewer inputs where they previously failed. I think that is consistent with the intended semantics. The remaining CI failures appear unrelated (package typing, installed-package construction, and Singularity resolution).
