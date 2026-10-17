# Re-scope debrief — 2026-10-17

[Scope evaluation](earlier_drafts/2/scope_evaluation.md) (first hardening pass of the re-harden) recommended a modest expansion; followed "Handling a Re-Scope".

- Alt: `issue_20657_input_processing_mode_alt_original_scope` at `be1f6486427`, pushed to `jmchilton` — see [alts/original_scope.md](alts/original_scope.md).
- `ae4676ed7e3` Label `list:list` ("list of lists") and `list:list:paired` ("list of lists of pairs") in `COLLECTION_TYPE_TO_LABEL`. Hint/markers, FormData "No … available" + drop alerts, and collection creator button/placeholder ("Create list of lists") now use them. Red: 5 vitest text assertions. Existing FormData.test.ts expectations moved from raw "list:list" to new label; raw-type fallback test moved one level deeper (`list:list:list:list`) to keep fallback coverage — original fixture kept as new test.
- `e5be2b7b4c0` Five admin/role/user/quota `remove_selected_*` XPath selectors: `/i[contains(@class,'multiselect__tag-icon')]` → `/*[...]` (vue-multiselect 3 renders `<button>`; same bug as the tool-form selector fix). Red→green on Playwright for `test_admin_role_and_user_forms.py` (both tests); green on Selenium. Quota/group remove selectors have no test.
- Review ([subagents/rescope_review.md](subagents/rescope_review.md)): no correctness issues; added `08fb0c26a8b` testing the nested labels in the no-options alert.
- Not done: `NodeOutput.vue` own label map, drop alert raw param type, wizard "Nested List of Dataset Pairs" wording — follow-ups.
- Run note: admin E2E tests need `GALAXY_CONFIG_OVERRIDE_ADMIN_USERS` incl. `test@bx.psu.edu` and a selenium context without `admin_*` lines.
