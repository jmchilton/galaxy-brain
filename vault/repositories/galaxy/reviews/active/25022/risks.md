Profile: gx_risk_assessment · Model: Claude Opus 5.5 · Effort: low · Reviewed commit: 5a5b2cc11c097d8dd18ef9b186bb20ec3e7dc356

Mostly a two-way door in code, but it changes the on-disk layout of embedded Pulsar job state on a release branch: in-flight jobs are orphaned across an upgrade (until the migration script runs) and again across a rollback or a handler rename, with no automatic recovery either way.

<details><summary>Risk Details</summary>

- The default `persistence_directory` moves from `<data_dir>/pulsar_persisted_data` to `<data_dir>/pulsar_persisted_data/<server_name>`; jobs in flight during a 26.2 point-release upgrade are not recovered until an admin stops handlers and runs `scripts/migrate_embedded_pulsar_persistence.py`. The only signal is a startup log warning.
- Rollback is not clean: entries already in per-handler subdirectories are invisible to the older code, which only scans `*-<status>` directories directly under the shared root.
- Persistence is now keyed by `server_name`; renaming, removing, or scaling down handlers orphans that handler's unfinished Pulsar jobs (previously any handler sharing the directory would pick them up).
- `{server_name}` becomes a de facto supported config token in `persistence_directory`, documented in the sample job conf, which is effectively a new admin-facing contract.
- Explicit `persistence_directory` values without the placeholder keep the old shared, cross-handler-recovery behavior silently.
- The migration script moves files (`shutil.move`) and is destructive if run with handlers live or with a wrong `--target`; `--dry-run` exists but is opt-in.

</details>

<details><summary>Risk Review Advice</summary>

Reviewers should decide whether a storage-layout change with a manual migration step belongs on `release_26.2` versus `dev`, and if so whether release notes and admin docs call out the stop-handlers-and-migrate step clearly (a log warning alone is easy to miss). It is worth considering whether the runner could also scan the legacy shared directory for jobs assigned to its own handler, which would make both upgrade and rollback self-healing.

Also confirm the behavior for deployments that set `persistence_directory` without the placeholder, and that the handler-rename orphaning is acceptable or documented.

</details>
