# Plan: Normalized Format2 + Native Workflow Models (galaxy-tool-util)

## Step 0 — Restructure `packages/schema/src/workflow/` ✅

Move generated (raw) schemas into `packages/schema/src/workflow/raw/`:
- `gxformat2.ts`, `gxformat2.effect.ts`, `native.ts`, `native.effect.ts` → `raw/`
- New `raw/index.ts` re-exports everything the current `workflow/index.ts` does
- Update `workflow/index.ts` to re-export from `raw/` + will later export normalized types
- Update `Makefile` `generate-schemas` target output path to `workflow/raw/`
- Single internal consumer (`packages/schema/src/index.ts`) — import path unchanged
- Also added `sync-schema-sources` and `generate-schemas` to `.PHONY` (pre-existing gap)

## Step 1 — Expand Makefile sync targets ✅

- **`sync-workflow-fixtures`**: copy `$(GXFORMAT2_ROOT)/gxformat2/examples/format2/synthetic-*.gxwf.yml` and `native/synthetic-*.ga` → `packages/schema/test/fixtures/workflows/format2/` and `native/`
- **`sync-workflow-expectations`**: copy `$(GXFORMAT2_ROOT)/gxformat2/examples/expectations/*.yml` → `packages/schema/test/fixtures/expectations/`
- Both added to the `sync` aggregate (gated on `GXFORMAT2_ROOT`)
- Synced 26 fixtures + 7 expectation files, checked in

## Step 2 — Declarative test runner (red) ✅

New file: `packages/schema/test/declarative-normalized.test.ts`

- `loadExpectations()` — scan expectations dir, parse YAML, yield `[testId, case]`
- `navigate(obj, path)` — path elements: string (property access), number (index), `$length` (len), `{field: value}` (find-in-list)
- `assertValue()`, `assertValueSet()`, `assertValueContains()`
- Operation dispatch map — `normalized_format2` and `normalized_native` wired up; other operations in `UNSUPPORTED_OPERATIONS` set that skips with a message
- Unknown/uncategorized operations use `it.fails` (not `it.skip`) so new expectation files that reference novel operations surface visibly
- `for...of` loop over cases (vitest `it.each` not needed since expectations loaded at module scope)
- `FIELD_ALIASES` maps `in_` → `in`, `type_` → `type` (Pydantic reserved-word aliases → raw JSON keys)

Results: 16 red, 24 skipped (deferred operations), 0 green.

## Step 3 — Implement `normalizedNative` (Effect schemas, green) ✅

New: `packages/schema/src/workflow/normalized/native.ts`

**Schemas** (Effect `Schema.Struct`):
- `ToolReferenceSchema` — `{tool_id, tool_version}`
- `NormalizedNativeStepSchema` — all fields from raw `NativeStep` with narrowed types: `tool_state` always `Record<string, unknown>`, containers always non-null arrays/dicts, plus computed `connected_paths: Set<string>`
- `NormalizedNativeWorkflowSchema` — narrowed workflow with `tags: string[]`, typed `steps` dict, computed `unique_tools: Set<ToolReference>`
- Mutual recursion handled via `Schema.suspend(() => NormalizedNativeStepSchema)` in the workflow schema (workflow defined first, step defined second references workflow directly)

**Normalization rules** (`normalizedNative()` function):
- Parse `tool_state` JSON strings → objects
- Guarantee non-None containers: `inputs`, `outputs`, `workflow_outputs` → `[]`; `input_connections` → `{}`; `post_job_actions` → `{}`; `tags` → `[]`
- Normalize `input_connections` single values → arrays
- Normalize tags (empty string / CSV → array)
- Recursive normalization of `subworkflow`
- Computed: `unique_tools` (walk steps + subworkflows, collect `{tool_id, tool_version}` tuples), `connected_paths` per step (keys of `input_connections`)

Results: 7 native tests green + 4 unique_tools native tests green = 7 total green. 9 format2 tests still red.

### Lessons learned
- `Schema.Class` doesn't work for mutually recursive types (step ↔ workflow) — use `Schema.Struct` + `Schema.suspend` instead, matching the pattern in the raw generated schemas
- The normalizer returns plain objects conforming to the schema types (not class instances) — this works because `Schema.Struct` types are just interfaces
- `input_connections` values kept as `Schema.Array(Schema.Unknown)` rather than `NativeInputConnectionSchema` — raw fixture data doesn't always conform to the full typed connection shape

## Step 4 — Implement `normalizedFormat2` ✅

New: `packages/schema/src/workflow/normalized/format2.ts`

**Schemas** (Effect `Schema.Struct`, same pattern as native):
- `NormalizedFormat2WorkflowSchema` — label, doc, inputs/outputs/steps as arrays, computed `unique_tools: Set<ToolReference>`
- `NormalizedFormat2StepSchema` — id, tool_id, tool_version, run (recursive workflow or URL string), in/out as arrays, state, tool_state
- `NormalizedFormat2InputSchema`, `NormalizedFormat2OutputSchema`, `NormalizedFormat2StepInputSchema`, `NormalizedFormat2StepOutputSchema`

**Normalization rules** (all implemented):
- `$graph` extraction: find `main` workflow, inline `#ref` subworkflows into step `run`
- Dict→list for steps, inputs, outputs; keys become `id`
- Input shorthand expansion: `"data"` string → `{id, type: "data"}`
- Input type aliases: `"File"` → `"data"`, `"data_input"` → `"data"`, `"data_collection"` → `"collection"`
- Step `in` shorthand: `{input1: source}` → `[{id: "input1", source: "source"}]`
- Step `out` shorthand: string → `{id: string}`
- `$link` resolution: walk state for `{$link: "x"}` → replace with `{__class__: "ConnectedValue"}`, add corresponding `in` entry
- `tool_state` JSON string parsing (matching Python-side change)
- Populate step IDs from dict keys
- Join `doc` arrays to strings
- Computed: `unique_tools` (walk steps + recursive subworkflows)

**Gap coverage** — synced 6 new fixtures + 10 new test expectations from gxformat2 worktree covering: doc array joining, input type aliases (`data_input`, `data_collection`, `File`), step out shorthand, outputs dict→list, array-form inputs, tool_state JSON parsing, tags, `$link` resolution.

**Not implemented** (no test expectations, may belong at expanded level):
- `connectedPaths` — set of step input keys (native has this, format2 doesn't yet)
- `knownLabels` — set of all step/input labels

Results: 25 green (7 native + 9 original format2 + 9 gap coverage), 24 skipped (deferred operations), 0 red.

### Lessons learned
- `ToolReferenceSchema` shared from `native.ts` via import — no duplication needed (resolves unresolved question)
- `$link` resolution is a normalized-level concern in gxformat2 — Python normalizer handles it, test expectations confirm
- Python side also changed `tool_state` from pass-through to JSON-parsed at normalization time

## Step 5 — Export + shared types ✅

- `packages/schema/src/workflow/normalized/index.ts` — re-exports all format2 + native types/schemas/functions
- `packages/schema/src/workflow/index.ts` — re-exports raw + normalized
- `packages/schema/src/index.ts` — exposes all to package consumers

All normalized types, schemas, and normalizer functions accessible via `@galaxyproject/tool-util-schema` package import.

---

## Resolved questions

- **`in_` / `type_`**: Handled via `FIELD_ALIASES` map in test runner — maps Python Pydantic aliases to raw JSON keys used in TS objects.
- **Fixture sync destination**: `packages/schema/test/fixtures/workflows/` and `packages/schema/test/fixtures/expectations/` (colocated with existing parameter fixtures).
- **Classes vs interfaces**: `Schema.Struct` types (plain interfaces). `Schema.Class` doesn't work with mutual recursion. Normalizer returns plain objects.

## Unresolved questions

- On gxformat2 side: worth adding a `fixtures.yml` manifest listing files intended for cross-project sync? (gxformat2 now has `catalog.yml` which may serve this purpose)
- Should `connectedPaths` / `knownLabels` be added to format2 normalized model? No test expectations exist yet. May belong at expanded level.
