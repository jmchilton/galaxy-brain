# better_custom_build_error_handling_25.1

- [PR #24310](https://github.com/galaxyproject/galaxy/pull/24310)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/better_custom_build_error_handling_25.1)

## Status

`ready` — one commit (`bd26faf57f3`) on `release_25.1` (`814bfd75c6c`). Worktree: `~/projects/worktrees/galaxy/branch/better_custom_build_error_handling_25.1`.

John opened [#24310](https://github.com/galaxyproject/galaxy/pull/24310) directly (not draft) at `bd26faf57f3` on 2026-10-20, skipping polish; title `[25.1] Better API Handling for Custom Builds`, his own short body, labels `kind/bug`, `area/API`. MERGEABLE.

PR CI in progress at registration (26 pass, 2 skipped, 31 pending, no failures).

[Implementation](implementation_debrief.md) · [PR description](pr_description.md)

## Decisions

- Base `release_25.1` per John; fast branch per John (no codex/thermo/full harden).
- PR-first, no GitHub issue, per John.

## Dependencies

- Merge-forward conflict expected with `custom_build_no_converter_400_26.0` in `users.py` (adjacent hunks in the FASTA branch of `add_custom_builds`). Resolution: keep this branch's `get_accessible` line, then 26.0's `NoConverterException` handling.
