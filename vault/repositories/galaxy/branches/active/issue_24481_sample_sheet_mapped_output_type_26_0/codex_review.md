Run via gpt-6.1-sol (Codex reported no reasoning effort).

# Codex review (re-hardening round)

**Codex made one finding. It is a real gap but is not fixed on this branch. It is recorded as a known limitation, grouped with review 2's `type_source` finding.** The review was of HEAD `25e8710ad19` against `release_26.0`. Codex's shell sandbox could not start (bwrap nested in this session's sandbox), so the diff, the full post-change core files and the relevant excerpts were inlined in the prompt. The rejected first attempt and that workaround are described in [earlier_drafts/1/codex_review.md](earlier_drafts/1/codex_review.md).

## Triage

- **NEEDS-DECISION: completed or job-created child collections are not retyped (P1, `structure.py`/`managers/collections.py:147-155`).**
  - In `precreate_dataset_collection`, a completed job's output collection is attached as-is. Fresh jobs also create their own output collections in `tools/actions/__init__.py` `create_collection`.
  - If a mapped tool's *own* output is a `sample_sheet`, those children keep the `sample_sheet` type and columns under a parent that is now typed `list:list`.
  - Before this branch the parent would have been the equally invalid `list:sample_sheet`.
  - Confirmed in the code. It is reachable only when a tool output resolves to `sample_sheet`. No in-tree tool declares a fixed `sample_sheet` output, but `type_source` pointing at a sample sheet input does resolve to one.
  - It is the same case as review 2's `type_source` finding, and belongs to the #24303/#24308 `type_source` work, or a deliberate follow-up that retypes per-job collections.
  - Not fixed here.

Refuted: none.

<details>
<summary>Raw findings</summary>

```json
{
  "coverage": {
    "files_reviewed": [
      "client/src/components/Workflow/Editor/modules/collectionTypeDescription.ts",
      "client/src/components/Workflow/Editor/modules/collectionTypeDescription.test.ts",
      "lib/galaxy/model/dataset_collections/type_description.py",
      "lib/galaxy/model/dataset_collections/structure.py",
      "lib/galaxy/model/dataset_collections/matching.py",
      "lib/galaxy/managers/collections.py",
      "lib/galaxy/managers/workflows.py",
      "lib/galaxy/tools/execute.py",
      "lib/galaxy/tools/actions/__init__.py",
      "client/src/components/Workflow/Editor/modules/terminals.ts",
      "lib/galaxy_test/api/test_tool_execute.py",
      "lib/galaxy_test/base/populators.py",
      "test/unit/data/dataset_collections/test_structure.py",
      "test/unit/data/dataset_collections/test_type_descriptions.py",
      "test/unit/workflows/test_modules.py"
    ],
    "notes": "Reviewed supplied full files, diff, and excerpts only. Shell execution failed because the sandbox could not initialize; surrounding repository code and tests could not be inspected or run."
  },
  "findings": [
    {
      "severity": "P1",
      "category": "correctness",
      "file": "lib/galaxy/model/dataset_collections/structure.py",
      "line": 182,
      "title": "Demoting the structure does not demote reused completed output collections",
      "detail": "This changes the descriptive tree only. In precreate_dataset_collection, when completed_collection supplies a job, the manager attaches jtiodca.dataset_collection directly and skips recursion into the demoted substructure. A completed sample_sheet output therefore retains its original collection type and columns beneath a parent whose declared type now requires a list. The resulting collection's declared type and actual child types disagree.",
      "failure_scenario": "Map a tool producing sample_sheet collections over a list, with completed jobs available for reuse. multiply produces a list:list structure, but precreation attaches each completed job's sample_sheet collection unchanged. The implicit output declares list:list while its children remain sample_sheet collections carrying sample sheet metadata.",
      "confidence": "certain"
    }
  ]
}
```

</details>
