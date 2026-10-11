# galaxy #23898 — Use explicit Pulsar implementation imports

[PR #23898](https://github.com/galaxyproject/galaxy/pull/23898) · Status: active; open draft. GitHub state checked 2026-10-11.

[Release-pin update review](release-pin-review-2026-10-11.md) · [implementation debrief](../../../branches/active/pulsar-explicit-imports/implementation_debrief.md) · [original review and history](review.md)

Current PR head: `d2a95eff002f6ca9cb4c7040303dceea64029438`. Published Pulsar 0.16.0 replaces all three Git source pins, and temporary build settings are removed. The PR is mergeable after merging current dev; fresh CI is queued. Incremental review has no findings; 33 focused runner tests pass against the published wheel. No GitHub review/comment was posted.

The original review at `c6f8234b5e459285e9637c1fa2ed6b985ee41402` remains historical. Its temporary-source-pin/release blocker is resolved by the new update; its compatibility-shim recommendation predates John’s explicit decision to publish the 0.16 import break.
