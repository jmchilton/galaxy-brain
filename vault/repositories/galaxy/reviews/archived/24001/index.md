# galaxy #24001 — [25.1] Respect allow_uri_if_protocol for single deferred data inputs

[PR #24001](https://github.com/galaxyproject/galaxy/pull/24001) · [Initial review](review-2026-10-11.md) · [Unposted approval draft](draft-review.md) · [Validation evidence](validation.txt) · [Baseline pytest plugin](baseline_plugin.py)

Status: archived; merged 2026-10-11 at 14:49:46 UTC. Initial recommendation: **approve**. Local draft was unposted; no formal GitHub review by John. Tracking ended on merge; GitHub state confirmed 2026-10-11.

Reviewed HEAD: `373ef0eae9ec68a747f98ab09db5075ccdc99133` (base `release_25.1`; parent `b8b33e5732876aa6880c507b931dfbf79ec4b1a4`). Author: davelopez. John requested this review on 2026-10-11.

GitHub checked after validation on 2026-10-11: open, out of draft, reviewed head unchanged. Two discussion comments concern retargeting from unsupported 25.0 to 25.1; no submitted reviews. Checks: 55 successful, five failed, two skipped. CI failures are triaged in the review; none demonstrates a regression in this patch.

Validation: four focused API tests passed; 38 existing evaluator/materialization tests passed. With the pre-fix evaluator methods substituted through a temporary pytest plugin, the new single-input URI regression test failed and the disallowed-protocol control passed. No Galaxy source edits.

Former worktree: `/Users/jxc755/projects/worktrees/galaxy/pr/24001/`. Clean HEAD and branch matched the merged PR; worktree, terminal session, and CI cache removed on 2026-10-11. Review evidence retained here.
