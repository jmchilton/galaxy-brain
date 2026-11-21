---
related_records: pulsar/issues/492
---
# #24804 — Resubmit Pulsar jobs using structured failure reasons

- PR: https://github.com/galaxyproject/galaxy/pull/24804 (mvdbeek, base `dev`)
- Worktree: `~/projects/worktrees/galaxy/pr/24804`
- [Findings](review_0_findings.yml) · [comment note](johns_review_0_comment_note.md) · [PR note](johns_review_0_pr_note.md) · review branch [`pr_24804_round_0_rev_1`](https://github.com/jmchilton/galaxy/tree/pr_24804_round_0_rev_1) (rebase of [`rev_0`](https://github.com/jmchilton/galaxy/tree/pr_24804_round_0_rev_0))
- Reports: [default](initial_review.md), [thermo](thermo_review.md), [test challenges](test_challenges_review.md) ([debrief](test_challenges_debrief.md)), [risks](risks.md), [learning galaxy](learning_galaxy.md) ([stale-research issue draft](learning_galaxy_followup_issue.md))

## Status

Round 0 on `677cab47347`: six P2s + eight P3s, comment unposted; twelve fixes rebased onto the author's `3f09bd54b36` as `pr_24804_round_0_rev_1` and pushed into the PR 2026-11-21 at John's request (head `eaa6202814b`).

PR open, out of draft; CI pending on `eaa6202814b`; `TestEmbeddedMessageQueuePulsarPurge::test_purge_while_job_running` failed locally (`failed_metadata`) on the author's `3f09bd54b36` too, so it isn't from the review branch; consumes galaxyproject/pulsar#570 (merged 2026-11-13; Galaxy half of pulsar#492).
