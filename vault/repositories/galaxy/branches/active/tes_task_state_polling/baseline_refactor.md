Run via Claude Opus 5.5 at high effort.

The branch now starts with two commits that sit on the base by themselves. First comes a "Baseline tests" commit that pins how the TES runner cancels tasks today. Next comes a pure refactor that adds the two `PulsarJobRunner` extension points the feature uses: the `pulsar_param_specs` class attribute and the `_kill_remote_job` hook. The ten feature commits were replayed on top, so the code they leave is unchanged.

- Pre-rewrite head: `e0eacf9c6c6d92e8665effecf34af1c77b3054af`. It isn't on any remote; the fork's `tes_task_state_polling` is still at `af12aa04327`, so publishing the new history needs a force push.
- New head: `dec68d7a865` (local only, not pushed).
- `git diff e0eacf9c6c6 dec68d7a865` touches only `test/unit/app/jobs/test_pulsar_tes_task_checks.py`: four baseline tests and the `PulsarMQJobRunner` import (+37/−1). Runner, helper and sample config are byte-identical.

## New history on `origin/release_26.2`

| Commit | Subject |
|---|---|
| `a2619a1c5b2` | Baseline tests for cancelling Pulsar TES tasks |
| `341d1043671` | Let Pulsar runner subclasses set param specs and remote kills |
| `7b16c21158b` | Fail Pulsar TES jobs whose task dies before Pulsar reports |
| `fc3bf3f6efc` | Keep TES task failure messages within Job.info's 255 characters |
| `645fa461a8a` | Treat cancelling a TES task that already ended as done |
| `69f787c5092` | Fix mypy error in the TES task check tests |
| `06c0951cfde` | Keep the fake clock in the TES check error test |
| `a36b57f6f00` | Tighten the TES task check tests |
| `82daaf71827` | Keep Pulsar's report on the TES task watch |
| `2402c691a80` | Remember Pulsar's final status when it beats the first TES check |
| `0c6639e4a05` | Check that idle TES task watches don't read the job |
| `dec68d7a865` | Describe unreported TES task endings in the TES helper module |

## Baseline tests (`a2619a1c5b2`)

This commit creates `test_pulsar_tes_task_checks.py` with a minimal harness: a fake TES server that answers only `POST …:cancel`, the dataclass `FakeJob`, `FakeTool` and `FakeJobWrapper`, and the real runner built from a `Mock` app with the real Pulsar client manager. It adds four tests that pass on unmodified `release_26.2`:

- `test_stopping_a_job_cancels_its_tes_task`: `stop_job` sends the cancel POST and logs no error. The test challenge had dropped this test because it was a control with no Baseline commit to live in.
- `test_failing_a_job_cancels_its_tes_task_then_fails_the_job`: `fail_job` cancels, then fails the job.
- `test_status_for_a_stopped_job_cancels_its_tes_task_and_finishes_it`: a status message for a `STOPPED` job cancels the task and queues `finish_job`.
- `test_tes_options_are_rejected_by_other_pulsar_runners`: `PulsarMQJobRunner` rejects `tes_status_check_interval`.

The first three tests cover the paths through both `client.kill()` call sites, which the refactor commit routes through `_kill_remote_job`. They also cover the success path of the TES override (`client.kill()` succeeds, so no state read), which no other test covered. The fourth pins the claim that `PULSAR_TES_PARAM_SPECS` extends the shared specs without leaking the TES options into the other runners.

## Refactor (`341d1043671`)

This commit makes `PulsarJobRunner.__init__` pass `self.pulsar_param_specs` (default `PULSAR_PARAM_SPECS`) instead of the constant. It also adds `_kill_remote_job(client, job_wrapper, destination_params)`, which just calls `client.kill()`, and uses it in `_update_job_state_for_status` and `stop_job`. The text is identical to what the feature commits had, so `7b16c21158b` and `645fa461a8a` no longer touch these lines. The baseline tests and the neighbouring Pulsar runner tests pass on both commits.

## How the replay was done

I built the new commits on a temporary branch with `git cherry-pick --no-commit` of each original commit, then committed with `git commit -C <original>`, which keeps the original messages and authorship. Neither feature commit's message mentioned the hooks, so no message needed editing. I wrote the test file in each replayed commit with a script: it takes that original commit's version of the file and adds the four baseline tests. For the two commits before the cancel fix, the script also adds the harness support those tests need (the cancel-capable fake server, the client manager, the extra `FakeJob` fields, and the `nginx_upload_job_files_path` and `encode_id` settings on the mock app). After the cancel fix, the original file already had them. At every replayed commit:

- the files other than the test file match the original commit exactly, except in the first two, which also carry the refactor's 9-line hook diff in `pulsar.py`;
- black, isort and ruff are clean on the test file;
- the test file passes: 24 and 25 tests in the two commits before the cancel fix, then 35 or 36.

`git branch -f tes_task_state_polling` then moved the branch to the result, and the temporary branch was deleted. I didn't touch the child branch `tes_task_state_polling_unreachable`. It doesn't descend from the old head either, so its stacking is unaffected by this rewrite.

## Validation on the final head

- `test_pulsar_tes_task_checks.py`, `test_pulsar_runner.py` and `test_runner_pulsar.py`: 87 passed. Before this work, 83 passed; the difference is the four baseline tests.
- black, isort and ruff are clean on `pulsar.py`, `util/tes_task.py` and the test file.
- mypy (`cd lib`) on those three files reports only the pre-existing `galaxy/managers/notification.py` error.

## Not done

- **Moving the TES helper module (`util/tes_task.py`) or the runner class ahead of the feature.** Both exist only for the feature and have no caller on the base, so a refactor commit for them would be dead code until the next commit.
- **Squashing the review-fix commits** (mypy fix, fake-clock fix, test tightening). They are the branch's own history, and squashing them isn't refactoring the base. Whoever opens the PR can still squash them.
