# Scope evaluation: selenium_apply_rules_nest_menus (round 2, after re-scope)

**Recommendation: keep as implemented.** The round-1 expansion (all single-selector `rule_builder_*` helpers on `rule_builder.rule_editor_column_selector`) is now commit 2, guarded by the baseline commit. That closes the gap the branch itself created. The only modest expansion left in touched code is an indexed target for concatenate/split/swap, or targets for the raw radio/regex inputs in the two regex helpers. The thermo review argued against both on design grounds: the fix for the remaining idiom split is one typed editor-handle refactor, not more helpers moved onto targets one at a time. Also, `rule_builder_concatenate_columns` has no caller anywhere, so migrating it would be an untested change. Neither "release branch" nor "coverage-only PR" is a reason here. The editor-handle refactor stays a dev follow-up, `test_workbook_mapping.py` consolidation goes with it, and the contraction options lose more than they gain.

Three commits on `origin/release_26.2`, head `c1dc296ac86`, +125/−10 across 6 hand-written files (`index.md`'s "Two commits" predates the baseline restack):
1. `74022c11369` Baseline tests: `assert_rule_builder_source` (framework.py) plus rule-source assertions in `test_uploads.py` rules examples 3 and 4.
2. `ad080f29d40` `rule_editor_column_selector` target (navigation.yml, schema.ts), with sort, add_regex_groups, add_regex_replacement and remove_columns moved onto it.
3. `c1dc296ac86` `test_run_apply_rules_nest_from_menus`, `rule_builder_add_column_basename`, `history_wait_for_new_collection`. Additions only.

## Possible Decompositions

The commits already line up with the seams. Options, not a recommendation:

- **A. One PR, as is.** Baseline → refactor → new test, reviewed commit by commit.
- **B. Three PRs in commit order.** (1) Baseline tests for rules examples 3/4 plus `assert_rule_builder_source`. (2) Target plus the 4-helper refactor, on top of (1). (3) The nest test plus the two new helpers, on top of (2), since basename uses the target.
- **C. Two PRs.** (1) Baseline + refactor, a self-contained "pin and tidy rule builder helpers" PR. (2) The new test.
- **D. Baseline alone, then the rest.** The workhorse "Baseline tests" rule exists so commit 1 can go up by itself. The refactor and the new test follow as one PR.
- **E. New test only, from `_alt_original_scope`** (`3948673005b`). The alt adds the target inside the test commit, so it stands without commit 2. The refactor (with or without the baseline) could follow later, or move to dev.

Whichever of this branch and `selenium_collection_build_convert` lands second carries no net change for `history_wait_for_new_collection` under any option. It merges cleanly in either order.

## As implemented

Baseline assertions, single-selector helpers moved onto a named target, then the only menu-driven Apply rules E2E (Column > Basename + list-identifiers nesting, then Sort collection mapping over the `list:list`).

| Pros | Cons |
|---|---|
| <ul><li>Fills a real gap: every other Apply rules test sets source JSON</li><li>Refactor is checked against its own baseline: commit 2 alone is green on both backends</li><li>Examples 3/4 went from no assertions to pinning full rules + mapping</li><li>Target has 5 callers, so its generic name is justified</li><li>Codex round 2: no findings</li></ul> | <ul><li>Three helper idioms remain: target (5), raw indexed `find_elements` (3), and mixed inside one function (the two regex helpers)</li><li>Rule-type literal repeated in 5 helpers</li><li>A "missing test" PR now also rewrites existing helpers, which the PR description has to say</li></ul> |

## Indexed target for concatenate/split/swap

Add something like `rule_editor_column_selector_n(rule_type, index)` and move the three two-selector helpers onto it, so `.rule-column-selector` drops out of `navigates_galaxy.py` completely.

| Pros | Cons |
|---|---|
| <ul><li>Finishes the migration in the cluster commit 2 touches</li><li>Example 3 already pins split/swap indices, so split and swap are covered</li><li>Small: 1 yml + 1 schema line, about 6 helper lines</li></ul> | <ul><li>Thermo explicitly advised against moving more helpers onto targets one at a time</li><li>`concatenate_columns` has no callers, so its migration is untested</li><li>Harder than it looks: `:nth-of-type` probably fails because ColumnSelector roots share a parent with other divs. A class XPath has to use the `concat(' ', normalize-space(@class), ' ')` token idiom, or it also matches `-target`, `-up`, `-remove`</li><li>Leaves the radio/regex mixing in place</li><li>Adds a second target shape that the editor-handle refactor would delete again</li></ul> |

## Editor-handle refactor (dev)

`rule_builder_rule_editor` yields a typed handle (`editor.select_column(label, index=0)`, `editor.input(...)`), and all ten editor helpers move onto it. This removes raw lookups, indexed picks, mixed idioms and the repeated rule-type literal in one go.

| Pros | Cons |
|---|---|
| <ul><li>The fix every review round points to</li><li>Leaves a reusable abstraction behind</li><li>Natural pairing with a `rule_builder_*` mixin extraction from the 3.4k-line `navigates_galaxy.py`</li></ul> | <ul><li>New abstraction plus 10 rewritten helpers, out of proportion to this branch</li><li>Changes the context manager's yield contract</li><li>Concatenate still has no coverage, so it would need a test first</li><li>Belongs on dev</li></ul> |

## Targets for radio/regex/number inputs in the regex helpers

Add nav targets for `input[type=radio][value=...]`, `input.rule-regular-expression`, `input[type=number]` and `input.rule-replacement` under `.rule-edit-add-column-regex`, so the two regex helpers stop mixing a target with `editor_element.find_element`.

| Pros | Cons |
|---|---|
| <ul><li>Removes the within-function mixing thermo flagged, in helpers commit 2 already touches</li><li>Examples 3/4 cover both helpers (group count and replacement URL are pinned)</li></ul> | <ul><li>The re-scope review called it wider scope, and polish declined it</li><li>4 new nav targets that the editor handle would replace</li><li>Other helpers in the family (filter count, add value) would still use raw inputs, so the inconsistency just moves</li></ul> |

## `test_workbook_mapping.py` onto `assert_rule_builder_source`

Replace its private `_mapping`/`_assert_mapping` with the new framework helper, or with a mapping-only variant of it.

| Pros | Cons |
|---|---|
| <ul><li>Gives the new shared helper another caller</li><li>Removes overlapping assert code</li></ul> | <ul><li>Its asserts are mapping-only and per-index, so the helper would need a variant or the workbook test needs a source fetch</li><li>Touches a test file the branch doesn't otherwise touch</li><li>Pairs with the dev follow-up</li></ul> |

## Shared open → select input → edit rules test helper

Factor out the Apply rules entry sequence used by the nest test, `_apply_rules_and_check` and `_tool_apply_with_source`.

| Pros | Cons |
|---|---|
| <ul><li>3 call sites in one file</li></ul> | <ul><li>Two callers take docs screenshots mid-sequence, so the helper needs screenshot params</li><li>Saves about 3 lines per site</li><li>Declined on its merits in every round</li></ul> |

## Menu coverage for the remaining Column-menu rules

Add menu helpers and steps for rownum, substr, group tag value and sample-sheet index.

| Pros | Cons |
|---|---|
| <ul><li>Fits the missing-tests framing</li></ul> | <ul><li>A different feature from the force-map-over scenario</li><li>Group tags and sample sheets need extra setup</li><li>Diverges from `galaxy_ui_driver`'s commit</li><li>Better as its own coverage branch</li></ul> |

## Fold into or stack on `selenium_collection_build_convert`

Land commit 3 inside the sibling, or rebase onto it, so the duplicated wait helper leaves this diff.

| Pros | Cons |
|---|---|
| <ul><li>One copy of `history_wait_for_new_collection`</li></ul> | <ul><li>The sibling's scope evaluation keeps Apply rules out</li><li>`merge-tree` is already clean, and whichever lands second carries no net change</li><li>Couples review order</li><li>Commits 1-2 have nothing to do with the sibling</li></ul> |

## Contract: revert to `_alt_original_scope`

Ship the alt: only the nest test, with basename as the sole target user and no baseline or refactor commits.

| Pros | Cons |
|---|---|
| <ul><li>Touches no existing helpers</li><li>Smallest diff (+64)</li></ul> | <ul><li>Brings back the single-outlier idiom round 1 recommended fixing</li><li>Drops the example 3/4 assertions, which pin real behavior that had no checks before</li><li>Target goes back to one caller with a generic name</li></ul> |

## Contract: drop the map-over hint phase

End the nest test after the `list:list` structure assertions.

| Pros | Cons |
|---|---|
| <ul><li>Shorter test</li></ul> | <ul><li>The hint is the downstream proof of "force mapping over", the scenario the commit exists for</li><li>Cheap, and kept on purpose by every review</li></ul> |
