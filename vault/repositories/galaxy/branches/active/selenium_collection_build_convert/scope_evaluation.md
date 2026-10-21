# Scope evaluation (round 2, after re-scope)

**Recommendation: keep as implemented.** Round 1's modest expansion (the `SuitableConvertersTab.vue` disabled fix) is in, and it adds a red-to-green step to a branch that was otherwise pure coverage. Nothing left is worth parking the branch for. The strongest remaining candidate is stale state when the edit view switches collections on the same route. A code read confirms the mechanism for the converter tab: `SimpleProviderMixin` keeps `item` while it refetches, so `SuitableConvertersTab` stays mounted and keeps collection A's `selectedConverter` on collection B. But the bug predates this branch, nobody has reproduced it, and it needs its own switch-collections E2E. It should be a follow-up branch, not an expansion here. The other candidates also stay out:
- `00c72c7fa3c` and `f19d8ec90f8`: still blocked, because `tool_form_fill` is absent on `origin/release_26.2`.
- The null-vs-`{}` cleanup: a visible multiselect change, better done when the tab is converted to `<script setup>`.
- The `navigates_galaxy.py` split: it was already 3.4k lines at base, and splitting it would churn the gxui restack.

## Possible Decompositions

About 143 changed lines, all hand-edited: `navigation.yml`/`schema.ts`, one Vue line, `navigates_galaxy.py`, and two test files. These are options, not recommendations.

- **(a) One PR as is.** Order: `876754fddc7` refactor, `8a5fb734bdd` keep-extensions, `25ce2409856` convert, `97ffab4de3f` rename, `c1c12b303ed` converter fix.
- **(b) Builder PR + edit PR.**
  - Builder: `8a5fb734bdd` + `97ffab4de3f`, about 55 lines. Rename needs keep-extensions first because the hunks are adjacent.
  - Edit: `876754fddc7` + `25ce2409856` + `c1c12b303ed`, about 75 lines.
  - Whichever half lands second gets a trivial adjacency re-resolve in `navigation.yml`/`navigates_galaxy.py`.
- **(c) Refactor first, then coverage + fix.** `876754fddc7` alone is a no-behavior-change test refactor, and it includes the dbkey test reopening hid 5. The rest follow.
- **Correction to round 1.** The converter fix can't go out "as its own tiny PR ahead of the edit PR". `c1c12b303ed` adds its `assert_disabled` calls to `test_convert_datatype_simple_list`, which `25ce2409856` creates. So it lands with or after the convert commit. The only way to ship it alone is as a Vue-only change with no red test.

On every option, the `galaxy_ui_driver` restack drops the three FAQ commits by subject. The fix has no gxui counterpart.

## Scopes considered

### 1. As implemented (recommended)

Five commits on `release_26.2`:
- a test-helper refactor;
- E2E coverage for Auto Build List keeping extensions, converting a collection's datatype, and renaming an element in the Advanced flat list;
- the one-line Convert-button disabled fix, with its assertions.

| Pros | Cons |
|---|---|
| <ul><li>Coherent "collection build and edit" coverage plus one real bug fix in the component the test drives</li><li>Red without the fix, 5/5 under both backends</li><li>Codex: no findings. Thermo: no changes. Polish: no changes.</li><li>Restack mapping to `galaxy_ui_driver` is settled</li></ul> | <ul><li>Title/description need a "tests + fix" framing, not test-only</li><li>Leaves the known same-route stale-state bug in the same view</li></ul> |

### 2. Contract to the original scope (`selenium_collection_build_convert_alt_original_scope`, `97ffab4de3f`)

Test-only. Drops the converter fix.

| Pros | Cons |
|---|---|
| <ul><li>Pure coverage, so the PR framing is simplest</li><li>Already pushed as an alt, so it's zero work</li></ul> | <ul><li>No red step, which is weaker than the plan's step 2 ("each brings the fixes its test needs")</li><li>Leaves a user-visible bug: Convert with nothing selected POSTs `/api/tools/undefined/convert`</li><li>Galaxy reviewers would ask why the known bug next to the new test stayed</li></ul> |

Rejected.

### 3. Expand: reset edit-view tabs when the route switches collections

`CollectionEditView` gets a new `collectionId` without remounting.
- **Convert tab.** `SuitableConvertersProvider` (`SimpleProviderMixin`) never clears `item` on an `id` change, so `SuitableConvertersTab` stays mounted. A converter picked on collection A stays selected, and Convert stays enabled, on collection B. The options list updates underneath it. Before the fix, Convert was always enabled anyway, so the fix doesn't introduce this.
- **dbkey/datatype tabs.** These probably remount on a first visit, because `attributesData` for an uncached id is `undefined` and their `v-if` drops. When B's attributes are already cached, the stale `onMounted`/setup state can persist.
- **Likely fix.** `:key="collectionId"` on the three tabs, or on the `GTabs`.

| Pros | Cons |
|---|---|
| <ul><li>A related bug in the view this branch's tests drive. Galaxy reviewers like related bugs fixed together.</li><li>The fix is likely a `:key` of a line or two</li><li>Converting B with A's converter is a real wrong-tool run</li></ul> | <ul><li>Pre-existing and not yet reproduced. The dbkey/datatype half depends on store caching.</li><li>Needs a new switch-collections E2E. That is new test machinery, not a tweak to an existing test.</li><li>Not from any `galaxy_ui_driver` commit, so it broadens a branch the restack treats as "these FAQ commits"</li><li>Adding it means another full harden cycle on a branch that is otherwise done</li></ul> |

Not recommended here. It is the best follow-up branch candidate. Base it on `release_26.2` with a red E2E that opens collection A's edit view, picks a converter, clicks B's pencil, and asserts Convert is disabled.

### 4. Expand: collapse the converter's `null`/`{}` empty values

Use `selectedConverter: null` everywhere with `:disabled="!selectedConverter"`, possibly with `allow-empty="false"` and a matching `deselect-label`.

| Pros | Cons |
|---|---|
| <ul><li>One empty sentinel instead of two</li><li>Fixes the cosmetic contradiction between `deselect-label="Can't remove this value"` and `allow-empty`</li></ul> | <ul><li>Changes how vue-multiselect renders the empty state (placeholder vs blank). Visible, and unverified.</li><li>Pure cleanup, because the `tool_id` check already covers both values</li><li>Fits better with the `<script setup>`/TS conversion and typing `CollectionEditView.clickedConvert(any)`</li></ul> |

Rejected. Follow-up.

### 5. Expand: fold in `00c72c7fa3c` (Apply rules nesting) and/or `f19d8ec90f8` (`tool_form_fill` collection mode)

These are the last collection commits left on `galaxy_ui_driver`.

| Pros | Cons |
|---|---|
| <ul><li>Same collection-FAQ theme</li><li>`history_wait_for_new_collection` is already here</li></ul> | <ul><li>Both need `tool_form_fill`, which is absent on `origin/release_26.2` (`git grep` finds no `def tool_form_fill`). It comes from dev-only `selenium_tool_form_helpers`.</li><li>Landing them here means rewriting them, which forks the patch from gxui</li><li>Green under Playwright only. Touches `test_tool_form.py`, outside build/edit.</li></ul> |

Rejected. These go with `selenium_tool_form_helpers` on dev, or as an adapted coverage PR once this lands.

### 6. Expand: split `navigates_galaxy.py`

| Pros | Cons |
|---|---|
| <ul><li>The file is 3441 lines</li></ul> | <ul><li>It was already 3.4k at base, and the branch adds about 47 lines</li><li>A large move on a release branch</li><li>Churns every open selenium branch and the gxui restack</li><li>Unrelated to this scope</li></ul> |

Rejected. This is a standalone refactor for dev, after the upstreaming queue drains.

### 7. Contract: drop the refactor commit `876754fddc7`

Rejected for the same reasons as round 1:
- it carries the Codex-confirmed fix that makes the dbkey test reopen hid 5;
- it replaces the first-`.edit-btn` selector;
- gxui `verbs.py` reads these helpers.
