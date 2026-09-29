> **Drafted by Claude (AI assistant) on jmchilton's behalf.**

Addresses galaxyproject/pulsar#135.

A Pulsar destination with `jobs_directory` builds its job config locally, so `pulsar_version` there is Galaxy's own `pulsar-galaxy-lib` version, not the remote's. The minimum version check always passed, and the `0.14.999` new-shell and `0.15.13` dataset collector gates keyed off the wrong version.

The companion Pulsar change (galaxyproject/pulsar#523) marks these configs with `pulsar_version_source` (`client`, or `destination` when the admin sets `remote_pulsar_version`).

- `PulsarJobRunner.pulsar_version()` returns `None` for `client`.
- `check_job_config` logs at info and skips the check when the version is unknown. A declared version is checked as before.
- The new-shell and dataset collector gates assume a current Pulsar when the version is unknown, which is what happens today in practice.
- `PulsarEmbeddedMQJobRunner` defaults `remote_pulsar_version` to `pulsar.__version__`. Its queue is consumed by the in-process Pulsar app, so the version is known and the check still runs. A destination can override it.
- Configs without the key (remote setup, and any Pulsar release before this) behave exactly as before, so this is safe to merge ahead of the Pulsar release.

Adds unit tests for `check_job_config` covering the reported, client, and declared cases, and for the embedded MQ default.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
