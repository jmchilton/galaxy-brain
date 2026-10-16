# pulsar_mq_status_poll

Status: `branches_ready_for_final_review` (refreshed 2026-10-16).

Opt-in `status_poll_interval` asks Pulsar MQ to resend lost job statuses; stops double finishes (revives #9911).

[Implementation](implementation_debrief.md) · [review](review.md) · [Tracking history](tracking_history.md)

Depends on [Pulsar #532](https://github.com/galaxyproject/pulsar/pull/532) being released and the Galaxy pin being bumped.

## TICK — 2026-10-11

Current-head integration status-recovery case still times out, matching the recorded unreleased Pulsar dependency blocker. Client-unit focusOrder/GPopover and social-core package failures are unrelated but do not remove that blocker; no promotion.

## TICK — 2026-10-12

Requested failed-job reruns for the recorded unrelated failures: [run 37554848973](https://github.com/jmchilton/galaxy/actions/runs/37554848973), [run 37554848984](https://github.com/jmchilton/galaxy/actions/runs/37554848984). All requests were accepted; this does not claim a passing rerun or recover an evicted client cache/artifact.

Resolved only the runner-test import block, combining upstream’s metrics/runner imports with this branch’s PulsarJobState and Job imports. All **42 runner unit cases pass**. Tests use the existing Python 3.13 environment plus the exact dev-pinned `pulsar-galaxy-lib==0.15.16` wheel in a temporary PYTHONPATH directory; no existing environment was changed. Initial runs in the bare environment lacked Pulsar and stopped during collection; supplying the exact wheel resolved setup. Changed Python parses and whitespace checks pass. Rebased onto dev `2671a6d5d63ca13ad554ac68cfd6739d4a881780` and force-pushed with the exact old-head lease to `jmchilton:pulsar_mq_status_poll` at `953892df26cb825ed06e03c00700448461b23cef`. Fresh CI is pending. The rebase had a conflict, so any previous SHA approval cannot carry; no PR opened or final-review approval inferred.

## GOOD_MORNING — 2026-10-13

Rebased onto actual dev `b23da2fc8f0943d51b2cb191148464aa2297de43`. Resolved only the runner-test import block, retaining upstream build_client_manager and the branch’s PulsarJobState/Job imports. All **52 runner unit tests pass** using the existing Python 3.13 environment and released Pulsar 0.16.0 in a temporary PYTHONPATH. Whitespace checks pass. Force-pushed only to jmchilton with exact old-SHA lease `953892df26cb825ed06e03c00700448461b23cef`, new head `9d225eb5eb0dba8c4dc2fe981e453a0bebab5360`. Fresh CI pending; old green results do not attest this head. Conflict resolution invalidates any old approval; no PR opened.

## TICK — 2026-10-13 evening

Current fork head `9d225eb5eb0dba8c4dc2fe981e453a0bebab5360` has passing Integration: `TestEmbeddedMessageQueuePulsarLostStatusUpdate::test_status_poll_recovers_lost_complete_status` passed in [run 38430282752](https://github.com/jmchilton/galaxy/actions/runs/38430282752). The earlier unreleased-Pulsar blocker is cleared on this head. Remaining reds are unrelated: mulled zlib container building fails while conda retrieves channel metadata (run 38430282896), and the release script compares old fork master `VERSION_MINOR = None` (run 38430282944). Promoted to `branches_implemented`; requested failed-job reruns. No PR approval or publication inferred.

## Morning refresh — 2026-10-16

Rebased onto `origin/dev` and published `401bb8191cf2bbab10e978d11274f3a1931db5e1` only to jmchilton with an exact old-head lease. Resolved only the import/additive fixture conflict; a fresh human read is required, with no approval carried forward. Kept the base per-instance AMQP queue prefix and both polling fixture arguments; Python syntax and diff whitespace checks pass. Fresh fork CI is pending. Existing local development worktrees were left at their original heads; use the new fork head when resuming.
