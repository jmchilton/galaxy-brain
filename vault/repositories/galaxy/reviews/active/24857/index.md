# #24857 — Fix sub-workflow upgrade connections and TRS version handling, make editor refactors undoable

- [View on GitHub](https://github.com/galaxyproject/galaxy/pull/24857)
- Round 0 findings: [review_0_findings.yml](review_0_findings.yml)
- John's notes: [comment](johns_review_0_comment_note.md), [review-branch PR](johns_review_0_pr_note.md)
- Reports: [default](initial_review.md), [test challenges](test_challenges_review.md) ([debrief](test_challenges_debrief.md)), [risks](risks.md), [learning_galaxy](learning_galaxy.md)

## Status

Review: round 0 on `93b224b00ea` ready, unposted. Three P2s + four P3s, all fixed on `pr_24857_round_0_rev_0` (head `ce92fabf765`, pushed to jmchilton fork, not pushed into PR). One filtered (F1, pre-existing `curated.py` comment).

PR: open against `dev`, by mvdbeek; out of draft. Prep for sub-workflow versioning (#11430); feature follows in a separate PR.

Worktree: `~/projects/worktrees/galaxy/pr/24857` (on review branch; has `client/node_modules` + built `static/dist`).
