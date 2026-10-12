# playwright_scoped_css_parity — polish debrief

Polished 2026-10-06. Branch now `095a548a273` (2 commits on `playwright_text_table_parity` @ `1449e639c22`).

- **CI:** fork CI on `e2eeec2f4b0` failed Playwright and Integration Selenium at "Restore client cache", the same fork cache eviction other branches hit, so it's infra. I reran both in full, then superseded them with the new push. Fork CI on `095a548a273` hasn't been checked yet.
- **Checklist (GENERAL.md):** passed first time. The reviewer suggested optional hardening, because a bare `button` would pick a tag's delete button on a card that already has tags.
- **Strengthening:** one task, the hardening above. `add_tag` now uses `.toggle-button` / `.headless-multiselect input`, matching navigation.yml's `tag_area_button` / `tag_area_input`. The reviewer judged that reusing `tagging_add` isn't worth it: it's document-scoped and never clicks the toggle. I re-ran the checklist after the change and it still passes; its answers match the description.
- **Local verification of the new selectors: not done.** The shared Vite server on 5173 (from the `workflow_multiple_parameter_followups` worktree) returns `504 Outdated Optimize Dep`, so `#masthead` never renders. Another session may own it, so I left it alone. The description says fork CI verifies the final selectors. The earlier bare-selector version passed all 14 tests locally on both backends.
- **Description claims checked:** dev has three `@selenium_only` test decorators (`test_tags`, `test_history_pages`, `test_library_contents`). This branch and its two siblings remove one each, which supports the description's "last decorator" claim.
- **Stale note:** the implementation debrief lists `test_change_password` (#23808) as a remaining decorator. #23808 merged on 2026-10-05.

## Left for John

- Human-read checklist item.
- Fork CI on `095a548a273`, which is the first real run of the final selectors.
- Scope questions, not done: should the card tag-cell lookups (`test_histories_list`, `test_histories_published:49`) move into `navigates_galaxy` / `navigation.yml`? Should `tagging_add` get an element-scoped variant that clicks the toggle?
- The parent's fork CI on `1449e639c22` shows Selenium/Playwright/Integration Selenium reds that haven't been diagnosed.
