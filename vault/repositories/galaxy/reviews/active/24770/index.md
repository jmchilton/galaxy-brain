# #24770 — [26.2] Avoid replaying workflows while tool inputs are unchanged

- [View on GitHub](https://github.com/galaxyproject/galaxy/pull/24770) · base `release_26.2` · author mvdbeek · worktree `~/projects/worktrees/galaxy/pr/24770`
- [default](initial_review.md) · [thermo](thermo_review.md) · [test challenges](test_challenges_review.md) · [risks](risks.md) · [performance](performance_challenges_review.md) · [learning galaxy](learning_galaxy.md) ([follow-up issue](learning_galaxy_followup_issue.md))
- [verified review](verified_review.md) · [filtered findings](filtered_findings.md) · [review branch](https://github.com/jmchilton/galaxy/tree/pr_24770_round_0_rev_2) ([details](round_0_rev_2_branch_details.md); superseded [rev_1](round_0_rev_1_branch_details.md), [rev_0](round_0_rev_0_branch_details.md)) · [response](initial_review_response.md) · [agents](initial_review_agents.md) · [action](initial_response_action.md) · [findings checklist](verified_findings_checklist.md)

## Status

Round 0 initial review on `8ec2452c3bb` (2026-11-09), unposted. Four P3s (P3 1–4), all fixed on `pr_24770_round_0_rev_2` (fork, not pushed into PR). Ten items filtered; John trimmed the test findings (P2 1, P2 2, P3 6) 2026-11-10.

2026-11-10: author pushed `c44640e7442` (exception dependencies moved to `ToolInputsNotReadyWithDependencies`), resolving P3 5; it moved to filtered. Review branch rebased onto it as `rev_1` without our P3 5 commit; edited tests re-run green (10/15/14).
