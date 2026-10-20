# issue_24093_batch_element_labels_26.1

Status: `ready` — PR [#24211](https://github.com/galaxyproject/galaxy/pull/24211), open, title "[26.1] Label every value of a batch data input in the tool form". mvdbeek's review is addressed, and replies were posted 2026-10-20 ([review response](review_response.md)); waiting on re-review. Base: `release_26.1` (`b2b1e1deeee`). Head: `3f058729bad`. CI on the new head is pending. Fork: `jmchilton/issue_24093_batch_element_labels_26.1`. Worktree: `~/projects/worktrees/galaxy/branch/issue_24093_batch_element_labels_26.1`.

Fixes [#24093](https://github.com/galaxyproject/galaxy/issues/24093): hidden collection elements dropped into a batch ("Multiple datasets") input get inconsistent labels. The `/build` endpoint now labels every batch value, not just the first.

[PR description](pr_description.md) · [Titles](pr_titles.md) · [Tags](pr_tags.md) · [Polish](polish_debrief.md) · [Implementation](implementation_debrief.md) · [Initial implementation](initial_implementation_debrief.md) · [Normal review](subagents/normal_review.md) · [Test challenges](test_challenges_debrief.md) · [E2E polish](polish_e2e_tests_debrief.md) · [Codex review](codex_review.md) · [Thermo-nuclear review](thermo_nuclear_review.md) · [Scope evaluation](scope_evaluation.md) · [Screenshots](screenshot_debrief.md)

## Decisions

- User chose the server-side fix, which labels every batch value in tool form build, over relabelling on the client.
- User asked for a Selenium-suite test rather than an API test. It is `@playwright_only` because Selenium's drag helper never sends `dragenter`.
- User asked for the branch off latest `release_26.1`.

## CI diagnosis — 2026-10-19

- Unit tests (3.14): `make` failed fetching CWL conformance tests (`502: Bad Gateway`, missing `conformance_tests.yaml`). Infra. Failed job rerun.

## TICK — 2026-10-20

John undrafted #24211. CI green (64 pass, 2 skipped), MERGEABLE/CLEAN. Moved to `ready`.
