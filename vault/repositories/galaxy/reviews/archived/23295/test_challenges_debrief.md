# Test challenges debrief — #23295

Reviewed commit `73695fa00a6` (Keith's `18a64ceca88` + John's merged suggestion commit). Review-directory mode: nothing in the PR was edited; every drop/rewrite below is a recommendation.

## What was run

`PYTHONPATH=lib <galaxy .venv>/bin/python -m pytest test/unit/app/jobs/test_runner_default_destination_params.py` from the worktree (worktree has no `.venv`; used `~/projects/repositories/galaxy/.venv`): 15 passed.

No other tests were run. Suggested new tests below were not written or run.

## Layer assessment

- Backend config plumbing (runner param -> destination param). No API surface, no UI: no API/integration/Selenium test warranted.
- An integration test would need a runner that declares `runner_default_destination_params`; today only `PulsarGcpBatchJobRunner` does and it needs GCP. Not feasible; unit layer is right.
- The real call paths are reachable cheaply in unit tests, though, and the PR's tests never go through them (below).

## Seam coverage (mutation reasoning)

| Mutation | Caught? |
|---|---|
| Delete `self._populate_parameter_defaults(...)` from `BaseJobRunner.prepare_job` (`runners/__init__.py:362`) | No — all 15 pass |
| Drop `super()` chain in `PulsarJobRunner._populate_parameter_defaults` | Yes (`test_populate_parameter_defaults_seeds_through_the_pulsar_hook`) |
| Delete `_populate_parameter_defaults` call in Pulsar `queue_job` (`pulsar.py:434`) | No (pre-existing call, not touched by PR) |
| Switch subscript to `.get()` in `_apply_runner_default_destination_params` | Yes (`test_unset_default_falls_back_to_spec_default`) |
| Remove `__init__` declaration check | Yes (`TestDeclarationValidation`) |

The `prepare_job` call is the "self-enforcing seam" — the main design point of the merged suggestion — and is the one thing no test pins.

## Per-test challenge

`test/unit/app/jobs/test_runner_default_destination_params.py`:

- `_make_runner` — builds runners with `object.__new__`, skipping `__init__`. `TestDeclarationValidation` already shows the real constructor works with `_mock_app()` (no threads started in `__init__`). Rewrite to construct for real so every test also passes the declaration check and nothing hand-wires `runner_params`.
- `test_runner_default_seeds_unset_destination_param` — keep (core contract).
- `test_destination_value_overrides_runner_default` — keep.
- `test_no_runner_default_leaves_destination_untouched` — keep.
- `test_only_listed_params_are_seeded` — keep; cheap guard against seeding every `default_*` spec.
- `test_unset_default_falls_back_to_spec_default` — keep; real regression guard (`.get()` vs `__missing__`). Docstring is three lines; trim to one.
- `test_falsy_runner_default_is_still_applied` — keep (None-means-unset contract), but it builds a third ad-hoc runner subclass; with a real-constructor helper taking the param name this collapses.
- `test_destination_falsy_value_beats_runner_default` — overlaps `test_destination_value_overrides_runner_default` (`None` is the stricter case). Merge into one parametrized test.
- `test_seeding_is_idempotent` — second call returns `False` only because the param is now set, i.e. it re-tests "destination wins". No in-tree runner double-applies (Pulsar doesn't use `prepare_job`). Drop.
- `TestDeclarationValidation::test_missing_spec_is_a_configuration_error` — keep.
- `TestDeclarationValidation::test_registered_spec_starts_cleanly` — weak (asserts a spec default of `None`); fold into the real-constructor helper and drop.
- `TestPulsarGcpBatchWiring::test_declared_default_is_registered_in_param_specs` — keep: the `__init__` check only fires when a GCP Pulsar runner is configured, which CI never does, so this static check is the only CI guard for that runner.
- `TestPulsarGcpBatchWiring::test_legacy_runner_level_name_is_rejected` — drop. Asserts a dict key is absent. The legacy `custom_vm_image` runner key never shipped (`PASSTHROUGH_PARAMS` is absent from `release_26.0`/`26.1`/`26.2`), so there is no deployed config to protect. Unknown-key rejection is already covered by `test_runner_params.py::test_missing_parameter`.
- `TestPulsarGcpBatchWiring::test_populate_parameter_defaults_seeds_through_the_pulsar_hook` — keep, but move to `test_pulsar_runner.py`. It's Pulsar-specific, and that file already has `_runner()` / `RecordingClientManager`, so the test can assert the value reaches `client.destination_params` via `get_client_from_wrapper`, not just the dict.
- `_mock_app()` uses `unittest.mock.Mock`. Only `config.redact_email_in_job_name` is read; a `SimpleNamespace(config=SimpleNamespace(...))` (the pattern in `test_pulsar_runner.py::_runner`) is more explicit. Minor.

## File placement

- The generic mechanism is base-runner behavior, so a new file is defensible. `test_runner_params.py` (50 lines, base `RunnerParams`) is a reasonable alternative home but not required.
- Pulsar wiring belongs in `test_pulsar_runner.py`.
- `test_gcp_batch_runner.py` covers the *native* GCP Batch runner, which resolves runner-level `custom_vm_image` (no `default_` prefix) per key in `_get_job_params` (`gcp_batch.py:285`). It doesn't use this mechanism, so nothing there to extend. That's a sibling-consistency point for the main review: two GCP runners with different runner-level key names for the same param.

## Test plan (recommended)

1. **Add a seam test through `prepare_job`** in `test_runner_local.py`, reusing `MockJobWrapper` and the existing `GALAXY_SLOTS` assertions. `local_slots` is a real destination param consumed after `prepare_job`:

   ```python
   class _SlotsDefaultLocalRunner(local.LocalJobRunner):
       runner_default_destination_params = ["local_slots"]

   def test_runner_default_slots(self):
       self.job_wrapper.command_line = "echo $GALAXY_SLOTS"
       runner = _SlotsDefaultLocalRunner(
           self.app, 1, runner_param_specs={"default_local_slots": dict(map=int, default=None)}, default_local_slots=4
       )
       runner.queue_job(cast(MinimalJobWrapper, self.job_wrapper))
       assert self.job_wrapper.stdout.strip() == "4"
   ```

   Optionally add a sibling case with destination `local_slots=3` that expects `"3"`. This fails if `prepare_job` stops calling the hook.
2. Move the Pulsar hook test into `test_pulsar_runner.py`. Assert on `RecordingClientManager.calls[0][0]["custom_vm_image"]` after `_populate_parameter_defaults` + `get_client_from_wrapper`.
3. Construct runners with the real constructor in the generic file. Merge the two destination-wins tests. Drop `test_seeding_is_idempotent`, `test_legacy_runner_level_name_is_rejected` and `test_registered_spec_starts_cleanly`.
4. No E2E/API/integration tests needed.
