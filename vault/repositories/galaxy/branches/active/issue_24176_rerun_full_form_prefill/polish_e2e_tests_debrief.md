Replaced the raw `[step-label] .portlet-header` CSS in `test_workflow_rerun_prefills_expanded_form` with new `workflow_run.step_header`/`step_body` navigation targets and a shared `workflow_run_expand_step` helper. Also tightened the parameter check to an exact `.ui-form-preview` match and added assertions on the job re-use toggle in both directions. The test passed 3 of 3 runs: 2 on Playwright and 1 on Selenium.

## Details

Scope: the one E2E test this branch added, `TestWorkflowRun::test_workflow_rerun_prefills_expanded_form` in `lib/galaxy_test/selenium/test_workflow_rerun.py` (commit `7563fb26aa0`). Changes are uncommitted in the worktree.

### navigation.yml (`client/src/utils/navigation/navigation.yml`)
- `workflow_run.step_header`: `[step-label='${label}'] .portlet-header`. A sibling of the existing `input_div`/`input_data_div`, which already use the `[step-label=...]` prefix.
- `workflow_run.step_body`: `[step-label='${label}'] .portlet-content`. This is `v-show="expanded"`, so it gives a real wait after the click.
- `workflow_run.job_reuse_checkbox`: `.workflow-expanded-form [data-label="Attempt to re-use jobs with identical parameters?"] input[type="checkbox"]`. The FormElement has no `id` (it falls back to the default `"identifier"`), so the target keys off the `data-label` that `ui-form-field` already renders. No Vue change was needed.
- `tool_form.parameter_preview`: `div.ui-form-element[id="form-element-${parameter}"] .ui-form-preview`. This is the collapsed-value preview (`text_value`) that the run form shows for non-runtime tool params.

### Framework (`lib/galaxy/selenium/navigates_galaxy.py`)
- New `workflow_run_expand_step(label)` next to `workflow_run_ensure_expanded`. It clicks the step header, then waits for the step body to become visible. The test calls it twice, and the sibling #24177 test (same fixture, same file) can reuse it.
- Two existing options were considered and rejected:
  - `tool_form.section_header` / `_expand_collapsed_sections` clicks every portlet header. FormCard toggles on click, so it would collapse `input1`.
  - `subworkflow_step_icon` only matches string-class icons, and tool steps use an object icon.

### Test
- The private helper `_expand_rerun_step` (raw CSS) was removed and replaced with `self.workflow_run_expand_step("random")`.
- `_assert_tool_parameter_shows` (`expected in div.text`) became `_assert_tool_parameter_preview`, which checks for an exact match on `tool_form.parameter_preview`. This is stronger: before, any stray digit in the div's text would have passed.
- Strengthened: on the plain rerun, `job_reuse_checkbox` is **not** selected. On the `use_cached_job=True` rerun it **is** selected. Before, this was only visible in a screenshot. The check uses `wait_for_present` because BFormCheckbox switch inputs are opacity:0, which Selenium treats as invisible.
- Unchanged:
  - The direct `self.get("workflows/rerun?invocation_id=...")` (there is no rerun-by-id helper).
  - The `seedme` check via `tool_form.parameter_input`, which was already nav-based.
  - The three screenshot names, which `screenshot_debrief.md` maps.
- There were no sleeps to remove.

### Runs
- Each run started this worktree's own Galaxy (8096) and Vite (5186) under the global lock. `config/galaxy.yml` bind was temporarily set to 8096 and has since been restored.
  - Playwright headless: passed twice (55.7s, 65.5s).
  - Selenium (chromedriver via selenium-manager): passed once (53.5s).
- black, isort and `ruff@0.17.0` are clean. navigation.yml loads, and the new targets resolve via `load_root_component()`.
- Problem: the runner script (`e2e_24176_shots.sh`) kills port listeners and `run.sh` children, but not gravity's celery worker/beat processes. Each run leaked one pair. All six (plus a multiprocessing resource tracker) were stopped by PID afterwards, and none are left running from this worktree. The script's cleanup should also kill celery.

### Not done
- The pre-existing `_assert_input_table_has_parameter` uses a raw `[data-description="input table"]` selector. It isn't part of this branch's test, so it was left alone.
- Overlap: #24177 adds `test_workflow_rerun_keeps_tool_step_parameters` at the same spot in this file. When it's restacked, it should switch to `workflow_run_expand_step` / `parameter_preview` / `job_reuse_checkbox`.
