Run via claude-opus-5-5 at default effort.

# Scope evaluation: issue_24531_edit_disabled_tooltip_26.2

**Recommendation: modest expansion (Scope B).** Also route `GCard`'s primary/secondary action buttons through GButton's `tooltip` prop. The implementation skipped `GCard` because its "titles come from callers", but the callers do write disabled-reason titles, and the directive currently swallows them: workflow card Run/Edit/Import ("Log in to run workflow", "You cannot run a deleted workflow. Restore it first."), the tool card Favorite button ("Login or Register to Favorite Tools") and the history card "current history" button. This is the same bug the branch already fixes in `WorkflowPublishedButtons.vue` ("Restore it first"), but on the more heavily used list cards. The fix is two lines in one shared component and fixes every caller, so it fits Galaxy reviewers' preference for the general fix. `RuleCollectionBuilder`'s Finish button (`TooltipOnHover` with `:disabled` around the disabled message "Button is disabled due to validation errors…") has the same symptom and is a cheap fix, so include it too. Leave the `vGTooltip` directive-wide change out.

Branch is ~74 changed lines (incl. tests), under 100: no decomposition section.

## Scope A: as implemented

The ContentOptions edit button moves to `tooltip` + `title` + `disabled-title`, and the Selenium `get_tooltip_text` becomes GTooltip-aware. Four more state-titled buttons move over: HistoryNavigation create/switch, MultiviewPanel create, WorkflowPublishedButtons edit.

| Pros | Cons |
|---|---|
| - Fixes the issue symptom, with red-to-green Selenium coverage<br>- Uses the established GButton disabled-title pattern<br>- Small and easy to review on release_26.2 | - Leaves the same bug in GCard actions (workflow/tool/history lists), which users hit more often than the fixed sites<br>- The audit's rationale for skipping GCard ("caller titles") doesn't hold up |

## Scope B (recommended): A + GCard actions + TooltipOnHover/RuleCollectionBuilder

In `GCard.vue` (~860 and ~890), swap `v-g-tooltip.hover` for GButton's `tooltip` prop on the secondary and primary action buttons. In `RuleCollectionBuilder` Finish, drop `:disabled` from `TooltipOnHover`, or put the title on the GButton itself via `tooltip`/`disabled-title`.

| Pros | Cons |
|---|---|
| - One shared-component change fixes ~5 disabled-reason tooltips across workflow, tool and history lists<br>- Same mechanism as the rest of the branch, so no new concept<br>- RuleCollectionBuilder's disabled message is plainly meant to show only while disabled, and currently never shows | - GCard tooltips move from the `.g-tooltip-d` balloon to GTooltip, so Selenium list tests that read card-action tooltips may need the new helper path (it already handles both)<br>- Somewhat larger visual/UI-test blast radius on a release branch |

<details><summary>Details</summary>

- `useWorkflowCardActions.ts`: Run `disabled: isAnonymous || deleted`, Edit `disabled: deleted`, and Import `disabled: isAnonymous`. All three have titles that explain why they're disabled.
- `useToolsListCardActions.ts`: Favorite is `disabled: isAnonymous || isTogglingFavorite`, and its title is "Login or Register to Favorite Tools".
- `useHistoryCardActions.ts`: "current" is always disabled, with title "current history". "import-copy" can't be both visible and disabled.
- The `GCard:702` note in the debrief (never rendered disabled) is about a different button. The action loops at ~863/~892 do bind `:disabled`.
- Check how `GCard` uses `tooltip` with `to`/`href` GButtons: the debrief notes that GButton renders disabled links as `<button>`, which is fine.
- `TooltipOnHover` is a Vue 2-style wrapper used only in RuleCollectionBuilder. Its `disabled` prop now *suppresses* the tooltip, which inverts what the caller intends.

</details>

## Scope C: A + transient bulk-loading sites and EditableUrl

Also convert the `DatasetList`, `WorkflowList` and `HistoryList` bulk-action buttons, plus `PanelViewMenu`, `FilterMenuRanged`, `NodeOutput` and `EditableUrl`.

| Pros | Cons |
|---|---|
| - Removes every `v-g-tooltip` + `:disabled` pairing | - Most of these are disabled only briefly while loading, or have titles that don't explain the disabled state, so they add little user value<br>- More churn for reviewers on a release branch |

## Scope D: change `vGTooltip` to show on `aria-disabled` elements

Relax the guard in `client/packages/ui/src/directives/vGTooltip.ts` (~229) so it shows tooltips on `aria-disabled` elements (and possibly native `disabled` ones too).

| Pros | Cons |
|---|---|
| - Fixes every call site at once, including any future ones | - Changes behavior app-wide: tooltips would start appearing on transient loading buttons<br>- Duplicates GButton's `disabled-title` mechanism, giving two ways to do the same thing<br>- Issue proposal and reviews already chose call-site fixes; wider risk for a release branch |

## Scope E: contract to the ContentOptions fix only

Drop the audit commit (HistoryNavigation, MultiviewPanel, WorkflowPublishedButtons).

| Pros | Cons |
|---|---|
| - Minimal diff | - Leaves known, same-cause bugs in touched patterns. This goes against reviewer preference and the issue's own option 3 |
