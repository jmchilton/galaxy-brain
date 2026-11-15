# Implementation debrief: tes_native_staging

**STATUS: BLOCKED. The branch is parked on a scope decision for John (D2).** The port of design B to `release_26.2` is done and hardened. The scope evaluation recommends parking it, with one exception: move the MINIMAL-view state-check fix into the parent now. Following gx_workhorse "Parking on a Scope Decision", I didn't re-scope.

```
created .../tes_native_staging/differential-review/snapshots/20261115T143009Z-hardening-88d6414a6dcd.json
  hardening @ 88d6414a6dcd vs tes_task_state_polling (merge-base 54d2aa613df4)
  since 20261115T124814Z-implementation-9737781e4087:
    commits: 0 same, 0 rebased, 6 changed, 25 new, 0 dropped
    hunks:   12 carried, 10 changed, 37 new, 10 dropped
```

## Branch

- `jmchilton/tes_native_staging` at `88d6414a6dc`: 31 commits on `tes_task_state_polling` `54d2aa613df`. That is the parent's latest `jmchilton` head, with TES task watches keyed by `(tes_url, task_id)`. Upstream target: `release_26.2`.
- +2421/−287 over 13 files:
  - about 1,000 lines of library code: `tes.py` 365, `util/tes_staging.py` 269, `security/job_files_tokens.py` 70, plus job files API, manager and `util/tes_task.py` changes;
  - about 1,400 lines of tests.
- Nothing came from the parked `tes_task_state_polling_unreachable`. The runner uses only helpers that are on the parent. So, like the Pulsar runner without that child, it retries an unreachable TES server forever.
- The order after the baseline refactor (details in [baseline_refactor.md](baseline_refactor.md)):
  1. **Seven base refactors.** The parent could take any of them. Six don't change behavior. The seventh, `a0c60ba6d80`, does: TES state checks use the MINIMAL view with a 30 s timeout, for the Pulsar runner too.
  2. **The design B feature:** raw PUT, the runner, tokens, DIRECTORY outputs, cancel and recovery, and the re-key.
  3. **The hardening commits.**
  4. **A mypy fix for the tests.**

## The port

What `release_26.2` required is in [initial_implementation_debrief.md](initial_implementation_debrief.md):

- the job files API rewritten onto `FastAPIJobFiles`/`JobFilesManager`;
- the Pulsar 0.16 module rename;
- a non-Pulsar failure message;
- full typing for new modules;
- keying the runner's poll schedule by `(tes_url, task_id)`, as the parent's re-key does.

## Hardening, step by step

- **Brain research** (Sonnet, high): [brain_research.md](brain_research.md). It queued one research request, `gx_research/todo/job_files_api.md`, and extended another, `gx_research/todo/galaxy_job_runner_monitor_and_stop_lifecycle.md`.
- **Test challenges** (Opus, high): [test_challenges_debrief.md](test_challenges_debrief.md).
  - Each security behavior is now pinned through the API: token binding, authorization before the body is read for both PUT routes, the job re-check after a long PUT, and DIRECTORY containment, including a symlink that points outside.
  - The fake TES server moved into a shared `tes_fakes.py`. The runner's unit tests use the real runner and client against it, with no mocks.
  - New `test/integration/test_tes_runner.py` runs Galaxy jobs end to end against an in-process fake TES worker. That is Galaxy's first CI-runnable TES path.
  - Fixed: a token whose expiry had more than 4,300 digits made the API answer 500.
- **Codex review** (gpt-6.1-sol): [codex_review.md](codex_review.md). It raised four findings; all were confirmed and fixed:
  - walltime limits were never enforced;
  - metadata ran twice with `embed_metadata_in_job: false`;
  - DIRECTORY outputs deleted files that tools link to (now copied);
  - sibling modules of a tool script weren't staged (small tool directories now go whole).

  Codex's sandbox fails here, so the diff and the sources were pasted into its prompt.
- **Performance challenges** (Opus, high): [performance_challenges_debrief.md](performance_challenges_debrief.md).
  - State polls downloaded every input URL in the task, 336 KiB per poll at 1,000 inputs. They now use MINIMAL, with a timeout, because one hung TES server stalled the monitor for every job.
  - Job directory scans now read one file at a time.
  - A test pins every token request to exactly one query.
  - Not done: two job-state queries per job per poll, serial polling, and pydantic-tes's missing session and timeouts.
- **Thermo-nuclear review** (Opus, high): [thermo_nuclear_review.md](thermo_nuclear_review.md).
  - `tes.py` was split into the runner and a pure `util/tes_staging.py`.
  - Cancel and failure handling is now shared with the Pulsar runner (`log_tes_cancel_failure`, `describe_ended_tes_task`).
  - The job files code lost a boolean mode flag and a copied buffering loop.
  - A leak of the stashed container was fixed.
  - Follow-up issue, not done: share TES polling between the two runners. It would rewrite the READY parent's polling. See [thermo_followup_refactor_issue.md](thermo_followup_refactor_issue.md).
- **Baseline refactor** (Opus, high): [baseline_refactor.md](baseline_refactor.md). Seven refactor commits moved ahead of the feature, with the tree unchanged. The feature commits no longer touch `pulsar.py` or the parent's tests. There are no "Baseline tests" commits, because no branch test pins behavior that exists on the base.
- **Scope evaluation** (Opus, high): [scope_evaluation.md](scope_evaluation.md). It recommends parking (see below).
- **Check branch.** `make format` is clean. Full-tree mypy from `lib/` reports only the existing `galaxy/managers/notification.py` error; I fixed the 5 test-file errors in `88d6414a6dc`. `.ci/check_mypy_legacy_list.py` passes; its one stale entry, `galaxy.jobs.runners.util.env`, predates this branch.
- **Not applicable:** E2E polish and screenshots, since there is no UI.
- **Security.** I did a dedicated pass myself over:
  - the raw PUT route;
  - the HMAC `job_token` scheme;
  - DIRECTORY path handling (containment, symlinks, encoded separators, absolute and empty relative paths);
  - token and key handling;
  - how Galaxy treats a task-written `galaxy.json`, which `discover.py` keeps inside the working directory.

  Every subagent also had the private-report instruction. Nobody found anything exploitable, so **no private security report exists.**

## Tests at `88d6414a6dc`

- Unit tests, 103 passed: `test_tes_runner.py`, `test_pulsar_tes_task_checks.py`, `test_JobFilesManager.py`, `test_job_files_tokens.py`.
- `test/integration/test_job_files.py`: 40 passed.
- `test/integration/test_tes_runner.py`: 5 passed.
- ruff, black, isort and `make format` are clean.
- Fork CI on `88d6414a6dc` was queued at hand-off.
- No live TES runs. The v26.1.2 prototype's live evidence on Funnel, TESK and tesp-api still describes the design, but not this port.

## The scope decision for John

The evaluation's recommendation:

- **Now:** move only `a0c60ba6d80` (MINIMAL view and a 30 s timeout) into `tes_task_state_polling`, with a Pulsar-runner hang test. One hung TES server stalls monitoring of every TES job today.
- **Park the rest** as a reference branch: the runner, the signed tokens and both PUT routes. No TES deployment has asked for them (D2). They are features, not 26.2 fixes. They would need OIDC for the deployments the synthesis names.
- **Retarget to `dev`** if it is ever pursued.

If John pursues design B anyway, the evaluation says not to ship it as implemented. Instead, a modest expansion on `dev`:

- turn on `tes_directory_outputs` by default;
- **refuse at submit time** jobs that discover outputs, write `extra_files` or write `galaxy.json` on a destination that can't return directories. Today they go `ok` with outputs silently missing, which is how hyphy ran 4 of 12 jobs on tesp-api and was still reported COMPLETE;
- return every job metrics plugin's files;
- use `os.replace` in `JobFilesManager.replace`;
- after the parent merges, share TES polling between the runners, so both get the unreachable timeout.

Five possible decompositions are in the evaluation:

- one PR;
- parent fix, then the feature;
- API, then the runner;
- four capability layers;
- refactors first.

**What still applies if the scope changes.** Every review above was done on this exact code and remains valid for any decomposition. If it moves to `dev`: rebase, rerun the four unit files and the two integration files, and rerun mypy. Any expansion would need its own test challenge and Codex pass. Live runs on Funnel and TESK (and tesp-api with directories off) are still owed before a PR.

## Notes for the parent branch

- `a0c60ba6d80` and the six behavior-free base refactors touch the parent's code: `pulsar.py`, `util/tes_task.py` and `test_pulsar_tes_task_checks.py`. If the parent changes there, rebasing this branch conflicts there. The parent may want `a0c60ba6d80` whatever happens to design B.
- The README of the demo repository wasn't touched. The v26.1.2 prototype record is marked superseded and moved to `branches_reference`.
