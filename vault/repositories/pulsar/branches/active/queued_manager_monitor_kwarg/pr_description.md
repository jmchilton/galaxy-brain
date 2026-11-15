Fix the `queued_python` manager running every queued job at once, whatever `num_concurrent_jobs` says.

With `num_concurrent_jobs: 1` (the default), two 2-second jobs run side by side on master:

```
FAILED test/manager_queued_test.py::PythonQueuedManagerTest::test_num_concurrent_jobs_limits_running_jobs
E       AssertionError: jobs overlapped with num_concurrent_jobs=1: [1794696919.652089, 1794696921.6523018] and [1794696919.678403, 1794696921.6785533]
```

Behind a TES server (tesp-api) whose Pulsar is configured with `num_concurrent_jobs: 2`, four `sleep 20` tasks ran together:

| Pulsar | Max concurrent jobs |
| --- | --- |
| 0.16.0 (PyPI) | 4 |
| this branch | 2 |

The cause is a keyword typo. Each `QueueManager` worker thread calls `Manager._run(..., montior=MonitorStyle.FOREGROUND)` so it waits for its job before taking the next one. `_start_monitor` read `monitor` out of `**kwd`, so the misspelt keyword was silently dropped and every job got a background monitor thread. Workers went straight back to the queue. The typo arrived with 8fd077b ("Generalize orchestrated container scheduling") and has been in every release since 0.15.0.

The keyword is renamed, and `monitor` is now a keyword-only parameter of `_start_monitor`, so the same typo raises `TypeError` and mypy reports it. The only other caller, `CoexecutionManager.launch`, already passed `monitor=`. The new test checks that the two jobs' run intervals don't overlap. It has no timing tolerance: the second job's process can't start until the first job's monitor returns.

## Risks

The code is trivially reversible, but upgrading changes how `queued_python` deployments behave: jobs now wait in the queue up to `num_concurrent_jobs` (default 1), where since 0.15.0 they all ran at once.

<details><summary>Risk Details</summary>

- Admins who never set `num_concurrent_jobs` have effectively had unlimited concurrency since 0.15.0. After upgrading, they get one job at a time until they raise it (an integer, or `"*"` for the CPU count).
- Jobs waiting for a worker now report `queued` instead of `running`, as they did before 0.15.0.
- Other managers (`queued_drmaa`, `queued_cli`, `queued_condor`, …) don't use this path and are unaffected.

</details>

<details><summary>Risk Review Advice</summary>

The code change is three keyword renames, so the decision is about release notes rather than the diff. The changelog entry should tell `queued_python` admins to check `num_concurrent_jobs` before upgrading.

</details>

## Context

Found while running Pulsar as the job backend of the community tesp-api TES server, as part of an investigation of Galaxy with GA4GH WES and TES.

## Agentic Checks

### ✅ Second Frontier Model Review

<details><summary>An independent Codex review found no defects, and no other caller is affected.</summary>

Codex reviewed the diff with the manager, stateful-proxy and test sources and reported nothing. A manual check found `CoexecutionManager.launch` is the only other `_start_monitor` caller and already uses `monitor=`. Nothing overrides `_run`, and the DRMAA, CLI and Condor managers don't inherit from `BaseUnqueuedManager`. Local gate: `make lint`, isort and mypy pass. Manager tests: 118 passed, 3 skipped. `integration_test.py`: 39 passed, 20 skipped.

[Full report](https://galaxy-brain.jmchilton.net/repositories/pulsar/branches/queued_manager_monitor_kwarg/codex_review/). Run via gpt-6.1-sol at high effort.

</details>

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01S9mD3nK1ghSGVVYtkV411H
