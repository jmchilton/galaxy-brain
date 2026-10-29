# #24367 — [26.2] Keep unmappable resubmissions from stopping job dispatch

- [View on GitHub](https://github.com/galaxyproject/galaxy/pull/24367) · [default review](initial_review.md) · [test challenges](test_challenges_review.md) ([debrief](test_challenges_debrief.md)) · [risks](risks.md) · [verified review](verified_review.md) · [filtered](filtered_findings.md) · [review branch `pr_24367_review_0`](https://github.com/jmchilton/galaxy/tree/pr_24367_review_0) ([details](review_0_branch_details.md)) · [response](initial_review_response.md) · [response action](initial_response_action.md) · [findings checklist](verified_findings_checklist.md) · [agents](initial_review_agents.md)

## Status

Initial review of `63c6cbf9eb3` complete 2026-10-24; APPROVED with response posted 2026-10-26 (no PR from review branch, not pushed to PR head): two P2s + three P3s, all fixed on `pr_24367_review_0` (`dd33df60f6a`, pushed to fork; per-job backstop in resubmit loop, `__fail__` in shared helper, integration test vs real `JobWrapper.fail`). Unit tests (sqlite) + new integration test pass; postgres variants skipped locally.

Open, ready for review, against `release_26.2`. Author afgane. 2 files, +82/-10. Worktree `~/projects/worktrees/galaxy/pr/24367` (bootstrapped `.venv`). `initial_review.md` header says low effort; it ran at medium.

## Archived — 2026-10-29

GitHub: MERGED 2026-10-27 (merge commit `3a8f6bfd8d80cda02d2498ac37c8c40f0b1d457e`). Tracking ended on merge.
