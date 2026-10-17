screenshots successfully obtained

These were regenerated on head `ced412c6248` (parent `57bf3eebd77`). The source is the branch's E2E test `TestWorkflowRun::test_workflow_rerun_prefills_expanded_form`, which **passed** on Playwright headless. It ran against this worktree's own Galaxy on port 8096 and Vite on 5186, under the global lock.

After the run:
- the servers were stopped;
- nothing is listening on 8096 or 5186;
- `config/galaxy.yml` is back to `# bind: localhost:8080`;
- the temporary diagnostic `test_zz_tmp_baseline_24176.py` was deleted, and the worktree is clean.

The round-1 set, including the `04` baseline, is in [earlier_drafts/1/screenshots/](earlier_drafts/1/screenshots/). The captures match round 1. That is expected: for current workflows the re-scope doesn't change what users see, because the `/request` index-key change only affects legacy input steps, which the API can't create.

## Screenshots (`screenshots/`, local only)

| File | Shows |
|---|---|
| `01_rerun_expanded_form_seeded_step.png` | Rerun of a run that set `num_lines=3`. It opens the expanded form through the `rerunHasStepParameters` guard. `input1` is prefilled with the original `1: Test_Dataset`, **Randomly select = 3** is seeded, the seed is the saved `asdf`, and job re-use is No. The "Simple Form" button is still shown here; #24177 removes it. |
| `02_rerun_seeded_workflow_parameters_job_reuse.png` | Rerun of a `${seedme}` run (`num_lines=2`, `seedme=moo`, `use_cached_job=True`). **seedme = moo**, re-use jobs is **Yes**, and `input1` is the original `3: Test_Dataset`. The orange banner at the top predates this branch: dev already blocks the simple form for this workflow. |
| `03_rerun_seeded_workflow_parameters_step.png` | The same rerun with the tool step expanded. **Randomly select = 2**, and Random seed shows `moo`, linked to `${seedme}`. |

## Notes

- The connected `from` input still shows the cosmetic red "required" label from round 1. That label also appears on the plain run form.
- Getting the run through was rocky. The first run timed out when Vite was cold, and a runner-script edit broke the next attempt. The run that produced these screenshots was started by the screenshot subagent before it was cut off. Its bundled temporary baseline test failed, but nothing here depends on it, and round 1's baseline still applies.
