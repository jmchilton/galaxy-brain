# Plan: JSON Schema Generation & Validation Testing

**Repo:** `galaxy-tool-util` (TS)
**Upstream branch:** `json_schema_parameters` in Galaxy (4 commits)
**Goal:** Generate JSON Schema from Effect models, validate against `parameter_specification.yml`, match the Python-side `test_parameter_specification_json_schema.py` test coverage.

---

## Context: What the Python Side Did (4 Commits)

### Commit 1: `d06e043a` — Foundation
- New test file `test_parameter_specification_json_schema.py`:
  - Iterates `parameter_specification.yml` entries
  - For each tool + state representation, generates JSON Schema from Pydantic via `to_json_schema(model)`
  - Validates `_valid` entries pass and `_invalid` entries fail using `jsonschema.Draft202012Validator`
  - Introduced `json_schema_skip` dict in YAML entries — keys are `{rep}_invalid` entries where the Python AfterValidator-only constraints can't be represented in JSON Schema (expression, empty_field, early in_range/regex/length)
- Bug fixes in `json.py`: `_fix_conditional_oneofs` (makes discriminated union branches unambiguous), `_fix_collection_runtime_oneofs` (converts `oneOf` → `anyOf` for nested collections), `_normalize_annotated_types_keywords` (Pydantic emits `ge`/`gt`/`le`/`lt` instead of `minimum`/`exclusiveMinimum` for Union types)

### Commit 2: `c2a667be` — In-range, length, regex in JSON Schema
- `parameters.py`: Added `_json_schema_annotations_for()` and `_json_schema_extra_for_validators()` — emits `annotated_types.Ge/Gt/Le/Lt`, `MinLen/MaxLen`, regex `pattern`, and negated length via `not:{minLength,maxLength}` as native JSON Schema keywords
- `decorate_type_with_validators_if_needed()` now attaches annotations alongside the runtime `AfterValidator`
- Removed `json_schema_skip` entries for in_range, length, regex (they now pass)

### Commit 3: `92b430f4` — Color pattern + negated length
- `ColorParameterModel.field_kwargs()` now emits `json_schema_extra: {pattern: "^#[0-9a-f]{6}$"}`
- Removed color `json_schema_skip`
- Removed negated length `json_schema_skip` (negated length emits `not:{minLength,maxLength}`)

### Commit 4: `e8d71557` — Rename `json_schema_skip` → `_json_schema_skip`
- Underscore prefix prevents the existing Pydantic test from trying to parse skip entries as test cases
- Added `_json_schema_valid_skip` for valid-side skips (not currently used but reserved)

### Net YAML Changes
The Python-side `parameter_specification.yml` has 21 more lines than our copy — all `_json_schema_skip` entries for validators that remain AfterValidator-only:
- `gx_text_expression_validation`: expression validator (request_invalid, workflow_step_linked_invalid)
- `gx_text_empty_validation`: empty_field validator (request_invalid, job_internal_invalid, job_runtime_invalid, workflow_step_linked_invalid)
- `gx_directory_uri`: regex AfterValidator (request_invalid, job_internal_invalid, job_runtime_invalid)
- `gx_directory_uri_validation`: regex/length/expression combo (request_invalid, workflow_step_linked_invalid)
- `gx_hidden_validation`: regex/length/expression combo (request_invalid, workflow_step_linked_invalid)

Also some non-skip structural changes: `dce` src ordering in data collections, YAML anchor additions for `data_optional` job_runtime entries.

---

## Current State: TS Side

### What Works
- **Effect Schema validation** via `S.decodeUnknownEither` — 2087+ tests passing against `parameter_specification.yml`
- **JSON Schema generation** already exists via `JSONSchema.make()` from `@effect/schema/JSONSchema` — used by CLI (`schema` command) and server (`/api/tools/.../schema` endpoint)
- **`gx-color`** already uses `S.pattern(/^#[0-9a-fA-F]{6}$/)` which emits correct JSON Schema

### The Gap
All 6 validators use `S.filter()` (runtime-only). `JSONSchema.make()` **throws** on `S.filter()` unless a `jsonSchema` annotation is provided. This means:

| Validator | Current Implementation | JSON Schema Emittable? |
|-----------|----------------------|----------------------|
| `in-range` | `S.filter()` with manual min/max logic | **Yes** — use `S.greaterThanOrEqualTo()` etc. or `jsonSchema` annotation |
| `regex` (non-negated) | `S.filter()` with `RegExp.test()` | **Yes** — use `S.pattern()` or `jsonSchema: {pattern}` |
| `length` (non-negated) | `S.filter()` with `.length` checks | **Yes** — use `S.minLength()`/`S.maxLength()` or annotation |
| `length` (negated) | `S.filter()` with inverted check | **Yes** — `jsonSchema: {not: {minLength, maxLength}}` |
| `expression` | `S.filter()` parsing Python expression | **No** — runtime only, needs `_json_schema_skip` |
| `empty_field` | `S.filter()` checking length === 0 | **No** — runtime only, needs `_json_schema_skip` |

**Key insight:** Effect Schema provides first-class JSON Schema support — `S.greaterThanOrEqualTo()`, `S.lessThan()`, `S.minLength()`, `S.maxLength()`, `S.pattern()` all emit correct JSON Schema keywords. We can either:
- **Option A:** Replace `S.filter()` with Effect Schema built-in combinators where possible (cleaner, idiomatic)
- **Option B:** Keep `S.filter()` and add `jsonSchema` annotation option (minimal diff)

**Recommendation:** Option A for in-range, regex, length. These combinators emit better JSON Schema and provide better error messages. Keep `S.filter()` for expression and empty_field (truly runtime-only).

---

## Implementation Plan

### Step 1: Sync `parameter_specification.yml` from Galaxy + Add Makefile Target

The TS copy is slightly out of sync with the Python source (dce ordering, YAML anchor deduplication for data_optional job_runtime, plus the new `_json_schema_skip` entries). The `yaml` npm package handles anchors/aliases natively, so we can copy the file directly.

Add a `sync-param-spec` Makefile target following the existing `sync-golden` pattern:

```makefile
# Sync parameter_specification.yml from Galaxy repo.
#   GALAXY_ROOT=~/projects/worktrees/galaxy/branch/json_schema_parameters make sync-param-spec
PARAM_SPEC_SRC = $(GALAXY_ROOT)/test/unit/tool_util/parameter_specification.yml
PARAM_SPEC_DST = packages/schema/test/fixtures/parameter_specification.yml

sync-param-spec:
ifndef GALAXY_ROOT
	$(error GALAXY_ROOT is not set. Point it at your Galaxy checkout.)
endif
	@test -f "$(PARAM_SPEC_SRC)" || (echo "ERROR: $(PARAM_SPEC_SRC) not found" && exit 1)
	@echo "Syncing parameter_specification.yml from $(PARAM_SPEC_SRC)..."
	cp $(PARAM_SPEC_SRC) $(PARAM_SPEC_DST)
	@echo "Synced."
```

Also update the `.PHONY` line to include `sync-param-spec`, and consider a top-level `sync` target that runs both:

```makefile
sync: sync-golden sync-param-spec
```

The existing `parameter-specification.test.ts` already skips unknown keys (anything not `{rep}_valid`/`{rep}_invalid`), so the new `_json_schema_skip` entries won't break existing tests.

**Test:** existing 2087 tests still pass after sync.

### Step 2: Upgrade Validators to Emit JSON Schema Keywords

#### 2a: `in-range.ts` — Use Effect Schema numeric combinators

Replace `S.filter()` with chained Effect Schema combinators:

```typescript
function applyInRange(schema: S.Schema.Any, validator: unknown): S.Schema.Any {
  const v = validator as InRangeValidatorModel;
  if (v.negate) {
    // Negated range — keep S.filter, add jsonSchema annotation
    return (schema as S.Schema<number>).pipe(
      S.filter((value: number) => { /* existing logic */ }, {
        jsonSchema: { not: buildRangeConstraint(v) }
      }),
    ) as S.Schema.Any;
  }
  // Non-negated: chain Effect Schema combinators
  let s = schema as S.Schema<number>;
  if (v.min != null) {
    s = v.exclude_min ? s.pipe(S.greaterThan(v.min)) : s.pipe(S.greaterThanOrEqualTo(v.min));
  }
  if (v.max != null) {
    s = v.exclude_max ? s.pipe(S.lessThan(v.max)) : s.pipe(S.lessThanOrEqualTo(v.max));
  }
  return s as S.Schema.Any;
}
```

**Test (red-to-green):** JSON Schema test for `gx_int_validation_range`, `gx_int_min_max`, `gx_float_validation_range`, `gx_float_min_max` entries should pass.

#### 2b: `regex.ts` — Use `S.pattern()` for non-negated

```typescript
function applyRegex(schema: S.Schema.Any, validator: unknown): S.Schema.Any {
  const v = validator as RegexValidatorModel;
  const re = new RegExp(v.expression);
  if (v.negate) {
    return (schema as S.Schema<string>).pipe(
      S.filter((value: string) => !re.test(value)),
    ) as S.Schema.Any;
  }
  // Non-negated: S.pattern emits JSON Schema "pattern" keyword
  // Python re.match anchors at start; add ^ if missing
  let pattern = v.expression;
  if (!pattern.startsWith("^")) pattern = "^" + pattern;
  return (schema as S.Schema<string>).pipe(S.pattern(new RegExp(pattern))) as S.Schema.Any;
}
```

**Consideration:** `S.pattern()` also validates at runtime, so we don't lose validation coverage. But the regex semantics differ slightly — Python `re.match` anchors at start, JSON Schema `pattern` does not by default. We prepend `^` like the Python side does.

**Test:** JSON Schema test for `gx_text_regex_validation` should pass.

#### 2c: `length.ts` — Use `S.minLength()`/`S.maxLength()` or negated annotation

```typescript
function applyLength(schema: S.Schema.Any, validator: unknown): S.Schema.Any {
  const v = validator as LengthValidatorModel;
  if (v.negate) {
    const notConstraint: Record<string, number> = {};
    if (v.min != null) notConstraint.minLength = v.min;
    if (v.max != null) notConstraint.maxLength = v.max;
    return (schema as S.Schema<string>).pipe(
      S.filter((value: string) => {
        let valid = true;
        if (v.min != null) valid = valid && value.length >= v.min;
        if (v.max != null) valid = valid && value.length <= v.max;
        return !valid;
      }, { jsonSchema: { not: notConstraint } }),
    ) as S.Schema.Any;
  }
  let s = schema as S.Schema<string>;
  if (v.min != null) s = s.pipe(S.minLength(v.min));
  if (v.max != null) s = s.pipe(S.maxLength(v.max));
  return s as S.Schema.Any;
}
```

**Test:** JSON Schema test for `gx_text_length_validation`, `gx_text_length_validation_negate` should pass.

#### 2d: `expression.ts` and `empty-field.ts` — Add `jsonSchema` passthrough annotation

These validators can't be represented in JSON Schema. Add `jsonSchema: {}` annotation so `JSONSchema.make()` doesn't throw — it will simply emit the base type without constraint keywords.

```typescript
// expression.ts - add jsonSchema annotation to prevent JSONSchema.make() throw
S.filter((value: string) => { /* existing */ }, {
  jsonSchema: {},  // not representable — covered by _json_schema_skip in tests
})
```

Same for `empty-field.ts`.

**Test:** JSON Schema generation should no longer throw for tools with expression/empty_field validators. The `_json_schema_skip` entries tolerate these `_invalid` entries passing.

### Step 3: Fix `gx-color` JSON Schema Pattern

`gx-color.ts` already uses `S.pattern(/^#[0-9a-fA-F]{6}$/)`. The Python side uses `^#[0-9a-f]{6}$` (lowercase only). The case-insensitive regex in TS accepts uppercase hex digits which is more permissive. Check whether this matters for JSON Schema validation — the test fixture only has lowercase color values, so this should be fine. No change needed unless tests fail.

### Step 4: Handle Structural JSON Schema Issues

The Python side needed three post-processing fixes in `json.py`. Check if Effect Schema's `JSONSchema.make()` has analogous issues:

1. **Conditional `oneOf` disambiguation** — Python Pydantic emits overlapping `oneOf` branches for conditionals because the discriminator is a callable. Effect Schema uses `S.Union` with `S.Literal` discriminators — check if this produces clean `oneOf` or needs fixing.

2. **Collection runtime `oneOf` → `anyOf`** — Pydantic's nested collection discriminator overlap. Effect Schema may handle this differently — verify with a data_collection test case.

3. **Annotated types keyword normalization** — Pydantic emits `ge`/`gt` instead of `minimum`/`exclusiveMinimum` for Union types. Effect Schema emits standard keywords — likely no fix needed.

**Approach:** Write JSON Schema test first, then fix issues as they surface. These fixes likely live in a new utility function that post-processes `JSONSchema.make()` output, or they may not be needed at all.

### Step 5: Write JSON Schema Test

Create `packages/schema/test/parameter-specification-json-schema.test.ts` mirroring the Python test structure:

```typescript
import { describe, it, expect, afterAll } from "vitest";
import * as JSONSchema from "@effect/schema/JSONSchema";
import Ajv from "ajv/dist/2020";  // or jsonschema equivalent
import { createFieldModel } from "../src/schema/model-factory.js";
// ... same imports as parameter-specification.test.ts

describe("parameter specification (JSON Schema)", () => {
  for (const [toolName, combos] of Object.entries(specification)) {
    describe(toolName, () => {
      const bundle = loadBundle(toolName);
      if (!bundle) { it.skip(...); return; }
      // ... skip logic same as existing test

      const jsonSchemaSkip: Record<string, string> = combos._json_schema_skip ?? {};
      const jsonSchemaValidSkip: Record<string, string> = combos._json_schema_valid_skip ?? {};

      for (const [specKey, testCases] of Object.entries(combos)) {
        if (specKey.startsWith("_")) continue;
        // ... parse rep + valid/invalid from specKey

        const effectSchema = createFieldModel(bundle, stateRep);
        if (!effectSchema) { it.skip(...); continue; }

        let jsonSchema;
        try { jsonSchema = JSONSchema.make(effectSchema); }
        catch { it.skip(`JSON Schema generation failed for ${stateRep}`); continue; }

        for (let i = 0; i < testCases.length; i++) {
          it(`${specKey}[${i}]`, () => {
            const valid = ajv.validate(jsonSchema, testCases[i]);
            if (isValid && !valid && !(specKey in jsonSchemaValidSkip)) {
              expect.fail(`valid entry REJECTED: ${JSON.stringify(testCases[i])}`);
            }
            if (!isValid && valid && !(specKey in jsonSchemaSkip)) {
              expect.fail(`invalid entry ACCEPTED: ${JSON.stringify(testCases[i])}`);
            }
          });
        }
      }
    });
  }
});
```

**JSON Schema validator choice:** Python uses `jsonschema.Draft202012Validator`. In TS, options:
- `ajv` with draft 2020-12 support (most popular, fast)
- `@cfworker/json-schema` (lightweight, draft 2020-12)
- `@hyperjump/json-schema` (spec-compliant, draft 2020-12)

**Recommendation:** `ajv` — well-maintained, fast, widely used. Add as devDependency to `packages/schema`.

### Step 6: Validate & Iterate

Run the JSON Schema test. Expected outcomes:
- Tools with no validators → should pass immediately
- Tools with in-range/regex/length validators → should pass after Step 2
- Tools with expression/empty_field validators → `_invalid` entries accepted (tolerated by `_json_schema_skip`)
- Conditional/container tools → may surface structural issues (Step 4)

Fix any issues discovered. The Python side had to iterate on conditional oneOf and collection oneOf — we may hit similar or different issues due to Effect Schema's different JSON Schema generation approach.

---

## Implementation Order

| Step | What | Effort | Blocked By | Test Approach |
|------|------|--------|------------|---------------|
| 1 | Add `sync-param-spec` Makefile target + run sync | 10m | — | Existing 2087 tests still green |
| 2a | Upgrade `in-range.ts` to emit JSON Schema keywords | 20m | — | Red: JSON Schema test fails for int/float range. Green: passes |
| 2b | Upgrade `regex.ts` to use `S.pattern()` | 15m | — | Red: JSON Schema test fails for regex. Green: passes |
| 2c | Upgrade `length.ts` to use `S.minLength/maxLength` | 15m | — | Red: JSON Schema test fails for length. Green: passes |
| 2d | Add `jsonSchema: {}` to expression + empty_field validators | 10m | — | `JSONSchema.make()` no longer throws for these tools |
| 3 | Verify gx-color JSON Schema | 5m | — | Color pattern in JSON Schema output |
| 4 | Fix structural JSON Schema issues (if any) | 30m | 5 | Discovered during test run |
| 5 | Write `parameter-specification-json-schema.test.ts` + add ajv dep | 30m | 1 | All non-skipped entries pass |
| 6 | Iterate on failures | 30m | 2-5 | Full green |

Steps 1 and 5 should come first (test infrastructure), then 2a-2d (validator upgrades), then 3-4 (structural fixes), then 6 (iteration).

Practical order: **1 → 5 → 2d → 2a → 2b → 2c → 3 → 4 → 6**

Start with the test (even though it'll have many failures), then incrementally fix validators to go red→green.

---

## Unresolved Questions

- `ajv` vs other JSON Schema validator for TS tests? ajv is standard but check if it handles Draft 2020-12 `not:{minLength,maxLength}` correctly
- Does `JSONSchema.make()` handle `S.Union(fieldSchema, ConnectedValueSchema)` for `workflow_step_linked`? Or does it need special handling?
- Effect Schema emits Draft-07 (`$schema: "http://json-schema.org/draft-07/schema#"`) — Python uses Draft 2020-12. Does this matter for keyword compatibility?
- Should we add a `toJsonSchema()` utility in the schema package that wraps `JSONSchema.make()` with any needed post-processing, parallel to Python's `to_json_schema()`?
- Non-string types with `regex` validator (e.g., `directory_uri` which is `AnyUrl`) — Python side emits pattern via `json_schema_extra` because `StringConstraints` is incompatible with `AnyUrl`. Does Effect Schema's `S.pattern()` work on non-string types?
- Do we need to keep runtime `S.filter()` validation alongside the new JSON Schema-emitting combinators, or do the combinators provide identical validation semantics?
