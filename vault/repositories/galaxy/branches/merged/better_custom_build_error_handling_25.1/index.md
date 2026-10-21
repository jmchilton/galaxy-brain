# better_custom_build_error_handling_25.1

- [PR #24310](https://github.com/galaxyproject/galaxy/pull/24310)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/better_custom_build_error_handling_25.1)

## Status

Merged into `release_25.1` 2026-10-21 ([#24310](https://github.com/galaxyproject/galaxy/pull/24310)).

[Implementation](implementation_debrief.md) · [PR description](pr_description.md)

## Decisions

- Base `release_25.1` per John; fast branch per John (no codex/thermo/full harden).
- PR-first, no GitHub issue, per John.

## Dependencies

- Merge-forward conflict expected with `custom_build_no_converter_400_26.0` in `users.py` (adjacent hunks in the FASTA branch of `add_custom_builds`). Resolution: keep this branch's `get_accessible` line, then 26.0's `NoConverterException` handling.
