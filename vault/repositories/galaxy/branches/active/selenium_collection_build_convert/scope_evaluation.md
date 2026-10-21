# Scope evaluation

**Recommendation: expand modestly.** Add one small product-fix commit. In `SuitableConvertersTab.vue`, `:disabled="selectedConverter == {}"` is always false, because it compares against a fresh object. As a result, Convert Collection is always enabled, and clicking it with no converter selected POSTs to `/api/tools/undefined/convert`. Change it to `:disabled="!selectedConverter?.tool_id"`, and in `test_convert_datatype_simple_list` assert that the button is disabled before a converter is picked. That assertion is red without the fix. This is the component the branch's new convert test drives. It also gives a branch with no red hook a real red-to-green step, which matches the plan's step 2 framing ("each brings the fixes its test needs"). Keep the four existing commits as implemented. Don't fold in `00c72c7fa3c` (Apply rules nesting): on 26.2 it would need a rewrite away from `tool_form_fill`, which is dev-only. Don't drop the refactor commit.

## Possible Decompositions

The branch has about 125 non-generated lines: hand-edited `navigation.yml`/`schema.ts`, `navigates_galaxy.py`, and two test files. These are options for John, not recommendations.

- **(a) One PR as is**, plus the converter fix if it is adopted. The commit order is refactor, keep-extensions, convert, (converter fix), rename.
- **(b) Builder PR + edit PR.**
  - Builder: `8a5fb734bdd` keep-extensions and `97ffab4de3f` rename, about 55 lines.
  - Edit: `876754fddc7` refactor, `25ce2409856` convert, and the converter-fix commit, about 70 lines plus the fix.
  - Checked with `git merge-tree`, the builder pair cherry-picks cleanly onto `origin/release_26.2` in order. Rename doesn't apply on bare base on its own, so it needs keep-extensions first. The edit half would then be re-picked on base. Its `navigation.yml`/`navigates_galaxy.py` hunks sit next to the builder hunks, so expect a trivial adjacency re-resolution whichever half lands second.
  - The converter fix could also go out as its own tiny PR ahead of the edit PR.
- **(c) Refactor first, then coverage.** `876754fddc7` alone (open by hid, shared change-datatype steps, and the dbkey test reopening hid 5) is a no-behavior-change test refactor. The three coverage commits, plus the converter fix, would follow.

On every option, the `galaxy_ui_driver` restack drops the three FAQ commits by subject (see `baseline_refactor.md`). The converter fix has no `galaxy_ui_driver` counterpart, so it adds nothing to the restack.

## Scopes considered

### 1. As implemented

Four commits on `release_26.2`: a test-helper refactor, then E2E coverage for keeping extensions in Auto Build List, converting a collection's datatype, and renaming an element in the Advanced flat list. Test-only, no Vue changes.

| Pros | Cons |
|---|---|
| <ul><li>Coherent "collection building and editing" coverage for 26.2</li><li>Green 5/5 under both backends, hardened through 5 review passes</li><li>Restack mapping to `galaxy_ui_driver` is settled</li></ul> | <ul><li>No red hook, since it is pure coverage</li><li>The convert test exercises a component with a known always-enabled button bug and leaves it unfixed</li><li>Galaxy reviewers tend to ask why a known bug next to the new test was left alone</li></ul> |

### 2. Expand: fix the `SuitableConvertersTab.vue` disabled check (recommended)

A one-line fix, `:disabled="!selectedConverter?.tool_id"`. The `?.` also covers `allow-empty` deselecting to null and the `{}` reset after a click. Add a disabled-before-selection assertion to `test_convert_datatype_simple_list`, or a small vitest mount test, since none exists for the component. Make it its own commit.

| Pros | Cons |
|---|---|
| <ul><li>Fixes a user-visible bug: an empty Convert posts to `tools/undefined/convert` and shows "Conversion failed."</li><li>It is in the exact component the new test drives</li><li>Gives the branch a red-to-green step</li><li>Closes the race the normal review flagged, where Enter fires before options load and the convert runs empty</li><li>It is the only `== {}` comparison in `client/src/**/*.vue`</li><li>Sibling tabs (`ChangeDatatypeTab` `enableSave`, `DatabaseEditTab`) already disable correctly</li></ul> | <ul><li>Branch is no longer test-only; the title/description needs a "fix" framing</li><li>Must confirm `collection_edit_convert`'s `wait_for_and_click` waits for enabled under the Playwright adapter as well as Selenium. Otherwise the helper races the newly disabled button.</li><li>Adds one more commit with no `galaxy_ui_driver` counterpart (harmless for restack)</li></ul> |

<details>
<summary>Optional tidy in the same commit</summary>

`deselect-label="Can't remove this value"` contradicts `:allow-empty="true"`. Either is fine once the disabled check handles null. Aligning them with the sibling tabs (`allow-empty="false"`) is a one-word change, but it is cosmetic and not needed.

</details>

### 3. Expand: fold in `00c72c7fa3c` "Test nesting a list with Apply rules from the rule builder menus"

This is the last collection FAQ-loop commit left on `galaxy_ui_driver` (`collections_force_mapping_over`). It adds `rule_builder_add_column_basename` and a `test_tool_form.py` test that nests a list through the Column > Basename menus, then checks that Sort collection maps over the `list:list`.

| Pros | Cons |
|---|---|
| <ul><li>Same "collection FAQ coverage" theme</li><li>Its only branch-level dependency, `history_wait_for_new_collection`, is added here</li><li>Its textual patch applies cleanly on top (`merge-tree` clean)</li><li>`rule_builder_set_mapping`, `tool_form_wait_for_batch_info` and `create_list_in_history` all exist on 26.2</li></ul> | <ul><li>It calls `tool_form_fill`, which is absent on `release_26.2`. That helper comes from dev-only `selenium_tool_form_helpers` (6a). Landing it here means rewriting the map-over step, e.g. `tool_set_value(..., expected_type="data_collection")`, which forks the patch from `galaxy_ui_driver`.</li><li>Green under Playwright only so far, never run under Selenium</li><li>It touches a fourth test file (`test_tool_form.py`), outside "build and edit"</li></ul> |

Not recommended. The con is technical: a diverged, unverified patch, not one of the overridden "release branch" or "outside issue" reasons. Once this branch lands, `00c72c7fa3c` no longer depends on it and can go with `selenium_tool_form_helpers` on dev, or as its own adapted 26.2 coverage PR.

### 4. Expand: edit tabs keep stale selections when the route switches collections

`DatabaseEditTab` sets `selectedGenome` only `onMounted`. `ChangeDatatypeTab` sets `selectedDatatype`/`currentDatatype` once at setup. `CollectionEditView` only re-keys `FormDisplay` (`collectionChangeKey`), not these tabs. So opening another collection's edit view from the same route may show the previous collection's dbkey or datatype. This is the mechanism behind the Codex finding.

| Pros | Cons |
|---|---|
| <ul><li>A related bug in the same view the branch's tests drive</li><li>The fix is small, e.g. key the tabs on `collectionChangeKey` or watch the props</li></ul> | <ul><li>Unconfirmed: the `v-if="item && databaseKeyFromElements"` may remount the tabs during reload, which would hide the bug. Needs a reproduction first.</li><li>Touches two more Vue files and needs its own E2E</li><li>The Codex fix (reopen hid 5) already stops the test from depending on it</li></ul> |

Not recommended without a reproduction. It is a good candidate for a follow-up issue or branch.

### 5. Contract: drop the refactor commit `876754fddc7`

| Pros | Cons |
|---|---|
| <ul><li>A smaller diff to existing tests</li></ul> | <ul><li>It carries the Codex-confirmed fix: the dbkey test reopens hid 5, not hid 3. Before it, the test could pass on a leftover selection.</li><li>`history_panel_collection_edit(hid)` replaces the first-`.edit-btn` selector, which only worked while the collection was newest</li><li>gxui `verbs.py` reads these helpers, so dropping it breaks the `galaxy_ui_driver` restack</li></ul> |

Rejected.

### 6. Split builder vs edit tests

Covered under Possible Decompositions. The process leaves splitting to John, so this evaluation gives no verdict.

### 7. Contract to the two originally requested commits (drop `e31b6908bec`)

John explicitly chose (2026-10-21) to include it. The convert commit's hunks sit next to it, and the upstreaming plan pairs it with rename. Not reconsidered.

### Not in scope

`f19d8ec90f8` (`tool_form_fill` collection mode) depends on 6a, so it goes with dev-only `selenium_tool_form_helpers`. The other FAQ-loop commits are on other branches or not about collections.
