---
related_records:
  - galaxy/reviews/24517
  - galaxy/reviews/23984
---
# #23986 — Add Crypt4GH-encrypted datasets with server-managed compute grants

- [View on GitHub](https://github.com/galaxyproject/galaxy/pull/23986)
- Learning: [learning_galaxy](learning_galaxy.md) ([stale-research follow-up](learning_galaxy_followup_issue.md)), [alternative layers](alternative_layers.md)
- Round 0 findings: [review_0_findings.yml](review_0_findings.yml)
- John's notes: [comment](johns_review_0_comment_note.md), [review-branch PR](johns_review_0_pr_note.md)
- Reports: [default](initial_review.md), [thermo](thermo_review.md), [test challenges](test_challenges_review.md) ([debrief](test_challenges_debrief.md)), [performance](performance_challenges_review.md) ([debrief](performance_challenges_debrief.md)), [risks](risks.md)
- Review branch: [`pr_23986_round_0_rev_0`](https://github.com/jmchilton/galaxy/tree/pr_23986_round_0_rev_0)

## Status

Review: round 0 on `ae37e517ebc` ready, unposted. 11 P2s + 21 P3s; 20 fixed on `pr_23986_round_0_rev_0` (head `f4c1a518d0c`, pushed to jmchilton fork, not pushed into PR). One filtered (F1, disproved).

PR: open against `dev`, by davelopez; draft. Supersedes #23277; builds on merged #23984, #23985, #24517.

Worktree: `~/projects/worktrees/galaxy/pr/23986` (on review branch; bootstrapped `.venv` + `config/galaxy.yml`).

## Standing instructions

- John asked (2026-11-21) for extra effort on the learning layer (`learning_galaxy.md`) and an ad-hoc alternative-layers reviewer (`alternative_layers.md`) weighing other places to implement the feature.
