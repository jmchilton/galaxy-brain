# Screenshot debrief

Screenshots successfully obtained.

Both tests passed together in one Playwright (headless) run under the shared E2E lock, taking 112s. Head was `46db8f9d5b6` on parent tip `ced412c6248`. Files are in `screenshots/`, which is gitignored. The round 1 set is in `earlier_drafts/1/screenshots/`.

## Test change

I added one `self.screenshot("workflow_rerun_simple_form_workflow_parameters_renamed")` to the end of `test_workflow_rerun_simple_form_keeps_workflow_parameters`. It records the visible result of the `replacement_params` fix: both the original simple-form run and its rerun produce `moocow suffix`. I folded it into "Simple workflow run form: submit workflow parameters as replacement_params", so head moved from `840ec8a631e` to `46db8f9d5b6`. The Baseline commit is still first. ruff, black and pre-commit pass. The test run already included this line.

## Index

| File | Source test | Shows |
|------|-------------|-------|
| `screenshots/workflow_rerun_expanded_form_seeded_step.png` | `test_workflow_rerun_prefills_expanded_form` | Rerun of a run that set `num_lines` = 3. It opens in the expanded form with the orange reason alert: "This is the legacy workflow run form. The original run set tool step parameters. The simplified form does not support these, so they would be lost." There is no Simple Form toggle, job reuse is off, and the "2: random" step shows the seeded `3`. |
| `screenshots/workflow_rerun_expanded_form_seeded_workflow_parameters.png` | same | Rerun of a `${seedme}` workflow run. The expanded form opens with Workflow Parameters `seedme` = `moo` and job reuse set to Yes. The alert gives the static reason ("This workflow contains parameters in tool steps that require advanced handling..."), because that reason takes priority over the rerun one. |
| `screenshots/workflow_rerun_expanded_form_seeded_workflow_parameters_step.png` | same | Same form scrolled, with the random step expanded: `num_lines` = `2` and Random seed `moo`. |
| `screenshots/workflow_rerun_simple_form_workflow_parameters.png` | `test_workflow_rerun_simple_form_keeps_workflow_parameters` | Rerun of a simple-form run. It stays in the simplified form with workflow parameter `replaceme` prefilled to `moocow`, and the input is `1: 1.txt`. The history already shows the original run's output named `2: moocow suffix`, which means the rename now applies on simple-form runs. |
| `screenshots/workflow_rerun_simple_form_workflow_parameters_renamed.png` | same (new screenshot) | After the rerun is submitted: the history shows `3: moocow suffix` and `2: moocow suffix`. The invocation view is behind, and its graph still shows the step as running. The "Rerun" tooltip is showing because the mouse is over it. Neither is a problem. |

## Not captured

- Simple-form object store prefill: this needs an object store selection config, which the stock dev config doesn't have. Vitest covers it, as in round 1.
- The other existing rerun tests show the plain simple-form rerun path, which round 1 already captured. I didn't run them again.
