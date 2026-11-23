# PR #25023 — [26.2] Fix remote tool evaluation on Pulsar and allow it with directory metadata

- PR: https://github.com/galaxyproject/galaxy/pull/25023
- Author: mvdbeek; base `release_26.2`; draft; review requested from John
- Worktree: `~/projects/worktrees/galaxy/pr/25023`
- Related: #25021 (non-remote-eval Pulsar fix; semantic conflict, see P2 1), #16744, fixes #25012

## Round 0

- Reviewed commit: `ff96b8bb47c49cd0886b04747bc1825bc8e25601`
- Status: round 0 review posted as Approve 2026-11-22 (John dropped P3 5). Six fixes on review branch `pr_25023_round_0_rev_1` (head `3a6d5333d72`, pushed to the jmchilton fork, not into the PR); rev_0 (`391e46a8a1e`) kept. Not fixed: P2 1 (#25021 conflict, fix belongs to whichever PR merges second) and P3 4 (dead model methods; would delete a test assertion).
- Findings: [review_0_findings.yml](review_0_findings.yml)
- Notes: [comment](johns_review_0_comment_note.md), [review-branch PR body](johns_review_0_pr_note.md)
- Reports: [default](initial_review.md), [thermo](thermo_review.md), [test challenges](test_challenges_review.md) ([debrief](test_challenges_debrief.md)), [risks](risks.md), [learning_galaxy](learning_galaxy.md) ([vault follow-up](learning_galaxy_followup_issue.md))

## Archived

Merged 2026-11-23; tracking ended (GitHub state: MERGED).
