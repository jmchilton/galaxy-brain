### P2 1: PR description no longer matches the code

The description still describes the pre-ksuderman/galaxy#10 version: it says a **truthy** `default_<param>` is copied (code uses `is not None`, and a test asserts falsy values apply), lists a "falsy-default ignored" test and "5 passed", and says Pulsar gains "a call to the shared helper" (there's no call; the base `_populate_parameter_defaults`, invoked from `BaseJobRunner.prepare_job`, does the work and Pulsar's override chains up). It doesn't mention the `prepare_job` seam (applies to every runner that routes through it), the three-tier resolution, the startup `ConfigurationError`, or the `job_conf.sample.yml` entry. The rename note says #23068 "only landed on `dev`", but it's also on `release_26.2` (see P2 2).

Update Changes and Testing; Motivation and Follow-ups still hold.

<details><summary>Details</summary>

Suggested replacement for Changes:

> 1. **`BaseJobRunner`**
>    - `runner_default_destination_params` class attribute: destination params a runner seeds from a runner-level `default_<param>`.
>    - `_populate_parameter_defaults(job_destination)` is now a base-class hook called from `prepare_job`, so declaring runners get seeding for free. For each listed `<param>` it resolves destination value > runner-level `default_<param>` > that spec's default, and copies the result unless it is `None`. The destination always wins, even with a falsy value.
>    - Startup `ConfigurationError` if a runner lists a param without registering its `default_<param>` spec.
> 2. **`PulsarGcpBatchJobRunner`**: registers `default_custom_vm_image` in `PULSAR_PARAM_SPECS` and declares `runner_default_destination_params = ["custom_vm_image"]`. Pulsar doesn't route through `prepare_job`, so its existing `_populate_parameter_defaults` override chains up via `super()`. Removes `PASSTHROUGH_PARAMS` and the commented-out sketch.
> 3. `job_conf.sample.yml`: documents `default_custom_vm_image` under the Pulsar GCP runner.
> 4. Unit tests in `test/unit/app/jobs/test_runner_default_destination_params.py`.

Rename note: "#23068 is on `dev` and `release_26.2`, and 26.2 isn't tagged yet, so this is a clean rename only if it reaches `release_26.2` before tagging."

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort.

</details>

### P2 2: The `custom_vm_image` → `default_custom_vm_image` rename must reach `release_26.2` before 26.2 is tagged

#23068 (merge `fb7b5ce3358`) is on `release_26.2`, and that branch's `pulsar.py` has the runner-level `custom_vm_image` spec and `PASSTHROUGH_PARAMS`. There's no `v26.2*` tag yet (latest is `v26.1.1`). If this PR lands only on `dev` and 26.2 ships first, admins will configure `custom_vm_image`. After the rename that key is rejected as an unknown runner param, so Galaxy fails to start with no deprecation path.

Target or backport this PR to `release_26.2` before tagging. If that isn't possible, keep accepting `custom_vm_image` as a deprecated alias.

<details><summary>Evidence</summary>

- `git branch -r --contains fb7b5ce3358` includes `origin/release_26.2`.
- `git show origin/release_26.2:lib/galaxy/jobs/runners/pulsar.py` has `custom_vm_image=dict(` (line 247) and `PASSTHROUGH_PARAMS = ["custom_vm_image"]` (line 1371).
- `git tag -l 'v26*'`: v26.0.0, v26.0.1, v26.1.0, v26.1.1.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_risk_assessment](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_risk_assessment.md) via Claude Opus 5.5 at low effort.

</details>

### P2 3: The `prepare_job` seeding seam is untested (implementation verified)

Making seeding self-enforcing depends on one line: `self._populate_parameter_defaults(job_wrapper.job_destination)` in `BaseJobRunner.prepare_job`. Every test calls `_apply_runner_default_destination_params` or `_populate_parameter_defaults` directly, so deleting that line keeps all 15 tests green.

Add a behavior test through a real runner's `queue_job`. The review branch adds two to `test_runner_local.py`, reusing `MockJobWrapper` and the existing `GALAXY_SLOTS` pattern. A `LocalJobRunner` subclass declares `runner_default_destination_params = ["local_slots"]` and is configured with `default_local_slots=7`. The first test asserts `$GALAXY_SLOTS` is `7`. The second sets the destination's `local_slots` to `3` and asserts `3`.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort and [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort. With the seam line removed, the new test fails (`assert '1' == '7'`); both tests pass with it in place.

</details>

### P3 1: The docstring says seeded values aren't persisted, which is false for the only consumer (implementation verified)

`_apply_runner_default_destination_params` says seeded values "are not persisted to `job.destination_params`, so this is not a suitable mechanism for params that must survive job recovery." That's wrong for the only runner using the mechanism, Pulsar GCP Batch:

- `PulsarJobRunner.queue_job` seeds first.
- After submission it calls `job_wrapper.set_job_destination(job_destination, ...)` (`pulsar.py:548`), which writes `job.destination_params = job_destination.params` (`jobs/__init__.py:2984`).
- On recovery, the handler rebuilds the destination with `JobDestination(from_job=job)` (`handler.py:377`), which reads those persisted params. No recover path re-seeds.

The caveat is real only for a runner that seeds in `prepare_job` and never calls `set_job_destination`. Its `destination_params` snapshot is taken in `JobWrapper.enqueue` (`queue_with_limit`, `jobs/__init__.py:~1806`), which `BaseJobRunner.put` calls before queueing `queue_job`, so it happens before seeding, so a recovered job of that kind has no seeded value and doesn't get one back.

Suggested wording: "Seeding runs only on the prepare path; recovered jobs see seeded values only if the runner persisted them via `set_job_destination`."

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort by tracing `queue_job` → `set_job_destination` → `JobDestination(from_job=job)` on recovery; the review branch applies the wording.

</details>

### P3 2: `default_custom_vm_image` is silently accepted and ignored on non-GCP Pulsar runners (implementation verified)

The init check enforces that every listed param has a spec, but not the reverse. `PULSAR_PARAM_SPECS` is shared by every Pulsar runner, so setting `default_custom_vm_image` on `pulsar_rest`, `pulsar_mq`, `pulsar_tes`, etc. loads without error and does nothing.

The review branch adds a matching check in `BaseJobRunner.__init__`: it raises `ConfigurationError` when a configured `default_<x>` names an `x` that isn't in `runner_default_destination_params`. The check can't misfire on current configs. No runner spec or `DEFAULT_SPECS` key other than `default_custom_vm_image` starts with `default_`, and every runner kwarg must match a spec.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort. The new test fails without the check and passes with it.

</details>

### P3 3: Unit tests mirror the implementation in places, and one doesn't test what its docstring claims (implementation verified)

These tests in `test_runner_default_destination_params.py` need tightening:

- `_make_runner` builds runners with `object.__new__` and hand-assigns `runner_params`, so no test passes through the declaration check in `__init__`. `BaseJobRunner(app, 1, runner_param_specs=...)` is cheap and starts no threads.
- `test_seeding_is_idempotent` re-tests "destination wins": the second call is a no-op only because the param is now set. No in-tree runner double-applies, since Pulsar doesn't route through `prepare_job`.
- `test_registered_spec_starts_cleanly` only shows that the constructor succeeds. Once every test uses the real constructor, the rest of the suite covers that.
- `test_destination_falsy_value_beats_runner_default` duplicates `test_destination_value_overrides_runner_default`.
- `test_legacy_runner_level_name_is_rejected` asserts dict membership instead of rejection. It should stay: the old key is on `release_26.2`.

The review branch makes these changes:

- Builds runners with the real constructor.
- Drops the idempotency and starts-cleanly tests.
- Merges the falsy-destination case into a parametrized override test.
- Makes the legacy-name test assert that `RunnerParams(specs=PULSAR_PARAM_SPECS, params={"custom_vm_image": "x"})` raises.
- Trims the multi-line docstrings.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at medium effort and [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort. The reworked file passes (14 tests, including P3 2's new tests).

</details>
