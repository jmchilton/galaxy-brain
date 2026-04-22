# Rebase test-format validation onto Effect Schema

Replaces Ajv + JSON-Schema path introduced by the `wf_test_schema` PR.
Motivation: `@galaxy-tool-util/schema` already standardizes on Effect Schema
(parameter bundles, workflow formats, normalized/expanded shapes, stateful
validation). Adding an Ajv runtime path is a separate validator stack with its
own diagnostic shape, its own CJS/ESM interop hazards (see the
`Ajv2020Import as unknown as` cast in `validate.ts`), and no shared idioms with
the rest of the package. Effect Schema makes downstream consumers (VS Code
plugin bundling, web server) uniform and drops the Ajv dep.

## Source of truth

Python-side Pydantic `galaxy.tool_util_models.Tests` stays authoritative. We
stop vendoring the JSON Schema as the *runtime* artifact and instead treat it
as a sync input to an Effect Schema generator. Options below.

## Strategy options (pick one)

### A. Generate Effect Schema from the Pydantic-emitted JSON Schema

Pipeline: `Tests.model_json_schema()` → `tests.schema.json` (keep, as sync
input) → small codegen script → `tests.generated.ts` (Effect). Runtime imports
the generated Effect module.

- Pros: single source of truth stays in Python; checksum-verifiable in CI.
- Cons: have to build the converter. Pydantic's JSON Schema uses
  `$defs` + `$ref`, `anyOf` w/ null for optionals, `oneOf` for unions,
  `additionalProperties: false`, `const`, titled fields, sometimes nested
  `anyOf` wrappers. Coverage of the subset we actually emit is tractable
  (~15-20 keyword handlers). Recursive `$ref` (Collection → elements → Collection)
  handled via Effect's `Schema.suspend`.

### B. Generate Effect Schema from Pydantic models directly

Write a Python generator that walks `Tests.model_fields` and emits Effect TS.
Similar to the existing `schema-salad-plus-pydantic` tool but pydantic-in
instead of salad-in. Could live as a small script colocated with
`dump-test-format-schema.py`, or upstreamed.

- Pros: higher-fidelity types (Literal vs const, discriminated unions via
  `Field(discriminator=...)`, `StrictModel` extra=forbid); access to field
  docstrings.
- Cons: more code; binds to internal pydantic APIs; duplicates effort with
  `schema-salad-plus-pydantic` if that project ever adds pydantic-in.

### C. Hand-port to Effect Schema

Write `test-format/tests.effect.ts` by hand, mirroring the ~20 Pydantic classes
in `test_job.py` + `tool_outputs.py`.

- Pros: simplest to land; idiomatic Effect; good comments/docs we control.
- Cons: drift risk with Python. No automated sync — relies on human diligence
  when `tool_util_models` changes. Existing sync discipline for workflow
  formats is code-generated (`generate-schemas` target), so hand-port here
  breaks the pattern.

**Recommendation: A.** Keeps the Python-authoritative story (`make
sync-test-format-schema` still runs `Tests.model_json_schema()`), adds a
codegen step analogous to the `generate-schemas` target, and leaves a clean
checksum/verify loop. The JSON Schema becomes an intermediate artifact, not a
runtime dep.

## Work items (assumes option A)

1. **Codegen script** `scripts/jsonschema-to-effect.mjs`. Input:
   `tests.schema.json`. Output: `packages/schema/src/test-format/tests.generated.ts`.
   Handlers needed for the Pydantic-emitted subset:
   - `type: string | number | integer | boolean | null` → `Schema.String` /
     `Schema.Number` / `Schema.Int` / `Schema.Boolean` / `Schema.Null`
   - `type: array` + `items` → `Schema.Array(itemSchema)`
   - `type: object` + `properties` + `required` + `additionalProperties: false`
     → `Schema.Struct(...)` with optional fields via `Schema.optional`
   - `type: object` + `additionalProperties: <schema>` → `Schema.Record`
   - `const: X` → `Schema.Literal(X)`
   - `enum: [...]` → `Schema.Literal(...values)`
   - `anyOf: [schema, {type: null}]` (Pydantic's `Optional[T]`) → `Schema.NullOr`
   - `anyOf` / `oneOf` general → `Schema.Union`
   - `$ref: "#/$defs/X"` → reference emitted symbol; for cycles use
     `Schema.suspend(() => XSchema)`
   - `$defs` → top-level `const XSchema = Schema.Struct(...)` exports, topologically
     sorted with `suspend` for cycles
   - `title` → JSDoc on emitted const
   - `default: ...` — ignore for validation; Effect's decode-with-defaults is a
     separate concern we don't need here (validator only flags
     typing/structural errors)
2. **`validateTestsFile` rewrite.** Replace Ajv body with
   `Schema.decodeUnknownEither(TestsSchema)(parsed)` and map
   `ParseResult.ParseError` into the existing `TestFormatDiagnostic` shape.
   - Path format: Effect yields a `ReadonlyArray<PropertyKey>` path. Convert to
     json-pointer (`/0/job/foo`) to match what Ajv produced — keeps CLI
     snapshot tests stable.
   - Keyword mapping: Ajv's `keyword` values (`required`, `additionalProperties`,
     `type`, `const`, `enum`) don't map 1:1 to Effect's `ParseIssue` tags
     (`Missing`, `Unexpected`, `Type`, `Composite`, `Refinement`, `Pointer`).
     Define a small `issueToKeyword(issue)` translation. Cross-check tests rely
     on `keyword`, so keep the vocabulary (`required`, `unknown_property`,
     `type`, `literal`).
   - Message: Effect gives structured issues; format to match the Ajv string
     where it's cheap, diverge where it's clearer. Snapshot tests get updated
     accordingly (one-time churn).
3. **Drop Ajv + ajv-formats from `packages/schema/package.json`.** Remove the
   CJS-interop shim in the old `validate.ts`. Delete `tests.schema.generated.ts`
   (the `as const` TS wrapper around the JSON) — the JSON is now only a
   codegen input, not a runtime import. Keep `tests.schema.json` + its
   `.sha256` on disk for debugging / external consumers.
4. **Make target.** Add `generate-test-format-schema` (or fold into existing
   `generate-schemas`): runs the codegen script from the checked-in JSON.
   `sync-test-format-schema` continues to dump the JSON + sha; the codegen
   step runs after. `make check` runs the codegen in dry-run + diff mode so
   CI catches a desynced `tests.generated.ts` (same pattern as
   `verify-test-format-schema` today).
5. **Re-export surface.** `@galaxy-tool-util/schema` exports:
   - `validateTestsFile(parsed): { valid, errors: TestFormatDiagnostic[] }` (unchanged API)
   - `TestsSchema` (Effect) — lets advanced consumers decode/encode directly
   - Keep `testsSchema` JSON export for plugin consumers that still want raw
     JSON Schema (VS Code plugin currently uses JSON Schema for the
     YAML-language-server association — we shouldn't break that).
     `testsSchema` becomes a raw JSON import, not a `.generated.ts` re-export.
6. **Tests.** Existing fixtures under
   `packages/schema/test/fixtures/test-format/` keep their positive/negative
   roles. Port `test-format.test.ts` assertions:
   - Positive fixtures: assert `valid === true`
   - Negative fixtures: assert presence of a specific `keyword` + `path` —
     update expected keyword strings for the Effect vocabulary
   - New: a snapshot test pinning the emitted `tests.generated.ts` header +
     a few representative schema consts (catches codegen regressions)
7. **CLI.** `validate-tests` / `validate-tests-tree` output format is
   determined by diagnostic shape. Keep the `TestFormatDiagnostic` fields
   (`path`, `message`, `keyword`, `params`). CLI tests get snapshot refreshes
   where messages differ; structure is unchanged.
8. **Changeset.** Amend the existing `test-format-validation.md` changeset to
   describe the Effect-Schema path (same minor bump — this all lands on one
   PR before any release). Note removal of `ajv` + `ajv-formats` from the
   schema package's dep list.

## Cross-check (inputs/outputs) — implications

Plan item from `TEST_JOB_VALIDATION_TS_FOLLOWUP_PLAN.md` was going to share
`TestFormatDiagnostic` shape. Still works: cross-check is still a plain
programmatic walk, emits diagnostics with the same shape. Its `keyword`
vocabulary (`workflow_input_missing`, etc.) stays orthogonal to the Effect
issue vocab. No dependency on Ajv or Effect — pure TS. The follow-up plan's
"plugin avoids Ajv transitively" worry dissolves: schema package no longer
pulls Ajv at all.

## Risks / things to validate early

- **Effect Schema bundle size.** Adds nothing new — already a dep — but the
  generated schema module will be a few hundred `Schema.Struct`/`Literal`
  calls. Check `dist` size delta before/after. If the plugin ends up bundling
  the full Effect runtime by pulling `TestsSchema`, a subpath export
  (`@galaxy-tool-util/schema/test-format/json-schema`) that yields only the
  raw JSON gives the plugin a zero-Effect import path.
- **Diagnostic path fidelity.** Ajv's `instancePath` is well-defined and the
  plugin might lean on it for AST mapping. Effect's path array → json-pointer
  conversion has to handle index coercion (numeric keys as array indices) and
  `Composite` issues carrying nested paths. Land a unit test that fuzzes a
  dozen malformed docs and asserts path equality with the old Ajv output.
- **`const` / discriminator coverage.** Pydantic emits `"const": "File"` on
  discriminated union members. Codegen must map to `Schema.Literal("File")`
  *and* — ideally — build the parent union as a discriminated
  `Schema.Union(...).pipe(Schema.union(...))` with tag resolution. Worst
  case: fall back to plain `Schema.Union` — decoding still works, just
  produces noisier error messages on mismatched discriminant.
- **Recursive schemas.** `Collection.elements` items include `Collection`
  (nested collections). `Schema.suspend(() => CollectionSchema)` handles it;
  codegen must detect cycles (SCCs in the `$defs` ref graph) and emit
  `suspend` wrappers for back-edges only.
- **Unsupported JSON Schema keywords.** If pydantic ever emits `allOf`,
  `patternProperties`, `if/then/else`, codegen should fail loud, not silently
  skip. Start with a denylist check.

## Test strategy (red-to-green)

1. Add `scripts/jsonschema-to-effect.mjs` skeleton + tests that exercise each
   JSON Schema keyword on a small hand-written input (not the real schema
   yet). Green once every keyword handler works in isolation.
2. Run the codegen against the real `tests.schema.json`, land output as
   `tests.generated.ts` (checked in). TypeScript compiles.
3. Port `test-format.test.ts` positive fixtures — assert valid. Fix codegen
   bugs iteratively.
4. Port negative fixtures — assert expected `keyword`/`path`. This is where
   the Ajv→Effect mapping shakes out; most churn lives in
   `issueToKeyword` + path conversion.
5. Update CLI snapshot tests.
6. Delete Ajv deps + shim. Full `make test` green.
7. Wire `make check`'s codegen-drift guard.

## Out of scope for this PR

- Changing the sync discipline on the Python side (still `Tests.model_json_schema()`).
- Decoding defaults / coercions. `validateTestsFile` is validate-only; if
  anyone eventually wants Effect's decode-with-defaults semantics, it's a
  separate call.
- Cross-check implementation — still lands in the follow-up plan, just
  without Ajv anywhere in sight.

## Unresolved questions

- Option A vs B — tolerate building a pydantic-in generator (B) for
  higher fidelity (discriminators, StrictModel semantics), or stay with
  A's JSON-Schema intermediate and accept some fidelity loss?
- Keep `testsSchema` (raw JSON) export for plugin YAML-language-server use, or
  expect the plugin to read `tests.schema.json` directly from the
  package's `files`? Affects whether JSON has to stay in the TS bundle.
- Subpath export for zero-Effect plugin import — worth the package.json
  `exports` field churn now, or defer until plugin work?
- Snapshot-test the entire `tests.generated.ts`, or just a representative
  slice? Full snapshot catches any codegen regression but produces a huge
  diff on every Python-side schema change.
- Codegen: TS (`.mjs`) or Python? Keeping it Node side-steps another Python
  env in CI; Python could reuse pydantic introspection for option B.
