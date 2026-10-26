# Test challenges debrief

Dropped one redundant Jest test; kept baseline + modal test; Selenium assertions kept (polished separately).

- Baseline `listWizard` hand-off test (store + route): kept. Pins behavior the fix touches; passes pre-fix.
- `it.each` "leave selection mode when opening the list wizard (advanced=false/true)": dropped. Both modes covered by Selenium `_assert_selection_cleared` in `test_build_list_simple_hidden` (auto) and `test_build_paired_list_auto_matched` (advanced), which were red on reverted fix.
- Modal `created-collection` -> `update:show-selection` false: kept. Build-list-all (query selection) path has no E2E coverage, red pre-fix at its own assertion. Uses router mocks + `CollectionCreatorIndex` stub; component is Options API with `$router`, no reusable router util in 25.1 Jest helpers, so left as is.
- No API/integration tests in branch. E2E present, no new one needed.

Results: Jest file 29/29 pass; the 2 touched Selenium tests pass.
