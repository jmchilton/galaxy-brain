> **Drafted by Claude (AI assistant) on jmchilton's behalf.**

Builds on #518, whose commits show here until it merges; only the last commit is new. Pairs with galaxyproject/galaxy#23850.

Records the version of the Pulsar that staged a job as a Galaxy job metric. Preprocess writes `__instrument_pulsar_version` (`{"version": ...}`) into the job's metadata directory, which is staged back to Galaxy with the rest of that directory.

Most runners already get the remote's version from the completion status. Polling coexecution runners (Kubernetes, TES, GCP Batch, AWS Batch) build their status from the platform instead, so this file is the only way Galaxy learns what actually ran there. That's also the case where the version comes from the staging image rather than from Pulsar itself.

The version file and the transfer metrics now share one file writer. As with the transfer metrics, a failure to write it is logged and never fails the job.

Tests: preprocess writes the version, and postprocess stages it back to the client's metadata directory.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
