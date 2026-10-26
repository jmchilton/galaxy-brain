# Preparation debrief: mapped collection outputs over sample sheets

Prepared 2026-10-26 from [the original draft](mapped_output_over_sample_sheet_invalid_type.md). See [the proposal](proposed_mapped_output_over_sample_sheet_invalid_type.md).

## Existing work and duplicate check

Searched active and merged Galaxy branch records for sample sheet mapping, `sample_sheet:list`, multiplication, the source filename and #24303. No implementation branch for this specific problem was found.

- [The #24303 implementation debrief](../../../repositories/galaxy/branches/active/issue_24303_collection_type_prefix_26.2/implementation_debrief.md) explicitly leaves mapped sample sheet output types as a follow-up. Its scope evaluation and runtime review say the same. Normalizing a sample sheet when adding a per-job `type_prefix` is implemented there, but that does not repair the outer mapping product.
- #24226 concerns effective map-over structure for nested compound inputs, not multiplication by a per-job collection output. Its earlier draft's sample sheet truncation premise was rejected; that does not invalidate this distinct example.
- The XSD sample sheet branch concerns tool XML validation rather than mapped collection precreation. The collection matching branches concern input compatibility.
- Live GitHub searches across all issue states for `sample_sheet mapped in:body`, `"sample_sheet:list"`, and `"sample sheet" collection output` found related #24303, #24308, #24226 and #24220, but no dedicated duplicate. This is a targeted search, not proof none exists.

GitHub API reads succeeded after requesting network access; the initial sandbox connection errors were not authentication failures.

## Evidence and scope

Executed the proposal's in-process example in the installed Galaxy environment at `1e6125acd93b22a682043509e9549b124546fd25`. It exercises real `Tree.multiply`, real `DatasetCollectionManager.precreate_dataset_collection`, model collection objects and the real validator, with a constructed mapping tree and an uninitialized manager (that method needs no application/session for this path).

- `list` → `sample_sheet:list`, rejected by `validate()`.
- `list:paired` → `sample_sheet:list:paired`, rejected by `validate()`.
- Control: `paired` → `sample_sheet:paired`, accepted.
- Precreation retains `column_definitions` and the sample's `columns` in all three cases.

Downloaded upstream `dev`'s `structure.py` and `type_description.py` at `557e7f327839dd3ec0adee0b0660e7ed0d3c7fe2`. `structure.py` is identical to the tested checkout; the only `type_description.py` change is the unrelated compound `can_map_over` suffix-boundary fix. Multiplication and validation are unchanged. Also reran the reproduction with the downloaded upstream type-description module loaded directly: identical results.

No API job was submitted and no browser was exercised. The proposal describes the reproduced precomputation/precreation inconsistency, with no claim about job completion, a downstream crash or editor behavior. The source's metadata question is narrowed: metadata preservation already exists in the demonstrated path. Whether to normalize the outer type or extend supported sample sheet nesting remains a design decision; the proposal does not prescribe an implementation.

## Review and recommendation

One fresh-subagent review completed. The reviewer checked the runtime path, related issues and branch notes, clarified that precreation succeeds and the explicit validation call exposes the inconsistency, added assertions for preserved metadata, and added the column definition's required `optional: False` field. The reviewer reran the revised reproduction successfully and found no duplicate or blocking premise problem. There was one review round only.

Recommend posting this as a granular collection-type correctness issue, with the explicit in-process reproduction limitation. Nothing has been filed; the source remains in `to_file/` awaiting John's decision.

`make validate` passed: 126 files, 0 errors, 15 existing advisory warnings. `git diff --check` passed. No frontmatter or generated catalog/dashboard sources changed.
