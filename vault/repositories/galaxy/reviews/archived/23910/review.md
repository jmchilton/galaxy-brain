# galaxy #23910 - Fix storage run dataset popover overflowing the viewport

- PR: https://github.com/galaxyproject/galaxy/pull/23910 (itisAliRH, base `dev`)
- Head reviewed: `44a42b8b6603efcf24d2f69001afa031b79e9b13` (merge-base with `origin/dev`: `931bdcff826`)
- Worktree: `~/projects/worktrees/galaxy/pr/23910`
- Size: +52/-1, 2 files. The fix is one selector in `DatasetPopoverLink.vue` (`:deep(.dataset-details-popover)` ->
  `.dataset-details-popover`) plus a comment. The other 50 lines are a new vitest file
  (`DatasetPopoverLink.width.test.ts`).

## Verdict

Approve. It's a one-line CSS fix that reuses the existing abstraction (`GPopover`) and doesn't reinvent anything.
The test fails on `dev` and passes on head. Nothing blocking.

## Findings (ranked)

1. **This fixes a dead rule. It doesn't add any new positioning logic.** The key question was whether 52 lines
   reinvent popover positioning. They don't. `DatasetPopoverLink` already uses `GPopover` (galaxy-ui,
   `client/packages/ui/src/components/GPopover.vue`), which runs floating-ui with `flip()` + `shift({padding: 5})`.
   The 420px cap was already in the file, but it never matched anything. `GPopover` moves its root element under
   `document.body` (or the nearest `<dialog>`) with `appendChild` (GPopover.vue:604-606), so a `[data-v-x] .dataset-details-popover`
   descendant selector has no scoped ancestor to match. The slot content was compiled in the parent's template, so
   it keeps the parent's scope attribute, and the plain scoped selector matches it directly. The `:deep()` came from
   the original BPopover implementation (`49993f6daeb`) and survived the GPopover migration (`549df45b6f7`).
2. **The sibling convention already matches the fix.** `StorageOperationOutcomeProgress.vue` (same feature) styles its
   popover content with a plain scoped `.storage-operation-progress-popover { min-width: 220px; }`, which is the
   form this PR switches to. I checked all 18 `GPopover` call sites, and none of the others puts `:deep()` on popover
   content, so nothing else has the same dead-selector bug. The other existing way to size a popover is `custom-class` plus an unscoped
   global `<style>` (`WorkflowAttributes.vue` `.best-practice-popover { max-width: 250px !important }`). Capping
   the slot content with a scoped selector is cleaner than that.
3. **Why flip/shift alone didn't save it (possible follow-up, not for this PR).** With `placement="right"`, `flip()`
   moves the popover to the left, but `shift()` only nudges it along the cross axis (vertical), so a box that's too
   wide still runs off the left edge. The global `.popover { max-width: 70% }` (`style/scss/ui.scss:213`) lets
   wide content get that big. The generic fix is floating-ui's `size()` middleware in `GPopover` (cap `maxWidth` to
   `availableWidth`). Nothing in galaxy-ui uses `size()` today. That would protect every popover, but it's a
   galaxy-ui change that affects every call site. This PR's local cap is the proportionate fix, and the
   content does want a readable width anyway.
4. **Test: real red-to-green, but it brings in a one-off style-compilation helper.** Vitest doesn't process SFC
   CSS (`vitest.config.mts` has no `test.css`), so the test re-compiles the component's `<style>` blocks with
   `@vue/compiler-sfc` `compileStyle` and injects them. Nothing else in the client does this. That's fine for one
   test. If a second test like it shows up, the helper belongs in a shared test util. The assertions check the
   actual regression: the content isn't inside `wrapper.element`, and its computed `max-width` is `420px`. It
   isn't trivial or weakened. Not worth raising.

Nit-level, skip: the `.width.test.ts` suffix is unusual, but it has precedent (`historyStore.lists.test.ts`,
`GalaxyAI.newchat.test.ts`). There's no other `DatasetPopoverLink` test it would collide with.

## Tests run

- `pnpm exec vitest run src/components/Common/DatasetPopoverLink.width.test.ts` (node 22.20.0) -> 1 passed on head.
- Red check: the same test with `DatasetPopoverLink.vue` restored from `origin/dev` -> fails with
  `expected '' to be '420px'`. Restored afterwards, and the worktree is clean.

## Risks

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door).

## Draft review comment

> *Drafted by Claude (AI assistant) on behalf of jmchilton.*
>
> Looks good. I confirmed `GPopover` moves its root under `document.body` with `appendChild`, so the old
> `:deep()` descendant selector had no scoped ancestor and never matched. Slot content keeps the parent's scope id,
> so the plain scoped selector is right. It also matches how `StorageOperationOutcomeProgress` already styles its
> popover content. None of the other `GPopover` call sites use `:deep()` on popover content, so this was the only
> place with the dead rule. The new test fails against `dev` and passes here.
>
> Not for this PR: `flip()` moves the popover to the left but `shift()` can't make it narrower, so any wide popover
> near an edge can still overflow. A `size()` middleware in galaxy-ui's `GPopover` would fix that for every popover,
> if it comes up again. Approving.
