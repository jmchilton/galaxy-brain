Fix coexecution jobs that run with `pulsar-submit --no-wait` (TES) never reaching `running` in Galaxy.

> **Stacked on 🔀 #577.** This PR's own commits are the last two, `3c27f58` and `1a741aa`, which touch only `pulsar/scripts/submit_util.py` and add `test/submit_util_test.py`. Review those first. The code doesn't depend on #577 and cherry-picks onto `master` alone; it is stacked so that later PRs in the set can build on both.

Galaxy job states for the same fastp + MultiQC workflow on Galaxy v26.1.2 → Pulsar TES runner → Funnel:

| | Galaxy states | AMQP status messages per job |
| --- | --- | --- |
| `master` | new → queued → ok | `complete` |
| this branch | new → queued → **running** → ok | `running`, `complete` |

MultiQC sat `queued` in Galaxy for its whole run while its TES task was `RUNNING`.

<details><summary>Why it happens</summary>

For a containerized sequential job (TES), the client runs `pulsar-submit --no-wait` with `monitor: none` (`pulsar/client/coexecution.py`, `pulsar/client/client.py`). `run_server_for_job` calls `submit_job` and shuts the app down straight away. Inputs stage on the manager's thread, and the stateful manager publishes `running` only from `get_status`, on the transition to running. Nothing calls `get_status` before shutdown. `pulsar-finish` then marks the job finished first, so it publishes only `complete`. The `--wait` path (Kubernetes, containerless jobs) already polls and was fine.

</details>

<details><summary>The fix</summary>

In the `--no-wait` branch, `pulsar-submit` now calls `wait_for_launch`, which polls `get_status` until the job leaves `preprocessing`, then shuts down as before. The manager's state machine publishes `running` once. After a staging failure, which already publishes `failed`, nothing more is sent. The persisted marker stops `pulsar-finish` from repeating `running`. This costs no executor time, because the process already waited for the staging thread before exiting.

`wait_for_job` and `wait_for_launch` share one `_wait_for_status(manager, job_id, until, poll_time)` loop that returns the status that ended the wait.

</details>

<details><summary>Tests</summary>

`test/submit_util_test.py` drives the real `pulsar-submit` / `pulsar-finish` entry points with the coexecution manager, `monitor: none`, an outbox and a `memory://` broker:

- `--no-wait` submit publishes exactly `['running']`. Without the fix: `[]`.
- Submit → command → finish publishes `['running', 'complete']` and stages the output. Without the fix: `['complete']`.
- A failed stage-in publishes exactly `['failed']`.

</details>

## Risks

Risks are minimal: a script now polls before exiting, which is easy to revert (a two-way door).

<details><summary>Risk Details</summary>

- If the staging thread dies without writing either the `preprocessed` or the `preprocessing_failed` marker, `pulsar-submit --no-wait` now polls forever. Before this change the same case hung the tool executor instead. `wait_for_job` has always polled forever in the matching postprocessing case.
- One more status message per TES job reaches Galaxy (`running`).

</details>

<details><summary>Risk Review Advice</summary>

Check that `get_status` is the intended place to publish `running`, rather than publishing it straight after launch. Publishing it from `get_status` keeps the semantics of DRM-queued managers unchanged.

</details>

## Context

Part of a set of fixes found while running Galaxy jobs on GA4GH TES servers (Funnel, TESK) through Pulsar coexecution. Fixes the symptom reported as tesp-api issue #46 ("Galaxy never shows RUNNING") for any TES server.

## Agentic Checks

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>The fix is in the right layer. A duplicated polling loop was merged into one helper.</summary>

- Waiting in the script, the one place that owns the short-lived app's lifetime, is the minimal fix. Publishing `running` at launch would change every manager's semantics.
- `wait_for_job` and `wait_for_launch` were the same poll-sleep loop with different stop conditions. They now share `_wait_for_status`.
- Left as is: the unbounded wait if the staging thread dies without a marker. It mirrors `wait_for_job`, and the guarantee belongs in the stateful manager, not the script.

[Full report](https://galaxy-brain.jmchilton.net/repositories/pulsar/branches/coexecution_publish_running/thermo_nuclear_review/). Run via Claude Opus 5.5 at high effort.

</details>

### ✅ Second Frontier Model Review

<details><summary>No findings in two runs.</summary>

Codex got the diff, the full post-change files and the surrounding manager, messaging and client code (18 files). Neither run reported anything to fix.

[Full report](https://galaxy-brain.jmchilton.net/repositories/pulsar/branches/coexecution_publish_running/codex_review/). Run via GPT-6.1 (gpt-6.1-sol) at high effort.

</details>

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01S9mD3nK1ghSGVVYtkV411H
