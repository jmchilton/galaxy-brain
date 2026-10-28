Run via claude-opus-5-5 at default effort.

# Scope evaluation (round 2): issue_24531_edit_disabled_tooltip_26.2

**Recommendation: keep the scope as implemented (the current branch, which is round 1's Scope B).** The branch now fixes every disabled-reason tooltip that the `v-g-tooltip` directive suppressed in the issue's pattern: ContentOptions edit, HistoryNavigation, MultiviewPanel, WorkflowPublishedButtons, the shared GCard primary/secondary actions (workflow, tool and history list cards), and the rule builder's Reset/Finish buttons. It also deletes the now-unused `TooltipOnHover`. All of them go through the established GButton `tooltip`/`disabled-title` mechanism, with GTooltip-aware Selenium and vitest coverage. The other `v-g-tooltip` + `:disabled` sites are about 25 files, mostly upload-panel controls, filter menus and bulk-list buttons. Round 1 looked at them as Scope C and found they are mostly disabled only while loading, or have titles that don't explain the disabled state. A new pass doesn't change that, so the next modest expansion has no clear target. The directive-wide change (D) still conflicts with GButton's mechanism and is too risky for 26.2. No further re-scope.

The diff is 13 files, +101/−52, including tests. That is about 60 lines of non-test change, under 100, so there is no decomposition section. The alt `issue_24531_edit_disabled_tooltip_26.2_alt_original_scope` stays available if reviewers want the narrower fix.

## Scope A (recommended): as implemented (round 1 B)

ContentOptions edit fix, GTooltip-aware Selenium helper, audit conversions (HistoryNavigation, MultiviewPanel, WorkflowPublishedButtons), GCard action tooltips, and the rule builder Reset/Finish buttons via GButton tooltips, with `TooltipOnHover.vue` deleted.

| Pros | Cons |
|---|---|
| - Covers the issue plus every high-traffic, same-cause site whose title explains the disabled state<br>- One shared-component fix (GCard) covers many callers: the general fix reviewers prefer<br>- Removes a dead wrapper with inverted semantics<br>- Red-to-green tests at each layer | - GCard buttons lose their native `title`, so selectors moved to `data-title` (JobInformation test, `workflow_card_button`). This is a small risk for downstream Selenium code that reads `title` |

## Scope B: revert to original scope (alt branch)

Ship `_alt_original_scope`: no GCard or rule builder changes.

| Pros | Cons |
|---|---|
| - Smaller release-branch diff, with no selector churn | - Leaves the same bug on the more heavily used list cards. Round 1 already showed that the reason for skipping GCard was wrong |

## Scope C: A + remaining `v-g-tooltip` + `:disabled` sites

This covers the upload panel methods and table cells, FilterMenuRanged/Input, PanelViewMenu, the DatasetList and WorkflowList bulk actions, EditableUrl, CustomBuilds, ServiceCredentials, FolderTopBar, Node, ExportButton, WorkflowRunForm, WorkflowInvocationState, and others.

| Pros | Cons |
|---|---|
| - Removes the anti-pattern codebase-wide | - About 25 files of churn on a release branch<br>- Most are disabled only briefly while loading, or have titles that don't explain the disabled state, so there's little user value<br>- Each one needs its own judgment call, so this is better as a dev follow-up sweep if wanted |

<details><summary>Details</summary>

I found these candidates with `grep -l v-g-tooltip | xargs grep -l :disabled`. Matching both in one file doesn't prove they're on the same element, and I didn't audit them one by one. If John wants a follow-up, a dev-targeted audit issue fits better than growing this branch.

</details>

## Scope D: change `vGTooltip` to show on disabled or `aria-disabled` elements

| Pros | Cons |
|---|---|
| - Fixes all present and future sites at once | - Changes behavior app-wide, so tooltips would appear on loading buttons<br>- Duplicates GButton's `disabled-title`<br>- Wider risk than 26.2 warrants; the issue and reviews chose call-site fixes |
