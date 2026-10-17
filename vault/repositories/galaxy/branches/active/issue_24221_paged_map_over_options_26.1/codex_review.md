# Codex review

One finding, confirmed real but not acted on: needs a scope decision. No code changes.

Not acted on:
- **P1 map-over option shares the direct option's selection identity** (CONFIRMED, pre-existing). `FormSelect.vue:136,161,221,258` key and track selections by `itemUniqueKey` (src+id); `FormData.vue` resolves values by id+src. So with both entries listed, the map-over row can't be selected independently of the direct row. This already happens on 26.1 page one; this branch only makes later pages reach the same state. Dev fixes it in `9eff87c8e21`/`68b8d3969e5` on `issue_20657_input_processing_mode` (~400 lines, entangled with the map-over hint UI). Not filed as its own issue. Candidate: separate 26.1 issue/backport, or note as known limitation in the PR. Same as normal review L1.

Codex coverage note: pytest/vitest couldn't start in its sandbox; it ran the python unit assertions directly.

<details><summary>Raw Codex findings</summary>

```json
{
  "coverage": {
    "files_reviewed": [
      "lib/galaxy/tools/parameters/pagination.py",
      "lib/galaxy/tools/parameters/basic.py",
      "lib/galaxy_test/api/test_tools.py",
      "lib/galaxy_test/base/populators.py",
      "test/unit/app/tools/test_parameter_pagination.py",
      "client/src/components/Form/Elements/FormData/types.ts",
      "client/src/components/Form/Elements/FormData/types.test.ts",
      "client/src/components/Form/Elements/FormData/FormData.vue",
      "client/src/components/Form/Elements/FormData/FormData.test.ts",
      "client/src/components/Form/Elements/FormData/variants.ts",
      "client/src/components/Form/Elements/FormSelect.vue",
      "client/src/components/Form/Elements/FormSelection.vue",
      "client/src/components/Tool/ToolForm.vue",
      "client/src/components/Workflow/Run/WorkflowRunDefaultStep.vue",
      "client/package.json",
      "client/vitest.config.mts",
      "pytest.ini"
    ],
    "notes": "Full diff reviewed. Python unit assertions and additional boundary checks passed when executed directly. Pytest and Vitest startup were blocked by sandbox temporary-file restrictions; API tests were not run."
  },
  "findings": [
    {
      "severity": "P1",
      "category": "correctness",
      "file": "client/src/components/Form/Elements/FormData/types.ts",
      "line": 115,
      "title": "The preserved map-over option still shares the direct option's selection identity",
      "detail": "The new identity is used only for merging. FormSelect.vue still uses itemUniqueKey (src and id) for its multiselect keys and selected-state checks, so both preserved entries count as the same selection. FormData.vue also resolves currentValue and matchedValues by id and src alone, choosing the direct entry first. Consequently, preserving both entries does not make the mapped variant independently selectable. The option identity needs to reach these selection paths as well.",
      "failure_scenario": "Load a page containing both entries for a list:list HDCA accepted by collection_type=\"list,list:list\". Select its direct entry, then click its map_over_type=\"list\" entry. Both have the same multiselect key, so the mapped entry is treated as already selected: a required selector keeps the direct selection, and an optional selector clears it instead of selecting map-over.",
      "confidence": "certain"
    }
  ]
}
```

</details>
