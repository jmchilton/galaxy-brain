# Dead history multi-operation Selenium selectors and helper

- Area: Selenium / navigation.yml
- Found while: [[Component - History Panel Selection and Collection Builders]]
- Galaxy SHA: 65e6daff
- Severity: low

## Problem

`client/src/utils/navigation/navigation.yml:337-347`, `history_panel.multi_operations`:

- `selectors.action_button`: `.history-contents-list-action-menu-btn`
- `selectors.action_menu`: `.list-action-menu .dropdown-menu`
- `labels`: `build_pair`, `build_list`, `build_list_pairs`, `build_from_rules`

No class or text in `client/src` matches any of these. The menu they described was removed with the legacy history (`163dfddc8b7`, `d08196a1706`). Today's Selection menu is `[data-description="selected content menu"]`, and its items are addressed by `data-description`.

`NavigatesGalaxy.history_panel_multi_operation_action_click(action)` (`lib/galaxy/selenium/navigates_galaxy.py:2998-3008`) clicks `action_button` and then a link whose text matches a label. Nothing calls it, and it would time out if anything did. The only live entry in the block is `selectors.show_button`.

## Evidence / repro

- `grep -rn "history-contents-list-action-menu-btn\|list-action-menu" client/src` finds nothing outside `navigation.yml`.
- `grep -rn "history_panel_multi_operation_action_click\|multi_operations.labels" lib/ client/src` finds only the definition.

## Suggested fix

Delete `action_button`, `action_menu`, the `labels` block and `history_panel_multi_operation_action_click`. If a selector for the Selection menu is wanted, add `selected_content_menu: '[data-description="selected content menu"]'`, as #24487 does on 25.1.

## Related

- [[Component - History Panel Selection and Collection Builders]]
- [[Component - E2E Tests - Writing]]
