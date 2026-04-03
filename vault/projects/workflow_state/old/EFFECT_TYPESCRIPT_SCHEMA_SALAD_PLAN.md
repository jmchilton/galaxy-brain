# Effect Schema TypeScript Backend for schema-salad-plus-pydantic

## Goal

New `--format effect-schema` option that generates TypeScript using [Effect Schema](https://effect.website/docs/schema/) instead of plain interfaces. Provides runtime validation, encoding/decoding, and discriminated union support -- analogous to what pydantic provides for Python.

## Architecture

New file `codegen_effect_schema.py` subclassing `CodeGenBase`, same pattern as `codegen_typescript.py`. Registered in `orchestrate.py` and `cli.py` as `"effect-schema"` format.

## Step 1: Create `codegen_effect_schema.py` ✅

Subclass `CodeGenBase`. Key mappings:

| schema-salad concept | Effect Schema output |
|---|---|
| Primitive `string` | `Schema.String` |
| Primitive `int/long/float/double` | `Schema.Number` |
| Primitive `boolean` | `Schema.Boolean` |
| Primitive `null` | `Schema.Null` |
| `Any` | `Schema.Unknown` |
| Record | `Schema.Struct({ ... })` exported as `const FooSchema = ...` + `type Foo = typeof FooSchema.Type` |
| Inheritance | `Schema.Struct({ ...ParentSchema.fields, childField: ... })` |
| Multi-symbol enum | `Schema.Literal("a", "b", "c")` exported as type alias |
| Single-symbol enum | `Schema.Literal("value")` |
| Optional field | `Schema.optional(T)` |
| Array | `Schema.Array(T)` |
| Union | `Schema.Union(A, B)` |
| Discriminated union | `Schema.Union(A, B)` where A/B have `Schema.Literal` discriminant -- Effect auto-detects this |
| `pydantic:alias` / field rename | Property name uses the alias directly |
| `pydantic:type` override | `_python_type_to_effect()` translates Python type -> Effect Schema equivalent |
| Abstract records | Emit schema, type alias exported |

### Implementation details

- Added `_union_type_str()` and `_type_ref_str()` template methods to `CodeGenBase` so `type_loader` can produce `Schema.Union(A, B)` and `FooSchema` references instead of `A | B` and `Foo`
- Extracted `split_top_level()` utility from TS backend into `codegen_base.py` (shared by both backends)
- Topological sort of struct definitions ensures dependencies come before dependents
- Circular references wrapped with `Schema.suspend((): Schema.Schema<any> => FooSchema)` -- typed return annotation breaks TypeScript inference cycles

**Output structure:**

```typescript
import { Schema } from "effect"

// Enums
export const StatusEnumSchema = Schema.Literal("active", "inactive", "pending")
export type StatusEnum = typeof StatusEnumSchema.Type

// Schemas (topologically sorted)
export const BaseRecordSchema = Schema.Struct({
  id: Schema.optional(Schema.Union(Schema.Null, Schema.String)),
})
export type BaseRecord = typeof BaseRecordSchema.Type

export const ChildRecordSchema = Schema.Struct({
  ...BaseRecordSchema.fields,
  status: Schema.optional(Schema.Union(Schema.Null, StatusEnumSchema)),
  "format-version": Schema.optional(Schema.Union(Schema.Null, Schema.String)),
  items: Schema.optional(Schema.Union(Schema.Record({ key: Schema.String, value: Schema.String }), Schema.Null)),
  tags: Schema.optional(Schema.Union(Schema.Null, Schema.Array(Schema.String))),
  members: Schema.optional(Schema.Union(
    Schema.Null,
    Schema.Array(Schema.Union(PersonMemberSchema, OrgMemberSchema))
  )),
})
export type ChildRecord = typeof ChildRecordSchema.Type

// Type guards for discriminated unions
export function isPersonMember(v: PersonMember | OrgMember): v is PersonMember {
  return v?.class === "Person";
}
```

## Step 2: Wire into orchestrator + CLI ✅

- `orchestrate.py`: `elif output_format == "effect-schema":` -> `EffectSchemaCodeGen`
- `cli.py`: `"effect-schema"` added to format choices

## Step 3: Handle `pydantic:type` overrides for Effect Schema ✅

`_python_type_to_effect()` function (parallel to `_python_type_to_ts()`):

- `dict[K, V]` -> `Schema.Record({ key: K, value: V })`
- `list[T]` -> `Schema.Array(T)`
- `str` -> `Schema.String`, etc.
- `Literal["x"]` -> `Schema.Literal("x")`
- Unions -> `Schema.Union(A, B)`

## Step 4: Handle `pydantic:alias` ✅

Alias used directly as the property name in the struct (same as TS backend). No `fromKey` needed for current use cases.

## Step 5: Tests -- `test_effect_schema_roundtrip.py` ✅

Tests exercise generated code through real tooling (tsc + node), not string matching. Same pattern as `test_typescript_roundtrip.py`.

### Infrastructure

Uses `nodejs-wheel` (already a test dependency) for `node` and `npm` binaries. A session-scoped pytest fixture:
1. Copies scaffolding (`package.json`, `tsconfig.json`) to a temp dir
2. Generates Effect Schema TS from the test schema into `generated.ts`
3. Runs `npm install` (installs `typescript`, `@types/node`, and `effect`)

### Scaffolding -- `tests/ts_project_effect/`

Committed files:

- **`package.json`** -- `{ "type": "module", dependencies: { "typescript": "^5", "@types/node": "^22", "effect": "^3" } }`
- **`tsconfig.json`** -- strict, noEmit, ESM, `allowImportingTsExtensions`

### Validation scripts (committed alongside scaffolding)

- **`validate_good.ts`** -- imports generated schemas, constructs valid data, calls `Schema.decodeUnknownSync()` on it, asserts decoded fields match. Also tests type guards if emitted. Exits non-zero on assertion failure.
- **`validate_bad_enum.ts`** -- constructs data with an invalid enum value (e.g. `status: 999`), calls `Schema.decodeUnknownSync()`, expects it to throw. Exits 0 if decode correctly rejects, exits 1 if it doesn't.
- **`validate_bad_discriminator.ts`** -- constructs data with a wrong discriminator literal, expects decode to throw.
- **`validate_alias.ts`** -- constructs data using the wire-name key (e.g. `"format-version"`), decodes, asserts the value round-trips correctly.

These scripts use `import { Schema } from "effect"` and import the generated schemas from `./generated.ts`.

### Test cases -- `test_effect_schema_roundtrip.py`

**Simple schema (tests/schemas/simple.yml):**

1. **`test_tsc_compiles`** -- `tsc --noEmit` on all scripts + generated code passes.
2. **`test_runtime_decode_good`** -- `node validate_good.ts` exits 0. Proves `Schema.decodeUnknownSync` accepts valid data and fields survive decoding.
3. **`test_runtime_decode_bad_enum`** -- `node validate_bad_enum.ts` exits 0. Proves decode rejects invalid enum values at runtime.
4. **`test_runtime_decode_bad_discriminator`** -- `node validate_bad_discriminator.ts` exits 0. Proves decode rejects wrong discriminator values.
5. **`test_runtime_alias`** -- `node validate_alias.ts` exits 0. Proves aliased key works at decode time.
6. **`test_generated_code_is_nonempty`** -- Sanity check that generated.ts contains Effect Schema code.

**gxformat2 native schema (skipped if GXFORMAT2_SCHEMA_DIR absent):**

7. **`test_native_tsc_compiles`** -- `tsc --noEmit` on generated code from the real gxformat2 native schema. Compile-only, no validation scripts. This exercises circular reference handling (Schema.suspend).

## Step 6: Update README

TODO -- add `effect-schema` to the format docs.

## Implementation Order (completed)

1. ✅ Added `_union_type_str`, `_type_ref_str` to CodeGenBase, updated `type_loader`
2. ✅ Created `codegen_effect_schema.py` with all field/enum/class methods
3. ✅ Wired into orchestrator + CLI
4. ✅ Created test scaffolding (`tests/ts_project_effect/`) with `effect` dependency
5. ✅ Created validation scripts (good, bad_enum, bad_discriminator, alias)
6. ✅ Created `test_effect_schema_roundtrip.py` -- all 7 tests pass
7. ✅ Topological sort for forward references
8. ✅ `Schema.suspend` with typed return annotation for circular references (native schema compiles)
9. ✅ Extracted `split_top_level` to shared utility, backported `needs_quote` fix to TS backend
10. ✅ Code review: lint clean, mypy clean, 57 tests pass
11. TODO: Update README

## Resolved Questions

- **Should Effect Schema output include a `decode` helper function?** Not needed -- `Schema.decodeUnknownSync(FooSchema)(data)` is the standard Effect Schema API, no wrapper needed.
- **`Schema.Class` vs `Schema.Struct`?** `Schema.Struct` -- appropriate for generated code, produces plain data validation.
- **Naming convention?** `FooSchema` + `Foo` type (via `typeof FooSchema.Type`).
- **Should abstract records be exported?** Yes, exported same as concrete records (needed for field spreading in children).
- **`fromKey` aliasing?** Not needed for current use cases -- alias used directly as property name.

## Unresolved Questions

- Should we generate `Schema.NullOr(T)` instead of `Schema.Union(T, Schema.Null)` for nullable fields? More idiomatic but functionally equivalent.
- The `Schema.suspend` typed annotation uses `Schema.Schema<any>` -- circular field types lose specificity. Could be improved with generated interfaces for cyclic schemas if needed.
