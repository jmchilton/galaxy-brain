# pulsar#552 — Report failed postprocessing to clients polling for status

[View on GitHub](https://github.com/galaxyproject/pulsar/pull/552) · [Code review](initial_review.md) · [Test review](test_challenges_review.md) · [Test debrief](test_challenges_debrief.md) · [Risks](risks.md) · [Verified review](verified_review.md) · [Review branch](https://github.com/jmchilton/pulsar/tree/pr_552_review_0) · [Branch details and validation](review_0_branch_details.md) · [Response](initial_review_response.md) · [Actions](initial_response_action.md) · [Findings checklist](verified_findings_checklist.md)

## Status

Initial review of `4fe464c48b7fb2b665c266def1dacec0c4f7a8db` against `master` completed 2026-10-26: two P2 findings verified and fixed in two commits on the pushed review branch; approval with response posted and review-branch commits fast-forward pushed onto the PR branch (head 47ebb2b), 2026-10-26. Three added test cases passed individually, the ordering mutation failed as expected, final lint passed, and review/revision snapshots succeeded.

PR open as checked 2026-10-26; all Pulsar test, resilience, lint, and type checks pass. The [Galaxy master directory framework check](https://github.com/galaxyproject/pulsar/actions/runs/40337183725/job/121621789579) fails during collection with `ImportError: cannot import name 'build_client_manager' from 'pulsar.client'`; both Galaxy dev framework checks pass. A baseline reproduction of this CI failure was not performed. 
