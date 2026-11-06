# Scope evaluation

Recommendation: **keep** the scope as implemented. This is a missing-tests branch on `release_26.2`. The one related bug in the touched flow (Attributes save turning `comment_lines` 0 into blank) is already fixed on another branch, and John settled that it stays out. The modest expansions available, listed below, add tests for other metadata kinds without fixing anything. They fit better in follow-up `galaxy_ui_driver` batches than on this branch. Under 100 lines of non-generated code, so no decomposition section.

## As implemented
E2E tests for the tool form data field's accepted formats list and for assigning interval column metadata on the Attributes tab, plus the selectors and helpers they need.

| Pros | Cons |
|---|---|
| - Small and focused; both behaviors had no coverage<br>- Clean cherry-pick from `galaxy_ui_driver` (drop both by subject when restacking) | - Covers only interval select metadata, not other metadata widgets |

## Expand: fix and assert `comment_lines`
Fold in the `set_edit` `payload.get(name) or None` fix and assert that `comment_lines` 0 survives a save.

| Pros | Cons |
|---|---|
| - Fixes a real bug in the flow these tests drive | - Already fixed elsewhere; would duplicate or conflict with it<br>- John settled it as out of scope |

## Expand: cover more metadata kinds
Add Attributes-tab metadata tests for other datatypes, such as bed `strandCol` or tabular `column_names`, using `edit_dataset_attribute_fields`.

| Pros | Cons |
|---|---|
| - Puts the generic fields helper to wider use<br>- Cheap given the helpers already exist | - Adds no new behavior class; overlaps the interval case<br>- Better as a later `galaxy_ui_driver` batch |

## Contract: split the two tests
Ship the accepted-formats test and the interval-columns test as separate PRs.

| Pros | Cons |
|---|---|
| - Each PR is trivially reviewable | - Both are already tiny; two PRs is overhead with no gain |
