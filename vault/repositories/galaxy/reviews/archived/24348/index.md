# galaxy#24348 — [26.0] Defer tool test parsing so galaxy-web starts within the Helm startup probe

- [View on GitHub](https://github.com/galaxyproject/galaxy/pull/24348) · [Review](initial_review.md) · [Tests](test_challenges_review.md) ([debrief](test_challenges_debrief.md)) · [Risks](risks.md) · [Architecture](learning_galaxy.md) · [Verified review](verified_review.md) · [Review branch](https://github.com/jmchilton/galaxy/tree/pr_24348_review_0) ([details](review_0_branch_details.md)) · [Response](initial_review_response.md) · [Actions](initial_response_action.md) · [Checklist](verified_findings_checklist.md) · [Agents](initial_review_agents.md)

## Status

Initial review of `ebd02a8b4b47b2ec4d9ec406c5afb65ed81f5c2d` complete, unposted: one verified P2 concurrency finding fixed on `pr_24348_review_0` (`b465fdd6e20`, pushed to John's fork); the new concurrent-access regression fails before the fix and passes afterward.

PR open, targeting `release_26.0`; checked 2026-10-26, CI green except skipped CWL check; release-push-only Helm install check was not rerun locally.

## Archived — 2026-10-29

GitHub: MERGED 2026-10-28 (merge commit `08c21d0146dfade91244ab21f9ece90fc694eebf`). Tracking ended on merge.
