# issue_24328_data_table_mismatch_26.1

- [PR #24349](https://github.com/galaxyproject/galaxy/pull/24349)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/issue_24328_data_table_mismatch_26.1)

## Status

Polished; opened as draft on John's request (`ci_wait`), title from `pr_titles.md` option 1. Base: `release_26.1` (`6ff6692662d`). Head: `7811fe4b0ca`. Alts: `issue_24328_data_table_mismatch_26.1_alt_original_scope`, `issue_24328_data_table_mismatch_26.1_alt_skip_at_startup`. Fork: `jmchilton/issue_24328_data_table_mismatch_26.1`. Worktree: `~/projects/worktrees/galaxy/branch/issue_24328_data_table_mismatch_26.1`.

Draft [#24349](https://github.com/galaxyproject/galaxy/pull/24349) at `7811fe4b0ca`, labels `kind/bug`, `area/admin`, `area/tool-framework`.

CI on `7811fe4b0ca` running; no failures so far.

Fixes [#24328](https://github.com/galaxyproject/galaxy/issues/24328): installing IUC `data_manager_fetch_index_maf` leaves Galaxy unable to start (`indexed_maf_files` column mismatch with core).

[PR description](pr_description.md) · [PR titles](pr_titles.md) · [PR tags](pr_tags.md) · [Polish debrief](polish_debrief.md) · [Implementation](implementation_debrief.md) · [Initial implementation](initial_implementation_debrief.md) · [Re-scope](implementation_rescope_debrief.md) · [Normal review](subagents/normal_review.md) · [Re-scope review](subagents/rescope_review.md) · [Test challenges](test_challenges_debrief.md) · [Codex review](codex_review.md) · [Thermo-nuclear review](thermo_nuclear_review.md) · [Baseline refactor](baseline_refactor.md) · [Scope evaluation](scope_evaluation.md) · [Halt-at-startup review](subagents/halt_at_startup_review.md) · Alts: [original scope](alts/original_scope.md), [skip at startup](alts/skip_at_startup.md) · Earlier drafts: [1/](earlier_drafts/1/), [2/](earlier_drafts/2/)

## Decisions

- Base `release_26.1` (John): the install-time `DataTableColumnMismatch` guard lands in 26.1; 26.0 has the same startup crash but different install code.
- Startup halts with an actionable `ConfigurationError` rather than skipping the conflicting shed table (John); skip version kept as alt.
- Galaxy pieces only: startup error, stop `reset_tool_data_tables` wiping the live registry, typed merge error. The core vs IUC `indexed_maf_files` name collision is tools-iuc's to resolve; not filed.
- Re-scope took round 1 items (2)+(3); declined (1) moving `reset_tool_data_tables` on a release branch.
