# issue_24221_paged_map_over_options_26.1

- [#24228](https://github.com/galaxyproject/galaxy/pull/24228)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/issue_24221_paged_map_over_options_26.1)

## Status

Polished; PR out of draft, `ready`. Base `release_26.1` (`d808b6425b8`), head `2ab8f4493c8`. Worktree: `~/projects/worktrees/galaxy/branch/issue_24221_paged_map_over_options_26.1`.

mvdbeek's second review (2026-10-21) addressed 2026-10-22: rebased, suffix/hint unit unified, description fixed; reply drafted, not posted ([review response](review_response.md)).

Draft [#24228](https://github.com/galaxyproject/galaxy/pull/24228) opened 2026-10-17 at John's request; title "[26.1] Fix paged collection options dropping a collection's map-over entry". Screenshots hosted on `pr-assets-issue_24221_paged_map_over_options_26.1`.

PR CI running on `2ab8f4493c8`.

Fixes [#24221](https://github.com/galaxyproject/galaxy/issues/24221): paged collection options drop a collection's "map over" entry. On 26.1 that entry also couldn't be selected on its own.

[PR description](pr_description.md) · [PR titles](pr_titles.md) · [PR tags](pr_tags.md) · [Polish debrief](polish_debrief.md)

[Implementation](implementation_debrief.md) · [Initial implementation](initial_implementation_debrief.md) · [Re-scope](implementation_rescope_debrief.md) · [Scope evaluation](scope_evaluation.md) · [Test challenges](test_challenges_debrief.md) · [Codex review](codex_review.md) · [Thermo-nuclear review](thermo_nuclear_review.md) · [Baseline refactor](baseline_refactor.md) · [Screenshots](screenshot_debrief.md) · [Alt: original scope](alts/original_scope.md)

## Decisions

- Base `release_26.1`: regression from #22643 (26.1); 26.0 and older don't page options.
- Backport of the #24221 commits on [issue_20657_input_processing_mode](../issue_20657_input_processing_mode/index.md). Server commit cherry-picked; client hand-ported (26.1 forms are Options API).
- Re-scoped so the map-over row can be selected, using the selection-identity parts of dev `05907884de9`/`9eff87c8e21`. Original scope kept as alt `issue_24221_paged_map_over_options_26.1_alt_original_scope`. Left out: dev's badge/hint, the #24220 drop picker, and the merge refactors.
- If this lands before `issue_20657_input_processing_mode` rebases, drop the matching commits there.

## TICK — 2026-10-20

PR CI on `84e4857d07a`: one red, Mulled Unit Tests `test_find_anaconda_download_url`, HTTP 503 from api.anaconda.org. Infra, unrelated. Failed job rerun ([run 39353865217](https://github.com/galaxyproject/galaxy/actions/runs/39353865217)); stays `ready`.
