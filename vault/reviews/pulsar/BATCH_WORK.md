# GCP Batch job naming — work in flight

Handoff for picking this up cold. Companion to `473_gcp_batch_vm_sizing_env_lifecycle.md`
(see its final section, "Revised: converge on Galaxy's own Batch runner"); this file is the
operational state, that one is the reasoning.

## What this is

PR 473 (`ksuderman/pulsar:gcp-batch-resource-management`) P1 #1: the GCP Batch client builds
its job name from the wall clock and then recomputes it on every later operation, so status
polling and cancellation address a Batch job that never existed. Fixing it turned out to
require a Galaxy-side change too.

## Where it landed (after one reversal)

The first attempt made the GCP name deterministic. That was wrong. Galaxy's own Batch runner
(`lib/galaxy/jobs/runners/gcp_batch.py:218`) builds
`f"{prefix}-{int(time.time())}-{os.urandom(4).hex()}-{job_wrapper.get_id_tag()}"` — a clock
too — and makes it work by *persisting* it (`set_external_id` at `:198`, recovered at `:832`).
Keith's port kept the clock and dropped both the random bytes and the persistence.

Determinism loses on three counts, each verified:

1. `mark_as_resubmitted` (`lib/galaxy/jobs/__init__.py:1572-1579`) reuses the same job row, so
   the Galaxy job id is unchanged on resubmission and a derived name collides. Pulsar only
   deletes Batch jobs from `kill()`, so the completed first job still holds the name.
2. GCP has no `instance_id` at all — `gcp_job_id_prefix` (`container_job_config.py:299`) is
   `job_id_prefix or galaxy_instance_id or "pulsar"`, defaulting to `"pulsar"` for everyone.
   Two Galaxies sharing a project both emit `pulsar-<sequential int>`. The clock is currently
   masking this; determinism would have made a mandatory config knob the price of admission.
   `os.urandom(4)` solves it for free.
3. Determinism and `ExternalId` are mutually exclusive on the kill path — `stop_job`
   (`runners/pulsar.py:834`) passes the external id in *as* `job_id`, so deriving the name
   from `job_id` double-prefixes.

## Branches (both pushed, no PRs opened)

**Pulsar** — `jmchilton/pulsar:gcp-job-name-convergence-v2`, worktree
`~/projects/worktrees/pulsar/branch/gcp-job-name-convergence` (note: worktree dir keeps the
old name; the checked-out branch is the `-v2` one). Based on Keith's `8827d93`.

- `44c8a30` Share deterministic job naming between the Kubernetes and TES clients
  — `produce_unique_k8s_job_name` moves to `pulsar/util/job_naming.py` (dependency-free, so
  importable from both `pulsar.client` and `pulsar.managers` without a cycle); one `_job_name`
  on `CoexecutionLaunchMixin`; pykube_util keeps a delegating alias. GCP's `job_id_prefix`
  becomes a property override instead of an attribute assigned in `__init__`.
- `a76e5f4` Persist the GCP Batch job name instead of recomputing it
  — `produce_timestamped_job_name` matching Galaxy's shape; `_launch_containers` returns
  `ExternalId(job_name)`; kill and status read it back; the inherited deterministic
  `_job_name` raises `NotImplementedError` on GCP. TES gains `_tes_task_id`
  (`external_id or job_id`), fixing its polling path.

v1 of this branch still exists as `gcp-job-name-convergence` (deterministic GCP naming —
superseded, do not PR).

**Galaxy** — `jmchilton/galaxy:pulsar_external_id`, worktree
`~/projects/worktrees/galaxy/branch/pulsar_external_id`. Based on `a63da1dfd1`.

- `4b1913f20a` Pass the recorded external id through to the Pulsar client
  — `get_client` takes `external_id` alongside `job_id`, supplied on the polling, kill, and
  metadata paths.

## Two things not to undo

**The polling path could not see the external id.** `get_client_from_state`
(`runners/pulsar.py:675-678`) deliberately passes the *Galaxy* id, because `get_client` builds
`files_endpoint` and `token_endpoint` from `encode_id(job_id)`. The argument cannot be
swapped; the external id has to travel beside it. That is why this is a two-repo change.

**The external id is read from the job, not from `job_state.job_id`.** The latter falls back
to the Galaxy job id when nothing was recorded (`_job_state`, `:859`). Passing that through
would have clients chasing a Batch job that does not exist instead of raising a legible error.

## Test state

Pulsar: `test/client_test.py` 27 passed (+17 new). Full suite 44 failed / 227 passed against
44 failed / 210 passed on Keith's unmodified `8827d93` — identical failure set, the known
macOS `/usr/bin/cow` environmental ones. flake8 and mypy clean.

Galaxy: new `test/unit/app/jobs/test_pulsar_runner.py`, 4 tests. Red-to-green verified — 2
fail with the source change stashed, 2 (the negative cases) correctly pass either way. All
pre-commit hooks passed. No `.venv` in that worktree; tests were run with
`PYTHONPATH=lib ~/projects/worktrees/galaxy/branch/htcondor_pulsar/.venv/bin/python -m pytest`.

## Merge ordering

Galaxy must land first. Otherwise a Pulsar client on the GCP path raises "No backend job name
recorded" rather than silently polling a nonexistent job — a better failure, but still a hard
constraint. Say so in the Pulsar PR body.

## Next steps

- Draft both PR bodies (Pulsar against `ksuderman/pulsar:gcp-batch-resource-management`,
  Galaxy against `dev`). Neither PR is open yet.
- Open items carried over, none addressed by either branch:
  - Neither side validates the prefix. k8s checks `(?!-)[a-z\d-]{1,20}(?<!-)$`
    (`pykube_util.py:135-141`); `gcp_job_id_prefix` does nothing, so an operator string goes
    straight into a Batch job id against a 63-char cap. Galaxy has `sanitize_label_value`
    (`util/gcp_batch/helpers.py:338`); Pulsar has no equivalent.
  - Three backends read the instance discriminator from three different keys — TES accepts
    `galaxy_instance_id` or `tes_galaxy_instance_id`, k8s **only** `k8s_galaxy_instance_id`,
    GCP `job_id_prefix` or `galaxy_instance_id`. Plain `galaxy_instance_id` is silently
    ignored on k8s.
  - `GcpJobParams.labels` (`container_job_config.py:141`, applied `:271`) is never populated.
    Galaxy sets `galaxy-job-id`, `galaxy-tool-id`, `galaxy-runner`, `galaxy-handler`
    (`gcp_batch.py:431-436`).
  - `CreateJobRequest.request_id` unused — Batch's idempotency token, would make a retried
    submission after an ambiguous network failure safe.
  - 473 finding 2 (`kill()` belongs on the mixin) — could be a third commit on the Pulsar
    branch. Note `BaseMessageCoexecutionJobClient` precedes the launch mixins in the leaf
    classes' MRO, which is why `kill` currently lives on the leaves; the GCP pair was
    de-duplicated into `_delete_batch_job()` rather than moved, to avoid entangling with this.
  - 473's ten P2s remain unverified.

## Elsewhere in the 473 orbit

- Galaxy PR #23326 (HTCondor) opened, unrelated to this thread.
- Pulsar PR #487 (resilience `--port` arg) awaiting a merge decision.
