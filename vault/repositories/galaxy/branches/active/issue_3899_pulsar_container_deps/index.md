# issue_3899_pulsar_container_deps

Status: `branches_implemented`. Base: `dev`.

Respects a Pulsar container job’s dependency-resolution opt-in (#3899).

[Implementation](implementation_debrief.md) · [test challenge debrief](test_challenge_debrief.md) · [Tracking history](tracking_history.md)

## TICK — 2026-10-11

Live fork head `9bf9056b1cce4ed3b96f8af74913a92d7aaadc80`: Integration [run 37616684134](https://github.com/jmchilton/galaxy/actions/runs/37616684134) passed both `TestEmbeddedDockerPulsarRemoteDependencyResolution` host and container cases. Unit/tool/workflow framework and Python lint pass. API’s sole red is the unrelated workflow purged-input output-state assertion (`error` vs `paused`), also seen on the retry-only branch. Packages fail removed social_core AuthMissingParameter import, and browser/startup runs miss the client cache before tests. Relevant new Docker coverage is executed and green, so promoted to implemented; failed API/cache jobs were rerun.
