# PR #25022 initial review (default profile)

- Profile: default (`_shared/reviewers/default.md`)
- Model: Claude Opus 5.5, effort: low
- Reviewed commit: `5a5b2cc11c097d8dd18ef9b186bb20ec3e7dc356` (diff vs `origin/release_26.2`)
- Pulsar reference: `pulsar-galaxy-lib==0.16.0` (pinned), read from the `0.16.0` tag

## Verdict

Correct diagnosis and a small, well-scoped runtime change; the `{server_name}` substitution and the new default are right, and the integration tests go red on the base. The migration helper has one real gap (`assign_ids: uuid` entries are never matched) and the upgrade path for a point release leans on a manual step that the handler could do safely by itself, reusing the helper this PR already adds. No P1s.

## Findings

### P2 1 - Migration ignores Pulsar job ids that are not Galaxy ids (`assign_ids: uuid`)

`migrate_embedded_pulsar_persistence` treats each index entry name as `model.Job.id` (`session.get(model.Job, int(job_id)) if job_id.isdigit()`). Pulsar names the entry after its own job id, which is the Galaxy id only with the default `assign_ids: galaxy`. With `assign_ids: uuid` (Pulsar manager option, `pulsar/manager_factory.py:68`, `app.yml.sample:54`) every entry is a 32-char hex id, so the script reports every live job as "no Galaxy job with this id" and tells the admin to delete it. The test even encodes this (`uuid_id` expected as `"no Galaxy job with this id"`).

The runner already handles this case: `PulsarJobRunner.__async_update` (`lib/galaxy/jobs/runners/pulsar.py` ~line 1366) resolves a 32-char id via `model.Job.job_runner_external_id`. Galaxy stores Pulsar's returned id as `job_runner_external_id` for every Pulsar job (`set_job_destination(..., external_id=external_job_id)`), so a lookup by `job_runner_external_id == entry_name` (optionally falling back to the primary key for the narrow window before the external id is written) covers both assigners. Change the test's uuid entry to a real job submitted under a uuid-assigning manager, or at least build the expectation from a job whose `job_runner_external_id` is the uuid.

### P2 2 - Upgrade on a release branch strands queued jobs unless the admin runs a manual script; the handler could adopt its own entries

After this lands in a 26.2 point release, every site using the default directory (including single-handler sites that never had the bug) moves to `<data_dir>/pulsar_persisted_data/<server_name>`. Jobs in the old directory's preprocessing/postprocessing indexes are no longer recovered (launched jobs still recover via Galaxy's status polling, since `get_status` reads the shared staging dir). The only signal is a log warning; point-release upgraders rarely read upgrade notes.

The migration helper already does the hard part, and a handler can run it safely for itself at startup in `__init_pulsar_app`, before `PulsarApp(**conf)` calls `recover_active_jobs`: move only entries whose job has `handler == self.app.config.server_name` and a non-terminal state. Each entry belongs to exactly one handler, so concurrent handler startups never touch the same file, and `os.rename` within `data_dir` is atomic. Concretely: add an optional `handler` filter to `migrate_embedded_pulsar_persistence` (or a sibling that yields only self-owned entries), call it from the default branch where the warning is now, and keep the warning for whatever is left (other handlers' or terminal entries). The script then remains for explicit `persistence_directory` configs and cleanup. If the author prefers to keep it manual, the PR description's upgrade note should go into the 26.2 release notes, not only the sample config.

### P3 1 - Startup warning keeps firing after the migration script ran

The script deliberately leaves entries for missing/terminal jobs in the shared directory. `active_job_index_entries(base_directory)` still finds them, so every handler restart logs "Stop all job handlers and run scripts/migrate_embedded_pulsar_persistence.py" again, even though running it changes nothing. Either have the warning say that entries the script leaves in place can be deleted, or make the script (with a flag, e.g. `--delete-unrecoverable`) remove them so the warning goes quiet.

### P3 2 - Explicit `persistence_directory` without `{server_name}` keeps the bug silently (optional)

Sibling path to the default: a site that set `persistence_directory` (in `pulsar_app_config` or `pulsar_config`) keeps one shared directory per runner and gets no warning, although it has exactly the double-submit problem the PR describes. A one-time `log.warning` when a configured string lacks `{server_name}` (and isn't `__none__`) would point those admins at the fix. Optional: single-handler sites would see it too, so `info` level or gating on more than one configured handler is reasonable.

## Notes (not findings)

- `job.handler` is the right key: Pulsar index entries only exist for jobs already grabbed by a handler, and grabbing sets `handler = server_name` (`lib/galaxy/jobs/handler.py:171`), so tag-only assignments don't reach the script.
- The runner-level `persistence_directory` param (passed to `build_client_manager`, used for the AMQP ack UUID stores) doesn't get `{server_name}` substitution. That predates this PR and is a different store; mention only if the author wants the placeholder to mean the same thing everywhere.
- Imports are top-level; `ACTIVE_STATUS_DIRECTORIES` exists in the pinned 0.16.0. `__none__` passes through `.replace` unchanged, fine.
- Tests are integration tests against a real database and fail on the base (default path assertion), good red/green coverage; no unit-test padding.
