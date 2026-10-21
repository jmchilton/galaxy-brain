# Initial implementation debrief

Branch `selenium_apply_rules_nest_menus` off `origin/release_26.2` (`3bb80a42180`), head `ca42822f93e`, one commit (+51 lines).

## What

Cherry-picked `galaxy_ui_driver`'s `00c72c7fa3c` ("Test nesting a list with Apply rules from the rule builder menus") and adapted it to 26.2:

- `tool_form_fill(data={"input": hid})` is dev-only (from `selenium_tool_form_helpers`). Replaced with `tool_set_value("input", f"{hid}:", expected_type="data_collection")`, the idiom the same test already uses for Apply rules' input.
- Added `history_wait_for_new_collection(after_hid)` to `NavigatesGalaxy`, byte-identical and at the same spot as in `selenium_collection_build_convert` (`25ce2409856`). That branch already carries the second requested item (the shared wait folded into the convert test), so it wasn't touched here; another session is re-hardening it.

## Verification

- Playwright: pass (49s). Selenium: pass (46s). Framework-managed server, client built in place.
- Red check: replacing `rule_builder_add_column_basename("A")` with `pass` fails (no column B to map list identifiers to).
- `git merge-tree` with `jmchilton/selenium_collection_build_convert`: clean.

## Decisions

- Own branch, not stacked on or folded into `selenium_collection_build_convert`: that branch is mid-harden in another session and keeps moving.
- 26.2's `select_set_value` types the value then presses Enter (no exact-match fix `a68deb35cc6`); picking "A" works under both backends.
