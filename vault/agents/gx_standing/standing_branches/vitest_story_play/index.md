---
pr: 24300
upstream_base_branch: dev
record: galaxy/branches/vitest_story_play
---
# Storybook for client test review

- [PR #24300](https://github.com/galaxyproject/galaxy/pull/24300) · [branch record](../../../../repositories/galaxy/branches/active/vitest_story_play/index.md)

Move client test setup into Storybook stories and user-visible assertions into browser play functions, with accessibility checks.

## Children

- [`vitest_story_foundation`](../../../../repositories/galaxy/branches/active/vitest_story_foundation/index.md) — `wip` · `extracted` — README guidance, six readability examples, Storybook/play/a11y infra, GDropdownItem and HistoryExportWizard stories, blocking browser CI.
- [`vitest_readability`](../../../../repositories/galaxy/branches/active/vitest_readability/index.md) — [#24038](https://github.com/galaxyproject/galaxy/pull/24038) · `draft` · `stacked` — Client test readability rewrite.
- [`vitest_stories`](../../../../repositories/galaxy/branches/active/vitest_stories/index.md) — `wip` · `stacked` — Storybook Vitest addon and browser-mode infrastructure.
- [`fix_story_a11y`](../../../../repositories/galaxy/branches/merged/fix_story_a11y/index.md) — [#24046](https://github.com/galaxyproject/galaxy/pull/24046) · `merged` · `extracted` — Accessibility repairs found by the story audit.
- [`fix_story_a11y_followups`](../../../../repositories/galaxy/branches/merged/fix_story_a11y_followups/index.md) — [#24285](https://github.com/galaxyproject/galaxy/pull/24285) · `merged` · `extracted` — Follow-up accessibility repairs.
- [`vitest_real_api_calls`](../../../../repositories/galaxy/branches/active/vitest_real_api_calls/index.md) — `wip` · `related` — Recorded real API responses for client tests; stacked on `vitest_readability`.

## Decisions

- Title `[RFC][WIP] Adopt Storybook for richer, easier review of client unit tests` chosen by John 2026-10-20; keep draft.
- Extract small domain batches (roughly 5–10 tests) when John requests.
