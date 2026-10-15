# issue_24093_batch_element_labels_26.1

Status: implementing. Base: `release_26.1`. Fork: `jmchilton/issue_24093_batch_element_labels_26.1`. Worktree: `~/projects/worktrees/galaxy/branch/issue_24093_batch_element_labels_26.1`.

Fixes [#24093](https://github.com/galaxyproject/galaxy/issues/24093): hidden collection elements dropped into a batch ("Multiple datasets") input get inconsistent labels.

[Initial implementation](initial_implementation_debrief.md) · [Normal review](subagents/normal_review.md)

## Decisions

- User chose the server-side fix (label every batch value in tool form build), not a client relabel.
- User asked for a Selenium-suite test rather than an API test. It is `@playwright_only` because Selenium's drag helper never sends `dragenter`.
- User asked for the branch off latest `release_26.1`.
