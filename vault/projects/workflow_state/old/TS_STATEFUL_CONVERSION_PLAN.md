# TypeScript Stateful Conversion Plan

**Date:** 2026-04-04
**Repo:** `jmchilton/galaxy-tool-util-ts` (`galaxy-tool-util`)
**Goal:** Schema-aware format conversion (`gxwf convert --stateful`) and roundtrip validation (`gxwf roundtrip`) using tool definitions from the cache to properly re-encode parameter values.

---

## Background

### Schema-free vs Stateful

**Schema-free** (current `gxwf convert`): copies `tool_state` as-is between formats. Fast, no tool cache dependency, but produces lossy results — native tool_state may contain stale bookkeeping keys, string-typed numbers, comma-delimited multi-selects, ConnectedValue/RuntimeValue markers mixed into state.

**Stateful** (this plan): walks the parameter tree using tool definitions to:
- Strip stale keys before conversion
- Coerce types for the target format (e.g. string `"42"` → number `42` for format2)
- Separate connection/runtime markers into the format2 `in` block
- Validate before and after conversion
- Fall back to schema-free per-step on failure

### Design Principles

1. **No double encoding.** Native `tool_state` is a dict of values — proper dicts, lists, numbers, booleans, strings. The `{key: json.dumps(value)}` pattern from Python's `encode_state_to_native()` is a legacy serialization artifact that we do not replicate. (Python side is fixing this in STRICT_STATE_PLAN Step 0.)

2. **No legacy decode.** The walker does not silently decode JSON-string containers (`as_dict()`/`as_list()`). Containers must be proper dicts/lists. Legacy-encoded workflows are rejected by precheck, not silently accommodated. (Matches Python commit `67aa42d`.)

3. **Graceful degradation.** Per-step conversion failure falls back to schema-free passthrough. The caller gets a structured report of which steps converted vs fell back.

### Python Reference

Key files in `galaxy-tool-util` Python (wf_tool_state branch):
- `_walker.py` — `walk_native_state()`, `walk_format2_state()` with leaf callbacks
- `convert.py` — `convert_state_to_format2()`, `encode_state_to_native()`, scalar coercions
- `export_format2.py` — `export_workflow_to_format2()` with `ConversionOptions` callback
- `to_native_stateful.py` — format2→native with tool-aware encoding
- `roundtrip.py` — native→format2→native comparison with diff classification

Key files in `gxformat2`:
- `options.py` — `ConversionOptions` with `state_encode_to_format2` / `state_encode_to_native` callbacks

---

## Plan

### Step 1: Port the state walker

**New file:** `packages/schema/src/workflow/walker.ts`

Port Python's `_walker.py` — two walker functions with a shared leaf callback pattern.

#### `walkNativeState()`

```typescript
type LeafCallback = (
  toolInput: ToolParameterModel,
  value: unknown,
  statePath: string,
) => unknown | typeof SKIP_VALUE;

function walkNativeState(
  inputConnections: Record<string, unknown>,
  toolInputs: ToolParameterModel[],
  state: Record<string, unknown>,
  leafCallback: LeafCallback,
  options?: { prefix?: string; checkUnknownKeys?: boolean },
): Record<string, unknown>;
```

Handles:
- Conditional branch selection (test parameter value matching, default-when fallback)
- Repeat instance expansion from `inputConnections` (repeat_N pattern)
- Section recursion
- Bookkeeping key stripping (`__current_case__`, `__page__`, `__index__`, etc.)
- Optional unknown key detection (`checkUnknownKeys`)
- **No `as_dict`/`as_list`** — containers must be proper dicts/lists, not JSON strings

Returns new dict of `{paramName: callbackResult}` for non-skipped leaves, with nested dicts for conditionals/sections and arrays for repeats.

#### `walkFormat2State()`

```typescript
function walkFormat2State(
  toolInputs: ToolParameterModel[],
  state: Record<string, unknown>,
  leafCallback: LeafCallback,
  prefix?: string,
): Record<string, unknown>;
```

Simpler — no double-encoding, no bookkeeping keys, no input_connections. Clean dict walking with conditional branch selection, repeat iteration, section recursion.

#### Relationship to `state-merge.ts`

`state-merge.ts` does similar tree walking for connection injection/stripping but mutates in-place and doesn't use a leaf callback. The walker generalizes the pattern. We keep `state-merge.ts` as-is for now — it works and is tested. The walker is for new stateful conversion code. A future refactor could unify them, but that's not in scope here.

#### Reusable utilities

`state-merge.ts` already exports: `flatStatePath()`, `repeatInputsToArray()`, `keysStartingWith()`, `selectWhichWhen()`. The walker should import and reuse these rather than duplicating.

**Tests:** Unit tests covering:
- Leaf callback receives correct (toolInput, value, statePath) for each parameter
- Conditional branch selection (boolean, select, default-when fallback)
- Repeat instance expansion from inputConnections
- Section recursion
- SKIP_VALUE omits values from output
- Bookkeeping keys stripped (native walker)
- Unknown key detection when enabled
- Containers must be dicts/lists — string containers cause errors (no silent JSON decode)

### Step 2: Conversion functions

**New file:** `packages/schema/src/workflow/stateful-convert.ts`

#### Native → Format2: `convertStateToFormat2()`

```typescript
interface Format2ConvertedState {
  state: Record<string, unknown>;
  in: Record<string, string>;  // connection mapping (statePath → placeholder)
}

function convertStateToFormat2(
  nativeStep: NormalizedNativeStep,
  toolInputs: ToolParameterModel[],
): Format2ConvertedState;
```

Logic:
1. Extract `tool_state`, `input_connections`, connected paths from step
2. Walk native state with leaf callback that:
   - `gx_data` / `gx_data_collection`: always SKIP_VALUE, record in `in` block if connected/runtime
   - `gx_rules`: parse JSON string to object, SKIP if null/connected
   - ConnectedValue/RuntimeValue markers: record in `in` block, SKIP_VALUE
   - Scalars: coerce via `convertScalarValue()`
   - Null/`"null"` values: SKIP_VALUE
3. Return `{state, in}` pair

#### Scalar coercions: `convertScalarValue()`

| Parameter type | Native | Format2 |
|---|---|---|
| `gx_integer` | `"42"` or `42` | `42` (number) |
| `gx_float` | `"3.14"` or `3.14` | `3.14` (number) |
| `gx_boolean` | `"true"`/`"false"` or bool | `true`/`false` (boolean) |
| `gx_select` (multiple) | `"a,b,c"` or list | `["a","b","c"]` (array) |
| `gx_data_column` (multiple) | `"0,1"` or list | `[0, 1]` (number array) |
| `gx_data_column` (single) | `"3"` or `3` | `3` (number) |
| `gx_text`, `gx_color`, `gx_hidden`, etc. | string | string (passthrough) |

#### Format2 → Native: `encodeStateToNative()`

```typescript
function encodeStateToNative(
  toolInputs: ToolParameterModel[],
  state: Record<string, unknown>,
): Record<string, unknown>;
```

Walks format2 state reversing coercions:
- Multiple select lists: coerce elements to strings
- Data column values: coerce to strings

**No `JSON.stringify` per-key.** Returns a clean dict. The structural conversion (`toNative()`) places this dict directly as `tool_state` — a proper object, not double-encoded JSON strings.

#### Validation wrapper

```typescript
function convertStateToFormat2Validated(
  nativeStep: NormalizedNativeStep,
  toolInputs: ToolParameterModel[],
): Format2ConvertedState;  // throws ConversionValidationFailure
```

1. Validate native state against `createFieldModel(bundle, "workflow_step_native")` 
2. Convert via `convertStateToFormat2()`
3. Validate result against `createFieldModel(bundle, "workflow_step")` + linked validation with `in` connections
4. Throw `ConversionValidationFailure` if either validation fails — caller catches and falls back

**Tests:**
- Per-parameter-type scalar coercion (each type in table above)
- ConnectedValue/RuntimeValue → `in` block mapping
- gx_data always goes to `in` block (connected or not)
- gx_rules JSON string parsing
- Null/missing value handling
- Reverse coercions for format2→native
- Round-trip: convertScalarValue then reverse should preserve semantics
- Validation wrapper catches bad state and throws ConversionValidationFailure
- Multiple select edge cases: empty string, single value, already a list

### Step 3: Hook into toFormat2/toNative

**Modified files:**
- `packages/schema/src/workflow/normalized/toFormat2.ts`
- `packages/schema/src/workflow/normalized/toNative.ts`

#### ConversionOptions

```typescript
interface ConversionOptions {
  /** Per-step callback: native step → format2 state dict, or null for passthrough. */
  stateEncodeToFormat2?: (nativeStep: NormalizedNativeStep) => Record<string, unknown> | null;
  /** Per-step callback: (step, format2State) → native tool_state dict, or null for default. */
  stateEncodeToNative?: (step: Record<string, unknown>, state: Record<string, unknown>) => Record<string, unknown> | null;
  compact?: boolean;
}
```

Add optional `options` parameter to `toFormat2()` and `toNative()`:

```typescript
function toFormat2(raw: unknown, options?: ConversionOptions): NormalizedFormat2Workflow;
function toNative(raw: unknown, options?: ConversionOptions): NormalizedNativeWorkflow;
```

In `_buildFormat2Step()`, if `options.stateEncodeToFormat2` is provided, call it with the native step. If it returns non-null, use the returned dict as the format2 `state` (replacing the passthrough `tool_state`). If null, fall back to current behavior.

Same pattern for `_buildStep()` in `toNative.ts` with `stateEncodeToNative`.

#### Stateful wrappers

**New file:** `packages/schema/src/workflow/normalized/toFormat2Stateful.ts`

```typescript
interface StepExportStatus {
  stepId: string;
  toolId?: string;
  converted: boolean;
  error?: string;
}

interface StatefulExportResult {
  workflow: NormalizedFormat2Workflow;
  steps: StepExportStatus[];
}

async function toFormat2Stateful(
  raw: unknown,
  toolCache: ToolCache,
  options?: { compact?: boolean },
): Promise<StatefulExportResult>;
```

Creates the `stateEncodeToFormat2` callback:
1. For each step, load tool from cache
2. Call `convertStateToFormat2Validated(step, tool.inputs)`
3. Track per-step status (converted vs fallback with error)
4. Return converted state or null (fallback)

**New file:** `packages/schema/src/workflow/normalized/toNativeStateful.ts`

Same pattern with `stateEncodeToNative` callback using `encodeStateToNative()`.

**Tests:**
- Stateful export with cached tools: all steps converted
- Stateful export with missing tool: graceful fallback, status reports failure
- Stateful export with invalid state: fallback, status reports error
- Options passthrough (compact) works
- Verify format2 output has clean `state` dicts (not raw tool_state)

### Step 4: CLI wiring

**Modified files:**
- `packages/cli/src/commands/convert.ts`
- `packages/cli/src/commands/convert-tree.ts`
- `packages/cli/src/bin/gxwf.ts`

Add `--stateful` flag to `gxwf convert` and `gxwf convert-tree`:

```
gxwf convert my-workflow.ga --to format2 --stateful
gxwf convert-tree ./workflows/ --to format2 --stateful --output-dir ./converted/
```

When `--stateful`:
- Load tool cache (reuse existing `--cache-dir` infrastructure)
- Use `toFormat2Stateful()` / `toNativeStateful()` instead of schema-free variants
- Report per-step conversion status to stderr
- Exit code: 0 = all converted, 1 = some fell back

Without `--stateful`: behavior unchanged (schema-free passthrough).

**Tests:**
- CLI integration: `--stateful` with seeded tool cache
- CLI integration: `--stateful` without cache → graceful degradation
- Tree mode: `--stateful` processes all files, reports aggregate status

### Step 5: Precheck / legacy encoding gate

**New file:** `packages/schema/src/workflow/precheck.ts`

```typescript
interface PrecheckResult {
  canProcess: boolean;
  skipReasons: string[];
}

function precheckNativeWorkflow(
  workflow: NormalizedNativeWorkflow,
  toolInputs?: Map<string, ToolParameterModel[]>,
): PrecheckResult;
```

Checks:
- Legacy replacement parameters (`${...}` patterns in tool_state values) — can't validate typed fields with string interpolation
- Optionally: legacy encoding classification via existing `scanToolState()` from `legacy-encoding.ts`

Wire into stateful conversion: if precheck fails, skip stateful conversion for that workflow (fall back to schema-free).

**Tests:**
- Workflow with `${input1}` in tool_state → canProcess: false
- Clean workflow → canProcess: true

### Step 6: Roundtrip validation

**New file:** `packages/schema/src/workflow/roundtrip.ts`

```typescript
interface StepRoundtripResult {
  stepId: string;
  toolId?: string;
  success: boolean;
  failureClass?: FailureClass;
  error?: string;
  diffs: string[];
}

interface RoundtripResult {
  workflowName: string;
  stepResults: StepRoundtripResult[];
  success: boolean;
}

async function roundtripValidate(
  nativeWorkflow: NormalizedNativeWorkflow,
  toolCache: ToolCache,
): Promise<RoundtripResult>;
```

Pipeline: native → format2 (stateful) → native' (stateful) → compare

#### Comparison logic

Per-step comparison of original vs reimported `tool_state`:
- Recursive dict/array comparison
- Skip bookkeeping keys
- Type-aware equivalence: `"5" == 5`, `"true" == true`, `"null" == null`
- Classify diffs as benign vs real:
  - **Benign:** all-null section omitted, empty repeat omitted, multi-select normalized (scalar→list)
  - **Real:** value changed, key missing, type mismatch not covered by equivalence rules

#### CLI

```
gxwf roundtrip my-workflow.ga
gxwf roundtrip-tree ./workflows/ --json
```

Exit codes: 0 = clean roundtrip, 1 = benign diffs only, 2 = real diffs or errors.

**Tests:**
- Clean workflow roundtrips with zero diffs
- Workflow with stale keys: cleaned during conversion, benign diff
- Workflow with type coercions: `"42"` → `42` → `"42"`, benign
- Workflow with real state corruption: detected as failure
- Per-step failure classification

### Step 7: Documentation

Update `docs/guide/workflow-operations.md`:
- Add stateful conversion section
- Add roundtrip validation section
- Update Python parity table (mark `--stateful` variants as Done)

Update `docs/packages/cli.md`:
- Add `--stateful` flag to convert/convert-tree docs
- Add `roundtrip` / `roundtrip-tree` commands

---

## Implementation Order

1. **Step 1** — Walker (foundation for everything) ✅ **Done** (2026-04-04)
2. **Step 2** — Conversion functions (uses walker) ✅ **Done** (2026-04-04) — validation wrapper deferred to Step 3 (depends on integration)
3. **Step 5** — Precheck (independent, wired into steps 3-4) ✅ **Done** (2026-04-04)
4. **Step 3** — ConversionOptions hooks in toFormat2/toNative + stateful wrappers ✅ **Done** (2026-04-04, revised 2026-04-04)
5. **Step 4** — CLI wiring ✅ **Done** (2026-04-04)
6. **Step 6** — Roundtrip validation ✅ **Done** (2026-04-04)
7. **Step 7** — Documentation ✅ **Done** (2026-04-04)

Steps 1-2 are schema-package work. Step 5 is small and independent. Steps 3-4 wire everything together. Step 6 builds on top.

### Progress notes (2026-04-04)

**Step 1** — `packages/schema/src/workflow/walker.ts` + `test/walker.test.ts` (34 tests). Exports: `walkNativeState`, `walkFormat2State`, `SKIP_VALUE`, `UnknownKeyError`, `LeafCallback`, `WalkNativeOptions`. Reuses `flatStatePath`, `repeatInputsToArray`, `selectWhichWhen` from `state-merge.ts`. String container rejection (no legacy decode).

**Step 2** — `packages/schema/src/workflow/stateful-convert.ts` + `test/stateful-convert.test.ts` (52 tests). Exports: `convertScalarValue`, `reverseScalarValue`, `convertStateToFormat2`, `encodeStateToNative`, `Format2ConvertedState`. Scalar coercion table matches Python reference (confirmed via research agent). `encodeStateToNative` returns clean dicts — no `JSON.stringify` per-key. **Deferred:** `convertStateToFormat2Validated` wrapper with `ConversionValidationFailure` — defer to Step 3 where `createFieldModel` validation integrates with `toFormat2`/`toNative`.

**Step 5** — `packages/schema/src/workflow/precheck.ts` + `test/precheck.test.ts` (9 tests). Exports: `precheckNativeWorkflow`, `PrecheckResult`, `StepPrecheckResult`. Reuses `scanForReplacements` (typed `${...}` detection) and `scanToolState` (legacy encoding detection) — no duplicated walking. Per-step results enable per-step fallback in later steps.

**Step 3** — ConversionOptions hooks + stateful wrappers.
- `toFormat2.ts`: new `ToFormat2Options` with `stateEncodeToFormat2(nativeStep) → Format2StateOverride | null` callback. Wired into `_buildToolFormat2Step` — if the callback returns non-null, uses its state dict and merges optional `in` block overrides. Options threaded through subworkflow recursion.
- `toNative.ts`: new `ToNativeOptions` with `stateEncodeToNative(step, mergedState) → dict | null`. Wired into `_buildToolStep` — if non-null, replaces toolState body (merged with `__page__: 0` base).
- `toFormat2Stateful.ts` + `toNativeStateful.ts`: sync wrappers that take a `ToolInputsResolver` callback `(toolId, toolVersion) => ToolParameterModel[] | undefined`. Per-step status tracking (converted/error/toolId/toolVersion). Graceful fallback when resolver returns undefined or conversion throws.
- `stateful-wrappers.test.ts` (5 tests): cached → coerced state + stale keys stripped; uncached → fallback + status; per-step isolation; non-tool steps not in status; round-trip native→format2→native produces clean dicts.

Resolved unresolved question (sync vs async callbacks): callback-shaped resolver — matches gxformat2's `ConversionOptions.state_encode_to_*` design (options.py, _conversion.py:1264-1276). Core conversion stays sync, CLI layer handles async preloading. Schema package has no runtime dep on core.

**Revised 2026-04-04:** Original design used `Map<tool_id, ToolParameterModel[]>` keyed by tool_id alone. Reviewer identified (and gxformat2 research confirmed) that this (a) collides on version for multi-version workflows, (b) requires pre-computed lookups that miss external subworkflow refs. Switched to `ToolInputsResolver` callback taking `(toolId, toolVersion)`. Error message: `"tool not resolved: {id}@{version}"`. This is the gxformat2-aligned shape.

Total: 100 new tests. Full schema suite: 4443 passed | 88 skipped. Lint/format/typecheck clean across all packages.

**Step 4** — CLI wiring (`gxwf convert` / `gxwf convert-tree` `--stateful` flag).
- `stateful-tool-inputs.ts`: `loadToolInputsForWorkflow(data, format, cache, expansionOpts)` — expands the workflow via `expandedNative`/`expandedFormat2` (with `createDefaultResolver` for file/URL/TRS/base64 refs), walks every step including subworkflows, dedupes `(toolId, toolVersion)` pairs, preloads each via `loadCachedTool`, returns a sync `ToolInputsResolver` closed over `Map<"${id}\0${version}", inputs>`. Also returns per-tool `ToolLoadStatus[]` for reporting.
- `convert.ts`: `--stateful` + `--cache-dir` flags; empty-cache warning (mirrors `lint.ts` pattern); per-tool load errors printed with version; stateful wrapper called with the resolver; per-step stateful status reported to stderr; exit 1 if any step fell back.
- `convert-tree.ts`: same flags; shared cache loaded once; per-file expansion resolver (workflowDirectory = `dirname(tree/path)`); `toolLoadErrors` surface in text output under each file line; `[stateful N/M]` counts; aggregate fallback summary; exit 1 on file errors OR stateful fallbacks.
- `gxwf.ts`: registers `--stateful` and `--cache-dir` on both subcommands.
- `schema/src/index.ts`: re-exports `toFormat2Stateful`, `toNativeStateful`, `StepConversionStatus`, `StatefulExportResult`, `StatefulNativeResult`, `ToolInputsResolver` (Step 3 oversight fixed here).
- `convert-stateful.test.ts` (4 tests): scalar coercion + stale-key stripping with seeded cache; schema-free baseline comparison; empty-cache graceful fallback; tree aggregation with `[stateful N/M]` output.

Design notes:
- Expansion-before-collection correctly handles external subworkflow refs — the tool collector walks the fully-expanded tree, not `unique_tools` (which only covers inline subworkflows).
- Map key widened to `${toolId}\0${toolVersion ?? ""}` so multi-version workflows don't collide.
- Cache key (`sha256("{toolshed_url}/{trs_tool_id}/{version}")`) is byte-compatible with Galaxy's Python `wf_tool_state` branch — confirmed at `toolshed_tool_info.py:83-86` vs `packages/core/src/cache/cache-key.ts:7-10`. A cache populated by either side is lookup-compatible with the other.

Full test count: 4443 schema, 97 CLI (4 new), 13 proxy. `make check` + `make test` clean.

**Step 6** — Roundtrip validation.
- `packages/schema/src/workflow/roundtrip.ts`: `roundtripValidate(nativeRaw, toolInputsResolver)` — sync pipeline `ensureNative` → `toFormat2Stateful` → `toNativeStateful` → per-step `tool_state` diff via recursive `compareTree`. Per-step comparison keyed by step id (tool steps only). Per-step forward failures propagate as `conversion_error`; reverse throw → `reimport_error`.
- Diff classification (`DiffSeverity = error | benign`, `BenignArtifactKind` enum): `scalarsEquivalent` handles `"5"↔5`, `"3.14"↔3.14`, `"true"↔true`, `"null"↔null`. `multiSelectEquivalent` only fires when exactly one side is an array (identical arrays fall through to element-wise recursion — avoids false-positive benign flags). `classifyMissing` → `all_null_section_omitted` / `empty_container_omitted` / `connection_only_section_omitted`. Stale-key presence on one side → `bookkeeping_stripped`.
- `SKIP_KEYS` mirrors Python's set (`__current_case__`, `__input_ext`, `__page__`, `__rerun_remap_job_id__`, `__index__`, `__job_resource`, `chromInfo`). Note: `toNative._buildStep` always re-injects `__page__: 0` into reimported tool_state, so `__page__` diffs don't actually appear — only other stale keys do.
- `roundtrip.test.ts` (6 tests): clean already-typed workflow, bookkeeping key benign flag, type coercion equivalence, uncached tool fallback, `clean=true` when zero diffs, non-tool step filtering.
- CLI: `packages/cli/src/commands/roundtrip.ts` (`gxwf roundtrip`) + `roundtrip-tree.ts` (`gxwf roundtrip-tree`). Registered in `gxwf.ts`. Source must be native (rejects format2). Reuses `loadToolInputsForWorkflow` + expansion resolver — same pattern as `convert --stateful`. Exit codes: **0 clean, 1 benign-only, 2 real diffs or errors**. Tree variant uses `collectTree(..., includeFormat2=false)` + `skipWorkflow(...)` for non-native files; aggregates benign/error counts across files. `countDiffs` and `exitCodeFor` helpers exported from `roundtrip.ts` for tree reuse.
- `roundtrip.test.ts` CLI (6 tests): clean roundtrip (exit 0), string-int coercion (exit 0 or 1), stale key benign (exit 1), empty cache (exit 2), format2 rejection (exit 2), tree aggregation with `__rerun_remap_job_id__` benign flag (exit 1). Used `__rerun_remap_job_id__` rather than `__page__` because `toNative` re-injects the latter.

Exports added: `roundtripValidate`, `RoundtripResult`, `StepRoundtripResult`, `StepDiff`, `DiffSeverity`, `BenignArtifactKind`, `RoundtripFailureClass` (via `workflow/index.ts` and `src/index.ts`).

Total: 12 new tests. `make check` + `make test` clean: 4449 schema, 103 CLI (6 new), 97 core, 13 proxy.

**Step 6 review pass (2026-04-04).** Reviewed and applied three should-fixes + nits from a subagent review:
- **Subworkflow visibility.** `collectSubworkflowSteps` emits synthetic `StepRoundtripResult` entries with `failureClass: "subworkflow_not_diffed"` and `success: true` so callers see the skipped step. Filtered out of the overall verdict (tool results only). CLI reporter loop updated to print informational entries.
- **`isEmptyContainerDict` tightened.** Now requires `sawEmptyList = true` before classifying a value — matches Python's `_is_empty_container_dict`. Plain `{}` no longer mis-classified.
- **Null leaves short-circuit.** In `compareTree`'s missing-key branch, presentValue of `null` / `"null"` / `undefined` / `[]` emits no diff at all (matches Python `roundtrip.py:334-336`). Keeps `clean=true` aligned with Python's "ok" status.
- **Nits.** `let forward: StatefulExportResult` type annotation, docstring on `compareTree` explaining why it doesn't use `walker.ts` and why no `_try_json_decode`, tree output wording "conversion failure" vs "step fail". Added subworkflow visibility test (13th roundtrip unit test; 4450 schema suite).

**Python parity gaps not ported (deliberate):** step ID remapping (label+type matching — TS preserves step IDs through both conversions), subworkflow recursion in diff, comment remapping, visual/position/label/annotation diffs (`_compare_step_visual`), opportunistic JSON-decode of string leaves (`_try_json_decode` — violates "no legacy decode" principle), `KnownBenignArtifacts` rich enum (we have a smaller `BenignArtifactKind`). Version-key handling in resolvers is untested at the roundtrip layer — `mapResolver(toolId)` ignores version.

**Step 7** — Documentation.
- `docs/guide/workflow-operations.md`: Overview table expanded to five operations. New "Schema-free vs Stateful" subsection under Format Conversion with `--stateful`/`--cache-dir` usage. New top-level "Roundtrip Validation" section covering diff classification (benign kinds enumerated), exit codes (0/1/2), and limitations (native-only, no subworkflow recursion, no step remapping, tool_state-only). Python parity table flipped `gxwf-to-format2-stateful`, `gxwf-to-native-stateful`, their tree variants, `gxwf-roundtrip-validate`, and `gxwf-roundtrip-validate-tree` from Future → Done.
- `docs/packages/cli.md`: `convert` table gains `--stateful` + `--cache-dir`; `convert-tree` likewise. New `roundtrip <file>` and `roundtrip-tree <dir>` command sections with option tables and exit codes.

---

## Relationship to Python STRICT_STATE_PLAN

The STRICT_STATE_PLAN decomposes `--strict` into `--strict-structure`, `--strict-encoding`, `--strict-state`. Several items are directly relevant:

- **STRICT_STATE_PLAN Step 0** (fix `encode_state_to_native()`): Python's `encode_state_to_native()` currently does `{key: json.dumps(value)}` — producing the double-encoded format that `--strict-encoding` would reject. Step 0 fixes this to return clean dicts. The TS side never replicates this — our `encodeStateToNative()` returns clean dicts from the start.

- **67aa42d** (remove `as_dict`/`as_list`): Python walker no longer silently decodes JSON-string containers. The TS walker is ported without these helpers — containers must be proper types.

- **`--strict-encoding`**: Once implemented on both sides, validates that tool_state is a proper dict (not JSON string) and containers within are proper dicts/lists. The TS stateful conversion produces clean output by design.

- **`--strict-structure`**: Future work for TS — validate workflow dict against strict Effect Schemas. Not in scope for this plan.

---

## Future Work (not in this plan)

- **Stale key classification** — Port Python's `stale_keys.py` categories (BOOKKEEPING, RUNTIME_LEAK, STALE_ROOT, STALE_BRANCH, UNKNOWN) for `--allow`/`--deny` policy on export. Currently TS uses hardcoded stale key set.
- **Connection validation** — Validate that connection paths match tool parameter definitions. Uses walker infrastructure.
- **Strict flags** — Port `--strict-structure`, `--strict-encoding`, `--strict-state` decomposition from Python STRICT_STATE_PLAN.
- **Walker unification** — Refactor `state-merge.ts` to use the walker internally, eliminating duplicated tree traversal logic.

---

## Unresolved Questions

- Should `--stateful` be the default for convert eventually, or always opt-in?
- Roundtrip benign artifact classification — how much of Python's classification taxonomy is needed for the first pass? Start minimal (type coercion equivalence) and expand?
- Should the walker replace `state-merge.ts` inline walking now or later? They do the same traversal differently (state-merge mutates, walker builds new dict). Coexistence is fine but adds maintenance surface.
- ConversionOptions on `toFormat2()`/`toNative()`: async callbacks (tool cache lookups) vs sync? The wrappers (`toFormat2Stateful`) are async, but the core conversion functions are currently sync. Options: (a) make callbacks sync, require pre-loaded tools; (b) make `toFormat2` accept async callbacks; (c) keep core sync, stateful wrappers do the async tool loading and pass pre-resolved data to sync callbacks.
- Should `encodeStateToNative()` produce flat state (top-level keys only, pipe-separated paths) or nested state (dicts for conditionals/sections, arrays for repeats)? Python does flat + json.dumps — we're not doing json.dumps, so nested is more natural. But native `tool_state` in `.ga` files historically uses flat keys. Need to check what `toNative()` currently expects.
