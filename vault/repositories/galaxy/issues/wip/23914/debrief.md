# Debrief: page_card_share_hidden_until_user_loads

Source: finding #4 of the #23909 review (`gx_reviews/galaxy_23909_show_history_and_workflow_card_owner_actions_once_the_current_user_loads.md`). #23909 merged into `release_26.1` on 2026-10-05.

## Research

- `PageCard.vue` builds `primaryActions`/`secondaryActions` as plain arrays at setup. Share's `visible` reads `matchesCurrentUsername` once. `badges` is `computed`. The file is identical on `release_26.1` and `dev`.
- A throwaway vitest in the 23909 worktree, since deleted: when the user is set after mount, the "Owned by" badge clears but Share stays hidden (fails). The control, with the user set before mount, passes. The worktree was left clean.
- The review note said "notebooks list". In fact the only consumer is `HistoryPageList`, which is used by `/histories/:id/pages` and the Reports tab of a workflow invocation. `/pages/list` is a grid and is not affected.
- No duplicates found on GitHub.

## Subagent review (one round)

- Confirmed the code claims and the scope.
- Pushback, which I accepted: the race is probably rare in a browser. `HistoryPageView` mounts the cards only after its pages request returns, and `App.vue` starts `loadUser()` earlier. I spot-checked both. This is the same situation as the workflow cards in #23909, which were fixed with a unit test only. The draft's "9 of 15" line implied a similar rate, so it was replaced with that explanation.
- Rewrote Alternative Approaches into the required nested `<details>` format. Shortened the opener and noted where `PageCard` is used.

## Leftover

- Not reproduced in a browser. Throttling `/api/users/current` on a direct load of `/histories/:id/pages` would show it.
- The repro is a Vue 2 / `localVue` test. `dev` is mid Vue 3 migration, so a dev PR would need to adapt the test.
