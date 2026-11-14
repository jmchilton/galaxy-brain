# Implementation debrief — `coexecution_publish_running`

Run via claude-opus-5-5 (nested subagent of the ga4gh_wes_tes stage 2 agent). Parent `coexecutor_image_modern_base` `1138cd0`; head `07051ab`.

## Problem (observed live)

Galaxy v26.1.2 with `PulsarTesJobRunner` never showed a TES job as `running`: states went new → queued → ok, and Galaxy received one AMQP status message per job (`complete`). MultiQC sat `queued` in Galaxy while its Funnel task was RUNNING.

## Root cause (line numbers at `1138cd0`)

For a containerized SEQUENTIAL job (TES) the client picks `--no-wait` and `monitor: none` (`pulsar/client/coexecution.py:71`, `pulsar/client/client.py:377-382`). `run_server_for_job` calls `submit_job` and goes straight to `app.shutdown()` (`pulsar/scripts/submit_util.py:32-44`). Staging runs on a non-daemon thread (`pulsar/managers/stateful.py:266`), and `running` is only published from `StatefulManagerProxy.get_status` on the `to_running` transition (`stateful.py:345`, `375-379`). Nothing calls `get_status` before shutdown. `pulsar-finish` marks the job finished first, so it only publishes `complete`. The `--wait` path (K8s/PARALLEL, containerless) already polls and is unaffected.

## Fix

`wait_for_launch` in the no-wait branch polls `manager.get_status(job_id)` until it leaves `preprocessing`, then the existing shutdown runs. The manager's state machine publishes `running` once; after a staging failure (which already published `failed`) nothing more is sent; the persisted marker stops `pulsar-finish` from repeating `running`. The message goes out before shutdown (synchronous publish, or the outbox's final drain in `QueueState.deactivate`). No extra executor time: the process already waited for the staging thread.

## Testing

- New `test/submit_util_test.py` drives the real `pulsar-submit`/`pulsar-finish` entry points with the coexecution manager, `monitor: none`, an outbox and a `memory://` broker: no-wait submit publishes exactly `['running']`; submit → command → finish publishes `['running', 'complete']` and stages the output; a failed stage-in publishes exactly `['failed']`. The first two fail without the fix (`[]`, `['complete']`).
- `make lint` and isort pass. `integration_test_cli_submit`, `stateful_test`, `messaging_outbox_test`, `coexecution_manager_test`, `scripts_config_test`, `cli_help_tests` pass. `manager_coexecution_test` needs `python` on PATH (passes with the venv on PATH).
- End to end in the demo (`runs/2026-11-14-46e59ec8766b06a0/tes-evidence.txt`): Galaxy jobs went new → queued → running → ok for both fastp and MultiQC; the run before the fix (`runs/2026-11-14-b2563e46ebf0c519/`) shows new → queued → ok.

## Open

- Galaxy's client side is unchanged (works with pulsar-galaxy-lib 0.15.15), but TES users only get the fix with a rebuilt staging image; no published image exists.
