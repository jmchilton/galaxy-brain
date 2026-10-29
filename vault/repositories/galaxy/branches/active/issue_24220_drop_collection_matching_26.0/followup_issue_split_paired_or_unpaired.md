# Draft issue (not posted; galaxyproject/galaxy not greenlisted)

Title: Tool form lists `list:paired_or_unpaired` and `sample_sheet` map-overs that fail with "Cannot split collection in desired fashion."

## Body

The tool form dropdown (`DataCollectionToolParameter.to_dict`) lists map-overs that fail at submit in `_split_dataset_collection` (`lib/galaxy/model/dataset_collections/subcollections.py`) with `400 Cannot split collection in desired fashion.` Found in review of #24453, which now makes drag and drop refuse them.

**1. Compound `X:paired_or_unpaired` input types.** `collection_semantics.md` documents these as valid:

- `MAPPING_LIST_LIST_OVER_LIST_PAIRED_OR_UNPAIRED`: `list:list` mapped over a `list:paired_or_unpaired` input gives a flat `list`.
- `list:list:paired` mapped over a `list:paired_or_unpaired` input gives a flat `list`.

`/build` lists them with `map_over_type: list:paired_or_unpaired`, but `_split_dataset_collection` only splits on a literal suffix. `to_dict` (`basic.py`) and `WorkflowModule` (`workflow/modules.py`) both rewrite bare `paired_or_unpaired` to a literal split type (`paired` / `single_datasets`), but not compound types. Rewriting `X:paired_or_unpaired` to the collection's literal suffix (`X:paired` when the collection ends in `:X:paired`, else `X`) lets the existing split work. Each element is then consumed by `can_match_type` (`list` and `list:paired` both match `list:paired_or_unpaired`).

The yml examples only have `workflow_editor` tests, so add tool-run (API) coverage. Workflow invocation probably has the same gap; verify it.

Suggested shape: one helper on `CollectionTypeDescription` (with a TS mirror in `collectionTypeDescription.ts`) that gives the concrete split type, used by `to_dict`, `workflow/modules.py` and the client `collectionMatch.ts`. Then revert the compound refusal rows that #24453 added in `FormData.test.ts`.

**2. `sample_sheet` as a map-over target.** `sample_sheet` is only ever an outer type (`COLLECTION_TYPE_REGEX`), so no split yields one. `list:list` on a `sample_sheet` input (`__SAMPLE_SHEET_TO_TABULAR__`) is listed, with `map_over_type` `sample_sheet` or `sample_sheet:paired_or_unpaired`, and then fails. `match_multirun_collections` / `HistoryQuery.can_map_over` should not offer it.

**3. Deepest-first choice.** `HistoryQuery.can_map_over` picks the deepest matching type. Once a deeper type is unsplittable, a shallower one that works is never tried. For example, `list:list` on `["list:paired_or_unpaired", "paired_or_unpaired"]` is refused, though `paired_or_unpaired` (`single_datasets`) runs. Fixing (1) resolves this case.

## Open: target branch

`release_26.0` (matching #24453) or `dev`.
