# Component - Popper Popovers and Focus Management

Document the classic client popover stack: `client/src/components/Popper/Popper.vue` and `usePopper.ts` (`@/components/Popper`), and how consumers open, close and return focus from it.

Cover:

- **Triggers and lifecycle.** `trigger` modes (`click`, `hover`, `none`), `referenceEl` vs the `reference` slot, `useDelayedAction` open/close delays, `interactive`, and the document-level click/Escape listeners.
- **Closing paths.** The three ways a popover hides: `Popper.vue`'s `close()` (via `usePopper.hide()`, the only path that returns focus to the trigger), the `.popper-close` click delegation in `usePopper.ts`, and consumers writing the exposed `visible` ref directly. Include the conditional focus-return rule (`focusReturnTarget`, tabbable filter, Escape ignored for non-click popovers with no focusable reference).
- **Consumers.** Table of components using `Popper` (e.g. Markdown `CellAdd`/`CellAction`, `ActivityItem`, `NotificationsBell`, `LoginRequired`, upload extension help, storage quota/preview popovers), with trigger, reference style and how each closes.
- **Testing.** `Popper.test.js` / `usePopper.test.js` patterns (mocked `createPopper`, fake timers) and the Storybook story lane.

Leave out `GTooltip`/`v-g-tooltip`/`GButton` (see [[Component - Galaxy UI Buttons and Tooltips]]), `GPopover`, and the Tour popper.

## Why

The Markdown cell menu focus fix (#24335) follows #24285's `close()` focus return and needed to know which consumers bypass it; no note covers `Popper`, and the buttons/tooltips note excludes popovers. Further a11y work on popover consumers will hit the same question.

## Requested by

- vault/repositories/galaxy/branches/active/fix_markdown_cell_menu_focus/index.md: needed the closing-path and consumer map for routing menu selection through `close()`.
