# #24484 — Stage Pulsar job inputs from the object store by identity

- [View on GitHub](https://github.com/galaxyproject/galaxy/pull/24484) · [default review](initial_review.md) · [thermo](thermo_review.md) · [test challenges](test_challenges_review.md) ([debrief](test_challenges_debrief.md)) · [risks](risks.md) · [learning galaxy](learning_galaxy.md) ([follow-up issue](learning_galaxy_followup_issue.md)) · [verified review](verified_review.md) · [filtered](filtered_findings.md) · [review branch `pr_24484_review_0`](https://github.com/jmchilton/galaxy/tree/pr_24484_review_0) ([details](review_0_branch_details.md)) · [response](initial_review_response.md) · [response action](initial_response_action.md) · [findings checklist](verified_findings_checklist.md) · [agents](initial_review_agents.md)

## Status

Initial review of `baeca0d7dc6` complete 2026-10-27, unposted: six P2s + four P3s; nine fixed on `pr_24484_review_0` (pushed to fork, not into PR). P3 3 (`staged_input` flag/union design) left to author. P2 1: unconditional `url=` to `ClientInput` breaks non-staging Pulsar jobs on pinned 0.16.0 (seen in CI); pin bump itself awaits galaxyproject/pulsar#553 release, so some staging tests stay red until then.

Open, ready for review, against `dev`. Author nuwang. 21 files, +1385/-76. Worktree `~/projects/worktrees/galaxy/pr/24484` (bootstrapped; checked out on `pr_24484_review_0`).
