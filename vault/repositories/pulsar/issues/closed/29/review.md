# Pulsar #29 — Follow up on `__PULSAR_JOBS_DIRECTORY__` (CLOSED)

Closed 2026-09-22 as completed by
[pulsar#515](https://github.com/galaxyproject/pulsar/pull/515), which **removed the
`__PULSAR_JOBS_DIRECTORY__` destination token** rather than finishing the four checkboxes.
The 2026-09-16 research note that argued for finishing it is superseded; this is what is
left of it.

## Why removal beat completion

The recipe was documented in exactly one place (`docs/files/job_conf_sample_mq_rsync.yml`)
and was **unusable as documented**: Galaxy's `lib/galaxy/jobs/runners/pulsar.py` re-derived
the remote job directory with `os.path.abspath(join(remote_working_directory, os.pardir))`,
and in token mode `remote_working_directory` is *relative*, so `abspath` prefixed Galaxy's
own cwd and produced `/<galaxy_cwd>/__PULSAR_JOBS_DIRECTORY__/<id>`. That corrupted path
reached every command line via `command_factory.py` → `default_exit_code_file`. Three years
of nobody reporting it was the evidence that the feature had no users.

Boxes 1-3 (document in Galaxy, substitute in config/metadata files, write tests) are moot.
Box 4 (the singular `__PULSAR_JOBS_DIRECTORY__` → `__PULSAR_JOB_DIRECTORY__`) was already
done in `81be9db`, 2026-07-15, and survives — only the plural token was removed.

[pulsar#512](https://github.com/galaxyproject/pulsar/pull/512), which implemented the
substitution sweep over staged config and metadata files, was **closed unmerged**.

## What survives, and is still open

- **[galaxy#23620](https://github.com/galaxyproject/galaxy/pull/23620)** (draft, branch
  `pulsar_remote_job_directory`) — reads `job_directory` / `tools_directory` from the
  Pulsar job config instead of re-deriving them. Unaffected by the token removal: its
  posted rationale is that re-derivation duplicates what Pulsar already reports and that
  `abspath` assumes the remote path is both absolute and posix, neither of which the job
  config guarantees. A Windows Pulsar reporting `C:\pulsar\staging\123\working` still
  breaks it. Ships with no unit test — there is no seam in `__prepare_job`.

- **Unfiled bug, still live on master.** `pulsar/client/client.py:365` guards on
  `"job_directory"` (singular) then assigns `destination_params["jobs_directory"]`
  (plural). `_set_job_directory` (`client.py:142`) only reads the plural key and no
  destination param named `job_directory` exists in either repo, so the guard never fires
  and an admin-set `jobs_directory` on a coexecution destination is silently clobbered with
  `/pulsar_staging/` (or `/mnt/disks/<ssd_name>`). MQ clients are unaffected — their
  `default_staging_directory` returns `None`. The fix was part of the closed #512 and went
  down with it. **Wants its own issue.**

- **Galaxy test-file duplication.** `test/unit/app/jobs/test_pulsar_runner.py` and
  `test/unit/app/jobs/test_runner_pulsar.py` are a transposed-name pair, both with real
  content. Worth consolidating.
