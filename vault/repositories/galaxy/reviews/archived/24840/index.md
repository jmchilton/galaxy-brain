# #24840 — [26.2] mothur datatypes hardening for empty datasets

- PR: https://github.com/galaxyproject/galaxy/pull/24840 (bernt-matthias, base `release_26.2`)
- Worktree: `~/projects/worktrees/galaxy/pr/24840`

## Status

Round 0 on `67d7e1ca88a` delivered: approved, and `pr_24840_round_0_rev_0` (`9e33ce40176`) fast-forward pushed onto the PR head branch (2 P2 + 3 P3, all fixed). Awaiting merge.

2026-11-22: our push broke mypy (lint + packages jobs) — `.sniff()` on `build_sniff_from_prefix` classes in `test_mothur.py`. Fixed with `40bf7e35554` (use `sniff_prefix(FilePrefix(...))`), pushed to PR head.

- [Findings](review_0_findings.yml) · [comment note](johns_review_0_comment_note.md) · [PR note](johns_review_0_pr_note.md)
- Reports: [default](initial_review.md), [test challenges](test_challenges_review.md), [risks](risks.md)

## Archived

Merged 2026-11-23; tracking ended (GitHub state: MERGED).
