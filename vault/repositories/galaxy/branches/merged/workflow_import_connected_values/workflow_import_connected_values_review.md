# Review of Galaxy PR #23785

Reviewed 2026-09-28: https://github.com/galaxyproject/galaxy/pull/23785

Head: `c0d329d5cb329b18d5530c9c68ec51e11af615ac`; base: `release_26.1`.

No actionable correctness or regression findings in the diff.

The import path normalizes connected tool inputs after state recovery and before persistence, using the same `ToolModule.add_dummy_datasets` method used by the workflow module injector. Empty connections are ignored; unavailable tools and non-tool modules are guarded. The regression test covers both client-side and server-side format2 conversion, including a repeat input and exclusion from the legacy runtime-input list.

Validation: the complete `lib/galaxy_test/api/test_workflows_from_yaml.py` suite passed at the reviewed head: **12 passed**, 79 dependency deprecation warnings, 61.10 seconds. This includes the new regression, runtime inputs, execution after format round trips, subworkflows, and conditional values. `git diff --check` also passed. No full API or integration suite was run; GitHub CI was still queued/running when inspected.

Command (using the galaxy-backend-tests skill defaults):

```sh
GALAXY_CONFIG_OVERRIDE_CONDA_AUTO_INIT=false \
GALAXY_CONFIG_ENABLE_BETA_WORKFLOW_MODULES=true \
GALAXY_CONFIG_OVERRIDE_ENABLE_BETA_TOOL_FORMATS=true \
./run_tests.sh -api lib/galaxy_test/api/test_workflows_from_yaml.py --skip-common-startup
```

Test report: `/Users/jxc755/projects/worktrees/galaxy/branch/workflow_import_connected_values/run_api_tests.html`.
