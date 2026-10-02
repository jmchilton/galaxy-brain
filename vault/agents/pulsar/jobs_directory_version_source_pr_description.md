> **Opened by Claude (AI assistant) on jmchilton's behalf.**

Fixes #135.

With `jobs_directory` set, `LocalSetupHandler` builds the job config on the Galaxy side and never asks the remote Pulsar anything. Its `pulsar_version` is therefore the Pulsar client library installed in Galaxy, and Galaxy's version checks compare against the wrong thing. Those checks now gate behaviour as well as reject old servers: the new-shell handling below 0.14.999 and `dataset_collector_descriptions` at 0.15.13.

Job configs now carry `pulsar_version_source`, saying where `pulsar_version` came from:
- `remote`: the remote Pulsar built the config (remote setup) and reported its own version.
- `destination`: the admin declared it with the new `remote_pulsar_version` destination param. It must be a quoted version string; a YAML number such as `0.20` (read as `0.2`) or a malformed version is rejected.
- `container_image`: the destination uses a published `galaxy/pulsar-pod-staging` image, and Pulsar knows which version each was built from (tags don't follow releases; Galaxy's default `0.15.0.2` is `0.15.0.dev1`).
- `client`: none of the above, so `pulsar_version` is just the client library's version and the remote version is unknown.

A missing key now means a client library that predates this change. `pulsar_version` stays populated in every case, so Galaxy releases that predate this keep passing their check.

Documents `remote_pulsar_version` in `docs/galaxy_conf.rst`.

On the Galaxy side, galaxyproject/galaxy#23850 records `pulsar_version_source` as the `target_version_source` job metric, alongside the version Galaxy submitted for and the version that actually ran. Galaxy's behaviour doesn't change based on the key. It does nothing until a Pulsar release sends it.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

