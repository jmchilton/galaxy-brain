**Acted on:** nothing in code. Kept `5d35c8c7db3` as a declaration-parity fix and recorded finding 1 as a follow-up: nested-record `fields` are not passed through `ConvertSampleSheetTool.copy_elements` and collection creation. Today no client or API path can build a `sample_sheet:record`.
**Not acted on:** finding 2 (help text): advertising a broken conversion would conflict with dev. Finding 3 (version bump): no bump for a typo fix. Finding 4: info only. The `5d35c8c7db3` commit message overstates this ("backend already converts"); left as-is to avoid another force-push, and the PR text should say declaration parity.

# Re-scope review: xsd_sample_sheet_collection_type_25.1 (7ccd03c658d..5d35c8c7db3)

Top line: both re-scope commits are safe to ship, with no blockers. The CI change is correct, and with `|| exit 1` CI now fails if the schema is broken or missing. The `convert_sample_sheet.xml` fix is right as a declaration: it removes the duplicate and matches the sibling tool and the backend helper. But it does **not** make `sample_sheet:record` conversion work. The scope evaluation's "user-facing gap" premise doesn't hold: 25.1 can't create a nested record collection at all, and if one existed the converter would fail on it. The PR wording should say "declaration parity", not "record sheets now convert". No security concerns.

## Findings

1. **Medium (claim accuracy).** In 25.1, `sample_sheet:record` input to the converter fails end-to-end. `ConvertSampleSheetTool.copy_elements` (`lib/galaxy/tools/__init__.py` ~4729) rebuilds each nested element as `{"src": "new_collection", "collection_type": "record", "elements": ...}` and doesn't include `fields`. `CollectionManager.__recursively_create_collections_for_elements` (`managers/collections.py` ~612) wouldn't pass `fields` on even if it were there. `RecordDatasetCollectionType.generate_elements` then raises `RequestParameterMissingException: Missing or null parameter 'fields' required for record types.` I reproduced this by calling `builder.build_collection(record_plugin, {...}, fields=None)` directly. It's moot in practice, because such inputs can't be created in 25.1:
   - the client's `SampleSheetGrid.vue:537` logs "sample_sheet:record not yet implemented, this will fail"
   - the API nested-identifier path (`__recursively_create_collections_for_identifiers`) also drops `fields`
   - `CollectionBuilder.build` (output discovery) never passes `fields`
   - no API test creates `list:record` or `sample_sheet:record`

   dev has the same gaps. **Fix:** keep the commit, since it is a harmless one-token parity fix that removes an obvious duplicate. Word the commit/PR text as "declare `sample_sheet:record` to match `sample_sheet_to_tabular.xml` and `_sample_sheet_to_list_collection_type`; nested-record rebuild (propagating `fields`) is a separate follow-up". Don't claim the conversion works. Don't touch the tool help. Alternative: drop `5d35c8c7db3` if John wants the PR to contain only working behavior. Making it actually work isn't 25.1 material: it needs `sub_collection["fields"] = dce_object.fields` plus `fields=element.get("fields")` in the manager recursion, and a test fixture that 25.1 can't build through public paths.
2. **Low (no action): help text.** The help mapping lists only three conversions and leaves out `record`. Leave it as is. Adding a fourth line would advertise a conversion that fails (finding 1), and it would conflict on merge-forward with dev's rewritten help (`f841fc1e261`).
3. **Info (no action): version.** No version bump is needed. Precedent is mixed: `518fa136d99` added `record` to `__EXTRACT_DATASET__` without a bump, while `2ff11415bdd` bumped 1.0.1→1.0.2 for `paired_or_unpaired`. A bump on a core model-operation tool means keeping old and new XML side by side (as `filter_failed` 1.1.0 does), which is excessive for a stable-branch typo fix. Widening an input's accepted types can't change outputs for existing inputs, so job and workflow reproducibility is unaffected.
4. **Info (verified): `|| exit 1` is safe.** tox runs `bash .ci/validate_test_tools.sh` (`tox.ini:77`). The CircleCI `validate_test_tools` job installs `libxml2-utils` before `tox -e validate_test_tools`. The new path exists, and `xmllint --noout lib/galaxy/tool_util/xsd/galaxy.xsd` passes locally. The lines are byte-identical to `issue_23978_parameter_tools_xsd` lines 5–7, so that merge-forward hunk resolves cleanly. Exit status was already fail-on-error through the final `sh scripts/validate_tools.sh`. This change only makes a bad or missing XSD fail fast instead of printing an error and moving on.

<details>
<summary>Full review</summary>

### Diff reviewed
- `c7bf3b5e22f` `.ci/validate_test_tools.sh`: `xsd_path` changes from `lib/galaxy/tools/xsd/galaxy.xsd` (which doesn't exist) to `lib/galaxy/tool_util/xsd/galaxy.xsd`, and `xmllint` gets `|| exit 1` plus an updated comment.
- `5d35c8c7db3` `lib/galaxy/tools/convert_sample_sheet.xml:16`: the trailing duplicate `sample_sheet` becomes `sample_sheet:record`.
- Sanity pass over `origin/release_25.1..HEAD`: 3 files, +29/-11. XSD pattern and docs changes were already reviewed in `normal_review.md`. There is one incidental trailing-whitespace removal at `galaxy.xsd` ~L828, a pre-commit artifact that's harmless and consistent with dev. Nothing else changed.

### convert_sample_sheet end-to-end trace (sample_sheet:record)
1. Param selection: the `collection_type` list now accepts `sample_sheet:record` HDCAs. Before, they were rejected at selection.
2. `ConvertSampleSheetTool.produce_outputs` calls `_sample_sheet_to_list_collection_type("sample_sheet:record")` and gets `"list:record"` (`sample_sheet_workbook.py:632`). OK.
3. `copy_elements`: each row DCE is a `record` collection (`is_collection`), so the code builds `sub_collection` with `collection_type = "record"` and copies the datasets one level down. There is **no `fields` key**. `dce_object.fields` is available and would be the value to copy.
4. `output_collections.create_collection(..., collection_type="list:record", elements=...)` leads to `create_dataset_collection`. Because `has_subcollections`, it calls `__recursively_create_collections_for_elements`, which then calls `create_dataset_collection(collection_type="record", elements=sub_elements)` with no `fields`. From there `build_collection(record_plugin, fields=None)` leads to `RecordDatasetCollectionType.generate_elements`, which raises `RequestParameterMissingException`. Confirmed with a direct call in the 25.1 worktree: `fields=None` raises, and explicit fields build fine.
5. Reachability: in 25.1 there's no public path that creates a nested record collection. The client stub says it isn't implemented. The API identifier recursion drops `fields`. `CollectionBuilder.build` passes no `fields`. So the failing path can't be hit today, and the change carries no regression risk.

### Version/help
- Help (`convert_sample_sheet.xml` Description) lists only three mappings. dev rewrote this help with SVG schematics in `f841fc1e261`, and that rewrite doesn't mention record either. Editing help here would conflict with dev and overclaim what works.
- Tool version stays `1.0.0`. See finding 3 for precedent.

### CI context
- `tox.ini:76-77` `[testenv:validate_test_tools] commands = bash .ci/validate_test_tools.sh`.
- `.circleci/config.yml:73-82` uses `cimg/python:3.10`, `apt-get install -y libxml2-utils`, and `tox -e validate_test_tools`. `xmllint` is present, so `|| exit 1` can't fire just because the binary is missing.
- `scripts/validate_tools.sh` still validates each tool against the same XSD with `--schema`. The early lint is a fast-fail guard, not the only check.

### Tests
- No new tests were added. That's consistent with the "tiny fix, no dedicated test" precedent, and a `sample_sheet:record` API test can't be written on 25.1 without first implementing nested-record creation.
</details>
