# PR #25022 — [26.2] Give each job handler its own embedded Pulsar persistence directory

- PR: https://github.com/galaxyproject/galaxy/pull/25022
- Author: mvdbeek; base `release_26.2`
- Worktree: `~/projects/worktrees/galaxy/pr/25022`

## Round 0

- Reviewed commit: `5a5b2cc11c097d8dd18ef9b186bb20ec3e7dc356`
- Status: initial review ready, unposted. Two P2s + five P3s; P2 1, P3 1, P3 2, P3 5 fixed and P3 4 partly fixed on `pr_25022_round_0_rev_0` (head `1db1e609529`, pushed to jmchilton fork, not into PR). P2 2 (auto-migrate at startup) and P3 3 unfixed.
- Risk report's `pulsar_config` placeholder claim disproved by verifier (YAML loaded into `conf` before substitution).
- [Findings](review_0_findings.yml) · [comment note](johns_review_0_comment_note.md) · [PR note](johns_review_0_pr_note.md)
- Reports: [default](initial_review.md) · [test challenges](test_challenges_review.md) · [risks](risks.md) · [learning galaxy](learning_galaxy.md)
