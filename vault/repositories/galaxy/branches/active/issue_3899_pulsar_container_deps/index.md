# issue_3899_pulsar_container_deps

Status: `branches_implemented_needs_ci`. Base: `dev`. Current head: `a1f1b0862805c80637fb3608f887696bbf0a7ac3`; fresh fork CI pending.

Respects a Pulsar container job’s dependency-resolution opt-in (#3899).

[Implementation](implementation_debrief.md) · [test challenge debrief](test_challenge_debrief.md) · [Tracking history](tracking_history.md)

## TICK — 2026-10-11

Live fork head `9bf9056b1cce4ed3b96f8af74913a92d7aaadc80`: Integration [run 37616684134](https://github.com/jmchilton/galaxy/actions/runs/37616684134) passed both `TestEmbeddedDockerPulsarRemoteDependencyResolution` host and container cases. Unit/tool/workflow framework and Python lint pass. API’s sole red is the unrelated workflow purged-input output-state assertion (`error` vs `paused`), also seen on the retry-only branch. Packages fail removed social_core AuthMissingParameter import, and browser/startup runs miss the client cache before tests. Relevant new Docker coverage is executed and green, so promoted to implemented; failed API/cache jobs were rerun.

## TICK — 2026-10-12

Resolved only the runner-test import block, combining upstream’s metrics/runner imports with this branch’s effective_dependency_resolution import. All **32 runner unit cases pass**. Tests use the existing Python 3.13 environment plus the exact dev-pinned `pulsar-galaxy-lib==0.15.16` wheel in a temporary PYTHONPATH directory; no existing environment was changed. Initial runs in the bare environment lacked Pulsar and stopped during collection; supplying the exact wheel resolved setup. Changed Python parses and whitespace checks pass. Moved from implemented/green back to needs CI for this new head; previous head’s green Docker regression is retained as historical evidence, not claimed for the rebased SHA. Rebased onto dev `2671a6d5d63ca13ad554ac68cfd6739d4a881780` and force-pushed with the exact old-head lease to `jmchilton:issue_3899_pulsar_container_deps` at `a1f1b0862805c80637fb3608f887696bbf0a7ac3`. Fresh CI is pending. The rebase had a conflict, so any previous SHA approval cannot carry; no PR opened or final-review approval inferred.
