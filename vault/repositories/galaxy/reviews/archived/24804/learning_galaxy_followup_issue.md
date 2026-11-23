# Refresh job-runner research notes for galaxy#24804 and pulsar#570

Found while reviewing galaxyproject/galaxy#24804 at `677cab47347c1b40acf2988bed2f8ae18507ca9e`. galaxyproject/pulsar#570 merged on 2026-11-13.

## Stale now (against Galaxy `dev` and Pulsar master)

[[Component - Galaxy Pulsar Runner Code Sharing]]:

1. The divergence table says Galaxy's `runner_states` has `TOOL_TIMELIMIT_REACHED` and Pulsar's lacks it. Pulsar master now has it, along with `NODE_FAILURE`, `PREEMPTED` and `CANCELLED` (pulsar `c64abcc`, `a27c4bd`, `bc162bc`). The two `util/__init__.py` files now differ only by a blank line once #24804 merges. Before that merge, Pulsar is the side with more states.
2. The table gives `cli/job/slurm.py` as "173 L vs 80 L — Galaxy 2.2× larger". Pulsar's copy is now 181 lines, so the "Galaxy larger" claim no longer holds.
3. The "Files unique to one side" paragraph lists 7 Pulsar-only files. Pulsar master now also has `slurm/__init__.py`, which is Pulsar-only until #24804 merges.
4. "Job status translation" cites `lib/galaxy/jobs/runners/pulsar.py:362-388` for `_update_job_state_for_status`. On `dev` it starts at line 425.

[[Component - Job Completion Lifecycle]]:

5. The callers table cites `_finish_or_resubmit_job` at `lib/galaxy/jobs/runners/__init__.py:776-889` and `_finish_pulsar_job` at `pulsar.py:878-892`. On `dev` they start at lines 801 and 920. Line drift only, the description is still right.

## Post-merge activities (once #24804 merges)

- [[Component - Galaxy Pulsar Runner Code Sharing]]:
  - Update the drift table. `util/__init__.py` (`runner_states`), `slurm/__init__.py` (byte-identical) and `cli/job/slurm.py` (import style and wrapping only) converge. Recount "23 shared files, 3 identical, 20 diverged".
  - Record the rule from commit `10c4fdfa`: the mirrored `runner_states` holds only reason names, and Galaxy-only behaviour lives in `galaxy.jobs.runners.runner_state_definitions`. `register_runner_state` uses `setattr` to add names to Galaxy's copy of the Bunch only.
  - Under "Job status translation", add that `failed` now triggers `client.full_status()` on the poll path and reads `runner_state` / `runner_state_message`, and that well-formed reasons Galaxy doesn't define are kept. This is a new string contract across the repository boundary, like the status literals the note already lists. Add `resubmission_count` as a client param that both sides read.
  - Add `slurm/` to the `drmaa.py`-style list of shared code that Galaxy runners import (`SlurmJobRunner` now imports `galaxy.jobs.runners.util.slurm`).
- [[Component - Job Completion Lifecycle]]:
  - Note that the Pulsar path (`_complete_staged_job`) now runs `check_tool_output` and the resubmit handler before `finish()` when the destination has `resubmit` rules, through `_resubmitted_for_tool_failure`. Unlike `_finish_or_resubmit_job`, it doesn't pass `check_output_detected_state` on to `finish()`.
- `doc/source/admin/jobs.md` and `job_conf.sample.yml` don't list the `job_output_not_returned_from_cluster` condition variable, which the registry now exposes. A docs follow-up could generate this list from `RUNNER_STATE_DEFINITIONS`.
- Once the research request `vault/agents/gx_research/todo/job_resubmission_and_runner_states.md` produces a note, link it from both notes above.
