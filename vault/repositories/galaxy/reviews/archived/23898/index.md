## Tracking ended — 2026-10-13

PR **merged** at `2026-10-13T15:44:59Z`; final GitHub head `20cff59a4ab5ed99aa91dbbe2644c2180544885a`. Removed from the review queue and archived. The worktree was already absent. Historical reviews and delivery states below retain their original dates and commits.

# galaxy #23898 — Use explicit Pulsar implementation imports

[PR #23898](https://github.com/galaxyproject/galaxy/pull/23898) · Status: active; open draft. GitHub state checked 2026-10-11.

[Release-pin update review](release-pin-review-2026-10-11.md) · [implementation debrief](../../../branches/active/pulsar-explicit-imports/implementation_debrief.md) · [original review and history](review.md)

Current PR head: `d2a95eff002f6ca9cb4c7040303dceea64029438`. Published Pulsar 0.16.0 replaces all three Git source pins, and temporary build settings are removed. The PR is mergeable after merging current dev; fresh CI is queued. Incremental review has no findings; 33 focused runner tests pass against the published wheel. No GitHub review/comment was posted.

The original review at `c6f8234b5e459285e9637c1fa2ed6b985ee41402` remains historical. Its temporary-source-pin/release blocker is resolved by the new update; its compatibility-shim recommendation predates John’s explicit decision to publish the 0.16 import break.

## Morning check — 2026-10-12

Open, draft; live HEAD `d2a95eff002f6ca9cb4c7040303dceea64029438`. CI snapshot: 2 failure, 2 skipped, 52 success. Latest commit is by jmchilton at 2026-10-11T22:10:03Z, within the past 24 hours. [Package CI](https://github.com/galaxyproject/galaxy/actions/runs/38179338266) fails on Python 3.10 and 3.14: both Kubernetes client-selection parametrizations raise because `pykube` is missing. This comes from the new runner tests, not an unrelated failure. Current mergeability is CONFLICTING (DIRTY), superseding yesterday’s mergeable snapshot. [Nicola asks whether the package dependency bumps are needed](https://github.com/galaxyproject/galaxy/pull/23898#discussion_r4248233548); John has not replied. Still draft; no source edits or GitHub responses performed in this morning check.
