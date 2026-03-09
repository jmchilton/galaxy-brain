# Plan: Surface Collection Semantics in the Galaxy UI

## Overview

Bridge the gap between the formal spec and the workflow editor UI. Currently the UI only says *whether* a connection is valid with terse reasons; the spec encodes formal knowledge about *what happens* and *why*.

## Data Delivery: Build-time TS Generation

Extend `semantics.py` to emit a TypeScript module alongside the Markdown doc. The spec data is static - an API endpoint would add unnecessary latency.

**Generated file:** `client/src/components/Workflow/Editor/modules/collectionSemanticsData.ts`

```typescript
export interface ConnectionSemantics {
  label: string;
  description: string;
  operation: "mapping" | "reduction" | "subcollection_mapping" | "direct";
  outputCollectionType: string | null;
  isValid: boolean;
  suggestion?: string;
}

// Keyed by "${outputCollectionType}->${inputType}"
export const connectionSemanticsMap: Record<string, ConnectionSemantics> = { ... };

export const collectionTypeDescriptions: Record<string, string> = {
  "list": "A list of datasets",
  "paired": "A pair of datasets (forward and reverse)",
  "paired_or_unpaired": "Either a single dataset or a paired dataset",
  // ...
};

export const mappingDescriptions: Record<string, string> = {
  "mapping": "The tool will be applied to each element, producing an implicit output collection.",
  "reduction": "The collection is consumed directly, reducing dimensionality.",
  "subcollection_mapping": "Sub-collections are fed to the tool, outer structure preserved.",
};
```

## UI Integration Points (6 phases)

### Phase 1: Enhanced Rejection Reasons in `terminals.ts`

Create `collectionSemantics.ts` helper with `getSemanticReason(outputType, inputType)` that looks up `connectionSemanticsMap`.

Replace hardcoded messages in `terminals.ts`:
- `InputCollectionTerminal.attachable()` (lines 616-671): `"Incompatible collection type(s)"` -> semantic lookup
- `InputTerminal.attachable()` (lines 461-524): various mapping rejection messages

Example:
- **Old:** `"Incompatible collection type(s) for attachment."`
- **New:** `"Cannot connect a paired collection to a list collection input. A paired collection is a tuple-like structure (forward/reverse), while a list input expects an ordered sequence."`

### Phase 2: Static Tooltips on Terminals

**`NodeInput.vue`**: Add hover tooltip showing what collection types the input accepts and expected behavior. E.g., hovering a `paired` collection input shows: "Accepts: paired collection. A list:paired output will be mapped over this input, producing a list output."

**`NodeOutput.vue`**: Enhance `outputDetails` (line 305) with descriptions from generated data via `collectionTypeToDescription()`.

### Phase 3: Collection Type Badges

Add small rounded pill badges next to terminal labels:
- `InputCollectionTerminal` with `["paired"]` -> badge shows `paired`
- `InputTerminal` with `multiple: true` -> badge shows `multi`
- When mapped over -> badge shows `list >> paired`

### Phase 4: Connection Line Tooltips

**`SVGConnection.vue`**: Add `<title>` inside SVG `<path>`:
- Valid connections: show operation type ("mapping over paired elements")
- Invalid connections: show reason from `invalidConnections` store

### Phase 5: Lint Panel Enhancement

**`Lint.vue`**: Add `LintSection` for invalid connections showing:
- Which steps are involved
- Semantic reason for invalidity
- Suggestion for fix

### Phase 6 (Optional): Collection Help Panel

New activity panel or section in Best Practices showing:
- Collection types used in current workflow
- Descriptions and behavior rules
- Could be new activity in `activities.ts`

## File Changes

### New Files
| File | Purpose |
|------|---------|
| `client/src/components/Workflow/Editor/modules/collectionSemanticsData.ts` | Generated data |
| `client/src/components/Workflow/Editor/modules/collectionSemantics.ts` | Helper functions |

### Modified Files
| File | Change |
|------|--------|
| `lib/galaxy/model/dataset_collections/types/semantics.py` | Add `generate_typescript()` function |
| `client/src/components/Workflow/Editor/modules/terminals.ts` | Use `getSemanticReason()` |
| `client/src/components/Workflow/Editor/NodeInput.vue` | Static tooltip, badge |
| `client/src/components/Workflow/Editor/NodeOutput.vue` | Enhanced details, badge |
| `client/src/components/Workflow/Editor/SVGConnection.vue` | `<title>` tooltips |
| `client/src/components/Workflow/Editor/modules/collectionTypeDescription.ts` | Add `humanReadableName()` |

## Testing Strategy (Red-to-Green)

**Phase 1:** Import generated data, validate structure against YAML spec. Test `getSemanticReason()` for known rejection scenarios.

**Phase 2:** Update `terminals.test.ts` rejection tests to expect richer reasons. Enhance messages one by one.

**Phase 3:** Snapshot tests for badge rendering on different terminal types.

**Phase 4:** Component tests checking `<title>` element content on SVG connections.

**Phase 5:** E2E tests verifying tooltip content during drag operations.

## Unresolved Questions

1. Generated TS file: check into source control or generate at build time only?
2. Verbose tooltips always-on or opt-in setting for experienced users?
3. Help panel: new activity bar entry or inside Best Practices?
4. Human-readable names for all collection types or just common ones?
5. Localize enhanced messages (i18n) or keep English-only like current messages?
