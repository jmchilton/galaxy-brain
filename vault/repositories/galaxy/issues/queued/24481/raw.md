# Mapping a collection-output tool over a sample_sheet input precomputes an invalid outer type (`sample_sheet:list…`)

Source: review during #24303 (`type_prefix`), branch `issue_24303_collection_type_prefix_26.2` (record `vault/repositories/galaxy/branches/active/issue_24303_collection_type_prefix_26.2/`). Read from code, not reproduced. Refs at `release_26.2` `e2649e52818`; re-pin against `dev`.

## Problem

When a tool whose output is a collection (fixed `collection_type="list"` / `"list:paired"`, or `type_source`) is mapped over a `sample_sheet*` input, the implicit output collection's type is computed by joining the mapping structure's type with the per-job output type:

- `lib/galaxy/model/dataset_collections/structure.py:166-170` `Tree.multiply`
- `CollectionTypeDescription.multiply` → `map_over_collection_type` (`type_description.py` ~252-275)

Neither handles `sample_sheet` or calls `validate()`. Mapping over `sample_sheet:paired` (subcollection `paired`) with a `list` output gives `sample_sheet:list`, and `list:paired` gives `sample_sheet:list:paired`. `COLLECTION_TYPE_REGEX` (`type_description.py:38-40`) only allows `sample_sheet` alone or as `sample_sheet:{paired,record,paired_or_unpaired}`, so both results are invalid. Dataset outputs (`sample_sheet` × leaf) are fine.

Question for triage: should a mapped sample_sheet output keep `sample_sheet` (needs column definitions/rows carried through — they belong to the outer elements, so it could arguably keep them) or normalize to `list` (`_sample_sheet_to_list_collection_type`, `types/sample_sheet_workbook.py:620-635`)? Check what the implicit-collection creation does with sample sheet metadata today.

## Repro idea (red test)

API test: create a `sample_sheet:paired` HDCA, run a test tool with a fixed `list` collection output (e.g. an existing `collection_type="list"` discover tool that accepts a `paired` input) mapped over `paired`; inspect the implicit collection's `collection_type`. Also the editor (`terminals.ts` map-over display) for the same case.

## Related

- #24303 (`type_prefix` makes this reachable for prefixed outputs too; its runtime helper validates per-job types but not the mapped product).
- sample_sheet collection_semantics section in `collection_semantics.yml`.
