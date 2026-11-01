**Recommendation: keep.** The branch as re-scoped (`5d35c8c7db3`) is the right size. It has the XSD `sample_sheet` fix, core-tool lint coverage, the XSD self-lint path fix and the `convert_sample_sheet.xml` `sample_sheet:record` declaration fix. The re-scope review's medium finding should go to a follow-up, not into this PR: a real `sample_sheet:record` input to `ConvertSampleSheetTool` would fail because nested-record `fields` aren't threaded through `copy_elements` and `CollectionManager.__recursively_create_collections_for_elements`. No path on 25.1 or dev can create that input. The client grid stubs it as "not yet implemented", and the API identifier recursion and output discovery drop `fields` too. So the fix couldn't be tested red→green without first building nested-record creation. It would also touch shared collection-manager code that carries a "need test case first" TODO, which goes well past an XSD/lint bug. That fix belongs with whoever makes `sample_sheet:record` creatable, on dev. The only action needed here is wording: the PR text should call `5d35c8c7db3` "declaration parity", not working conversion. This is the second evaluation, and nothing here calls for another scope change.

Size: 3 files, +29/-11 (5 commits). Under 100 lines, so there's no decomposition section.

## 1. As implemented (post re-scope), recommended

`CollectionType` and `CollectionTypeList` in the XSD accept `sample_sheet(:(paired|paired_or_unpaired|record))?` as the outermost type only, and there's a docs sentence. `.ci/validate_test_tools.sh` is shellcheck-clean, lints the XSD at its real path with fail-fast, and also validates plain core tools (`data_fetch.xml`, `sample_sheet_to_tabular.xml`). `convert_sample_sheet.xml` now declares `sample_sheet:record` instead of a duplicate `sample_sheet`.

| Pros | Cons |
|---|---|
| <ul><li>Fixes the reported bug with runtime-regex parity, and the requested lint test goes red→green</li><li>Related bugs in touched files are fixed: the XSD self-lint path and the converter duplicate</li><li>Three reviews (normal, re-scope, Codex) found no blockers</li><li>The CI hunk is byte-identical to 23978, so the merge-forward stays small</li></ul> | <ul><li>`5d35c8c7db3` declares a type that wouldn't convert if it could be created. Harmless because unreachable, but the commit message overstates it ("backend already converts"), so the PR text has to correct it</li></ul> |

## 2. Expand: thread nested-record `fields` through sample sheet conversion

Add `sub_collection["fields"] = dce_object.fields` in `ConvertSampleSheetTool.copy_elements`, and pass `fields=element.get("fields")` in `__recursively_create_collections_for_elements`, so `sample_sheet:record` → `list:record` works end to end.

| Pros | Cons |
|---|---|
| <ul><li>Makes the `5d35c8c7db3` declaration real instead of aspirational</li><li>The code change is only a few lines</li></ul> | <ul><li>Can't be tested on 25.1 or dev: no public path builds a nested record collection, so there's no red→green</li><li>Touches the shared `CollectionManager` recursion on a release branch, and that code has a "need test case first" TODO</li><li>Only one of several `fields` drops. The identifier recursion and `CollectionBuilder.build` would still lose them, so a partial fix invites a false sense of support</li><li>Far from the reported XSD/lint bug. It's feature work for nested records</li></ul> |

Not recommended. This is the "modest expansion" the default leans toward, but it fails the proportionality test: it's untestable and touches shared infrastructure with no reachable path. Follow-up on dev, together with whatever work makes `sample_sheet:record` creatable (client `SampleSheetGrid.vue` stub, API identifier `fields`).

## 3. Contract: drop `5d35c8c7db3` (converter declaration)

Ship only the XSD, lint and CI path fixes, and leave the duplicate `sample_sheet` in `convert_sample_sheet.xml`.

| Pros | Cons |
|---|---|
| <ul><li>The PR then contains only behavior that verifiably works</li><li>No wording caveat needed</li></ul> | <ul><li>Leaves an obvious duplicate typo in a tool on the same theme</li><li>The declaration is already right per the sibling tool and `_sample_sheet_to_list_collection_type`. The deferred fix would have to redo it anyway</li><li>Another force-push and re-review for no user benefit</li></ul> |

Not recommended. It's the alternative the re-scope review offered if John wants only working behavior in the PR, so it's his call.

## 4. Contract: back out the whole re-scope (alt `_alt_original_scope`)

Return to `7ccd03c658d`.

| Pros | Cons |
|---|---|
| <ul><li>Smallest PR</li></ul> | <ul><li>Leaves the broken XSD self-lint path in the file this PR rewrites</li><li>Reverses an expansion that two reviews found safe</li></ul> |

Not recommended.

## 5. Expand: XSD-model internal `<type class>` tools

This was already rejected in the first evaluation (a design call for the public schema, large, and unrelated). Nothing has changed.

<details>
<summary>Notes</summary>

- Checked on head `5d35c8c7db3`: `__recursively_create_collections_for_identifiers` (`managers/collections.py:579`) forwards only `collection_type` and `element_identifiers`. `create_dataset_collection` has `# TODO: Pass fields here - need test case first.` (~L361). Both confirm the gap is systemic, not local to the converter.
- The first evaluation's premise that record sheets could already feed the converter was wrong, as the re-scope review showed. The declaration fix is still worth keeping on parity grounds alone.
- Leaving the `5d35c8c7db3` commit message as-is is fine. Fixing its wording at the next natural rebase, rather than with a dedicated force-push, is optional.
</details>
