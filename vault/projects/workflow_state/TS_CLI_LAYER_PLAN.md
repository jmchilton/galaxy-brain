# TypeScript CLI Layer Overhaul Plan

**Date:** 2026-04-03
**Repo:** `jmchilton/galaxy-tool-util-ts` (`galaxy-tool-util`)
**Goal:** Bring TS CLI surface into spiritual parity with the Python `gxwf-*` namespace — expose cleaning, linting, format conversion, and roundtrip operations that already exist in `@galaxy-tool-util/schema` but lack CLI commands.

---

## Current State

### What the TS CLI exposes today

| CLI | Commands |
|---|---|
| `galaxy-tool-cache` | `add`, `list`, `info`, `clear`, `schema` |
| `galaxy-workflow-validate` | single-file validate (structural + tool state, effect/json-schema backends) |

### What the schema/core packages already implement (no CLI)

| Operation | Module | Notes |
|---|---|---|
| `cleanWorkflow()` | `schema/workflow/clean.ts` | Strip stale keys, decode legacy encoding. Native only (format2 passes through). |
| `lintWorkflow()` / `lintNative()` / `lintFormat2()` | `schema/workflow/lint.ts` | Structural lint — outputs, labels, step errors, subworkflow recursion |
| `lintBestPracticesFormat2()` / `lintBestPracticesNative()` | `schema/workflow/lint.ts` | Annotations, creators, licenses, disconnected inputs, untyped params |
| `toFormat2()` | `schema/workflow/normalized/toFormat2.ts` | Native -> Format2 conversion (schema-free, like gxformat2) |
| `toNative()` | `schema/workflow/normalized/toNative.ts` | Format2 -> Native conversion (schema-free, like gxformat2) |
| `expandedNative()` / `expandedFormat2()` | `schema/workflow/normalized/expanded.ts` | Subworkflow expansion |
| `detectFormat()` | `schema/workflow/detect-format.ts` | Auto-detect native vs format2 |
| `scanForReplacements()` | `schema/workflow/replacement-scan.ts` | Legacy replacement parameter detection |
| `scanToolState()` | `schema/workflow/legacy-encoding.ts` | Legacy encoding classification |

### Python CLI commands (for parity reference)

**gxformat2 (schema-free):**
- `gxwf-to-native` — format2 -> native
- `gxwf-to-format2` — native -> format2
- `gxwf-lint` — structural lint
- `gxwf-viz` — Cytoscape visualization (out of scope for TS)
- `gxwf-abstract-export` — abstract CWL export (out of scope for TS)

**galaxy-tool-util workflow_state (schema-aware):**
- `gxwf-state-validate` / `gxwf-state-validate-tree`
- `gxwf-state-clean` / `gxwf-state-clean-tree`
- `gxwf-roundtrip-validate` / `gxwf-roundtrip-validate-tree`
- `gxwf-to-format2-stateful` / `gxwf-to-format2-stateful-tree`
- `gxwf-to-native-stateful` / `gxwf-to-native-stateful-tree`
- `gxwf-lint-stateful` / `gxwf-lint-stateful-tree`
- `galaxy-tool-cache` (populate-workflow, add, add-local, list, info, clear, schema, structural-schema)

---

## Plan

### Step 0: Unify under `galaxy-workflow` CLI

Replace the standalone `galaxy-workflow-validate` binary with a single `galaxy-workflow` command with subcommands. This mirrors how `galaxy-tool-cache` already works and avoids name explosion as we add operations.

**New binary:** `packages/cli/src/bin/gxwf.ts`

```
gxwf validate <file>     # existing validate (structural + tool state)
gxwf clean <file>        # new
gxwf lint <file>         # new
gxwf convert <file>      # new (format conversion)
```

**Deprecation:** Drop `galaxy-workflow-validate` and do not worry about backward compatibility. 

**package.json bin entries:**
```json
{
  "galaxy-tool-cache": "./dist/bin/galaxy-tool-cache.js",
  "gxwf": "./dist/bin/gxwf.js",
}
```

### Step 1: `gxwf clean`

Expose `cleanWorkflow()` via CLI.

```
gxwf clean <file> [--output <file>] [--diff] [--format native|format2]
```

| Option | Description |
|---|---|
| `<file>` | Workflow file (.ga or .gxwf.yml) |
| `--output <file>` | Write cleaned workflow to file (default: stdout). Use same path as input for in-place. |
| `--diff` | Show unified diff of changes instead of writing output |
| `--format` | Force format (auto-detected by default) |

**Implementation:** `packages/cli/src/commands/clean.ts`

Logic:
1. Read + parse file (JSON or YAML based on extension)
2. `cleanWorkflow(data)` — mutates in place
3. Output result or diff

Note: The Python version has stale key classification/policy (`--preserve`/`--strip`/`--allow`/`--deny`) and schema-aware cleaning (keys not in tool def). The TS `cleanWorkflow()` currently only strips hardcoded stale key sets. We should document this gap but not block the CLI on closing it — the hardcoded set covers the common case.

**Tests:**
- Unit test: clean a workflow with stale keys, verify they're removed
- Unit test: clean a format2 workflow, verify passthrough
- CLI integration test: run command on fixture, check stdout/exit code

### Step 2: `gxwf lint`

Unified lint combining structural checks, best practices, and tool state validation — equivalent to Python's `gxwf-lint-stateful`. Tool state validation is on by default; the two skip flags let callers opt out of the expensive or opinionated phases.

```
gxwf lint <file> [--skip-best-practices] [--skip-state-validation] [--format native|format2]
```

| Option | Description |
|---|---|
| `<file>` | Workflow file (.ga or .gxwf.yml) |
| `--skip-best-practices` | Skip annotation/creator/license/label checks |
| `--skip-state-validation` | Skip tool state validation against cached tool definitions |
| `--cache-dir <dir>` | Tool cache directory (for state validation) |
| `--mode <mode>` | State validation backend: `effect` (default) or `json-schema` |
| `--tool-schema-dir <dir>` | Pre-exported per-tool JSON Schemas (offline json-schema mode) |
| `--format` | Force format (auto-detected by default) |
| `--json` | Output structured JSON result |

**Implementation:** `packages/cli/src/commands/lint.ts`

Logic — three phases, each independently skippable:
1. **Structural lint** — `lintWorkflow(data)` (always runs)
2. **Best practices** — `lintBestPracticesNative(data)` or `lintBestPracticesFormat2(data)` based on format (skip with `--skip-best-practices`)
3. **Tool state validation** — reuse the existing `validateNativeSteps()` / `validateFormat2Steps()` logic from `validate-workflow.ts` (skip with `--skip-state-validation`). Requires tool cache; if cache is empty and `--skip-state-validation` not set, warn and degrade gracefully (report skipped steps, don't hard-fail).

Combined exit code: 0 = clean, 1 = warnings only, 2 = structural/state errors.

This means `gxwf lint` subsumes `gxwf validate` — validate becomes a convenience alias for `gxwf lint --skip-best-practices`. We should note this in docs but keep `validate` as a command since it's already established and the mental model ("I just want to check if this is valid") is distinct from "lint me everything".

**Dependency:** Step 2 should refactor the validation logic in `validate-workflow.ts` into a reusable function (returning `StepValidationResult[]`) that both `lint.ts` and `validate-workflow.ts` call. The current `runValidateWorkflow()` mixes validation with CLI output; split into `validateWorkflow()` (pure logic) + `runValidateWorkflow()` (CLI wrapper).

**Tests:**
- Lint a well-formed workflow with cached tools, verify all three phases pass
- Lint a workflow missing annotations/creators, verify best practice warnings
- Lint a workflow with broken output sources, verify structural errors
- Lint a workflow with invalid tool state, verify state validation errors
- `--skip-best-practices` suppresses those warnings but state validation still runs
- `--skip-state-validation` suppresses state checks but structural + best practices still run
- Both skip flags together = structural-only lint
- Empty tool cache + no skip flag = graceful degradation (skipped steps, not hard failure)

### Step 3: `gxwf convert`

Expose `toFormat2()` and `toNative()` via CLI.

```
gxwf convert <file> [--to native|format2] [--output <file>] [--compact] [--json|--yaml]
```

| Option | Description |
|---|---|
| `<file>` | Workflow file (.ga or .gxwf.yml) |
| `--to <format>` | Target format. If omitted, infer opposite of detected format. |
| `--output <file>` | Write result to file (default: stdout) |
| `--compact` | Omit position info in format2 output |
| `--json` | Force JSON output (default for native) |
| `--yaml` | Force YAML output (default for format2) |

**Implementation:** `packages/cli/src/commands/convert.ts`

Logic:
1. Read + parse
2. Detect format, determine target
3. `toFormat2(data)` or `toNative(data)`
4. Serialize (YAML for format2, JSON for native, overridable)

Note: This is the schema-free conversion path (like Python's `gxwf-to-format2` / `gxwf-to-native`). The Python project also has `gxwf-to-format2-stateful` and `gxwf-to-native-stateful` which use tool definitions for smarter state conversion. Those would be a follow-up feature requiring the tool cache integration.

**Tests:**
- Convert native -> format2, verify structure
- Convert format2 -> native, verify structure
- Round-trip: convert native -> format2 -> native, verify equivalence on key fields
- `--compact` strips position data
- Auto-detection of target format

### Step 4: Enhance `galaxy-tool-cache`

Add missing subcommands from the Python version.

#### 4a: `galaxy-tool-cache populate-workflow`

```
galaxy-tool-cache populate-workflow <path> [--cache-dir <dir>] [--galaxy-url <url>]
```

Scan a workflow file (or directory of workflows), extract all `tool_id`/`tool_version` pairs, fetch and cache each one. This is the TS equivalent of `galaxy-tool-cache populate-workflow` in Python.

**Implementation:** `packages/cli/src/commands/populate-workflow.ts`

Logic:
1. Read workflow, detect format
2. Normalize and collect all tool steps (with subworkflow recursion)
3. For each unique `(tool_id, tool_version)`, call existing `add` logic
4. Report: cached N tools, M already cached, K failed

#### 4b: `galaxy-tool-cache structural-schema`

```
galaxy-tool-cache structural-schema [--output <file>] [--strict]
```

Export the gxformat2 `GalaxyWorkflow` JSON Schema. This enables external tooling to validate workflow structure without the TS runtime.

**Implementation:** `packages/cli/src/commands/structural-schema.ts`

Logic:
1. `JSONSchema.make(GalaxyWorkflowSchema)` (Effect's built-in JSON Schema generation)
2. Write to file or stdout

### Step 5: Tree/batch mode

Mirror the Python `-tree` suffix as subcommands under `gxwf`. Each tree variant takes a directory instead of a file, discovers workflows, processes each, and aggregates results.

```
gxwf validate-tree <dir>
gxwf lint-tree <dir>
gxwf clean-tree <dir> --output-dir ./cleaned/
gxwf convert-tree <dir> --to format2 --output-dir ./converted/
```

Tree-specific options (not on single-file variants):

| Option | Description |
|---|---|
| `--report-json [file]` | Emit structured JSON report |
| `--report-markdown [file]` | Emit Markdown report |
| `--output-dir <dir>` | Output directory for clean-tree / convert-tree |

Shared logic in `packages/cli/src/commands/tree.ts`:
1. Discover workflow files (`.ga`, `.gxwf.yml`) recursively
2. Process each with the corresponding single-file logic
3. Aggregate results with summary counts (pass/fail/skip)
4. Exit code = worst exit code across all files

Maps directly to the Python `_tree_orchestrator.py` pattern. Subcommands under one binary instead of separate binaries.

### Step 6: Documentation overhaul

#### 6a: Update `docs/packages/cli.md`

Restructure to document both CLIs:

```
# CLI Reference

## galaxy-tool-cache
### add
### list
### info
### clear
### schema
### populate-workflow        # new
### structural-schema        # new

## gxwf
### validate / validate-tree
### clean / clean-tree           # new
### lint / lint-tree             # new
### convert / convert-tree       # new
```

#### 6b: New guide: `docs/guide/workflow-operations.md`

Expand `docs/guide/workflow-validation.md` into a broader operations guide:

- **Validation** — structural + tool state, effect vs json-schema backends
- **Cleaning** — stale key removal, when to clean before validating
- **Linting** — structural checks + best practices, relationship to validation
- **Format conversion** — native <-> format2, when to use, limitations
- **Batch processing** — recursive mode, report formats
- **Tool cache management** — populating cache, schema export

#### 6c: Update `docs/architecture/overview.md`

Add workflow operations to the architecture diagram showing the relationship between schema-level operations and CLI commands.

#### 6d: Python parity table in docs

Add a table mapping Python CLI commands to TS equivalents:

| Python | TypeScript | Status |
|---|---|---|
| `gxwf-lint` | `gxwf lint --skip-state-validation` | Planned |
| `gxwf-to-format2` | `gxwf convert --to format2` | Planned |
| `gxwf-to-native` | `gxwf convert --to native` | Planned |
| `gxwf-state-validate` | `gxwf validate` | Exists |
| `gxwf-state-clean` | `gxwf clean` | Planned |
| `gxwf-lint-stateful` | `gxwf lint` | Planned |
| `gxwf-to-format2-stateful` | `gxwf convert --to format2 --stateful` | Future |
| `gxwf-to-native-stateful` | `gxwf convert --to native --stateful` | Future |
| `gxwf-roundtrip-validate` | `gxwf roundtrip` | Future |
| `gxwf-*-tree` | `gxwf *-tree` | Planned |
| `galaxy-tool-cache populate-workflow` | `galaxy-tool-cache populate-workflow` | Planned |
| `galaxy-tool-cache structural-schema` | `galaxy-tool-cache structural-schema` | Planned |
| `galaxy-tool-cache add-local` | — | Out of scope (no local XML parsing) |
| `gxwf-viz` | — | Out of scope |
| `gxwf-abstract-export` | — | Out of scope |

---

## Implementation Order

1. **Step 0** — `gxwf` binary + migrate validate
2. **Step 1** — `clean` command
3. **Step 2** — `lint` command
4. **Step 3** — `convert` command
5. **Step 4a** — `populate-workflow`
6. **Step 4b** — `structural-schema`
7. **Step 6** — Documentation (can start alongside any step)
8. **Step 5** — Tree variants (`validate-tree`, `lint-tree`, `clean-tree`, `convert-tree`)

Steps 1-3 are independent once step 0 is done and can be parallelized.

---

## Future Work (not in this plan)

These represent Python parity features that need deeper library work:

- **Schema-aware conversion** (`--stateful` flag on `convert`) — needs tool cache integration in conversion path, walker callbacks for state encoding/decoding
- **Roundtrip validation** (`gxwf roundtrip`) — needs schema-aware convert in both directions, structured diff classification
- **Connection validation** (`--connections` flag on `validate`) — needs connection graph builder, type propagation
- **Stale key classification/policy** — needs schema-aware key detection (keys not in tool def vs hardcoded set)
- **Legacy encoding detection / prechecking** — detection exists in schema package (`scanToolState`), could be exposed as `gxwf precheck`
- **Report output modes** (`--report-json`, `--report-markdown`) — structured output for CI integration

---

## Unresolved Questions

- Should `gxwf` support reading from stdin for piping (`cat wf.ga | gxwf lint -`)?
- Should tree variants share all options with their single-file counterpart, or only the subset that makes sense?
- For `clean --diff`: use unified diff format or a custom format showing before/after per-step?
- `populate-workflow`: should it also accept a directory and auto-discover workflows (overlapping with tree mode)?
- Should we emit changesets per-step (0→4a, etc.) or batch into a single changeset for the whole overhaul?
