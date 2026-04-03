# Workflow JSON Schema Validation Plan

## Context

We have meta-model-based workflow validation in `validate-workflow.ts` that:
- Structurally validates workflows via Effect Schema (`NativeGalaxyWorkflowSchema` / `GalaxyWorkflowSchema`)
- Walks tool steps, builds Effect Schema meta models per tool via `createFieldModel()`, injects connections, validates state
- Uses `workflow_step_native` for native .ga, two-pass `workflow_step` → `workflow_step_linked` for format2

We also have JSON Schema infrastructure:
- `schema.ts` CLI command exports JSON Schema from meta models via `JSONSchema.make(effectSchema)`
- `parameter-specification-json-schema.test.ts` validates tool state JSON Schemas against the spec using AJV Draft 2020-12
- Galaxy-side commit `4cd245e` implements an equivalent `--mode json-schema` for Python validation

Goal: add a `--mode json-schema` path to `validate-workflow.ts` that mirrors the meta-model validation but uses AJV + generated JSON Schema instead of `S.decodeUnknownEither`.

---

## Step 1 — Add `--mode` CLI option

**File:** `packages/cli/src/index.ts` (or wherever `validate-workflow` subcommand is wired)

- Add `--mode <pydantic|json-schema>` option (default: current behavior, i.e. `"effect"`)
  - Use names `"effect"` and `"json-schema"` (Galaxy uses `"pydantic"` / `"json-schema"`; we mirror with `"effect"`)
- Thread `mode` into `ValidateWorkflowOptions`
- Optionally add `--tool-schema-dir` for offline mode (pre-exported schemas), mirroring Galaxy

**Test:** CLI smoke — `galaxy-tool-cache validate-workflow foo.ga --mode json-schema` parses without error.

---

## Step 2 — Structural validation via JSON Schema

**File:** new `packages/cli/src/commands/validate-workflow-json-schema.ts` (or inline in existing file — prefer separate to keep the file manageable)

### 2a — Generate structural JSON Schema from Effect schemas

```ts
import * as JSONSchema from "effect/JSONSchema";
const nativeStructSchema = JSONSchema.make(NativeGalaxyWorkflowSchema);
const format2StructSchema = JSONSchema.make(GalaxyWorkflowSchema);
```

Cache these (they're static). Compile with AJV once.

### 2b — Validate structural

```ts
const ajv = new Ajv2020({ allErrors: true, strict: false });
const validate = ajv.compile(structSchema);
const valid = validate(data);
if (!valid) { /* collect errors */ }
```

Convert AJV errors to same `StepValidationResult`-compatible shape. Mirror Galaxy's `_convert_errors` pattern.

### 2c — Short-circuit

If structural fails, skip tool-state validation (matches Galaxy behavior).

**Test:** Red-to-green: a structurally invalid workflow (missing `steps`) fails structural validation via JSON Schema mode.

---

## Step 3 — Per-step tool state validation via JSON Schema (native)

Mirror `_validateNativeStep` but swap `S.decodeUnknownEither` for AJV:

```ts
async function validateNativeStepJsonSchema(
  step, stepLabel, toolId, toolVersion, cache, validatorCache
): Promise<StepValidationResult> {
  // 1. Resolve tool from cache (same as meta model path)
  // 2. Scan for replacements → skip if "yes" (same)
  // 3. Deep copy state, inject connections (same)
  // 4. Build JSON Schema:
  //    const effectSchema = createFieldModel(bundle, "workflow_step_native");
  //    const jsonSchema = JSONSchema.make(effectSchema);
  //    const validate = ajv.compile(jsonSchema);  // cache by tool_id@version
  // 5. validate(state) → collect errors
}
```

Key details:
- Cache compiled AJV validators by `tool_id@tool_version` (same as Galaxy's `_validator_cache`)
- Use `onExcessProperty: "ignore"` equivalent — AJV's default is to allow extra properties unless schema says `additionalProperties: false`; our Effect schemas use `S.Struct` which emits `additionalProperties: false`, so we may need `ajv.compile(schema, { ... })` or patch the schema. Check behavior — the meta-model path uses `onExcessProperty: "ignore"`, so JSON Schema path should also be lenient. May need to strip `additionalProperties: false` from generated schema or use AJV's `removeAdditional` option.
- `injectConnectionsIntoState` + `scanForReplacements` are format-agnostic; reuse directly

**Test:** Red-to-green on a native workflow with a known-valid step — passes via JSON Schema mode.

---

## Step 4 — Per-step tool state validation via JSON Schema (format2)

Mirror the two-pass strategy:

### 4a — Base pass (workflow_step)
```ts
const baseSchema = JSONSchema.make(createFieldModel(bundle, "workflow_step"));
const baseValidate = ajv.compile(baseSchema);
baseValidate(state);
```

### 4b — Linked pass (workflow_step_linked)
If connections exist:
```ts
const linkedState = structuredClone(state);
injectConnectionsIntoState(bundle.parameters, linkedState, connections);
const linkedSchema = JSONSchema.make(createFieldModel(bundle, "workflow_step_linked"));
const linkedValidate = ajv.compile(linkedSchema);
linkedValidate(linkedState);
```

Cache validators for both representations.

**Test:** Red-to-green on a format2 workflow with connections — linked pass catches/accepts connected values correctly.

---

## Step 5 — Offline mode (--tool-schema-dir)

Mirror Galaxy's `_load_tool_state_validator_from_dir`:

```ts
function loadToolSchemaFromDir(
  toolId: string,
  toolVersion: string | null,
  schemaDir: string,
): object | null {
  const safeId = toolId.replace(/\//g, "~");
  const version = toolVersion ?? "_default_";
  // Try {schemaDir}/{safeId}/{version}.json, fallback to _default_.json
}
```

When `--tool-schema-dir` is provided, load pre-exported schemas instead of generating from cache. Falls through to dynamic generation if file not found and cache is available.

**Test:** Export a schema with `galaxy-tool-cache schema`, put it in the dir layout, validate a workflow against it.

---

## Step 6 — Subworkflow recursion

Both native and format2 JSON Schema paths need to recurse into subworkflows exactly as the meta-model paths do. Factor out the recursion logic or just duplicate the pattern (it's small).

**Test:** Validate a workflow with an embedded subworkflow via JSON Schema mode.

---

## Step 7 — IWC sweep test for JSON Schema mode

**File:** `packages/cli/test/iwc-sweep.test.ts` or new `iwc-sweep-json-schema.test.ts`

Add a parallel sweep that runs all IWC workflows through the JSON Schema validation path. Compare:
- Same skip set (tools not in cache, replacement params)
- Same pass/fail counts (ideally identical to meta-model sweep)

Any divergence between meta-model and JSON-Schema results = bug to investigate. The sweep is the proof that JSON Schema validation is equivalent.

**Test:** `GALAXY_TEST_IWC_DIRECTORY=... pnpm test -- iwc-sweep` passes with 0 new failures.

---

## Step 8 — Error formatting parity

AJV errors are shaped differently than Effect `ParseResult` errors. Normalize to same output format:
- `path.to.field: message`
- Use AJV's `instancePath` (slash-separated) → convert to dot-separated

Factor error conversion into a shared helper.

---

## Step 9 — CLI parameter sync with Galaxy

Galaxy's `gxwf-state-validate` has:
- `--mode pydantic|json-schema`
- `--tool-schema-dir`
- `--strip` (for native workflows — strip stale keys before validation)

Our CLI should mirror:
- `--mode effect|json-schema` (already in step 1)
- `--tool-schema-dir` (step 5)
- `--strip` — we don't currently have stale key stripping; defer or add if needed

---

## Implementation Order

| # | Step | Est. scope | Depends on |
|---|------|-----------|------------|
| 1 | CLI `--mode` option | S | — |
| 2 | Structural JSON Schema validation | M | 1 |
| 3 | Native per-step JSON Schema validation | L | 1, 2 |
| 4 | Format2 two-pass JSON Schema validation | L | 1, 2 |
| 5 | Offline `--tool-schema-dir` | M | 3 or 4 |
| 6 | Subworkflow recursion | S | 3, 4 |
| 7 | IWC sweep (JSON Schema) | M | 3, 4, 6 |
| 8 | Error formatting parity | S | 3, 4 |
| 9 | CLI param sync / `--strip` | S | — |

Red-to-green path: steps 1→2→3→7 gets us to a validated native JSON Schema path with IWC coverage. Then 4→7 extends to format2. Steps 5, 8, 9 are polish.

---

## Architecture Notes

- **Single AJV instance**, shared across all validations. Create once at module level with `allErrors: true, strict: false`.
- **Validator caching** by `tool_id@tool_version@representation` — same tool in different steps shouldn't recompile.
- **additionalProperties handling** — the meta-model path uses `onExcessProperty: "ignore"`. JSON Schema generated from `S.Struct` will have `additionalProperties: false`. Options:
  1. Post-process generated schema to remove `additionalProperties` constraints
  2. Use AJV's `removeAdditional: true` option
  3. Accept stricter validation in JSON Schema mode (may cause divergence)
  - Recommend option 2 (`removeAdditional: true` on the AJV instance) for parity. Investigate whether this causes any issues in the IWC sweep.
- **New file vs inline** — prefer a new `validate-workflow-json-schema.ts` that exports `validateNativeStepsJsonSchema` / `validateFormat2StepsJsonSchema`, called from the existing `runValidateWorkflow` based on `mode`. Keeps the main file clean, mirrors Galaxy's separate `validation_json_schema.py`.

---

## Resolved Questions

- **Stale keys / `--strip`:** The meta-model path uses `onExcessProperty: "ignore"` which silently skips unknown keys. For JSON Schema mode, `S.Struct` emits `additionalProperties: false` — so we must handle this to maintain parity. Use AJV's `removeAdditional: true` option or post-process the generated schema to strip `additionalProperties` constraints. This is critical for IWC sweep parity since real workflows have many stale/bookkeeping keys. Implementing proper stale key cleaning + dropping `onExcessProperty: "ignore"` tracked in jmchilton/galaxy-tool-util-ts#5.
- **Native structural validation:** Galaxy skips it, but we have `NativeGalaxyWorkflowSchema`. Tracked as jmchilton/galaxy-tool-util-ts#4 — not blocking for this work, skip for now to maintain Galaxy parity.

## Resolved During Implementation

- **`additionalProperties` strategy:** Recursive `stripAdditionalProperties()` on generated schema before AJV compilation. Simpler and more reliable than AJV's `removeAdditional` option which mutates data.
- **AJV dependency:** Added as runtime dependency to `packages/cli`. Bundle size acceptable.
- **Regex empty-string handling:** JSON Schema `pattern` keyword doesn't respect Galaxy's "empty = not set" convention. Fixed by wrapping patterns as `(^$|<original>)` in the JSON Schema annotation.
- **Regex flags divergence:** JSON Schema `pattern` doesn't support regex flags (s, i, m). When Python regex has inline flags, we skip the JSON Schema pattern annotation (runtime filter still validates).
- **JSON Schema target:** Must pass `{ target: "jsonSchema2020-12" }` to `JSONSchema.make()` — without it, Effect defaults to Draft-07 which AJV Draft 2020-12 rejects.
- **Python→JS regex /u compatibility:** AJV validates `pattern` values in unicode (`/u`) mode, which is stricter than standard JS regex. Three fixes applied to `pythonToJsRegex` / new helpers:
  1. `^(?flags)` — handle inline flags after leading `^` anchor (not just at position 0)
  2. `stripPythonIdentityEscapes()` — remove `\_`, `\'`, `\"` etc. (Python allows identity escapes for any char; JS /u mode only allows escaping syntax chars). Correctly skips `\\` (escaped backslash).
  3. `fixBracketCharClass()` — convert `[]]` → `[\]]` (legacy PCRE/Python idiom invalid under /u)
  4. `jsonSchemaSafePattern()` — /u pre-flight safety net; falls back to skipping annotation if conversion still fails
  - These eliminated all 16 JSON Schema skips, achieving full parity with Effect mode.

## IWC Sweep Results

| Mode | Validated | Skipped | Failed |
|------|-----------|---------|--------|
| Effect (meta-model) | 2515 | 0 | 0 |
| JSON Schema (AJV) | 2515 | 0 | 0 |

Full parity between both validation modes.

## Remaining Questions

1. Should we add a `--compare-modes` flag for development that runs both effect and json-schema and reports divergences?
