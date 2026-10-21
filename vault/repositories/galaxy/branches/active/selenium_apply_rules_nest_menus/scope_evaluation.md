# Scope evaluation: selenium_apply_rules_nest_menus

**Recommendation: expand modestly.** Move the four single-selector `rule_builder_*` siblings onto the new `rule_builder.rule_editor_column_selector` target: `rule_builder_sort`, `rule_builder_add_regex_groups`, `rule_builder_add_regex_replacement` and `rule_builder_remove_columns`. Leave everything else as implemented. The branch's new target makes `rule_builder_add_column_basename` the only helper in the family that uses a SmartTarget, while its siblings still call `editor_element.find_element(".rule-column-selector")`. Moving the siblings whose editor has exactly one selector ends that split in code the branch already touches. The cost is about 4 small hunks in `navigates_galaxy.py`, all exercised by existing `test_uploads.py` tests. Nothing in it overlaps `selenium_collection_build_convert`, which doesn't touch the `rule_builder_*` cluster or `test_tool_form.py`, and `history_wait_for_new_collection` stays byte-identical. The multi-selector siblings (concatenate, swap, split) need an indexed target or an editor-object refactor, so they stay a dev follow-up. The shared Apply rules builder-entry test helper still isn't worth it, now on its merits rather than "coverage-only PR".

Earlier steps (normal review, test challenges, polish, thermo, baseline refactor) declined expansions mainly because this is "a coverage-only PR on a release branch" or "touches existing tests". The scope process overrides both reasons, so each candidate below is re-weighed on its merits. Any expansion means rerunning the touched E2E (`test_uploads.py` rule tests plus the new test) under Playwright and Selenium. That's a cost, not a reason to stay narrow.

The branch is +64 lines, so there's no decomposition section.

## As implemented

One commit adds `test_run_apply_rules_nest_from_menus`. It nests a list through Column > Basename and the list-identifiers mapping via the menus, pins the rule source JSON and the `list:list` structure, and checks that Sort collection maps over the output. It also adds `rule_builder_add_column_basename`, `history_wait_for_new_collection` (shared with the sibling branch) and the `rule_editor_column_selector` navigation target (in both yml and `schema.ts`).

| Pros | Cons |
|---|---|
| <ul><li>Only Apply rules test driven by the menus; the others set source JSON</li><li>Strong assertions after the review and test-challenge rounds</li><li>Green under both backends, clean `merge-tree` with sibling</li><li>Purely additive</li></ul> | <ul><li>Adds a second idiom to the rule-builder helper family: one SmartTarget helper beside 12 `find_element` helpers</li><li>The new target has a generic name but only one in-tree user</li></ul> |

## Recommended: move single-selector siblings onto the target

Switch `rule_builder_sort`, `rule_builder_add_regex_groups`, `rule_builder_add_regex_replacement` and `rule_builder_remove_columns` to `rule_builder.rule_editor_column_selector(rule_type=...)`, the same way the new helper does. Each of these editors has exactly one `.rule-column-selector`. `remove_columns` re-picks the same multi-select in a loop, and a target re-resolves on every call, so that still works.

| Pros | Cons |
|---|---|
| <ul><li>Fixes the inconsistency this branch introduced, in the file and cluster it already touches</li><li>Gives the new target real callers, which justifies its generic name</li><li>Small: about one line per helper, no behavior change, no new abstraction</li><li>No overlap with `selenium_collection_build_convert`</li><li>All callers are in `test_uploads.py`, which covers it without new tests</li></ul> | <ul><li>Rewrites existing helpers in a PR framed as a missing test. The PR description should mention it</li><li>Needs `test_uploads.py` rule tests rerun under both backends</li><li>Need to confirm `select_set_value(target, ..., multiple=True)` handles SmartTargets the same way it handles elements, for `remove_columns`</li><li>Still leaves the split in the 3 multi-selector helpers</li></ul> |

<details>

`grep -n 'rule-column-selector' navigates_galaxy.py` on the head returns 10 hits in 7 helpers:
- **Single selector**: `sort` (1124), `add_regex_groups` (1132), `add_regex_replacement` (1152), `remove_columns` (1192, uses `find_element`, so the first match).
- **Multiple selectors, indexed `[0]`/`[1]`**: `concatenate_columns` (1200/1202), `split_columns` (1212/1218), `swap_columns` (1228/1230).

The thermo review's "12/13 siblings" counts the whole `rule_builder_*` family, not the helpers that use column selectors. Only the first group can use the current target unchanged. A SmartTarget resolves to its first match, so pointing it at the second group would silently select column 1 for both picks.

</details>

## Indexed target or editor-object refactor across all column-selector helpers

Give the editor context a typed handle (`with self.rule_builder_rule_editor(rt) as editor: editor.select_column(label, index=0)`) or an indexed target, then move all 7 helpers onto it, including concatenate, split and swap. This is the thermo review's "code judo" move.

| Pros | Cons |
|---|---|
| <ul><li>Removes the raw selector everywhere and states each rule type once</li><li>Leaves a reusable abstraction behind</li></ul> | <ul><li>A new abstraction plus 7 rewritten helpers is out of proportion for a +64 coverage PR</li><li>Changes `rule_builder_rule_editor`'s yield contract</li><li>Better done on dev, together with a possible `rule_builder_*` mixin extraction out of the 3.4k-line `navigates_galaxy.py`</li></ul> |

## Shared `_tool_open_apply_rules_builder(hid=None)` test helper

Factor out the open Apply rules → (optionally) select input → edit rules → wait-visible sequence. It's shared by the new test (582-585), `_apply_rules_and_check` (781-784) and `_tool_apply_with_source` (799-806).

| Pros | Cons |
|---|---|
| <ul><li>3 call sites in one file</li><li>Test-file only</li></ul> | <ul><li>Two of the three callers take screenshots partway through the sequence (`tool_apply_rules_landing`, `landing_screenshot`, `rule_init_screenshot`), so the helper would need 2 screenshot params to keep the docs screenshots</li><li>Saves about 3 lines per site</li><li>Not worth it on its merits, regardless of the release-branch framing</li></ul> |

## Menu-driven coverage for the remaining Column-menu rules

Add menu helpers and test steps for the Column-menu rules that have neither yet: `add_column_rownum`, `add_column_substr`, `add_column_group_tag_value`, `add_column_from_sample_sheet_index`.

| Pros | Cons |
|---|---|
| <ul><li>Fits the "missing tests" framing</li><li>Each new menu helper is cheap</li></ul> | <ul><li>A different feature (rule-builder menu coverage), not the force-mapping-over scenario this commit came from</li><li>Group tags and sample sheets need extra setup</li><li>Forks further from `galaxy_ui_driver`'s commit</li><li>Better as its own coverage branch</li></ul> |

## Fold into or stack on `selenium_collection_build_convert`

Land this commit inside the sibling branch, or rebase it onto the sibling so the duplicate `history_wait_for_new_collection` disappears from this diff.

| Pros | Cons |
|---|---|
| <ul><li>Removes the duplicated helper from one PR</li><li>Same collection-FAQ theme</li></ul> | <ul><li>The sibling is being re-hardened in another session and keeps moving</li><li>The sibling's own scope evaluation keeps Apply rules out (outside build/edit)</li><li>`merge-tree` is already clean, and whichever PR lands second carries no net change for the helper</li><li>Stacking couples review order for no gain</li></ul> |

## Contract: drop the map-over hint phase

End the test after the `list:list` structure assertions and drop the `__SORTLIST__` batch-hint check.

| Pros | Cons |
|---|---|
| <ul><li>Shorter test with fewer phases</li></ul> | <ul><li>The hint check is the downstream proof of "force mapping over", the FAQ scenario the commit exists for</li><li>Cheap, and kept on purpose by earlier reviews</li></ul> |
