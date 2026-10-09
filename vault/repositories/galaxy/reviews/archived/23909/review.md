# galaxy #23909 - [26.1] Show history and workflow card owner actions once the current user loads

- PR: https://github.com/galaxyproject/galaxy/pull/23909 (itisAliRH, open, base `release_26.1`)
- Head reviewed: `2b4052c8680d93d156c95f03eb5ae9ae75ec830f`
- Merge-base with `origin/release_26.1`: `ec664235280`
- Follows up: deferred item from #23830 (Histories list caret menu shows intermittently)
- Already approved by mvdbeek
- Worktree: `~/projects/worktrees/galaxy/pr/23909`
- Size: +189/-31, two composables + two new vitest files

## Verdict

Approve. Small, correct release fix. Matches how the sibling `useToolsListCardActions` and the
existing `historyCardPrimaryActions` already work, and both new tests fail on the base and pass on
head.

## What changed

- `useHistoryCardActions`: `historyCardExtraActions` (Delete / Delete Permanently) and
  `historyCardSecondaryActions` (Share & Manage Access) go from plain arrays built once at setup to
  `computed`. Ownership comes from `isMyHistory()` -> `currentUserOwnsHistory()` ->
  `userStore.matchesCurrentUsername()`, which is reactive only when read inside a computed/render. When
  cards mount before `/api/users/current` returns, the old arrays stayed hidden for the card's lifetime.
- `useWorkflowCardActions`: all three lists plus the shared run and common pieces become `computed`.
  The old post-hoc `unshift`/`push` placement by `editorView` becomes conditional spreads inside each
  computed. `editorView` and `current` are plain booleans fixed at setup, so branching on them in the
  computeds is fine.

## Findings (ranked)

1. **Reactivity is correct, and it's the established pattern here.** Consumers (`HistoryCard.vue`,
   `WorkflowCard.vue`) bind the returned refs as top-level `<script setup>` bindings, so templates
   auto-unwrap and `GCard`'s `CardAction[]` props get arrays. `useToolsListCardActions` already returns
   `computed((): CardAction[] => [...])`, and `historyCardPrimaryActions` was already computed. The PR
   makes the history/workflow siblings consistent instead of adding a new mechanism. No new abstraction
   needed. The fix also makes the lists react to changes in `history`/`workflow` (deleted/purged), which
   they didn't before. That's a side win and isn't covered by these tests.
2. **Ordering kept.** I traced the old `unshift`/`push` sequence for both views. List view: common
   actions first in secondary, run last in primary. Editor view: run, then common, then the rest in
   extra. The new spreads give the same result, and the `places common and run actions by view` test
   pins it. That test also passes on base, so it guards the refactor against regressions (it doesn't
   test the bug), which is the right job for it.
3. **Tests are meaningful and not weakened.** Red check: with the head tests run against the base
   composables, both `shows owner actions once the current user loads after setup` tests fail
   (`expected false to be true`). Green on head. Each test sets the user *after* setup, which is exactly
   the race. They're composable-level tests with only `useConfirmDialog` mocked and a real pinia user
   store, the right level for this. One small thing: the order test is a full-list snapshot including
   the duplicated `workflow-view-external-link` id, so adding any action means updating it. That's
   acceptable for a characterization test.
4. **Same bug, unfixed sibling: `PageCard.vue` (follow-up, not blocking).** Its `secondaryActions` is a
   plain array with `visible: ... && userStore.matchesCurrentUsername(props.page.username)`, built once
   at setup. Same race on a direct load of the pages/notebooks list, so "Share and Publish" can stay
   hidden. `primaryActions` there is also static on `props.page.deleted`. That's out of scope for this
   PR but worth mentioning so the pattern gets fixed everywhere it appears.
5. **Pre-existing, ignore:** two extra actions share the id `workflow-view-external-link` (url vs trs).
   Only one can be visible at a time, so the `:key` collision never shows up. Not this PR's concern.

No import or typing concerns. The return type in `useHistoryCardActions` was updated to
`ComputedRef<CardAction[]>`. `useWorkflowCardActions` infers its return type, as before.

## Risks

Risks are minimal. This change doesn't lock Galaxy into choices that are hard to change (a two-way
door). It's a client-only reactivity fix with no API or UI-semantics change, and it's easy to revert.

## Tests run

- `npm_config_use_node_version=22.20.0 pnpm exec vitest run` on the two new test files plus
  `src/components/Workflow/List` and `src/components/History/HistoryCard*`: 4 files, 8 tests, all pass on head.
- Red check: head tests against the `ec664235280` composables -> both "loads after setup" tests fail,
  and the ordering test passes (as expected for a characterization test).
- No Selenium/Playwright run.

## Draft review comment

> *Drafted by Claude (AI assistant) on behalf of jmchilton. Not written by them personally.*
>
> Looks good. Moving these lists to `computed` makes them match `historyCardPrimaryActions` and
> `useToolsListCardActions`. I checked that the conditional spreads produce the same order as the old
> `unshift`/`push` placement in both views. Both new "user loads after setup" tests fail against the
> release_26.1 composables and pass here.
>
> Not for this PR: `PageEditor/PageCard.vue` has the same pattern. Its `secondaryActions` is a plain
> array whose Share visibility calls `userStore.matchesCurrentUsername(...)` at setup, so it can probably
> hit the same race on a direct load of the notebooks list. Might be worth a quick follow-up.
