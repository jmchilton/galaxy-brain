# Preparation debrief: collection input type validation

Prepared 2026-10-26 from [the original draft](tool_api_collection_input_type_not_validated.md). The [proposed issue](proposed_tool_api_collection_input_type_not_validated.md) remains in `to_file/` for John's decision. No issue was posted.

## Recommendation

Post the proposed issue as a focused parameter-validation bug. The mismatch is reproduced on real Galaxy parameter and collection objects, with the exercised validation methods verified against current upstream `dev`. It affects the collection-input contract across tools, so it is substantial enough for a separate issue. Do not present it as an end-to-end API execution or workflow failure.

If posted, assignment to jmchilton is reasonable because this finding arose from his #24303 implementation work. Filing, assignment, and index updates await John's decision under `PREPARE_TO_FILE.md`.

## Evidence

- Read the source draft, `PREPARE_TO_FILE.md`, shared issue-description and show-me rules, synchronization and security rules, and Galaxy project-management guidance.
- Queried upstream `dev` on GitHub: `557e7f327839dd3ec0adee0b0660e7ed0d3c7fe2`. The local Galaxy checkout is `1e6125acd93b22a682043509e9549b124546fd25`, so it was not treated as current without comparison.
- Downloaded pinned upstream `lib/galaxy/tools/parameters/basic.py` to a temporary file. Compared ASTs for `DataCollectionToolParameter.from_json` and `BaseDataToolParameter.validate` with the local methods actually executed. Both are identical.
- Ran a six-case reproduction with actual Galaxy `DataCollectionToolParameter`, `DatasetCollection`, `DatasetCollectionElement`, dataset, and history-collection association objects. A session substitute resolves the submitted ID to the constructed collection. No collection resolver or validation method is patched.
- Each collection contains two datasets, with `list:list` containing two child lists. This avoids making the failure depend on an empty collection.

```text
from_json and validate ASTs match upstream dev 557e7f327839dd3ec0adee0b0660e7ed0d3c7fe2
accepts=list             supplied=paired       direct_match=False from_json=accepted validate=accepted
accepts=paired           supplied=list         direct_match=False from_json=accepted validate=accepted
accepts=list             supplied=list:list    direct_match=False from_json=accepted validate=accepted
accepts=list,list:paired supplied=paired       direct_match=False from_json=accepted validate=accepted
accepts=list             supplied=sample_sheet direct_match=True  from_json=accepted validate=accepted
accepts=list             supplied=list         direct_match=True  from_json=accepted validate=accepted
```

Also extracted and ran the exact standalone Python example in the proposed issue:

```text
direct_match: False
accepted: True
```

## Duplicate and context checks

Searched Galaxy issues and PRs for collection validation, collection-type mismatches, `collection_type`, and invalid `data_collection` inputs. Broader searches explicitly included `in:title,body`. Narrow quoted searches returned no results, which was not taken as proof of uniqueness. No matching duplicate was identified among the returned candidates.

- [#24303](https://github.com/galaxyproject/galaxy/issues/24303) concerns declarative output type prefixes, not rejection of incompatible direct input types.
- [#24220](https://github.com/galaxyproject/galaxy/issues/24220) and [#24453](https://github.com/galaxyproject/galaxy/pull/24453) concern tool-form drag-and-drop matching. The PR explicitly describes itself as client-only and does not change server acceptance.
- [#11063](https://github.com/galaxyproject/galaxy/pull/11063), “Add validation for collection parameters,” is merged. Current inherited validation applies dataset validators and min/max counts, without checking declared collection type.
- [#22923](https://github.com/galaxyproject/galaxy/issues/22923) is a closed report about request-schema rejection of `src=dce` when rerunning a mapped job. It is a different validation problem.
- [#23444](https://github.com/galaxyproject/galaxy/issues/23444) concerns nested parameter references in tool output sources.

## Rewrite decisions and limitations

The opener and table describe the reproduced validation mismatch. The proposal includes pinned code links, a runnable populated-collection example, and explicit limits on what was tested. It requests consistent direct-input rejection without prescribing an implementation, so it does not need Proposed Approach or Alternative Approaches sections.

Removed the source draft's claims that ordinary command-line tools run with the wrong template structure. That consequence was not tested. The original Nest 1.1.0 observation belongs to an implementation branch, and its API test asserts only a 400 and unchanged history counts. It does not establish where validation failed, so the proposal does not use that test as proof of a late error on current `dev`.

Workflow invocation was inspected only as context. `MapOverPlanner` tries direct matching and map-over, but inspection alone does not establish how an invalid connection reaches execution. No workflow behavior is claimed. Valid batch/map-over behavior, unrestricted inputs, adapters, and collection-element inputs were not exercised in this reproduction. The `sample_sheet` and matching `list` rows are positive controls, not a complete compatibility suite.

## Review and verification

Completed exactly one fresh subagent review under `PREPARE_TO_FILE.md`. The reviewer independently reran all six cases and the exact proposal snippet, confirmed the pinned-method comparison, checked cited sources and duplicate candidates, and revised the proposal in place. Changes tightened the opener to parameter validation and corrected the inherited `validate()` line link. The reviewer recommended posting the narrowed proposal. No egregious premise or duplicate was found.

The review identified two additional distinctions: [#24414](https://github.com/galaxyproject/galaxy/issues/24414) concerns user-defined tool value shapes across routes, and closed [#18506](https://github.com/galaxyproject/galaxy/issues/18506), fixed by [#18535](https://github.com/galaxyproject/galaxy/pull/18535), concerns workflow runtime collection mapping. The reviewer also confirmed that #24453 explicitly lists `from_json` type validation as a follow-up.

`make validate` passed: 126 files, 0 errors, 15 existing advisory warnings. These agent documents need no frontmatter and do not change index or dashboard sources. No Galaxy project files were modified. Remaining limits are the untested HTTP submission, eventual job outcome, and workflow behavior already disclosed in the proposal.
