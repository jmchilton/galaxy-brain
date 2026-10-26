# #24465 — [26.2] Commit the job's final state in the same transaction as its outputs

- [View on GitHub](https://github.com/galaxyproject/galaxy/pull/24465) · [Correctness review](initial_review.md) · [Test review](test_challenges_review.md) ([debrief](test_challenges_debrief.md)) · [Risks](risks.md) · [Architecture](learning_galaxy.md) ([follow-up](learning_galaxy_followup_issue.md)) · [Verified review](verified_review.md) · [Review branch](https://github.com/jmchilton/galaxy/tree/pr_24465_review_0) ([details](review_0_branch_details.md)) · [Response](initial_review_response.md) · [Actions](initial_response_action.md) · [Checklist](verified_findings_checklist.md) · [Agents](initial_review_agents.md)

## Status

Initial review of `d7dfb46505d72d1a4d4891e2977781d721d1cd5a` complete 2026-10-26, unposted: one P3 test-coverage finding addressed on `pr_24465_review_0` (`7bfee985a03`, pushed to fork); original seven tests and added regression test pass, and removing rollback makes the new test fail.

PR open, targeting `release_26.2`; GitHub state checked 2026-10-26, PostgreSQL integration coverage reported by author was not independently rerun.
