# Test challenges debrief — pulsar#571

Profile: generic_test_challenger · Claude Opus 5.5 · effort medium · reviewed commit `a08303706ea4b66fc46b5f03a5016b355e0e1414` (base merge-base `94575c7eb4be`).

The PR was not edited. Every drop, rewrite or new test below is a recommendation.

## What ran

Tests ran from a scratch uv venv (Python 3.12, `requirements.txt` + `dev-requirements.txt`, `engagequeue==0.1.1`), natively on macOS arm64, one file at a time:

| File | Result |
|---|---|
| `test/collection_ack_test.py` | 15 passed |
| `test/engagequeue_optional_test.py` | 8 passed |
| `test/cli_test.py` | 5 passed |
| `test/engagequeue_cli_test.py` | 29 passed, 1 skipped (Linux-only Docker test), 113 s |

## Mutation checks (do the tests fail without the behavior?)

Each mutation was applied to a `git archive` export of the PR head in the scratchpad, then the named tests were rerun.

| # | Mutation | Result |
|---|---|---|
| M1 | `LocalShell.execute`: restore `if not check_pg(p.pid)` instead of `p.poll()` | **killed**: `test_local_shell_preserves_rejected_command_exit_status` |
| M2 | `BaseManager._collection_lock` returns `contextlib.nullcontext()` | **killed**, 3/3 runs: `test_generic_guard_coordinates_independent_manager_instances` |
| M3 | `StatefulManagerProxy.preprocess_and_launch`: drop the `setup_params.require_collection_ack` → `require_collection_ack(job_id)` call | **survived**: all of `collection_ack_test.py` + `engagequeue_optional_test.py` pass |
| M5 | stateful launch: drop the `JOB_FILE_FINAL_STATUS` guard before re-activating | **killed**: `test_accepted_execution_survives_delayed_submit_response...[cancel]` |
| M7 | `recover_active_jobs`: always `__handle_recovery_problem` on failure | **killed**: 4 tests (unknown transport, crash before acceptance ×2, missing submission) |
| M8 | `queued_cli.launch`: `job_interface.params.update(submit_params)` (no allowlist) | **killed**: `test_per_job_resource_overrides_are_allowlisted` |
| M9 | `LocalSetupHandler.setup`: never set `job_config["require_collection_ack"]` | **survived**: all of `collection_ack_test.py` passes |
| M10 | `queued_cli.get_status`: nonzero status-command return → `FAILED` instead of `RUNNING` | **killed**: `test_known_execution_transport_failure_remains_nonterminal` |

The EngageQueue tests are strong. They drive a real executor and real prepared scripts, and every mutation tried against them was caught. The collection-ack tests cover the manager and the HTTP route. The local-setup/asynchronous chain the docs tell users to rely on is unexercised end to end (M3 + M9): `LocalSetupHandler` → `job_config` → `_setup_params_from_job_config` → `launch` → `preprocess_and_launch`.

## Collection ack across client types

| Path | Covered? |
|---|---|
| Direct manager (`QueueManager`) | yes |
| `LocalPulsarInterface` + `JobClient` (remote setup handler) | yes |
| HTTP routes via webtest (`test_pulsar_app`) | yes |
| `LocalSetupHandler` (`local_setup=True`) → launch `setup_params` | **no** (M3, M9 survive) |
| Real `HttpPulsarInterface` against a server (`run_job`/`check.py`) | no |
| MQ (`MessageJobClient`, `memory://`) | no |
| Relay / `MessageCLIJobClient` | no |
| `staging/down.py` `finish_job` (the in-tree consumer) | no; it never calls `acknowledge_collection` |

Over MQ/relay, `_setup_params_from_job_config` forwards `require_collection_ack` and `stateful.preprocess_and_launch` honors it. But `BaseMessageJobClient` has no `acknowledge_collection`, its `clean()` only drops the client-side status cache, and `bind_amqp` has no ack consumer. The tests never show what an opted-in MQ job does. I didn't chase whether server-side cleanup ever happens over MQ; that's left to the bug reviewer. The docs' claim that the facility "applies to ordinary managers independently of their execution backend" isn't backed by a test for any non-HTTP client.

## Per-test challenge

### `test/collection_ack_test.py`

- `test_legacy_client_cleanup_has_no_new_ack_requirement`, `test_opted_in_cleanup_waits_for_ack...`, `test_ack_does_not_clean_until_client_requests_it`, `test_failed_or_cancelled_before_launch...`, `test_debug_mode_preserves_data_even_after_ack`, `test_unknown_job_cannot_create_opt_in_ghost_directory`: keep. They are behavior tests against a real manager.
- `test_generic_guard_coordinates_independent_manager_instances`: keep (M2 proves it's meaningful). Rewrite the `manager.app if hasattr(manager, "app") else _app_for(manager)` expression. `QueueManager` has no `app` attribute, so the first branch is dead; call `_app_for(manager)` directly and move the helper above the test. It uses threads, not processes. That is fine for `flock`, which is per open file description, but it only covers the "independent processes" claim indirectly.
- `test_default_setup_wire_parameters_remain_unchanged`: borderline implementation test of a private helper. Replace it with the local-setup integration test below, which covers the same wire contract through real behavior.
- `test_local_client_setup_opt_in_and_ack_route`: keep. Add a `local_setup=True` sibling (see the test plan).
- `test_client_requires_literal_setup_confirmation`: keep. The monkeypatch of `setup_handler.setup` is a reasonable stand-in for "old server". It could become a tiny fake setup handler class, but that isn't worth it.
- `test_http_setup_and_ack_are_opt_in_and_idempotent`: keep. It checks the route, not the `JobClient`/`HttpPulsarInterface` path (`COMMAND_TO_PATH`/`COMMAND_TO_METHOD` entries, boolean serialization). Cover that with the `run_job` integration test below.

### `test/engagequeue_optional_test.py`

- `test_plugin_discovery_does_not_import_optional_executor`: keep. It's a good guard.
- `test_legacy_scheduler_cancel_status_does_not_redeliver`, `test_custom_cli_subclass...`, `test_invalid_cli_plugin_records_preprocessing_failure...`, `test_managed_profile_is_rejected_before_new_dispatch`: keep. These are regression tests for non-EngageQueue paths the PR touched.
- `test_status_parsers_preserve_parent_keyword_contract`: merge it with `test_nonterminal_uncertainty_does_not_authorize_collection` (below) into one parametrized parse test here.

### `test/engagequeue_cli_test.py`

- Integration tests (lines 75–284, 310–599): keep. They are the strongest part of the PR. They use the real executor, real scripts, subprocess crashes and gated wrappers.
- `test_cancellation_winning_at_submit_boundary_prevents_dispatch`: it injects cancellation on the *second* `_was_cancelled` call, which couples the test to the exact count and order of internal checks. A refactor that adds or removes one check silently moves the injection point. Rewrite it to inject at a named seam, e.g. record the cancel from a wrapper around `job_directory.lock("status")` entry, or expose the dispatch-boundary check as a small method and patch that.
- `test_cancel_request_marker_alone_is_not_confirmation`, `test_polling_retries_failed_cancel_delivery`, `test_accepted_execution...[cancel]`: patching `_kill_external` is legitimate fault injection. Prefer `manager.kill()` over `_record_cancel` where the test isn't specifically about the marker.
- `test_unknown_submission_transport_does_not_become_failed_or_complete` and `test_missing_submission_remains_nonterminal_without_replay`: both reach the same QUEUED outcome through `SubmissionUncertain`. They can't tell "lookup said missing" (rc 3) from "transport failed" (rc 124). Either assert something distinguishing (a log record or the `submission_uncertain` marker), or merge them into one parametrized test.
- `test_adapter_quotes_paths_and_supports_relative_container_sidecars` and `test_nonterminal_uncertainty_does_not_authorize_collection`: these are pure adapter tests that need no executor, but they sit behind the module-level `importorskip("engagequeue")`, so they skip wherever engagequeue isn't installed (Python < 3.10, Windows, `install_wheel`). Move them to `engagequeue_optional_test.py`. The second test is also misnamed: it tests the state map, including terminal states, and has nothing to do with collection.
- `Bunch(returncode=124, ...)` fakes (twice): replace them with a small `@dataclass CommandResult` at module top, per the challenge process. Also hoist `from galaxy.util.bunch import Bunch` and the Docker test's `import os` / `import shutil` to the top of the module.
- The executor teardown block (`for job in executor.list(): cancel; shutdown`) is duplicated in the fixture and in `test_crash_after_acceptance...`. Extract it as a helper.
- The two inline child scripts rebuild `make_manager` by hand and `from test.test_utils import ...`. That only resolves when cwd is the repo root. Put them in one importable helper module under `test/` (e.g. `test/engagequeue_child.py` with a `__main__`) that reuses `make_manager`, and invoke it with `-m`.
- File naming: it runs real subprocesses for about 2 minutes, but the `test-unit` tox env's `--ignore-glob='*integration*.py'` won't skip it. Rename it to `integration_test_engagequeue_cli.py`, following `integration_test_cli_submit.py`, once the pure tests are moved out.

### `test/cli_test.py`

- `test_local_shell_preserves_rejected_command_exit_status`: keep (M1 killed). It's a nice minimal regression test.

### CI workflow

The new `engagequeue-macos` job runs these files plus `stateful_test.py` natively. That's reasonable. For tests, the only concern is that `test_real_docker_sidecar...` skips silently when Docker or the image is missing. CI pre-pulls the image for the Linux tox job, so it should run there. Confirm in a CI log that it is not reported as skipped.

## Test plan (recommended additions)

1. **Local-setup opt-in end to end.** In `collection_ack_test.py`, mirror `test_local_client_setup_opt_in_and_ack_route` but build the client so `LocalSetupHandler` is used (as `local_setup=True` does in `check.py`). Then call `client.setup(require_collection_ack=True)`, `client.launch("true", job_config=config)`, wait for a terminal state, call `clean()`, assert the directory is retained, call `acknowledge_collection()`, and assert it's gone. This kills M3 and M9.
2. **`run_job` integration across client types.** Add a `require_collection_ack` option to `pulsar/client/test/check.py`. With it, `__finish` calls `client.acknowledge_collection()` before `finish_job`, then asserts the remote staging directory is gone. Add `test_integration_collection_ack` (HTTP, default) and `test_integration_collection_ack_local_setup` to `test/integration_test.py`, reusing `IntegrationTestConfiguration`.
3. **MQ behavior is pinned.** Add a `test_message_queue`-style test (`memory://`) with the option on. It should either assert the job is acked and cleaned, which needs a message-client ack path, or assert that opt-in over MQ is rejected at setup. The PR currently does neither.
4. **EngageQueue through the existing harness.** Add `test_integration_cli_engagequeue` beside `test_integration_cli_slurm`/`torque`: `@skip_unless_module("engagequeue")` and `run_job(..., job_conf_props={'type': 'queued_cli', 'job_plugin': 'EngageQueue', 'job_state_dir': <tmp>})`. None of the 659 new lines go through client staging. This one test proves the real Galaxy-facing path and could let a few manager-level happy-path tests go (e.g. `test_adapter_prepared_script_runs...`).
5. Apply the P3 cleanups above: move the pure tests out, merge the duplicate parse tests, add the dataclass fake, hoist imports, and rename the file.
