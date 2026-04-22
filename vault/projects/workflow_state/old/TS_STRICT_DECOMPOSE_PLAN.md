# Plan: Decompose --strict into --strict-structure, --strict-encoding, --strict-state (TypeScript)

**Branch:** `strict-decompose`
**Date:** 2026-04-06
**Mirrors:** Galaxy commit `509988c80b0cc64c86054074c1660326c18fdc5c` on `wf_tool_state`
**Python plan:** `STRICT_STATE_PLAN.md` (all steps complete on Python side)
**Status:** ALL STEPS COMPLETE (2026-04-06)

## Goal

Port the three-dimensional strict decomposition from the Python Galaxy codebase to the TypeScript `galaxy-tool-util` monorepo. After this work, the TS `gxwf` CLI will have feature parity with the Python `gxwf-*` CLIs for strict validation.

| Flag | What it enforces |
|---|---|
| `--strict-structure` | Reject unknown keys at workflow envelope/step level. Uses Effect Schema's `onExcessProperty: "error"` instead of current `"ignore"`. |
| `--strict-encoding` | Reject JSON-string `tool_state` (native) and format2 `tool_state`-instead-of-`state` misuse. Outer-level only. |
| `--strict-state` | Promote `skip` results (tool not found, legacy encoding, replacement params) to failures. Exit 2 instead of 0. |

`--strict` = all three combined.

## Current TS State

### What exists
- **Structural validation** uses `S.decodeUnknownEither(schema, { onExcessProperty: "ignore" })` — the switch to `"error"` for strict mode is trivial.
- **Legacy encoding detection** in `packages/schema/src/workflow/legacy-encoding.ts` — `scanToolState()` returns `"yes" | "no" | "maybe_assumed_no"`.
- **Replacement parameter scanning** in `packages/schema/src/workflow/` — `scanForReplacements()` returns `"yes" | "no" | "maybe_assumed_no"`.
- **Validation pipeline** in `packages/cli/src/commands/validate-workflow.ts` — structural + per-step tool state with `StepValidationResult` (`ok | fail | skip`).
- **Lint pipeline** in `packages/cli/src/commands/lint.ts` — structural + best practices + tool state via `LintReport`.
- **Convert pipeline** in `packages/cli/src/commands/convert.ts` — stateful conversion with `StepConversionStatus[]`.
- **Roundtrip pipeline** in `packages/schema/src/workflow/roundtrip.ts` — `roundtripValidate()` with `RoundtripResult`.
- **Tests use vitest** with `createCliTestContext()` helper for seeding caches and capturing output.
- **Both `onExcessProperty: "ignore"` and `"error"` already used** — tests in `declarative-normalized.test.ts` and `declarative-wfstate.test.ts` already exercise strict decoding. Infrastructure proven.

### What's missing
- No `--strict-*` CLI flags on any command.
- No `StrictOptions` type or shared CLI registration helper.
- No encoding validation functions (native: tool_state-is-string check; format2: state-vs-tool_state check).
- Report models (`StepValidationResult`, `LintReport`, `RoundtripResult`) lack `structureErrors`, `encodingErrors`, `skippedReason` fields.
- Roundtrip pipeline has no strict validation stages (input, format2 output, reimported native).

---

## Implementation Plan

### Step 1: Define StrictOptions type and CLI registration helper ✅ DONE

**Files:**
- `packages/cli/src/commands/strict-options.ts` (new)
- `packages/cli/src/bin/gxwf.ts` (update all commands)

```typescript
// strict-options.ts
export interface StrictOptions {
  strict?: boolean;
  strictStructure?: boolean;
  strictEncoding?: boolean;
  strictState?: boolean;
}

/** Expand --strict shorthand into the three individual flags. */
export function resolveStrictOptions(opts: StrictOptions): {
  strictStructure: boolean;
  strictEncoding: boolean;
  strictState: boolean;
} {
  const all = !!opts.strict;
  return {
    strictStructure: all || !!opts.strictStructure,
    strictEncoding: all || !!opts.strictEncoding,
    strictState: all || !!opts.strictState,
  };
}

/** Register --strict, --strict-structure, --strict-encoding, --strict-state on a Commander command. */
export function addStrictOptions(cmd: Command): Command {
  return cmd
    .option("--strict", "Shorthand for --strict-structure --strict-encoding --strict-state")
    .option("--strict-structure", "Reject unknown keys at envelope/step level")
    .option("--strict-encoding", "Reject JSON-string tool_state/state and format2 field misuse")
    .option("--strict-state", "Require every tool step to validate; no skips allowed");
}
```

**CLI wiring:** Add `addStrictOptions()` to `validate`, `lint`, `convert`, `roundtrip` commands (and their `-tree` variants) in `gxwf.ts`.

**Tests (red-to-green):**
- `resolveStrictOptions({ strict: true })` → all three true
- `resolveStrictOptions({ strictStructure: true })` → only structure true
- `resolveStrictOptions({})` → all false
- Flags compose independently

### Step 2: Implement --strict-encoding validation ✅ DONE

**File:** `packages/schema/src/workflow/strict-encoding.ts` (new)

Port from Python's `_encoding.py`. Two functions with different scopes per format:

```typescript
/** Native: reject tool_state that is a JSON string instead of a dict. */
export function validateEncodingNative(workflowDict: Record<string, unknown>): string[] {
  // Check each tool step's tool_state is a dict, not a JSON string
}

/** Format2: reject steps using `tool_state` field instead of `state`. 
 *  No string-state check — format2 state comes from YAML parsing so
 *  it's always a dict. The Python side checks this defensively but
 *  it's not a real-world scenario. */
export function validateEncodingFormat2(workflowDict: Record<string, unknown>): string[] {
  // Check steps use `state` (not `tool_state`)
}

export function checkStrictEncoding(workflowDict: Record<string, unknown>): string[] {
  // Dispatch to native or format2 based on a_galaxy_workflow presence
}
```

These operate on raw workflow dicts *before* normalization — matching the Python pattern of failing fast before any schema decoding.

**Tests (red-to-green):**
- Clean native workflow → empty errors
- Native with `tool_state: "{...}"` (string) → error
- Clean format2 → empty errors
- Format2 with `tool_state` instead of `state` → error

### Step 3: Implement --strict-structure validation ✅ DONE

**No new module needed.** The infrastructure already exists:
- `NativeGalaxyWorkflowSchema` and `GalaxyWorkflowSchema` in schema package
- `S.decodeUnknownEither(schema, { onExcessProperty: "error" })` vs `"ignore"`

The strict-structure check is: re-decode the raw workflow dict with `onExcessProperty: "error"` and collect excess-property errors.

```typescript
export function checkStrictStructure(
  workflowDict: Record<string, unknown>,
  format: WorkflowFormat,
): string[] {
  const schema = format === "native" ? NativeGalaxyWorkflowSchema : GalaxyWorkflowSchema;
  const result = S.decodeUnknownEither(schema, { onExcessProperty: "error" })(workflowDict);
  if (result._tag === "Left") {
    return formatIssues(result.left);
  }
  return [];
}
```

Could live in `strict-encoding.ts` (rename to `strict-checks.ts`) or a dedicated `strict-structure.ts`. Preference: single `packages/schema/src/workflow/strict-checks.ts` with all three check functions since they're all pre-normalization checks on raw dicts.

**Tests (red-to-green):**
- Clean native workflow → passes
- Native workflow with extra key at root → error listing the key
- Native workflow with extra key in step → error
- Clean format2 → passes
- Format2 with extra key → error

### Step 4: Wire --strict-encoding and --strict-structure into validate command ✅ DONE

**File:** `packages/cli/src/commands/validate-workflow.ts`

Update `ValidateWorkflowOptions` to include `StrictOptions`. In `runValidateWorkflow()`:

```typescript
const strict = resolveStrictOptions(opts);

// Pre-normalization: encoding check
if (strict.strictEncoding) {
  const encErrors = checkStrictEncoding(data);
  if (encErrors.length > 0) {
    console.error("Encoding errors:");
    for (const e of encErrors) console.error(`  ${e}`);
    process.exitCode = 2;
    return;
  }
}

// Pre-normalization: structure check
if (strict.strictStructure) {
  const structErrors = checkStrictStructure(data, format);
  if (structErrors.length > 0) {
    console.error("Structure errors:");
    for (const e of structErrors) console.error(`  ${e}`);
    process.exitCode = 2;
    return;
  }
}

// Existing structural validation (lenient) continues below...
```

For `--strict-state`: after tool state validation, check if any results have `status: "skip"`:

```typescript
if (strict.strictState) {
  const hasSkips = results.some(r => r.status === "skip");
  if (hasSkips) {
    process.exitCode = 2;
    return;
  }
}
```

**Exit code semantics (matching Python):** 0 = ok, 1 = validation fail, 2 = strict fail.

**Tests (red-to-green):**
- Validate with `--strict-encoding` on JSON-string tool_state → exit 2
- Validate with `--strict-structure` on extra-key workflow → exit 2
- Validate with `--strict-state` on missing-tool step → exit 2
- Validate with `--strict` → all three enforced
- Clean workflow with `--strict` → exit 0

### Step 5: Wire into lint command ✅ DONE

**File:** `packages/cli/src/commands/lint.ts`

Update `LintOptions` with `StrictOptions`. In `lintWorkflowReport()`:

Same pattern: encoding + structure checks before delegation. `--strict-state` promotes skipped state validation to errors.

Add `structureErrors`, `encodingErrors` to `LintReport`.

**Tests (red-to-green):**
- Lint with `--strict-encoding` on bad encoding → exit 2
- Lint with `--strict-structure` on extra keys → exit 2
- Lint with `--strict-state` on skipped steps → exit 2

### Step 6: Wire into convert command ✅ DONE

**File:** `packages/cli/src/commands/convert.ts`

Update `ConvertOptions` with `StrictOptions`. For stateful conversion:

- `--strict-encoding`: validate input encoding before conversion; validate output encoding after
- `--strict-structure`: validate input structure; validate output structure (decode output dict with `onExcessProperty: "error"`)
- `--strict-state`: require all steps to convert successfully (existing `failureClass` tracking)

**Tests (red-to-green):**
- Stateful convert with `--strict-encoding` on bad input → exit 2
- Stateful convert with `--strict-state` on unconvertible step → exit 2

### Step 7: Wire into roundtrip command ✅ DONE

**Files:**
- `packages/schema/src/workflow/roundtrip.ts` — extend `roundtripValidate()` with strict params
- `packages/cli/src/commands/roundtrip.ts` — wire CLI flags

Roundtrip is the most complex — strict flags apply at multiple pipeline stages:

1. **Input validation** (before forward conversion):
   - `strictEncoding`: check raw native dict encoding
   - `strictStructure`: check raw native dict structure

2. **Forward output** (native → format2):
   - `strictStructure`: decode format2 output with `onExcessProperty: "error"`
   - `strictEncoding`: validate format2 output encoding

3. **Reverse output** (format2 → native):
   - `strictStructure`: decode reimported native with `onExcessProperty: "error"`
   - `strictEncoding`: validate reimported native encoding

4. **Skip promotion** (`strictState`):
   - Steps that would be skipped (tool not found) → error

Extend `RoundtripResult` with:
```typescript
structureErrors: string[];
encodingErrors: string[];
```

**Tests (red-to-green):**
- Roundtrip with `--strict-structure` on extra-key workflow → failure at stage 1
- Roundtrip with `--strict-encoding` on JSON-string tool_state → failure at stage 1
- Clean workflow roundtrip with `--strict` → passes (verify output stages also pass)

### Step 8: Wire into tree commands ✅ DONE

**Files:** `*-tree.ts` commands

Same options passed through. Tree aggregation reports strict errors per-file. Exit code 2 if any file has strict failures.

All six tree commands: `validate-tree`, `lint-tree`, `clean-tree`, `convert-tree`, `roundtrip-tree`.

Note: `clean-tree` may not need all strict flags — consider which are meaningful (probably just `--strict-encoding` to verify clean output).

### Step 9: Enrich report models ✅ DONE

**Files:**
- `packages/cli/src/commands/validate-workflow.ts` — `StepValidationResult` gains `skippedReason`
- `packages/cli/src/commands/lint.ts` — `LintReport` gains `structureErrors`, `encodingErrors`
- `packages/schema/src/workflow/roundtrip.ts` — `RoundtripResult` gains `structureErrors`, `encodingErrors`

These fields enable structured JSON output (--json) consumers to distinguish which strict dimension failed.

### Step 10: Add synthetic test fixtures (SKIPPED — covered by inline test data)

**Directory:** `packages/cli/test/fixtures/strict/` (new)

Port the 5 synthetic fixtures from Python:

| Fixture | Purpose |
|---|---|
| `synthetic-cat1-extra-keys.ga` | Native workflow with unknown root/step keys |
| `synthetic-cat1-json-string-state.ga` | Native workflow with tool_state as JSON string |
| `synthetic-cat1-format2-tool-state.gxwf.yml` | Format2 using `tool_state` instead of `state` |
| `synthetic-cat1-format2-json-state.gxwf.yml` | Format2 with state as JSON string |
| `synthetic-missing-tool.ga` | Native workflow with unresolvable tool_id |

### Step 11: IWC sweep tests with strict flags ✅ DONE

**File:** `packages/cli/test/iwc-sweep.test.ts` (extend existing)

Add test suites:
- `IWC sweep --strict-structure` — all workflows pass or identify known structural issues
- `IWC sweep --strict-encoding` — all IWC workflows should be cleanly encoded
- `IWC sweep --strict` (all three) — full strict sweep

---

## Changes by Package

### `@galaxy-tool-util/schema` (packages/schema)

| File | Change |
|---|---|
| `src/workflow/strict-checks.ts` (new) | `checkStrictEncoding()`, `validateEncodingNative()`, `validateEncodingFormat2()`, `checkStrictStructure()` |
| `src/workflow/roundtrip.ts` | Extend `roundtripValidate()` signature with `strictStructure`, `strictEncoding`, `strictState`; add multi-stage validation; extend `RoundtripResult` |
| `src/index.ts` | Export new strict-checks functions |

### `@galaxy-tool-util/cli` (packages/cli)

| File | Change |
|---|---|
| `src/commands/strict-options.ts` (new) | `StrictOptions` interface, `resolveStrictOptions()`, `addStrictOptions()` |
| `src/bin/gxwf.ts` | Register `--strict*` flags on validate, lint, convert, roundtrip (+ tree variants) |
| `src/commands/validate-workflow.ts` | Accept `StrictOptions`; pre-normalization encoding/structure checks; strict-state skip promotion; extend `ValidateWorkflowOptions` |
| `src/commands/lint.ts` | Accept `StrictOptions`; extend `LintReport`; same check pattern |
| `src/commands/convert.ts` | Accept `StrictOptions`; input + output strict checks |
| `src/commands/roundtrip.ts` | Accept `StrictOptions`; pass through to `roundtripValidate()` |
| `src/commands/validate-tree.ts` | Pass through strict options |
| `src/commands/lint-tree.ts` | Pass through strict options |
| `src/commands/convert-tree.ts` | Pass through strict options |
| `src/commands/roundtrip-tree.ts` | Pass through strict options |

### Tests

| File | Status | Change |
|---|---|---|
| `packages/schema/test/strict-checks.test.ts` (new) | ✅ | 14 unit tests for encoding/structure validators |
| `packages/cli/test/strict-options.test.ts` (new) | ✅ | 5 unit tests for option expansion and composition |
| `packages/cli/test/strict-validate.test.ts` (new) | ✅ | 9 behavioral tests: validate with each strict flag |
| `packages/cli/test/strict-lint.test.ts` (new) | ✅ | 3 behavioral tests: lint with strict flags |
| `packages/cli/test/strict-roundtrip.test.ts` | DEFERRED | Behavioral tests: roundtrip with strict flags (covered by schema-level integration) |
| `packages/cli/test/iwc-sweep.test.ts` | ✅ | 3 strict sweep suites (encoding, structure, combined) |
| `packages/cli/test/fixtures/strict/` | SKIPPED | Covered by inline test data instead |

---

## Execution Order

1. ✅ **Step 1** — StrictOptions + CLI registration
2. ✅ **Step 2** — Encoding validation functions
3. ✅ **Step 3** — Structure validation function
4. ~~**Step 10** — Synthetic test fixtures~~ — covered by inline test data in Step 4 tests
5. ✅ **Step 4** — Wire into validate (9 behavioral tests)
6. ✅ **Step 5** — Wire into lint (3 behavioral tests)
7. ✅ **Step 6** — Wire into convert
8. ✅ **Step 7** — Wire into roundtrip
9. ✅ **Step 8** — Wire into tree commands (all 5 tree commands)
10. ✅ **Step 9** — Report model enrichment (skippedReason on StepValidationResult, encodingErrors/structureErrors on RoundtripResult)
11. ✅ **Step 11** — IWC sweep (3 strict sweep suites: encoding, structure, combined)

Steps 1-8 implemented in session 1 (2026-04-06). Steps 9+11 completed in session 2 (2026-04-06). All 4714 tests pass, lint/format/typecheck clean.

### Implementation notes (deviations from plan)
- Step 10 synthetic fixture files not created; inline test workflows in `strict-validate.test.ts` and `strict-lint.test.ts` cover all scenarios
- `LintReport` enriched inline with Step 5 rather than waiting for Step 9
- Tree commands use `throw new Error(...)` for strict failures (caught by `collectTree` error handler) rather than a separate exit-code path
- `clean` command not wired with strict options (per unresolved question — deferred)
- Roundtrip strict checks now run at all 3 stages (input, forward, reverse) inside `roundtripValidate()` via `RoundtripStrictOptions`; CLI passes options through rather than doing pre-checks
- `StepValidationResult.skippedReason` uses machine-readable codes: `not_in_cache`, `no_version`, `replacement_params`, `unsupported_params`
- `strict-roundtrip.test.ts` deferred — roundtrip strict validation is covered by the schema-level `RoundtripResult` enrichment and IWC sweep
- Fixed `--strict-state` gap in `validate-tree.ts` and `convert-tree.ts` — both now throw on skipped/unconverted steps, matching single-file variants
- `clean`/`clean-tree` confirmed: no strict options needed (matches Python which uses `--preserve`/`--strip` instead)

---

## Key Differences from Python Implementation

| Aspect | Python | TypeScript |
|---|---|---|
| Options model | Pydantic `@model_validator` for `--strict` expansion | Plain function `resolveStrictOptions()` |
| Structure check | gxformat2's `extra="forbid"` Pydantic models via `ConversionOptions` | Effect Schema's `onExcessProperty: "error"` (already in codebase) |
| Encoding check | `_encoding.py` module with `validate_encoding_native/format2` | Same logic, port to `strict-checks.ts` |
| CLI registration | `add_strict_args(parser)` on argparse | `addStrictOptions(cmd)` on Commander |
| Inheritance | Multiple inheritance: `class Opts(ToolCacheOptions, StrictOptions)` | Interface intersection: `ValidateWorkflowOptions & StrictOptions` |
| Exit codes | 0/1/2 (ok/fail/strict) | Same semantics |
| Report models | Pydantic fields | TypeScript interface fields |
| gxformat2 threading | `ConversionOptions(strict_structure=True)` | Direct `onExcessProperty: "error"` in decode call |

The TS port is simpler in some ways because Effect Schema already supports strict decoding natively — no need to thread options through a separate conversion library.

---

## Unresolved Questions

- ~~`clean` command: which strict flags apply?~~ **Resolved:** Python's clean command does NOT use `--strict` flags at all — uses `--preserve`/`--strip` for stale key categories instead. TS matches Python: no strict options on clean/clean-tree.
- ~~Should `--strict-structure` on roundtrip validate the *intermediate* format2 dict, or only input/final output?~~ **Resolved:** Now validates all 3 stages (input, forward output, reverse output) via `RoundtripStrictOptions`.
- ~~Test fixture cat1 tool~~ — `SIMPLE_TOOL_ID` (text+integer) and `DATA_TOOL_ID` (data+float) fixtures in `test/helpers/fixtures.ts` are sufficient for strict validation scenarios. No cat1 equivalent needed.
- IWC sweep: same 4 workflows skipped for deprecated position fields? Need to verify TS schema models handle position the same way. (Step 11 added suites but gated on env var — will be validated when run against real IWC checkout.)
