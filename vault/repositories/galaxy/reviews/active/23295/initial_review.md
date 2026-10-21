# Default review — galaxyproject/galaxy#23295 (follow-up round)

- Profile: [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md)
- Model: Claude Opus 5.5, low effort
- Reviewed commit: `73695fa00a6` (Keith's `18a64ceca88` + John's `73695fa00a6`, base `dev` @ `d57ebf638ac`)
- Scope: whole PR diff, John's suggestion commit reviewed with the same rigor.

## Verdict

Code is in good shape; the ksuderman/galaxy#10 suggestions landed coherently. `_populate_parameter_defaults` is on `BaseJobRunner`, called from `prepare_job`, and Pulsar chains up via `super()` from its existing direct call in `queue_job` (Pulsar never routes through `prepare_job`, so there is no double-apply; it would be idempotent anyway). Resolution reads `self.runner_params[...]` so `RunnerParams.__missing__` supplies the spec default; `is not None` semantics are consistent across docstring, code and tests; the init-time `ConfigurationError` makes a mis-declared list fail loudly. Unit test passes (15/15, run with the shared Galaxy venv since the worktree has no `.venv`).

Main ask: the PR description is now stale and contradicts the code. Remaining items are small.

No real bugs found. No security findings.

## Findings

### P2 1: PR description no longer matches the code

The description still describes Keith's pre-#10 version:

- "if ... the runner defines a **truthy** `default_<param>`" — code now uses `is not None`, and `test_falsy_runner_default_is_still_applied` asserts the opposite.
- Tests list "falsy-default ignored"; that test was replaced. "5 passed" is now 15.
- Pulsar change described as "a call to the shared helper" — there is no call; Pulsar only declares `runner_default_destination_params` and the base `_populate_parameter_defaults` (now invoked from `BaseJobRunner.prepare_job`) does the work.
- Not mentioned: the `prepare_job` seam (affects every runner that routes through it), three-tier resolution (destination > `default_<param>` > spec default), the startup `ConfigurationError`, the `job_conf.sample.yml` entry, and removal of the commented-out sketch in Pulsar.

Suggested fix: update Changes 1–3 and Testing to reflect the above. The Motivation, rename note, and follow-ups sections are still accurate.

### P3 1: Docstring claims seeded values are not persisted — false for the only consumer

`_apply_runner_default_destination_params` says seeded values "are not persisted to `job.destination_params`, so this is not a suitable mechanism for params that must survive job recovery." For Pulsar, `queue_job` seeds and then calls `job_wrapper.set_job_destination(job_destination, ...)` (`pulsar.py:548`), and `JobWrapper.set_job_destination` writes `job.destination_params = job_destination.params` (`lib/galaxy/jobs/__init__.py:2984`). So `custom_vm_image` *is* persisted. `pbs.py` and `tasks.py` also call `set_job_destination` after `prepare_job`.

The underlying caveat matters for the listed follow-ups (e.g. HTCondor's `htcondor_collector` is needed on recover/stop paths): seeding happens only on the prepare path, not in `recover_job`/`stop_job`. Suggested wording: "Seeding runs only on the prepare path (`prepare_job`, or a runner's direct call). Recover/stop paths see seeded values only if the runner persisted the destination via `set_job_destination`."

### P3 2: `prepare_job` seam is untested

The "self-enforcing" part of the design is the `self._populate_parameter_defaults(job_wrapper.job_destination)` line in `BaseJobRunner.prepare_job`, but no test goes through `prepare_job` — deleting that line keeps all 15 tests green. Cheap fix: build the `_Runner` via `_make_runner`, pass a `Mock` job wrapper with `job_destination=JobDestination(params={})` and `get_state()` returning `model.Job.states.DELETED` (so `prepare_job` returns early after seeding), and assert `custom_vm_image` was seeded.

Related, minor: `test_legacy_runner_level_name_is_rejected` asserts dict membership; asserting `RunnerParams(specs=PULSAR_PARAM_SPECS, params={"custom_vm_image": "x"})` raises would test the "rejected, not silently ignored" behavior its docstring claims.

### P3 3: `default_custom_vm_image` silently accepted and ignored on non-GCP Pulsar runners

The init check enforces list → spec, but not spec → list. `PULSAR_PARAM_SPECS` is shared by every Pulsar runner, so `default_custom_vm_image` on `pulsar_tes`, `pulsar_rest`, `pulsar_mq`, etc. loads without error and does nothing. (Same was true of `custom_vm_image` from #23068, but this PR renames it and adds the convention.) Per review focus, prefer rejecting input that can't work. Option: in `BaseJobRunner.__init__`, raise (or warn) when a configured `default_<x>` kwarg has `x` not in `runner_default_destination_params`. No other runner spec key currently starts with `default_` (`default_file_action` in `pulsar.py` is a destination default, not a runner spec), so the check wouldn't misfire today. Fine as a follow-up if the author prefers.

## Nits (no action required)

- `_apply_runner_default_destination_params` exists only to be called by `_populate_parameter_defaults`; tests could target `_populate_parameter_defaults` and the helper be inlined. Keeping it is defensible as the named, override-proof piece.
- `ClassVar[list[str]] = []` — a `tuple[str, ...]`/`Sequence[str]` would avoid the shared-mutable-default shape; subclasses all reassign so no real risk.

## Checked, no issue

- `JobDestination` from `JobConfiguration.get_destination` is deepcopied, so mutating params in `prepare_job` doesn't leak across jobs.
- Seeding before the DELETED-state check in `prepare_job` is harmless.
- No other runner defines `_populate_parameter_defaults`, so promoting it to the base class doesn't collide.
- Sample config entry sits under the `pulsar_gcp` (`PulsarGcpBatchJobRunner`) runner.
- Decisions called out in the description (allow-list, `default_` naming, deferring other runners) not re-litigated.
