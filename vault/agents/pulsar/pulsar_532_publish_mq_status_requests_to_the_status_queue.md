# pulsar#532 - Publish MQ status requests to the status queue

- PR: https://github.com/galaxyproject/pulsar/pull/532 (draft)
- Branch: `fix_mq_status_request_queue`, commit `1bb0efe` on `origin/master` `c6d9df6`
- Worktree: `~/projects/worktrees/pulsar/branch/fix_mq_status_request_queue`

## Verdict

Fix is correct and minimal. Approve the code change. One real gap: the regression test lives in a file CI never collects, so the red-to-green is local-only and nothing guards this in CI. Fix that here or file a follow-up, and fix the PR body to say so.

## Findings (by severity)

### 1. Medium - `test/integration_test_state.py` is never run by CI

- pytest's default `python_files` is `test_*.py` / `*_test.py`. `integration_test_state.py` (and `integration_test_cli_submit.py`) match neither, and no `python_files` override exists in `tox.ini` / `setup.cfg` / `pyproject.toml`.
- `.venv/bin/pytest --collect-only -q test/` collects 0 tests from either file. Collecting the file by explicit path finds 6.
- Master CI log (run 36734724686, `test-ci 3.12`, 433 passed) has no `integration_test_state` lines. `test/integration_test.py` does run (it matches `*_test.py`).
- So "the integration tests never caught this" happened because they never run, not only because the helper skipped the client. That also explains why `test_setup_failure_fires_failed_status` / `test_staging_failure_fires_failed_status` time out on master: they have bit-rotted unnoticed. It is not a flake caused by this change.
- Suggested fix:
  - Get the file collected, e.g. rename it to `state_integration_test.py`. The test-unit `--ignore-glob='*integration*.py'` still excludes it.
  - Then deal with the two failing tests: fix them, or `xfail` them with a linked issue. Without that, collecting the file turns master red.
  - If that's too much scope for this PR, file an issue and say so in the PR body.
  - Do the same check for `integration_test_cli_submit.py`.

### 2. Low - PR body is inaccurate about coverage

- "Red → green" is accurate locally: I re-ran `-k mq_status` and both tests pass (7s). It reads as though CI now covers the fix, and CI doesn't (see 1).
- The note on the two timeouts calls them "unrelated". True, but give the real reason: the file isn't collected in CI.
- Suggest one sentence: "Note `integration_test_state.py` isn't collected by CI (filename doesn't match pytest's patterns); ran locally with an explicit path."

### 3. Nit - helper builds a new client manager per call (`test/integration_test_state.py:232-237`)

- No leak. `MessageQueueClientManager.__init__` starts no threads (the callback and ack consumers start lazily via `ensure_has_*`). `PulsarExchange` starts its ack-manager thread only when `publish_uuid_store` is set, and here it isn't because `amqp_acknowledge` is off. The old helper also built a fresh exchange on every call. `shutdown()` is not needed.
- `{"jobs_directory": self.temp_directory}` only satisfies `BaseRemoteConfiguredJobClient`'s "requires a remote job_directory" precondition (`client.py:371`), and a status request never reads it. It's fine. Any path string works, and `temp_directory` is a reasonable choice.
- The `mq_url` / `manager` derivation is now repeated in three helpers (`_setup_app_provider`, `_status_update_consumer`, `_request_status`). This predates the PR. Optional: pull out a `_mq_params(test)` helper.

## Checks that came back clean

- **Routing / key prefix:**
  - `PulsarExchange.publish(name)` and `consume(name)` both go through `__queue_name(name)` = `f"{key_prefix}_{name}"` (`pulsar/client/amqp_exchange.py:231,336-357`).
  - The prefix comes from `amqp_key_prefix`, otherwise from the manager name. `setup`, `kill` and `status` all take the same path, so a prefix affects them identically.
  - The server consumes `"status"` via `start_status_consumer` (`pulsar/messaging/bind_amqp.py:66,119`) and handles it with `__process_status_message` -> `manager.trigger_state_change_callback`.
  - Client and server build the exchange from the same manager name and params, so the keys match.
  - Pre-existing quirk, not this PR's: the destination-level `amqp_key_prefix` stored on the client (`client.py:375`) is never used for publishing. Only the manager-level kwarg reaches `get_exchange`. This hits all three queues equally.
- **ACK_FORCE_NOACK_KEY:** `_build_status_request_message` sets it (`client.py:510-516`). `publish` skips adding ack keys when it is present (`amqp_exchange.py:235-236`). The client's `ensure_has_ack_consumers` only covers `setup` and `kill`, which is consistent. The real path keeps the old helper's behaviour. The payload now also carries `request: status`, which the server ignores.
- **Other callers:**
  - `MessageJobClient.get_status` (`client.py:539`) is the only AMQP `get_status`.
  - The `Message*CoexecutionJobClient`s (K8s/TES/GCP) subclass `BaseMessageJobClient` and inherit no `get_status`. `MessageCLIJobClient` has none either.
  - `RelayJobClient.get_status` (`client.py:622`) posts to its own `job_status_request` topic, which is unaffected.
  - `_build_status_request_message` has no other callers. Nothing is left inconsistent.
- **Imports:** `get_exchange` is still used by `SimpleConsumer` (`test/integration_test_state.py:247`). The `ACK_FORCE_NOACK_KEY` import was correctly dropped, and the new import is at module top.
- **Reuse:** the helper now goes through the real public client path (`build_client_manager` -> `get_client` -> `get_status`) instead of reimplementing the payload. Good: this is the abstraction that should be exercised. No dedicated mock-exchange unit test is needed. It would mostly assert a string literal, and getting this file collected (finding 1) is the better guard.
- **Commit message:** clear and accurate.
- **Comments / trivial tests:** none added.

## CI

- Master `pulsar.yaml`: the last 5 runs were green.
- PR #532 checks were pending when this was written. The changed test file won't run there anyway (finding 1).

## Resolution (2026-10-03)

- Test file renamed to `test/state_integration_test.py` so CI collects it (`be79c88`).
- `setup_failure` timeout was a real bug, not rot: `full_status` raised `NotADirectoryError` reading stdout from the broken job dir, so the `failed` status was never published. Fixed with a minimal-payload fallback for non-`complete` terminal statuses (`4c31c6a`).
- `staging_failure` only failed when run alongside `setup_failure`, because they shared a queue name. Separated.
- `SimpleConsumer` thread is now a daemon, so a failed test no longer hangs the run.
- PR body updated. Open follow-up: temp persistence directory for these tests.
