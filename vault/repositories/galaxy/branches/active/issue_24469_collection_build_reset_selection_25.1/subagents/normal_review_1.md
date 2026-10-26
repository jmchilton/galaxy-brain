# Normal review 1

Verdict approve, no bugs. Acted on: dropped redundant `reset-selection` emit — `setShowSelection(false)` already resets via `watch(showSelection)` in `selectedItems.ts` (~L432); now matches `runOnSelection`'s single emit. Jest 31/31, Selenium re-run green.

Not acted on:
- Cancelled wizard loses selection: accepted tradeoff (reset on success needs cross-route plumbing); note in PR body.
- No test that cancelling the creator modal keeps selection: modal cancel path untouched by this branch.
- `.content-item .selector` breadth: matches `ContentItem.vue` `class="selector"` button on 25.1; Selenium verified red→green.

<details><summary>Review</summary>

Correctness: emit order irrelevant; `listWizard` copies selection via `Array.from` before reset; `hasSelection` watcher only acts on true; modal unmount on reset only after create with `hide-on-create`; multiview gated by `!isMultiViewItem`. Restoring `createdCollection` fixes a real dangling handler.

Nits: unify with `runOnSelection` idiom; PR-body note for cancel tradeoff; cancel-keeps-selection test gap; selector breadth.
</details>
