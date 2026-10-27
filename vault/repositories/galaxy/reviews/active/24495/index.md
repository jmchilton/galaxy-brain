# #24495 — [26.2] Fall back to uncompressed when is_zipfile is a false positive

- [View on GitHub](https://github.com/galaxyproject/galaxy/pull/24495) · [default review](initial_review.md) · [test challenges](test_challenges_review.md) ([debrief](test_challenges_debrief.md)) · [risks](risks.md) · [verified review](verified_review.md) · [filtered](filtered_findings.md) · [review branch `pr_24495_review_0`](https://github.com/jmchilton/galaxy/tree/pr_24495_review_0) ([details](review_0_branch_details.md)) · [response](initial_review_response.md) · [response action](initial_response_action.md) · [findings checklist](verified_findings_checklist.md) · [agents](initial_review_agents.md)

## Status

Initial review of `d3a03e397a7` complete 2026-10-27, posted as PR comment 2026-10-27 (https://github.com/galaxyproject/galaxy/pull/24495#issuecomment-6443227886): three P2s fixed on `pr_24495_review_0` (`8355212f702`, pushed to fork; new unit + API tests red-to-green) + one P3 (leading-magic zip check, dev follow-up). P2 2 fix changes raw `guess_ext` for directory-first zips (`txt` → `tabular`); split `cb8fca124e1` if release branch should stay crash-fix-only.

Open, ready for review, against `release_26.2`. Author dannon. 4 files, +39/-9; fixes #24488. Worktree `~/projects/worktrees/galaxy/pr/24495`.
