# Codex review

Acted on the single finding (CONFIRMED): `getCollectionTypeFromInput` returned the declared `list:paired_or_unpaired` type for direct matches, while server (`tools/actions/__init__.py` ~1179-1185: `HistoryQuery.can_map_over` → declared type, else connected collection's actual type) keeps the connected type. Rewrote it in server order (map-over → declared type; direct match → connected type) and fixed the new test's expectations (`list` → `list`, `list:paired` → `list:paired`, added `list:list` map-over → `list:paired_or_unpaired`). Red-to-green; Workflow vitest 32 files / 199 tests pass. Amended into `d45d2fdb3bc`.

Not acted on: nothing else reported.

Side effect worth noting: `sample_sheet` connected to a `list` collection_type_source input now resolves to `sample_sheet` (was `list`), matching server.

## Details

```json
{
  "coverage": {
    "files_reviewed": [
      "client/src/components/Workflow/Editor/modules/collectionTypeDescription.ts",
      "client/src/components/Workflow/Editor/modules/collectionTypeDescription.test.ts",
      "client/src/components/Workflow/Editor/modules/terminals.ts",
      "client/src/components/Workflow/Editor/modules/terminals.test.ts",
      "client/src/components/Workflow/Editor/test-data/parameter_steps.json",
      "lib/galaxy/model/dataset_collections/type_description.py",
      "lib/galaxy/model/dataset_collections/query.py",
      "lib/galaxy/tools/actions/__init__.py"
    ],
    "notes": "Reviewed the full diff and relevant surrounding code. Vitest startup was blocked by the read-only sandbox; reproduced the finding using in-memory TypeScript transpilation."
  },
  "findings": [
    {
      "severity": "P1",
      "category": "correctness",
      "file": "client/src/components/Workflow/Editor/modules/terminals.ts",
      "line": 839,
      "title": "Preserve the concrete source type when the input matches directly",
      "detail": "The reversed canMatch now selects list:paired_or_unpaired for a connected list or list:paired, but the existing return at line 850 then reports that broader input type as the output type. The server preserves the connected collection type when no mapping occurs: HistoryQuery.can_map_over returns false here, and create_collection uses the source collection's actual type. Direct matches should preserve otherCollectionType; selecting the declared input type is appropriate for mapping. The new test encodes the incorrect broader output type.",
      "failure_scenario": "Connect a list output to a tool input declared as list:paired_or_unpaired whose output uses collection_type_source=\"input\". Connect that output to a downstream list input. The editor infers list:paired_or_unpaired and rejects the downstream connection as incompatible, although the server produces list. This rejection was reproduced in memory.",
      "confidence": "certain"
    }
  ]
}```
