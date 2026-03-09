# Plan: Auto-generate `terminals.test.ts` Cases from Collection Semantics Spec

## Overview

Use the YAML spec to auto-generate workflow editor terminal test cases instead of maintaining them manually. The spec already has `tests.workflow_editor` strings that directly map to `it()` clause descriptions in `terminals.test.ts` -- this 1:1 mapping is the foundation.

**Approach: Runtime generation within Vitest** (not build-time script). Import the YAML spec directly into a vitest test file using the existing `yamlPlugin()`, parse examples, and programmatically construct `it()` calls.

## Analysis: Spec-to-Test Mapping

Every spec example with `tests.workflow_editor` describes a connection scenario:

| Spec Field | Test Meaning |
|---|---|
| `assumptions.tool.in` | Input terminal type (`{i: dataset}`, `{i: "collection<paired>"}`, etc.) |
| `assumptions.collections.C` | Output collection type |
| `is_valid` (default true) | Whether `canAccept` returns true/false |
| `tests.workflow_editor` | The `it()` description string |

~29 spec entries map to tests across 4 categories:
- **A: Collection -> data input** (mapping)
- **B: Collection -> collection input** (direct match / sub-collection)
- **C: Collection -> multi-data input** (reduction)
- **D: Rejection cases** (`is_valid: false`)

## Enriched Spec Schema

Current spec doesn't encode enough to fully generate tests. Need to add structured `workflow_editor_test` field:

```yaml
- example:
    label: BASIC_MAPPING_PAIRED
    assumptions: [...]
    then: "..."
    tests:
        workflow_editor: "accepts paired data -> data connection"
        workflow_editor_test:
            output_step: "paired input"
            output_terminal: "output"
            input_step: "simple data"
            input_terminal: "input"
            expected_accept: true
            expected_map_over: {collectionType: "paired", isCollection: true, rank: 1}
```

Rejection case:
```yaml
        workflow_editor_test:
            output_step: "paired:paired input"
            output_terminal: "output"
            input_step: "list:paired collection input"
            input_terminal: "input1"
            expected_accept: false
```

### Pydantic Model Extension

```python
class WorkflowEditorTest(BaseModel):
    output_step: str
    output_terminal: str
    input_step: str
    input_terminal: str
    expected_accept: bool
    expected_map_over: Optional[dict] = None
    expected_reason: Optional[str] = None

class ExampleTests(BaseModel):
    tool_runtime: Optional[ToolRuntimeTest] = None
    workflow_editor: Optional[str] = None
    workflow_editor_test: Optional[WorkflowEditorTest] = None
```

## Full Step-to-Test Mapping Table

| workflow_editor description | output_step | input_step | accept | map_over |
|---|---|---|---|---|
| accepts paired data -> data connection | paired input | simple data | true | paired/1 |
| accepts paired_or_unpaired data -> data connection | paired_or_unpaired input | simple data | true | paired_or_unpaired/1 |
| accepts collection data -> data connection | list input | simple data | true | list/1 |
| accepts list:list data -> data connection | list:list input | simple data | true | list:list/2 |
| accepts list:paired_or_unpaired data -> data connection | list:paired_or_unpaired input | simple data | true | list:paired_or_unpaired/2 |
| accepts paired -> paired connection | paired input | paired collection input | true | null |
| accepts list -> list connection | list input | list collection input | true | null |
| rejects connecting paired -> list | paired input | list collection input | false | - |
| rejects connecting list -> paired | list input | paired collection input | false | - |
| treats multi data input as list input | list input | multi data | true | null |
| rejects paired input on multi-data input | paired input | multi data | false | - |
| accepts list:paired -> paired connection | list:paired input | paired collection input | true | list/1 |
| maps list:list over multi data input | list:list input | multi data | true | list/1 |
| rejects list:paired input on multi-data input | list:paired input | multi data | false | - |
| accepts paired -> paired_or_unpaired connection | paired input | paired_or_unpaired collection input | true | null |
| rejects paired_or_unpaired -> paired connection | paired_or_unpaired input | paired collection input | false | - |
| *(~14 more entries following the same pattern)* | | | | |

## Implementation Steps

### Step 1: Fix spec inconsistency
Rename `wf_editor` to `workflow_editor` on line 45 of `collection_semantics.yml`.

### Step 2: Extract shared test helpers
Move `useStores()`, `setupAdvanced()`, `rebuildTerminal()` from `terminals.test.ts` to:
`client/src/components/Workflow/Editor/modules/terminals.test-helpers.ts`

### Step 3: Add Vite resolve alias
In `client/vitest.config.mts`:
```typescript
"@spec": path.resolve(__dirname, "../lib/galaxy/model/dataset_collections/types"),
```

### Step 4: Create generated test file
`client/src/components/Workflow/Editor/modules/terminals.generated.test.ts`:

```typescript
import specYaml from "@spec/collection_semantics.yml";
import { setupAdvanced, useStores } from "./terminals.test-helpers";

const specEntries = (specYaml as SpecExample[]).filter(
    (entry) => "example" in entry && entry.example.tests?.workflow_editor_test
);

describe("collection semantics spec: workflow editor tests", () => {
    beforeEach(() => { /* pinia setup, terminals setup */ });

    for (const entry of specEntries) {
        const { label } = entry.example;
        const desc = entry.example.tests!.workflow_editor!;
        const spec = entry.example.tests!.workflow_editor_test!;

        it(`[${label}] ${desc}`, () => {
            const outputTerminal = terminals[spec.output_step]![spec.output_terminal]!;
            const inputTerminal = terminals[spec.input_step]![spec.input_terminal]!;
            const result = inputTerminal.canAccept(outputTerminal);
            expect(result.canAccept).toBe(spec.expected_accept);

            if (spec.expected_accept) {
                inputTerminal.connect(outputTerminal);
                if (spec.expected_map_over) {
                    expect(inputTerminal.mapOver).toEqual(spec.expected_map_over);
                } else {
                    expect(inputTerminal.mapOver).toBe(NULL_COLLECTION_TYPE_DESCRIPTION);
                }
                inputTerminal.disconnect(outputTerminal);
                expect(inputTerminal.mapOver).toEqual(NULL_COLLECTION_TYPE_DESCRIPTION);
            }
        });
    }
});
```

### Step 5: Populate spec with structured test data
Add `workflow_editor_test` entries one at a time, verifying each passes.

### Step 6: Add validation to `semantics.py`
Check that every `workflow_editor` entry also has `workflow_editor_test`, and that referenced step/terminal names exist in `parameter_steps.json`.

## What Stays Hand-Written

The spec only covers single-connection accept/reject. These must remain hand-written:
- `terminalFactory` class instantiation tests
- Multi-step constraint propagation (transitive map-over)
- `connect`/`disconnect` lifecycle tests
- `destroyInvalidConnections` tests
- `validInputTerminals` tests
- `producesAcceptableDatatype` tests
- Multi-data input with multiple individual connections
- `rebuildTerminal` stale state tests
- `filter_failed` collection_type_source resolution

Generated tests cover ~29 of ~50 test cases.

## Red-to-Green Strategy

1. **Red**: Create generated test file. Before populating `workflow_editor_test` in YAML, file has zero tests.
2. **Green**: Add entries one at a time, verify each passes against existing terminal logic.
3. **Refactor**: Mark hand-written equivalents as covered by spec. Optionally remove duplicates.

## Critical Files

| File | Role |
|------|------|
| `lib/galaxy/model/dataset_collections/types/collection_semantics.yml` | Enrich with `workflow_editor_test` |
| `client/src/components/Workflow/Editor/modules/terminals.test.ts` | Extract helpers, cross-reference |
| `lib/galaxy/model/dataset_collections/types/semantics.py` | Add `WorkflowEditorTest` model + validation |
| `client/src/components/Workflow/Editor/test-data/parameter_steps.json` | Fixture data for steps |
| `client/vitest.config.mts` | Vite resolve alias for YAML import |

## Unresolved Questions

1. Separate file (`terminals.generated.test.ts`) or merge into existing `terminals.test.ts` with spec-driven `describe` block?
2. Remove duplicate hand-written tests once generated versions work, or keep both?
3. Deep relative path vs Vite alias vs symlink for importing spec from `lib/` into `client/`?
4. Should `expected_reason` be required for rejection cases?
5. Fix `wf_editor` typo in this work or separate PR?
6. Should `parameter_steps.json` fixture additions be validated by `semantics.py check()`?
