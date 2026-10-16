screenshots successfully obtained

No existing E2E test reached the changed path. `test_workflow_rerun.py` uses cat-twice, boolean and optional-input workflows; none of them record tool step `parameters`, so their reruns still open the simple form. I added one new Playwright/Selenium test, `TestWorkflowRun::test_workflow_rerun_prefills_expanded_form` in `lib/galaxy_test/selenium/test_workflow_rerun.py`. It is left uncommitted in the worktree for the coordinator to keep or drop.

- The test sets up both original runs through the API with `WORKFLOW_RUNTIME_PARAMETER_SIMPLE` (`input1 → random_lines1`), opens `workflows/rerun?invocation_id=`, expands the tool step and takes a screenshot.
- It asserts that `num_lines` shows the recorded value and that the `seedme` workflow parameter is `moo`.
- Run 3 times on Playwright headless against this worktree's own Galaxy on 8096 and Vite on 5186, under the global lock, and passed every time. The servers were stopped by PID after each run.
- Overlap: #24177 (which stacks on this branch) adds `test_workflow_rerun_keeps_tool_step_parameters` at the same spot in the same file, with the same fixture. Expect a merge conflict or a duplicate when restacking. One of the two could absorb the other.

## Screenshots (`screenshots/`, local only)

| File | Shows |
|---|---|
| `01_rerun_expanded_form_seeded_step.png` | Rerun of a run that set `num_lines=3`, with no `${}` parameters. It opens the expanded form: the `rerunHasStepParameters` guard, since seeding has closed the runtime input. The "Simple Form" button is still shown (#24177 removes it). `input1` is prefilled with the original `1: Test_Dataset`. The tool step shows **Randomly select = 3** (seeded) and the seed is the saved `asdf`. |
| `02_rerun_seeded_workflow_parameters_job_reuse.png` | Rerun of a `${seedme}` run (`num_lines=2`, `seedme=moo`, `use_cached_job=True`). The Workflow Parameters card shows **seedme = moo**, "Attempt to re-use jobs" is **Yes**, and `input1` is the original `3: Test_Dataset` rather than the latest dataset. |
| `03_rerun_seeded_workflow_parameters_step.png` | The same rerun with the tool step expanded: **Randomly select = 2**, and Random seed shows `moo` (linked to `${seedme}`). |
| `04_baseline_plain_run_form_unseeded.png` | Comparison only (a temporary diagnostic, not in the kept test): the normal run form for the same `${seedme}` workflow on this branch. `num_lines` is empty/required, seed is `${seedme}`, re-use is No, and `input1` defaults to the latest dataset. |

## Problems / notes

- In screenshots 03 and 04, the connected `from` data input shows a red "required" label. It appears on the ordinary run form too (04), so the rerun change did not cause it. It is cosmetic: a temporary diagnostic submitted the 03 rerun, and the new invocation completed OK and recorded `num_lines: '2'`, `seed: 'moo'`, `replacement_params {'seedme': 'moo'}` and `use_cached_job: True`.
- Resource params are not captured, because a workflow resource config is needed and it is not set up by default.
- The job re-use toggle is checked only in the screenshot. The test does not assert it.
- The worktree's `config/galaxy.yml` bind was temporarily set to 8096 and has been restored. That file is gitignored.
