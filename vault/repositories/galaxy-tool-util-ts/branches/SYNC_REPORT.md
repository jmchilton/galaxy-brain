# Branch sync — 2026-11-06 (agent: workflow_libs)

- Merged: `issue_201_cli_version` (#206, 2026-10-26), `issue_204_unknown_map_over` (#205, 2026-10-26); entries removed, moved to `merged/`. Also moved, active records with no queue entry: `color_directory_uri_inputs` (#200, 2026-10-25), `gxformat2_sync_265_278` (#199, 2026-10-24), `lint_input_defaults` (#196, 2026-10-23), `lint_untyped_params` (#195, 2026-10-22).
- Closed: none. Moved: none. #207 stays `ready` (green, mergeable, no reviews); `pr: 207` added to its record. Untracked open PRs: none.
- Unmerged, no PR: `issue_212_udt_expression_paths`, `issue_210_datatypes_snapshot`, `issue_210_test_kind_checks` stay in `branches_ready_for_final_review` awaiting John; no CI until a PR opens. The 210 stack is 2 commits behind `main`.
- Worktrees removed: `issue_201_cli_version`, `issue_204_unknown_map_over` (clean, pushed).
- Worktrees kept: `issue_202_fill_defaults`, `issue_210_datatypes_snapshot`, `issue_210_test_kind_checks`. `poster_docs` (4 dirty) has no record and wasn't evaluated.
- Mismatch: `issue_212_udt_expression_paths`'s record names a worktree that isn't on disk; the branch is pushed and `ghwt create` can recreate it.
