# issue_24093_batch_element_labels_26.1

Status: implemented, CI pending. Base: `release_26.1` (`d405ebc1f4c`). Head: `a7186f5d63f`. Fork: `jmchilton/issue_24093_batch_element_labels_26.1`. Worktree: `~/projects/worktrees/galaxy/branch/issue_24093_batch_element_labels_26.1`.

Fixes [#24093](https://github.com/galaxyproject/galaxy/issues/24093): hidden collection elements dropped into a batch ("Multiple datasets") input get inconsistent labels. The `/build` endpoint now labels every batch value, not just the first.

[Implementation](implementation_debrief.md) · [Initial implementation](initial_implementation_debrief.md) · [Normal review](subagents/normal_review.md) · [Test challenges](test_challenges_debrief.md) · [E2E polish](polish_e2e_tests_debrief.md) · [Codex review](codex_review.md) · [Thermo-nuclear review](thermo_nuclear_review.md) · [Scope evaluation](scope_evaluation.md) · [Screenshots](screenshot_debrief.md)

## Decisions

- User chose the server-side fix, which labels every batch value in tool form build, over relabelling on the client.
- User asked for a Selenium-suite test rather than an API test. It is `@playwright_only` because Selenium's drag helper never sends `dragenter`.
- User asked for the branch off latest `release_26.1`.
