# issue_24221_paged_map_over_options_26.1

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.1...jmchilton:galaxy:issue_24221_paged_map_over_options_26.1?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/issue_24221_paged_map_over_options_26.1)

## Status

Implemented, re-scoped and re-hardened; `branches_implemented_needs_ci`. Base `release_26.1` (`dbe4f2f7e41`), head `79dccaf6f84`. Worktree: `~/projects/worktrees/galaxy/branch/issue_24221_paged_map_over_options_26.1`.

No PR.

Fork CI pending.

Fixes [#24221](https://github.com/galaxyproject/galaxy/issues/24221): paged collection options drop a collection's "map over" entry. On 26.1 that entry also couldn't be selected on its own.

[Implementation](implementation_debrief.md) · [Initial implementation](initial_implementation_debrief.md) · [Re-scope](implementation_rescope_debrief.md) · [Scope evaluation](scope_evaluation.md) · [Test challenges](test_challenges_debrief.md) · [Codex review](codex_review.md) · [Thermo-nuclear review](thermo_nuclear_review.md) · [Baseline refactor](baseline_refactor.md) · [Screenshots](screenshot_debrief.md) · [Alt: original scope](alts/original_scope.md)

## Decisions

- Base `release_26.1`: regression from #22643 (26.1); 26.0 and older don't page options.
- Backport of the #24221 commits on [issue_20657_input_processing_mode](../issue_20657_input_processing_mode/index.md). Server commit cherry-picked; client hand-ported (26.1 forms are Options API).
- Re-scoped so the map-over row can be selected, using the selection-identity parts of dev `05907884de9`/`9eff87c8e21`. Original scope kept as alt `issue_24221_paged_map_over_options_26.1_alt_original_scope`. Left out: dev's badge/hint, the #24220 drop picker, and the merge refactors.
- If this lands before `issue_20657_input_processing_mode` rebases, drop the matching commits there.
