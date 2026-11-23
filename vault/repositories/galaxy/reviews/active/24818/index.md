# #24818 — Expose dataset indexes to user-defined tools as secondary_files

- [View on GitHub](https://github.com/galaxyproject/galaxy/pull/24818) · base `dev` · author mvdbeek · worktree `~/projects/worktrees/galaxy/pr/24818` · closes #24797
- [default](initial_review.md) · [test challenges](test_challenges_review.md) ([debrief](test_challenges_debrief.md)) · [risks](risks.md) · [learning galaxy](learning_galaxy.md) ([follow-up issue](learning_galaxy_followup_issue.md))
- [findings](review_0_findings.yml) · [comment note](johns_review_0_comment_note.md) · [PR note](johns_review_0_pr_note.md) · [review branch](https://github.com/jmchilton/galaxy/tree/pr_24818_round_0_rev_0)

## Status

Round 0 initial review on `efa3e7bbdaf` (2026-11-11) ready, unposted: three P2s + seven P3s, nine fixed on `pr_24818_round_0_rev_0` (head `323625a69f8`, pushed to fork, not into PR). Nothing filtered.

PR open, out of draft; review requested from John.

2026-11-12: John posted P2 1 (per-dataset opt-in, asking for per-parameter models) and P3 1 (linking `8189c840546`, asking whether a tighter model is the real fix) as standalone PR comments, holding the rest for Marius's answer. No reply as of 2026-11-23.

2026-11-15 force-push to `d3adaeb1fc7` is a rebase onto dev only (range-diff: conflict resolution around `input_extra_files_path` / `ReferenceDataInternalJson`, no behaviour change). Neither concern addressed; all ten findings still hold. PR body still says `secondary_files[0]` (P3 3). Review branch conflicts trivially with the new head in `lib/galaxy/tools/runtime.py` (import list, adjacent function); needs a rebase before Push.
