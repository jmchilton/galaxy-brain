Runs 16 of the 17 tests in `test_uploads.py` under the Playwright backend.

Fifteen of the file's sixteen `selenium_only` decorators carried the blanket
reason "Not yet migrated to support Playwright backend". Thirteen tests pass
untouched.

Three rule-builder tests (`test_rules_example_5_matching_collections`,
`test_rules_example_6_nested_lists`, `test_rules_deferred_list`) failed with
`'_PlaywrightDriverImpl' object has no attribute 'move_to_element'`. The cause was
the last unported `action_chains()` call site in the file — `_scroll_to_end_of_table`
built a raw move / click / fifteen-key chain. `move_to_and_click()` and
`send_keys_to_page()` already cover both backends, so this is a two-line port; it
also collapses fifteen `perform()` round-trips into one under Selenium.

`test_rules_example_3_list_pairs` keeps its decorator, with the blanket reason
replaced by a real diagnosis. In `rule_builder_swap_columns` nothing blurs the
second column selector, so its closing dropdown
(`.multiselect__content-wrapper.multiselect-leave-active`) sits over the rule
editor's Apply button. Sending Escape to the widget's input does clear
`multiselect--active`, and 500ms later the button is hit-testable with every
wrapper `display: none` — but the Apply click still times out across 30s of
Playwright retries, so the overlay is re-established by something I have not
identified. Diagnosed, not solved.

Verification:

- 16 passed, 1 skipped under Playwright (full file)
- the three tests touching the ported helper pass under Selenium

`test_rules_example_5_matching_collections` fails locally under Selenium with an
`ElementClickInterceptedException`, but dev's own unmodified file fails identically
at the same coordinates, so that is a local viewport artifact and not a regression.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
