> **Drafted by Claude (AI assistant) on jmchilton's behalf.**

Addresses galaxyproject/pulsar#135.

A Pulsar destination with `jobs_directory` builds its job config locally, so `pulsar_version` there is Galaxy's own `pulsar-galaxy-lib` version, not the remote's. The minimum version check compared the client library against itself and always passed.

The companion Pulsar change (galaxyproject/pulsar#523) records where the version came from in `pulsar_version_source`:
- `destination`: the admin set `remote_pulsar_version`.
- `container_image`: the Kubernetes, TES and GCP Batch runners use a published `galaxy/pulsar-pod-staging` image, and Pulsar knows which version it was built from. This includes Galaxy's default `0.15.0.2`.
- `remote`: the remote Pulsar reported its own version.
- `client`: none of the above, so the version is only the client library's.

Changes here:
- `check_job_config` skips the minimum version check for `client` and logs that at debug. Every other source is checked as before.
- The other version checks (the `0.14.999` new-shell check and the `0.15.13` dataset collector check) are unchanged. For `client` they compare against the client library's version, which is current, so a current remote is assumed.
- `job_conf.sample.yml` documents `remote_pulsar_version` under the MQ destination. It notes that the setting is needed for remotes older than 0.15.13; otherwise discovered outputs are silently dropped.
- Configs without the key (any Pulsar client before #523) behave exactly as before, so this is safe to merge ahead of the Pulsar release.

Adds unit tests for `check_job_config` covering the skipped `client` case and the checked `destination`, `container_image` and `remote` cases.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
