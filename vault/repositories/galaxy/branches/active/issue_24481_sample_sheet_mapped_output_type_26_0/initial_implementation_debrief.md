# Initial implementation debrief: #24481

```text
created /home/ubuntu/projects/repositories/galaxy-brain/vault/repositories/galaxy/branches/active/issue_24481_sample_sheet_mapped_output_type_26_0/differential-review/snapshots/20261101T145255Z-implementation-bc2552c1950f.json
  implementation @ bc2552c1950f vs origin/release_26.0 (merge-base 0593b5e15412)
  first snapshot: 5 commits, 10 files, 12 hunks
```

## What changed

Mapping a tool whose output is a nested collection (`list`, `list:paired`, ...) over a sample sheet used to compose `sample_sheet:list`-style types. The API test confirms the old code ran the jobs and stored a populated collection of that invalid type. The fix keeps `sample_sheet` as the outer level only when the composed type is valid (`sample_sheet:paired|record|paired_or_unpaired`). Otherwise the leading `sample_sheet` is demoted to `list` (`sample_sheet:list` → `list:list`, `sample_sheet:paired` × `list` → `list:paired:list`).

- `map_over_collection_type` (`type_description.py`) applies the rule, so `Tree.multiply`, `UninitializedTree.multiply` and the effective structure built in `matching.py` all get it.
- `Tree.multiply` drops `columns_metadata` and `column_definitions` when the result is no longer a sample sheet. A plain list cannot carry them, and `precreate_dataset_collection` would otherwise copy them onto the list.
- The subworkflow output types the editor sees (`WorkflowContentsManager._resolve_collection_type`) now go through `map_over_collection_type` instead of string concatenation. The normal review found this.
- Client: `CollectionTypeDescription.append` mirrors the rule with the same regex.

## Choices

- **Base `release_26.0`.** Sample sheets exist from 25.1, but 25.1 has no sample_sheet-as-list normalization for mapping, on the server or the client. The fix builds on that normalization.
- **Normalize to `list` rather than extend sample sheet nesting.** This is the smaller, release-appropriate fix. It matches the issue_24303 branch, which treats a `sample_sheet` as `list` before prefixing. The cost is that sample sheet column metadata is dropped on the demoted outer level. Extending the valid types to `sample_sheet:list` etc. would be a feature for `dev`.
- Baseline tests come first (three commits) and pin the valid compositions and column preservation. The subworkflow baseline commit sits after the first fix commit because force-pushing to reorder was not permitted; the branch manager may reorder it.

## Tests

- Unit: `test/unit/data/dataset_collections/test_structure.py` (multiply plus precreate, including column handling) and `test_type_descriptions.py` (composition table). `test/unit/workflows/test_modules.py` adds subworkflow map-over cases.
- Client: `collectionTypeDescription.test.ts` (`append`).
- API: `test_tool_execute.py`:
  - `test_map_paired_output_over_sample_sheet` (baseline): `sample_sheet:paired` keeps its columns.
  - `test_map_list_output_over_sample_sheet` (regression): `list:list`, populated, with no columns. Before the fix it fails on the type assertion.
- All of these pass locally: 192 unit tests, 95 editor-module vitest tests, and the 3 sample sheet API tests.

## Known limitations

- Unlinked cross products where the sample sheet is not the leading level (`list` × `sample_sheet`, `sample_sheet` × `sample_sheet`) still compose `list:sample_sheet`, and the inner trees keep their columns. This predates the branch and the fix doesn't make it worse; it's a candidate follow-up.
- Expect a merge-forward conflict in `type_description.py` with the issue_24303 work on 26.2.

## Process notes

- `git stash` is shared across worktrees. A concurrent agent's stash was popped into this worktree by mistake. It was reverted immediately, the other agent's stash entry was left intact, and this worktree no longer uses stash.
- Run pytest with `-p no:postgresql`, because the `.venv` has no libpq.
