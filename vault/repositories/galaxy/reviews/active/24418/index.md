# #24418 — Add datatype validators for twobit and lav

- [View on GitHub](https://github.com/galaxyproject/galaxy/pull/24418) · [default review](initial_review.md) · [test challenges](test_challenges_review.md) ([debrief](test_challenges_debrief.md)) · [risks](risks.md) · [verified review](verified_review.md) · [review branch `pr_24418_review_1`](https://github.com/jmchilton/galaxy/tree/pr_24418_review_1) ([details](review_1_branch_details.md); earlier [review_0](review_0_branch_details.md)) · [response](initial_review_response.md) · [PR description](initial_pr_description.md) · [response action](initial_response_action.md) · [findings checklist](verified_findings_checklist.md) · [filtered](filtered_findings.md) · [agents](initial_review_agents.md)

## Status

Initial review of `bdfe24d00ed` complete 2026-10-23; approved 2026-10-24 with response, fix PR opened at https://github.com/richard-burhans/galaxy/pull/4 (review branch not pushed to PR head). Trimmed by John 2026-10-24: both P3s dropped (see filtered). Two P2s remain (invalid-case assertions pass on validator crash; twobit big-endian/v1/rejection branches untested), fixed on `pr_24418_review_1` (`bc2d663e291`, pushed to fork); 13 twobit/lav unit tests pass.

Open, ready for review, against `dev`. Author richard-burhans. 4 files, +85/-0. Worktree `~/projects/worktrees/galaxy/pr/24418`.
