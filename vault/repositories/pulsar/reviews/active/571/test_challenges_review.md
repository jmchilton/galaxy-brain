# Test challenges review — pulsar#571

Profile: generic_test_challenger · Claude Opus 5.5 · effort medium · reviewed commit `a08303706ea4b66fc46b5f03a5016b355e0e1414`.

Details, the mutation table and the test plan are in [test_challenges_debrief.md](test_challenges_debrief.md).

**Verdict:** the EngageQueue tests are strong integration tests. They use a real executor and real scripts, and every mutation tried against them was caught. All new tests pass (macOS arm64, Python 3.12; the Docker test skipped as Linux-only). Collection acknowledgment is covered for the manager, the in-process `JobClient` and the HTTP route. It is not covered for the local-setup/asynchronous path the docs recommend, nor for any message-queue client.

## P2 1 — Local-setup collection-ack opt-in is untested end to end

Removing either half of the local-setup chain leaves every test green:

- the `preprocess_and_launch` call that honors `setup_params.require_collection_ack` (mutation M3);
- `LocalSetupHandler` adding `require_collection_ack` to `job_config` (mutation M9).

The docs tell local/asynchronous clients to rely on exactly this path ("pass the returned job configuration to launch so its opt-in reaches the server"). `test_default_setup_wire_parameters_remain_unchanged` checks only the private dict builder.

Fix: add a `LocalSetupHandler`-based sibling of `test_local_client_setup_opt_in_and_ack_route`. It should run setup with opt-in, launch with the returned config, clean (directory retained), then acknowledge (directory gone). Optionally replace the private-helper test with it.

## P2 2 — Collection ack isn't tested, or defined, for message-queue clients

`_setup_params_from_job_config` forwards the opt-in over MQ and relay, and the stateful proxy honors it. But `BaseMessageJobClient` has no `acknowledge_collection`, its `clean()` only drops the client-side cache, and `bind_amqp` has no ack consumer. No test pins what an opted-in MQ job does. The docs say the facility applies "independently of their execution backend", which suggests a broader scope than is tested.

Fix: add a `memory://` test modeled on `test_message_queue` in `test/integration_test.py`. It should assert either a working ack and clean, or a setup-time rejection of opt-in for message clients. Whichever behavior is intended needs to be written down.

## P2 3 — No test goes through the existing client/staging integration harness

Neither EngageQueue nor collection ack is exercised through `run_job`/`pulsar/client/test/check.py`, the harness the existing Slurm and Torque CLI integration tests use. That leaves untested:

- `HttpPulsarInterface` for the new `acknowledge_collection` command (path, method, boolean serialization);
- the real staging-up and staging-down flow for an EngageQueue job.

In-tree `finish_job` never calls `acknowledge_collection`, so no current consumer drives the ack protocol (left to the bug reviewer).

Fix:

- Add `test_integration_cli_engagequeue` (`skip_unless_module("engagequeue")`, `job_conf_props={'type': 'queued_cli', 'job_plugin': 'EngageQueue', 'job_state_dir': ...}`).
- Add a `require_collection_ack` option to `check.py` that acks before `finish_job` and asserts the staging directory is removed. Run it under the default (HTTP) and `local_setup` configurations.

This reuses existing abstractions, and some bespoke manager-level happy-path tests could then go.

## P3 1 — Pure adapter tests are hidden behind `importorskip("engagequeue")`

`test_adapter_quotes_paths_and_supports_relative_container_sidecars` and `test_nonterminal_uncertainty_does_not_authorize_collection` need no executor. Because they sit in `engagequeue_cli_test.py`, they skip wherever engagequeue isn't installed (Python < 3.10, `install_wheel`).

Move them to `engagequeue_optional_test.py`. Merge the second into `test_status_parsers_preserve_parent_keyword_contract` as one parametrized parse test, and rename it: it tests the state map, terminal states included, and has nothing to do with collection.

## P3 2 — Submit-boundary cancel test is coupled to the internal call count

`test_cancellation_winning_at_submit_boundary_prevents_dispatch` records the cancel on the *second* `_was_cancelled` call. Adding or removing one internal check silently moves the injection point. Inject at a named seam instead, such as a small dispatch-boundary method or the `status` lock entry.

## P3 3 — Two recovery tests can't tell their branches apart

`test_unknown_submission_transport_does_not_become_failed_or_complete` (rc 124) and `test_missing_submission_remains_nonterminal_without_replay` (rc 3) both reach QUEUED through `SubmissionUncertain`. Neither asserts anything specific to its branch. Assert the distinguishing outcome, or merge them into one parametrized test.

## P3 4 — Test hygiene in `engagequeue_cli_test.py` and `collection_ack_test.py`

- Hoist the in-function imports: `from galaxy.util.bunch import Bunch` (twice), and `import os` / `import shutil` in the Docker test.
- Replace the `Bunch(returncode=..., stdout=..., stderr=...)` fakes with a small module-level dataclass.
- Extract the duplicated executor teardown (fixture and `test_crash_after_acceptance...`) into a helper.
- Move the two inline child scripts into one importable `test/` helper module that reuses `make_manager`. Today they `from test.test_utils import ...`, which only resolves when cwd is the repo root.
- In `test_generic_guard_coordinates_independent_manager_instances`, `manager.app if hasattr(manager, "app") else _app_for(manager)` has a dead first branch, because `QueueManager` has no `app`. Call `_app_for(manager)` directly.
- Rename `engagequeue_cli_test.py` to `integration_test_engagequeue_cli.py`, following `integration_test_cli_submit.py`, so `test-unit`'s `--ignore-glob='*integration*.py'` excludes it. It takes about 2 minutes of real subprocess work.

## Non-findings

- `test_generic_guard_coordinates_independent_manager_instances` is meaningful: it fails 3 out of 3 runs with a no-op lock.
- `test_local_shell_preserves_rejected_command_exit_status` fails without the `p.poll()` fix.
- The final-status re-activation guard, the recovery-failure retention, the resource allowlist and the nonzero status-command handling are each caught by a test when reverted.
- No tests were weakened or removed. The only edit to an existing test file adds a test.
