# Test challenges review — #23295

- Profile: [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md)
- Model: Claude Opus 5.5, low effort
- Reviewed commit: `73695fa00a6` (includes John's merged suggestion commit; its tests were challenged too)
- Full debrief and test plan: [test_challenges_debrief.md](test_challenges_debrief.md)

Ran `test/unit/app/jobs/test_runner_default_destination_params.py`: 15 passed. No suggested tests were written or run.

Unit is the right layer: this is runner config plumbing with no API or UI surface. Only `PulsarGcpBatchJobRunner` declares the mechanism, so an integration test isn't feasible.

## P2 1: `prepare_job` seam is untested

The point of the merged suggestion is that `BaseJobRunner.prepare_job` calls `_populate_parameter_defaults`, so declaring runners get seeding for free. Every test calls `_apply_runner_default_destination_params` or `_populate_parameter_defaults` directly. If you delete the call at `lib/galaxy/jobs/runners/__init__.py:362`, all 15 tests still pass.

Fix: add a behavior test in `test/unit/app/jobs/test_runner_local.py`. It can reuse `MockJobWrapper` and the existing `GALAXY_SLOTS` pattern (`test_default_slots` / `test_slots_override`). Declare a `LocalJobRunner` subclass with `runner_default_destination_params = ["local_slots"]`. Construct it with `runner_param_specs={"default_local_slots": dict(map=int, default=None)}, default_local_slots=4`. Then `queue_job` and assert stdout is `4`. Optionally add a sibling case with destination `local_slots=3` that expects `3`. This goes through `queue_job -> prepare_job -> seeding -> consumer`.

## P3 1: Move Pulsar wiring test into `test_pulsar_runner.py` and assert at the client boundary

`TestPulsarGcpBatchWiring::test_populate_parameter_defaults_seeds_through_the_pulsar_hook` is Pulsar-specific. `test_pulsar_runner.py` already has `_runner()` and `RecordingClientManager`. Moving it there lets the test assert that `custom_vm_image` reaches the client's `destination_params` via `get_client_from_wrapper`, instead of only checking the dict it just mutated. Keep `test_declared_default_is_registered_in_param_specs`: the runtime `__init__` check never fires in CI because no CI config uses a GCP Pulsar runner.

## P3 2: Drop redundant or implementation-mirroring tests

- `test_legacy_runner_level_name_is_rejected`: asserts `"custom_vm_image" not in PULSAR_PARAM_SPECS`. That runner-level key never shipped (`PASSTHROUGH_PARAMS` isn't on any release branch), and `test_runner_params.py::test_missing_parameter` already covers unknown-key rejection.
- `test_seeding_is_idempotent`: the second call returns `False` only because the param is now set, so it re-tests "destination wins". Also, no in-tree runner double-applies.
- `TestDeclarationValidation::test_registered_spec_starts_cleanly`: only asserts that a spec default is `None`. It's subsumed if the helper uses the real constructor (P3 3).
- `test_destination_falsy_value_beats_runner_default` overlaps `test_destination_value_overrides_runner_default`. Merge them into one parametrized test (`"destination-image"`, `None`).

## P3 3: Build runners with the real constructor, not `object.__new__`

`_make_runner` skips `__init__` and hand-assigns `runner_params`. `TestDeclarationValidation` already shows `BaseJobRunner(_mock_app(), 1, runner_param_specs=...)` is cheap and starts no threads. Using it everywhere means each test also passes the declaration check. It also removes the extra ad-hoc `_FalsyRunner` subclass if the helper takes the param name. `_mock_app()` could be a `SimpleNamespace` like `test_pulsar_runner.py::_runner`, since only `config.redact_email_in_job_name` is read. Trim the multi-line docstrings to one line.

## Note for main review (not a test finding)

The native GCP Batch runner (`lib/galaxy/jobs/runners/gcp_batch.py:285`) still resolves runner-level `custom_vm_image` (no `default_` prefix) through its own per-key fallback. After this PR the Pulsar GCP runner uses `default_custom_vm_image`, so the same param has different runner-level key names on the two GCP runners. `test_gcp_batch_runner.py` has nothing to extend unless that runner adopts the mechanism.
