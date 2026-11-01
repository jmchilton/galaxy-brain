```yaml
documents:
  - path: vault/repositories/galaxy/issues/queued/24481/debrief.md
    why: Verified in-process reproduction (list, list:paired invalid; paired control valid), which code is unchanged on dev, and that column metadata survives precreation; the design question (normalize outer to list vs support more sample_sheet nesting) is left open.
  - path: vault/repositories/galaxy/issues/queued/24481/proposal.md
    why: The posted issue text with a runnable reproduction script that can be turned into a regression unit test (Tree.multiply + precreate_dataset_collection + validate).
  - path: vault/repositories/galaxy/branches/active/issue_24303_collection_type_prefix_26.2/implementation_debrief.md
    why: The sibling fix normalizes sample_sheet* to list* before applying type_prefix via CollectionTypeDescriptionFactory.for_prefixed_collection_type, and explicitly defers the outer mapping product to this issue; precedent for the normalize-to-list decision and for the matching client mirror.
    load_when: Choosing between normalizing the outer rank to list and extending the regex, or keeping server and editor consistent.
  - path: vault/repositories/galaxy/branches/active/issue_24303_collection_type_prefix_26.2/research.md
    why: Code map of type_description.py (multiply, validate, COLLECTION_TYPE_REGEX), tool_output_to_structure, create_collection and the tool_util-side lenient type check, with line references (against 26.2, so verify on 26.0).
    load_when: Locating the call sites where an output type is composed or validated.
  - path: vault/research/Component - Collections - Sample Sheets Backend.md
    why: Regex rules (sample_sheet only outermost; sample_sheet:list invalid), allow_implicit_mapping, mapping rules, and listed limitations/future work including sample_sheet:list. Stale on one point - section 12 says implicit outputs do not carry column_definitions/columns, but Tree.multiply preserves them.
  - path: vault/research/Component - Collection Tool Execution Semantics.md
    why: Explains precreate_output_collections, _mapped_output_structure, and Structure multiplication, which is the path this bug lives in. Its Tree.multiply snippet omits the columns_metadata/column_definitions carry-through.
  - path: vault/research/Component - Collection Models.md
    why: Tree / UninitializedTree / Leaf structures, CollectionTypeDescription.multiply, and the precreation sequence into DatasetCollection / HDCA models (including where column_definitions land).
    load_when: Changing Tree.multiply or precreate_dataset_collection, or asserting on model objects in tests.
  - path: vault/research/Component - Workflow Editor Terminals.md
    why: Client map-over propagation (stepMapOver, localMapOver, CollectionTypeDescription.append) and the sample_sheet asymmetry in terminals.ts; the editor composes mapped output types by string append just like the server.
    load_when: Deciding whether the editor (collectionTypeDescription.ts append, normalizeCollectionType) needs a mirror change and its vitest.
  - path: vault/projects/collection_semantics/COLLECTION_SEMANTICS_DOCS.md
    why: Plan for the collection_semantics.yml spec; the YAML has no sample_sheet entries on 26.0, so a mapped-output example would be a new documented, test-linked case.
    load_when: Deciding whether to add a collection_semantics.yml example or doc section.
  - path: vault/research/Component - Collections - Paired or Unpaired.md
    why: Shows how the compound-suffix type algebra (_normalize_collection_type, has_subcollections_of_type, effective_collection_type) is mirrored in Python and TS with shared YAML-driven tests.
    load_when: Touching the normalization helpers or adding mirrored Python/TS tests.
  - path: vault/research/PR 19305 - Implement Sample Sheets.md
    why: Origin of the sample_sheet type, its regex restriction and the rationale for outer-rank-only.
    load_when: Judging whether supporting sample_sheet:list is feasible (rank plugin, column validation per element).
  - path: vault/research/Component - API Tests Tools.md
    why: Where and how to add a fluent API/tool-execute test (test_tool_execute.py already has test_map_over_paired_or_unpaired_with_sample_sheet, with_sample_sheet populator).
    load_when: Writing the end-to-end regression for a list-output tool mapped over a sample sheet.
research_requests:
  - vault/agents/gx_research/todo/tool_output_collection_types_and_mapped_structure.md
```
