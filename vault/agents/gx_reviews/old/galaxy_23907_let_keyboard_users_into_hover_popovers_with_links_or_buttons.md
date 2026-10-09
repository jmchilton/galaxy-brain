# galaxy #23907 - Let keyboard users into hover popovers with links or buttons

- PR: https://github.com/galaxyproject/galaxy/pull/23907 (itisAliRH, base `dev`, branch `g-popover-interactive`)
- Head reviewed: `239f4385c1828cabb457d1d05b9f93fde4b5dcae` (merge-base with `origin/dev`: `931bdcff826`)
- Part of #23732, follows #23731 (hover popovers open on focus, click popovers are non-modal dialogs)
- Worktree: `~/projects/worktrees/galaxy/pr/23907`
- Size: +884/-27, 18 files, 9 commits. About 145 lines in `GPopover.vue`, a new 55-line `packages/ui/src/utils/focusOrder.ts`,
  7 call sites touched. About 580 of the added lines are tests.

## Verdict

Approve, with optional follow-ups. The design is the right one for this codebase. It extends the existing `GPopover`
(the same floating-ui positioning, escape stack and dialog naming #23731 added) with an `interactive` prop, so it does
not create a parallel popover. It also pulls the tabbable query into a shared `focusOrder` util, and the old
click-dialog path now uses it as well. The keyboard model follows the APG non-modal-dialog/disclosure pattern and is
consistent with the click popovers. Tests are mostly real behavior tests, and 21 of them fail against the pre-fix
sources. Nothing blocking. The points below are about how the abstraction is shaped and about a few small things at
the call sites.

## What it does

- `GPopover` `interactive` prop (hover/focus triggers only). While the popover is open, Tab from the trigger focuses
  the first control inside. Shift+Tab from the first control goes back to the trigger. Tab past the last control goes
  to the next tabbable after the trigger (scoped to an enclosing `<dialog>`) and closes the popover. Escape closes it
  and returns focus to the trigger. Enter/Space on a non-link trigger toggles it. Two clipped `span` focus guards inside
  the popover catch focus at either edge. They only get `tabindex=0` once focus came in from the trigger
  (`guardsActive`).
- Interactive popovers are `role="dialog"` (no `aria-modal`), with `aria-haspopup="dialog"`, `aria-expanded` and
  `aria-controls` on the trigger and no `aria-describedby`. Others stay `role="tooltip"`.
- `focusOrder.ts`: `tabbableElements(root)` and `nextTabbableAfter(anchor, root, skip)`. These replace GPopover's
  private `TABBABLE_SELECTOR`, so click popovers now skip hidden/disabled/inert controls too.
- Call sites: workflow editor node recommendations, `DatasetPopoverLink`, the history storage helper, and
  `ToolLinkPopover` (new pass-through `interactive` prop, on in Markdown `JobMetrics`, `JobParameters` and
  `WorkflowDisplay`, off in `WorkflowInvocationStepHeader`). The Markdown elements get a `GLink type="button"` trigger
  named "Tool details" in place of a bare icon. `WorkflowDisplay` ids now come from `useUid`.

## Findings (ranked)

1. **Reuse is good: this extends the abstraction and doesn't fork it.** I looked for existing focus-management code
   to compare against. The client has no `tabbable`/`focus-trap` dependency. `selectedItems.findFirstFocusable` works
   on component refs and is unrelated. `GDropdown` uses its own arrow-key menu pattern, which is a different APG
   pattern and is correct to keep separate. `GModal` uses native `<dialog>`. So `focusOrder.ts` is the first shared
   tabbable helper, and putting it in `packages/ui/src/utils` next to `escapeStack`/`hoverBridge` is the right place.
   Moving the click-dialog path onto it is a good sign that it's a real abstraction and not just accretion. The cost
   is that `GPopover.vue` is now 817 lines, and the new focus-order state (`guardsActive`, the guard refs, four
   handlers, edits inside the hover `focusin`/`focusout` listeners) is woven into `setupListeners`. Optional follow-up:
   extract a `usePopoverFocusOrder(target, popoverEl, showState)` composable next to `floatingPosition.ts` /
   `accessibleHover.ts`, so the hover-dialog behavior could be tested and read on its own. Not a blocker for this PR.

2. **`ToolLinkPopover`'s `interactive` prop mixes two questions.** Its content is always a `ToolLink`, so its content
   is always interactive. Each call site actually answers "is my trigger focusable?". `GPopover` can answer that
   itself: `resolveTarget()` plus `tabbableElements`/`isTabbable` from the new util. If `GPopover` fell back to tooltip
   semantics when the resolved target isn't tabbable (or warned in dev), `interactive` would only describe the
   content. The pass-through prop on `ToolLinkPopover` could then go, and the `WorkflowInvocationStepHeader` case (a
   bare span trigger, where `aria-expanded` would be an axe `aria-allowed-attr` violation) would be handled by
   construction and not by remembering to leave the prop off. The prop docstring already says "Needs a focusable
   trigger", which is a rule a component could enforce. Worth raising, but the opt-in is defensible.

3. **Enter/Space toggling via `event.detail === 0` fits today's call sites but is a trap for future ones.**
   `onTriggerClick` toggles on any click with no pointer detail, and that includes a programmatic `el.click()`. None of
   the current triggers has its own click handler. I checked the node recommendations `GButton` (no `@click`), the
   Markdown `GLink type="button"` (none), and the storage helper `GButton :to` (a link, so skipped). Compare the very
   next candidate, `ToolTargetPreferredObjectStorePopover`. Its trigger, `#tool-storage` in `ToolCard.vue`, is a
   button with `@click="onShowObjectStoreSelect"`. Marking that popover `interactive` would make Enter both open the
   object store modal and toggle the popover. A line in the `interactive` prop doc ("the trigger's own click action
   still runs; use on triggers whose only job is the popover") would head this off.

4. **The workflow editor recommendations race their own fetch.** `Recommendations` is `v-if="popoverShow"` and calls
   `getToolPredictions` on every open, with no cache. If a keyboard user tabs to the arrow button and presses Tab
   before the request returns, `onTriggerKeydown` finds nothing to focus and lets Tab go through. Focus then leaves
   and the popover closes. When they come back, it re-fetches. The test "leaves Tab alone when the popover has nothing
   to focus" makes this behavior official. That's reasonable as a general rule, but at this call site the realistic
   outcome is "Tab skips the list unless you pause". Ask whether that's acceptable, or whether the loading span should
   be focusable (e.g. `tabindex=-1` + focus) while loading, so Tab lands inside and the guards take over.

5. **`WorkflowDisplay` duplicates the step-icon mapping.** Tool steps now render `<FontAwesomeIcon :icon="faWrench" />`
   inline, and every other step type still goes through `WorkflowStepIcon`, whose `STEP_ICONS.tool` is `faWrench`.
   Wrapping `<WorkflowStepIcon step-type="tool" />` in the `GLink` would keep a single source for step icons. (It
   carries `mr-1`, so the `GLink`'s `class="mr-1"` would go.)

6. **Some new accessible names aren't localized.** `aria-label="Tool details"` (in `JobMetrics`, `JobParameters` and
   `WorkflowDisplay`) and `ToolLinkPopover`'s `aria-label="Tool"` are literals. The same PR localizes the storage
   helper and dataset names. Separately, "Tool" is a weak dialog name on a report with many tool steps, since every
   one is announced the same way. The tool id or name, when available, would help.

7. **Tests: the core tests are solid, the call-site tests are thin, and the real-browser part isn't tested.** The 15
   new `GPopover` tests check behavior: Tab in, Shift+Tab out, guard activation only on entry from the trigger, Escape,
   Enter toggle and reopen, a link trigger keeping Enter, skipping hidden/disabled controls, `<dialog>` scoping, and
   non-interactive popovers staying tooltips. `focusOrder.test.ts` covers the util directly. Most call-site tests
   (`Node`, `DatasetPopoverLink` #1, `HistoryStorageOperationsIndicator`, `ToolLinkPopover`) only assert
   `props("interactive") === true`, which is close to restating the template. `JobElements` and `WorkflowDisplay`
   tests are worth more: they check that the popover target *is* the new named button, and that the ids are unique
   per instance. The weak spot is that happy-dom has no sequential focus navigation. The guard tests call
   `guards()[1].focus()` by hand to stand in for the browser's Tab, so the main claim ("Tab past the last control
   lands on the end guard") is assumed and not exercised. The PR lists "a keyboard Selenium check" as out of scope. A
   single Playwright test using real `keyboard.press("Tab")` on the editor recommendations or an invocation report
   would cover the guard ordering, and could replace several of the prop-wiring unit tests.

8. **Coverage of call sites.** The PR's own exclusions (step header, `CellStatusComponent`,
   `StorageOperationOutcomeProgress`) are reasonable and explained. Of the remaining hover `GPopover`s, `ToolCard`
   credentials, `ToolsListCard`, `WorkflowExtractionMessages` and `FormDataExtensions` hold plain text. Three render
   `ConfigurationMarkdown` (admin-authored markdown, which can contain links): `ToolTargetPreferredObjectStorePopover`,
   `WorkflowTargetPreferredObjectStorePopover` and `TemplateSummaryPopover`. Whether they need this depends on the
   content. The template one hangs off a bare span. Worth a line in #23732, not this PR.

Nits, skip: `isFocusGuard` filtering in `onTriggerKeydown` is redundant while `guardsActive` is false (guards are
`tabindex=-1` then), but it's harmless. Keyboard focus already opens the hover popover, so the first Enter on a
freshly focused button *closes* it. That is consistent with `aria-expanded` disclosure semantics, but it is one
small thing users learn.

## Tests run

- Node 22.20.0, `CI=true pnpm install`, then `pnpm exec vitest run` on `GPopover.test.ts`, `focusOrder.test.ts`,
  `DatasetPopoverLink.test.ts`, `HistoryStorageOperationsIndicator.test.ts`, `JobElements.test.ts`,
  `WorkflowDisplay.test.js`, `ToolLinkPopover.test.ts`, `Node.test.ts`, `WorkflowInvocationStepHeader.test.ts` -> 9
  files, 123 passed on head.
- Red check: reverted the 8 non-test sources (keeping `focusOrder.ts`) to `931bdcff`. 21 failed / 94 passed across 7
  files. `WorkflowInvocationStepHeader.test.ts` passes at base by design (it guards the case that must not change).
  Restored the sources afterwards, and the worktree is clean.
- CI at head: everything green except Selenium `test_history_options.py::test_options`, a
  `StaleElementReferenceException` in `history_panel_click_item_title`. That's an unrelated history-item expand flake,
  and none of the touched popovers are on that path.

## Risks

The one-way part is small. `interactive` becomes a public `GPopover` prop in `@galaxyproject/galaxy-ui`, with a
specific keyboard contract (Tab enters, Tab out continues after the trigger, Enter/Space toggles a button trigger) that
later call sites and users will rely on.

<details><summary>Risk Details</summary>

- New public prop and behavior contract on a shared UI-package component. Changing the Tab/Enter semantics later
  would change behavior in every opted-in popover.
- Keyboard users see changed behavior on five surfaces. Tab from the trigger now enters the popover where it used to
  skip it, and Enter on the node recommendations button toggles the popover.
- The Enter/Space toggle fires on any click without a pointer detail. If a trigger with its own click action is
  opted in, it would do both.
- Screen-reader output changes from "description" to "expanded, dialog popup" on opted-in triggers.
- Focus guards rely on real-browser sequential focus order, and no browser test covers that.
- `focusOrder` now decides Tab-out for click popovers too (hidden/inert/disabled filtering, via `checkVisibility`
  with a fallback).

</details>

<details><summary>Risk Review Advice</summary>

Reviewers should focus on the `interactive` prop contract in `GPopover.vue` (`onTriggerKeydown`, `onTriggerClick`,
the guard handlers and `guardsActive` in the hover listeners). This is the part other call sites will build on. Ask
whether "trigger must be focusable" should be enforced by the component and not documented. A quick manual keyboard
pass on the workflow editor recommendations (including tabbing before the predictions load) and on an invocation
report's "Tool details" buttons is the cheapest way to confirm the guard ordering works in a real browser. Unit tests
can't show that.

</details>

## Draft review comment

> *Drafted by Claude (AI assistant) on behalf of jmchilton.*
>
> Nice work. Extending `GPopover` with `interactive`, instead of adding a separate interactive popover, is the right
> call. Pulling the tabbable query into `focusOrder.ts` and moving the click-dialog path onto it makes it a real shared
> util. The core `GPopover` tests check behavior, and they fail against the pre-fix sources as expected. A few
> non-blocking thoughts:
>
> 1. **Could `GPopover` decide the trigger half itself?** `ToolLinkPopover`'s content is always a link, so its new
>    `interactive` prop is really answering "is my trigger focusable?". `GPopover` can check that with the new
>    `focusOrder` helpers on the resolved target and fall back to tooltip semantics (or warn in dev) when it isn't. That
>    would remove the pass-through prop, and the invocation step header case would be handled by construction.
> 2. **Enter/Space toggle and triggers with their own click.** `onTriggerClick` toggles on any `detail === 0` click.
>    That's fine for the current triggers, but the next obvious candidate (`ToolTargetPreferredObjectStorePopover`,
>    whose `#tool-storage` button opens the object-store modal on click) would do both. Maybe note that in the prop
>    doc.
> 3. **Recommendations load on open.** `Recommendations` re-fetches each time the popover opens. A keyboard user who
>    Tabs before predictions arrive goes straight past the list and the popover closes. Is that acceptable, or should
>    the loading state take focus so the guards can take over?
> 4. Small things: `WorkflowDisplay` now hard-codes `faWrench` for tool steps, but wrapping
>    `<WorkflowStepIcon step-type="tool" />` in the `GLink` would keep one icon mapping. `"Tool details"` and the
>    `"Tool"` dialog name aren't localized. And "Tool" is the same name for every step on a report.
> 5. Tests: happy-dom can't do sequential Tab, so the guard tests focus the guards by hand. A single Playwright
>    keyboard test (editor recommendations or a report's "Tool details") would exercise the real ordering, and could
>    stand in for some of the `props("interactive") === true` call-site tests.
>
> None of this blocks. Approving.
