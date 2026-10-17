# Re-scope review (ae4676ed7e3, e5be2b7b4c0)

**Acted on:** added one FormData test pinning the new labels in the "No … available" alert (`08fb0c26a8b`). **Not acted on:** wording/consistency nits, a workflow-editor label dedupe, i18n concatenation, and E2E confirmation of the admin selectors. All are listed below. Re-scope looks correct and fits the branch. No security issues.

Not acted on:
- **Admin selector fix is not E2E-verified (by this review).** vue-multiselect 3.5.0 renders a `<button class="multiselect__tag-icon">` (checked in `node_modules/.../vue-multiselect.esm.js`), so the old `/i[...]` could not match and `/*[...]` will. Running `test_admin_role_and_user_forms.py` is still worth doing before merge. Not done here because the review changed no selectors.
- **Wording consistency.** The wizard (`WhichBuilder.vue`, `WhichWorkbookCollectionType.vue`) says "Nested List of Dataset Pairs", `PairedOrUnpairedListCreatorHelp.vue` says "nested list of pairs", and `CollectionDescription.vue` says "nested list". The new "list of lists of pairs" follows the map's own "list of pairs" pattern and matches the workflow editor's "list of lists", so I left it alone. Wording is John's call.
- **Workflow editor `NodeOutput.vue` hard-codes "list of pairs"/"list of lists"** in `collectionTypeToDescription`, separate from `COLLECTION_TYPE_TO_LABEL`. It could reuse `collectionTypeLabel`, but that's out of scope (different subsystem, and its text would change). Possible follow-up.
- **i18n.** `CollectionCreatorFooterButtons`/`CollectionNameInput` call `localize("Create " + label)`, and FormData messages are not localized. This pattern predates the branch and is shared by every existing label. The new entries add no new problem.
- **Mixed raw/friendly drop alert.** "list of lists dataset collection is not a valid input for list:paired type …" labels the dropped side but not the parameter side. Pre-existing for all labels; out of scope.

Tests: vitest FormData/, Collections/common, PairedOrUnpairedListCollectionCreator, admin/, NodeOutput: 19 files, 157 tests pass (node 22.20.0). Prettier and eslint pass on commit.

<details>
<summary>Full review</summary>

**ae4676ed7e3: labels.** Two entries go into `COLLECTION_TYPE_TO_LABEL`. Consumers:
- `CollectionCreator.shortWhatIsBeingCreated` → footer button "Create list of lists", name placeholder "Enter a name for your new list of lists" (was "collection"). This is used by `PairedOrUnpairedListCollectionCreator` for `list:list`/`list:list:paired`, and the new parametrized test asserts the button text. It's a clear improvement. No Selenium/Playwright selector or test depends on the old "Create collection" text (grepped `lib/galaxy/selenium`, `lib/galaxy_test`, `navigation.yml`).
- `FormDataContextButtons` "Create a new …" / dropdown items. `buildersForCollectionType` never returns `list:list*`, so these are unaffected.
- `FormData` `noOptionsWarningMessage` and the drop alert, via `collectionTypeToText`. Text changes as intended. The no-options text was untested, so I added a test.
- `processingMode.mapOverUnit` / `FormDataProcessingHint` now say "one job per list of lists" / "The selected list of lists of pairs …". This is the motivating case.

**FormData.test.ts changes.** The original "falls back to raw collection types without a label" test used `list:list` as the unlabeled type. Adding the label would otherwise turn it into a labeled test. The commit keeps the same fixture as "names a nested list mapped over a list input" (now asserting "list of lists"). It moves the fallback test one level deeper (`list:list:list:list` / `list:list:list`) and adds "names nested list types" for `list:list:paired`. The marker test gained `list:list:paired` and `list:list:list` rows, so the `nested …` fallback is still asserted there too. The original intent is kept and coverage grew. Nothing was weakened.

**e5be2b7b4c0: selectors.** The five admin `remove_selected_*` XPaths go from `/i[contains(@class,'multiselect__tag-icon')]` to `/*[...]`. The direct-child step under the tag span, keyed by the label text, is precise. Element-agnostic matching is consistent with the branch's earlier CSS fix `tool_form.parameter_multiselect_tag_close` (`.multiselect__tag-icon`). No other `/i[...tag-icon]` or `i.multiselect__tag-icon` selectors remain in `client/src`, `lib/galaxy/selenium` or `lib/galaxy_test`. The `.share_with_view .multiselect__tag-icon` selectors are already element-agnostic, and `UserSharing.vue` renders its own icon. Consumers: `test_admin_role_and_user_forms.py` (`remove_selected_user`, `remove_selected_role`). `remove_selected_group` has no current callers.

**Fit with the whole branch.** Both commits follow `scope_evaluation.md` scope 2 exactly. The `processingMode.ts` doc-comment example was updated to stay true. No new abstractions are needed; the label map is the existing one.

</details>
