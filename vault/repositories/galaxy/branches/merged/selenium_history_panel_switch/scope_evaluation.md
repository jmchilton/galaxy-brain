# Scope evaluation

Recommendation: keep scope as implemented. Branch is a ~40-line E2E addition (one test, one helper, shared modal selectors) that already took its modest expansion in polish (shared `history_selector_modal` used by upload too). No review raised scope concerns.

## As implemented

Test for panel Switch to history modal; `history_panel_switch_to` helper; `history_selector_modal` component shared with upload target-history selection.

| Pros | Cons |
|---|---|
| - Closes the gap (panel switch button had no E2E)<br>- Already de-duplicated SelectorModal selectors | - Doesn't cover other SelectorModal users |

## Modest expansion: cover MultipleView history selection via the shared modal

`MultipleView.vue` uses the same `SelectorModal` (`multiple=true`) for pinning histories; add a test/helper routed through `history_selector_modal`.

| Pros | Cons |
|---|---|
| - Further reuse of the new component<br>- Another untested path | - Different interaction (multi-select + confirm), separate feature<br>- Existing multiview tests already exercise selection elsewhere; better its own "missing tests" branch |

## Contraction: drop upload selector sharing

| Pros | Cons |
|---|---|
| - Smaller diff | - Leaves duplicate selectors; worse reuse |
