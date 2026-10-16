# Cross-release alternative rejected — 2026-10-14

John: "That code is unreadable"; preserve a separate branch and identify it as an alternative John rejected for being too verbose, letting Marius comment on whether to take that route.

- Preserved full extension SHA `a13b016c0ff9575606639bfb8273f2572f68ed56` at `jmchilton/nightly_release_targets_alternative` before reverting anything.
- Reverted that single commit on nightly_unit_tests, producing `2ac1e9cc820`. `git diff --exit-code b2a792c206ded6040be900adef9b4b52f3819719 HEAD` confirms an identical tree. Both branches are pushed to the jmchilton fork.
- Restored the pre-extension PR description from its exact backup and the pre-extension four title options; the description now explicitly links the rejected alternative for Marius's assessment. The separate record preserves the latest extension description/title edits, including John's checked human-read item.
- Alternative is reference-only, do-not-PR, under branches_need_decision. It remains active rather than abandoned and should not be promoted automatically or deleted.
- Older extension debriefs in this directory are historical. The active proposal again has dev-only nightlies (five unit/Tool Shed Python versions), with existing release PR matrices retained.

[Alternative record](../../active/nightly_release_targets_alternative/index.md) · [Restored description](pr_description.md)

## Verification

Both remote refs were re-queried and match their recorded full SHAs. The restored reporter harness passes all seven cases; the four restored workflow files pass GitHub workflow schema validation. Vault validation reports zero errors and fifteen existing advisory warnings. Fresh fork CI on the rollback SHA is queued at refresh, including [unit](https://github.com/jmchilton/galaxy/actions/runs/38624976285) and [security lint](https://github.com/jmchilton/galaxy/actions/runs/38624976326). No claim of complete green rollback CI is made.
