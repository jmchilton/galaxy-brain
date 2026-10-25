**Acted on all three (`51bc57ccf1d`).** (1) The test now waits for the page's success alert after Save. The suggested `assert_success_message` matched an ok history item (`.alert-success` is global), so a page-scoped `custom_builds.success_alert` component is used instead. (2) Dropped the unused `row` component. (3) `add_custom_build` uses the `custom_builds` components. Green 3/3 under Playwright and Selenium.

Not acted on: `get_custom_builds`/`delete_custom_build` keep raw table walking — low payoff, as the review said.

---

Mostly fine. One real flake: the test can navigate away before the save PUT returns. Fix it by waiting on the existing success-message helper. Also drop the unused `row` component, and optionally move `add_custom_build` onto the new components. The datatypes hunk is safe.

## Findings

1. **Race between save and `wait_for_history()`.** `lib/galaxy_test/selenium/test_custom_builds.py:47-49`. `save()` in `client/src/components/User/CustomBuilds.vue:281` is an async axios PUT, and the converter datasets only exist once that PUT has finished. Before then, the history holds just the FASTA dataset, already `ok` and non-empty, so `history_becomes_terminal` (`lib/galaxy/selenium/navigates_galaxy.py:615`) can return on its first poll. `navigate_to_custom_builds_page()` then calls `home()`, which may cancel the PUT or load the list before the build has a `count`. `get_custom_builds` (`lib/galaxy/webapps/galaxy/api/users.py:602`) drops builds that have no count. Either way `row_count` times out. Fix: add `self.assert_success_message(contains="Successfully added a new custom build.")` right after `save.wait_for_and_click()`. GAlert renders `.alert-success`, which matches `components._.messages.done`. It shows for 5s, so an immediate wait catches it.
2. **Unused `row` component.** `client/src/utils/navigation/navigation.yml:115-117`. Nothing references `custom_builds.row`. Either drop it, or use it in `delete_custom_build` (`row(name=...)` plus the `button[data-title='Delete build']` child) so it earns its place.
3. **Parallel selector paths (optional, small).** `add_custom_build` (`test_custom_builds.py:67-79`) duplicates `name`/`key`/`definition`/`save` as raw `input[id="name"]` etc. Switching it to `self.components.custom_builds.*` takes about 4 lines and removes the duplication. `get_custom_builds`/`delete_custom_build` could stay as they are. They iterate the table generically and the payoff is lower.

## Details

### Scope
One commit `4d59114a0b1` on `release_26.2`: the new test, the `custom_builds` navigation components, and in `test/functional/tools/sample_datatypes_conf.xml` the `fasta -> len` converter plus the `len` (with `len -> linecount`) and `linecount` datatypes.

### Datatypes hunk: safe
- The three entries copy `lib/galaxy/config/sample/datatypes_conf.xml.sample` lines 98-100, 189 and 611 exactly (same classes, same `display_in_upload`). This matches production rather than inventing config.
- Framework tool tests: `get_tests_summary` (`lib/galaxy/webapps/galaxy/services/tools.py:603-626`) skips datatype converters in both the cached and fallback paths. The converters' `<tests>` (which need `chr_m.*` test-data that is absent here) are never collected.
- `api/test_datatypes.py` enumerates converters and was run green (10 passed) per the initial debrief.
- `test_get_suitable_converters_different_datatypes_no_matches` (bed + fasta, `test_dataset_collections.py`) expects an empty intersection. Bed has no `len` converter, and the new tool id `CONVERTER_fasta_to_len` is fasta-specific, so the result is still empty.
- `..._same_datatype_matches` asserts that expected converters are present, not an exact set, so the extra converter can't break it.
- Only consumer of the conf is `FRAMEWORK_DATATYPES_CONF` in `lib/galaxy_test/driver/driver_util.py:83,1163`; no test asserts datatype counts or exact upload-extension lists. No API/selenium test uploads `len`/`linecount`. Converter XML needs `python` via a `requirement`. That resolves fine under driver servers (the test is green).

### Readiness and waits
- `select#fasta-file:enabled` is a good readiness check. `fastaFilesSelectDisabled` turns false in the same tick that `selectedFastaFile` is set (`CustomBuilds.vue:266-268`), so "enabled" means "has a selected FASTA". CSS `:enabled` works the same in Selenium and Playwright.
- Baking `:enabled` into the selector name `fasta_file` is a little implicit, but it's fine for one use.
- `wait_for_history` counts hidden HDAs. `serialize_history_state` only excludes deleted ones, so the hidden `len`/`linecount` conversions keep the history `queued`/`running` until they finish. This holds once the PUT has returned (finding 1).
- The comment on line 48 explains a non-obvious wait, so keep it.

### Shared state / naming / selectors
- `build_name3`/`build_key3` follow the existing `1`/`2` pattern and are unique per class.
- The FASTA upload goes into the shared user's current history. The sibling tests don't look at history, so there is no cross-test interference.
- The xpath `td[1]`/`td[3]` depends on column order (`fields` in `CustomBuilds.vue:191-195`: name, id, count, action). This is consistent with the existing `delete_custom_build`, which indexes `td[3]` (0-based) for the action. GTable is a re-export from `@galaxyproject/galaxy-ui` and exposes no per-field cell attributes, so an index is the pragmatic choice.
- The test name `test_build_add_from_fasta` fits its siblings.
- Asserting `definition.wait_for_value() == "fasta"` documents the GTN-path default, which is reasonable.

### Out of scope (per brief)
- Not listed until reload: the re-navigation works around it. That is a queued issue.
- Swallowed `NoConverterException` turned into `ToolExecutionError` (`users.py:583`): queued issue.

No security findings.
