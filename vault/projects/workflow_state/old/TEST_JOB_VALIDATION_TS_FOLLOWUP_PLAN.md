# Cross-check Plan (inputs/outputs match workflow)

Follow-up to `TEST_SCHEMA_TS_PLAN.md`. Goal: land data-level cross-check in the
current `wf_test_schema` PR; leave `galaxy-workflows-vscode` with the smallest
possible shim to adopt later.

## Shared surface in `@galaxy-tool-util/schema/test-format/`

Expose canonical DTOs + pure extractors + comparator. No AST, no ranges (plugin
keeps those).

```
export interface WorkflowInput  { name, doc?, type, default?, optional? }
export interface WorkflowOutput { name, doc?, uuid? }

extractWorkflowInputs(parsed, format: "native"|"format2"): WorkflowInput[]
extractWorkflowOutputs(parsed, format: "native"|"format2"): WorkflowOutput[]

isCompatibleType(declaredType, valueType): boolean   // port from plugin utils

checkTestsAgainstWorkflow(
  testsDoc: unknown,
  workflow: { inputs: WorkflowInput[]; outputs: WorkflowOutput[] },
): TestFormatDiagnostic[]   // json-pointer paths like /0/job/foo
```

Diagnostics reuse existing `TestFormatDiagnostic` shape. New `keyword` values:
`workflow_input_undefined`, `workflow_input_required`, `workflow_input_type`,
`workflow_output_undefined`.

Notes from implementation review:
- Plugin's `isCompatibleType` has a bug in the `"null"` branch (`actualType === null` — dead check, since `actualType: string`); our port fixes it to `actualType === "null"`. `"null"` is never a declared workflow input type in production Galaxy/IWC workflows, so the fix changes no observable behavior. Don't mirror the bug.
- Plugin's native extractor reads step-level `optional` / `inputs[0].description` / `inputs[0].name` as fallbacks. Verified across 120 IWC workflows (677 input steps): step-level `optional` is **never** emitted; `description` disagrees with `annotation` in 4 edge cases (data bugs); `label` is always present. Our port reads only the canonical fields: `step.label`, `step.annotation`, `tool_state.optional`. Defensive-fallback behavior dropped.
- `isCompatibleType` signature matches plugin: `(expected: WorkflowDataType, actualType: string)`. Runtime-value callers go via the exported `jsTypeOf(value)` helper (vocabulary: YAML-LS AST — `"string" | "number" | "boolean" | "null" | "object" | "array"`).

## Work items

1. **Extractor ports.** `extract-native.ts`, `extract-format2.ts`. Mirror
   plugin's `NativeWorkflowDocument.getWorkflowInputs/Outputs` and
   `GxFormat2WorkflowDocument` AST walks, but operate on already-parsed
   JSON/YAML dicts. Native reads `tool_state` (string-encoded JSON) for
   `default`/`optional` — reuse existing schema-package utilities rather than
   re-parsing.
2. **Reuse `resolveFormat`.** Already lives in `@galaxy-tool-util/schema`
   (`workflow/serialize.ts`), CLI just re-exports. Cross-check imports it
   directly; no new format-detection helper.

3. **`isCompatibleType` port** — small pure function, mirror plugin tests.
4. **`checkTestsAgainstWorkflow`** — walks each test entry's `job` + `outputs`,
   emits diagnostics with json-pointer paths (same shape Ajv uses).
5. **CLI flags.** `validate-tests` gets `--workflow <path>` for single-file
   pairing. `validate-tests-tree` gets `--auto-workflow` only (opt-in
   convention-based sibling discovery: `foo.gxwf-tests.yml` ↔
   `foo.gxwf.yml`/`foo.ga`, `bar-tests.yml` ↔ `bar.yml`/`bar.ga`; silent
   no-op when no sibling found). `--workflow` on tree doesn't fit — tree
   walks many files.

6. **Fixtures.** Under `packages/schema/test/fixtures/test-format/` add
   `workflows/` (small native + format2 pair) and `cross-check/`:
   - `positive/match_inputs_outputs-tests.yml` + the workflow pair
   - `negative/input_not_in_workflow-tests.yml`,
     `missing_required_input-tests.yml`, `input_type_mismatch-tests.yml`,
     `output_not_in_workflow-tests.yml`
   Layout that plugin tests can vendor directly.
7. **Tests.** Schema unit tests: extractors over native+format2 fixtures;
   integration test asserts each negative fixture yields the expected
   diagnostic keyword. CLI test: `validate-tests --workflow` snapshot.
8. **Export surface.** Re-export `WorkflowInput`, `WorkflowOutput`,
   `extractWorkflowInputs`, `extractWorkflowOutputs`, `isCompatibleType`,
   `checkTestsAgainstWorkflow` from `@galaxy-tool-util/schema` root. Keep
   internals under `test-format/` for cohesion.
9. **Changeset.** Minor on `@galaxy-tool-util/schema` (new public API) + note
   on `@galaxy-tool-util/cli`.

## What this buys the VS Code plugin (separate follow-up PR, out of scope)

Plugin refactor reduces to three drop-ins:

- Import `WorkflowInput`/`WorkflowOutput` from `@galaxy-tool-util/schema`;
  delete local DTOs.
- Replace `NativeWorkflowDocument.getWorkflowInputs()` and
  `GxFormat2WorkflowDocument.getWorkflowInputs()` bodies with
  `extractWorkflowInputs(this.rawParsed, format)`. Same for outputs. AST
  classes shrink — sole remaining job: parse + expose raw dict.
- `WorkflowInputsValidationRule` / `WorkflowOutputsValidationRule` keep
  AST-range emission, but compute violation set via
  `checkTestsAgainstWorkflow` and map each json-pointer path back to a
  test-document AST range (plugin already has `nodeManager.getNodeRange` —
  needs only a pointer→node helper, trivial).
- `isCompatibleType` disappears from plugin → import from `@schema`.

Net effect: two extractors + three rule methods collapse to thin adapters;
test-document AST walking stays plugin-local (it's what the plugin is for).

## Risks / boundaries

- **`default` / `optional` parsing divergence.** Plugin reads native
  `tool_state` ad-hoc (`JSON.parse`); we may already have a typed walker.
  Using ours could shift behavior for workflows with odd encodings. Fix: port
  plugin's loose behavior verbatim for v1, tighten later.
- **Type normalization.** `WorkflowDataType` vocabulary differs subtly between
  formats; plugin stringifies whatever it sees. Match that — don't canonicalize
  in this PR.
- **Auto-discovery surface area.** Keep `--auto-workflow` off by default.
  Explicit `--workflow` only for single-file.
- **Output identity.** Plugin checks output *name* only; workflows also have
  `uuid`. Match plugin semantics (name-only) to avoid divergence.

## Test strategy (red-to-green)

1. Land DTOs + empty extractors + failing extractor tests against native and
   format2 fixtures.
2. Fill in format2 extractor (simpler); tests green.
3. Fill in native extractor (incl. tool_state decode); tests green.
4. Add `isCompatibleType` + its unit tests (red-to-green).
5. Add `checkTestsAgainstWorkflow` + negative-fixture tests.
6. Wire CLI `--workflow` flag + snapshot test.
7. Wire `--auto-workflow` in tree command + discovery test.

## Unresolved questions

- Diagnostic path format — json-pointer (`/0/job/foo`) vs dotted (`0.job.foo`)?
  Ajv uses json-pointer; match it.
- Auto-discovery pairs — case-insensitive? `.ga.json` supported? Start
  exact-suffix only.
- Extractor location — `test-format/extractors/` vs `workflow/extractors/`?
  Former keeps test-format subtree self-contained; latter if extractors are
  broadly useful. Preference?
- `extractWorkflowInputs` input — raw parsed dict or expanded (post-subworkflow)?
  Plugin uses raw. Start raw.
- Port `isCompatibleType` as-is or widen (plugin's mapping is loose)? Start
  as-is; file follow-up for rigor.
- Plugin-avoids-Ajv question: cross-check code (extractors, `isCompatibleType`,
  `checkTestsAgainstWorkflow`) is a pure programmatic walk — needs neither
  Ajv nor Effect. Keep it in `test-format/cross-check.ts` with imports that
  don't transitively pull `validateTestsFile` (the Ajv consumer). If plugin
  bundling later shows Ajv still creeping in, add a subpath export then.
  Effect has no runtime JSON Schema validator (Effect-TS/effect#1825 closed
  Out of Scope), so Ajv stays for `validateTestsFile`. Future Ajv removal
  via quicktype-generated Effect models tracked in jmchilton/galaxy-tool-util-ts#58.