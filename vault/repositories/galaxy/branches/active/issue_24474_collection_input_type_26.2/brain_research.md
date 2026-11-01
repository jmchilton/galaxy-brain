```yaml
documents:
  - path: vault/repositories/galaxy/issues/queued/24474/proposal.md
    why: The issue text with the six-case table (declared vs supplied type, direct_match vs from_json/validate) and a runnable parameter-layer reproduction; usable as a unit-test seed.
  - path: vault/repositories/galaxy/issues/queued/24474/debrief.md
    why: How the reproduction was verified against upstream dev, and what it does not establish (HTTP submission, job outcome, workflow invocation remain untested).
  - path: vault/research/Component - Collection Tool Execution Semantics.md
    why: Collection type hierarchy, map-over vs reduction, sub-collection mapping and paired_or_unpaired handling; defines which inputs must stay valid.
    load_when: Deciding which supplied types must still be accepted (map-over, reduction, nested types).
  - path: vault/repositories/galaxy/branches/active/issue_24220_drop_collection_matching_26.0/review_response_mvdbeek_1.md
    why: Notes server/client divergence on compound X:paired_or_unpaired and sample_sheet map-overs (listed by to_dict but failing at _split_dataset_collection); shows where a new check could disagree with the dropdown.
    load_when: Choosing between direct_match and can_map_over semantics, or touching paired_or_unpaired rewrites.
  - path: vault/repositories/galaxy/branches/active/issue_24220_drop_collection_matching_26.0/followup_issue_split_paired_or_unpaired.md
    why: Draft issue describing the same listing-vs-execution gap; confirms deepest-first can_map_over ordering.
    load_when: Reviewing edge cases for nested/paired_or_unpaired inputs.
  - path: vault/research/Component - Collection Adapters.md
    why: CollectionAdapter values reach DataCollectionToolParameter.from_json directly or as src dicts and carry their own collection_type; must not be rejected by the new check.
    load_when: Handling the CollectionAdapter / PromoteCollectionElementToCollectionAdapter branches of from_json.
  - path: vault/research/Component - Collections - Sample Sheets Backend.md
    why: sample_sheet satisfies list inputs (accepts() asymmetry) and DataCollectionToolParameter reads column_definitions; keep that compatibility.
    load_when: Writing sample_sheet test cases or touching column_definitions handling.
  - path: vault/research/Component - Collections - Paired or Unpaired.md
    why: Semantics of paired_or_unpaired as an input type (paired IS-A paired_or_unpaired) and how HistoryQuery direct_match/can_map_over treat it.
    load_when: Writing paired_or_unpaired / list:paired_or_unpaired test cases.
  - path: vault/research/Component - Collection Models.md
    why: HistoryQuery summary plus DatasetCollection / DCE / HDCA structure for building test fixtures.
    load_when: Constructing HDCA/DCE fixtures for unit tests.
  - path: vault/repositories/galaxy/branches/active/issue_24303_collection_type_prefix_26.2/index.md
    why: The sibling branch where this bug was found; touches sample_sheet-as-list normalization and collection type resolution in the same module.
    load_when: Checking for merge-forward conflicts or overlapping type handling.
  - path: vault/research/Problem - basic.py Parameter Hierarchy.md
    why: Structure of DataCollectionToolParameter / BaseDataToolParameter in basic.py (line numbers are stale; verify against the worktree).
    load_when: Deciding where in the class hierarchy the check belongs.
  - path: vault/research/Component - Tool State Dynamic Models.md
    why: Pydantic request/tool-state models for data_collection params, which may need to agree with any new parameter-level type check.
    load_when: Checking whether the tool request API path validates collection type separately.
research_requests:
  - vault/agents/gx_research/todo/collection_type_compatibility_and_input_matching.md
```
