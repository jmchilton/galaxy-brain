# Plan: Bring Galaxy workflow_state Declarative Tests into galaxy-tool-util

## Context

Galaxy's `test/unit/tool_util/workflow_state/` now has 5 declarative operations
(`clean`, `validate`, `validate_clean`, `export_format2`, `clean_then_validate`)
tested via gxformat2's `DeclarativeTestSuite` harness — 45+ test cases across 5
expectation YAMLs (commit `c80546d3`). These need to be synced and run in the TS
project, analogous to how gxformat2's normalization expectations are already synced.

Galaxy tests reference 7 fixtures from 3 locations:

- **Synthetic** (3): `synthetic-cat1-clean.ga`, `synthetic-cat1-stale.ga`, `synthetic-cat1.gxwf.yml`
- **IWC** (2): `RepeatMasking-Workflow.ga`, `rnaseq-sr.ga`
- **Framework test data** (2): `test_workflow_1.ga`, `test_workflow_2.ga`

Galaxy operations (all require tool info via `ToolCache`):

| Operation | Description |
|-----------|-------------|
| `clean` | Strip stale keys (bookkeeping, runtime leaks, inactive branches) |
| `validate` | Tool_state validation with precheck for legacy encoding |
| `validate_clean` | Internal clean copy, then validate |
| `export_format2` | State-aware native → format2 (distinct from gxformat2's `toFormat2`) |
| `clean_then_validate` | Mutating clean, then validate — real-world pipeline |

## Step 1: Makefile — Sync Galaxy workflow_state fixtures + expectations

Add targets using `GALAXY_ROOT` (already established for `sync-golden`, `sync-param-spec`):

- **`sync-wfstate-fixtures`** — Copy the 3 synthetic fixtures from
  `$GALAXY_ROOT/test/unit/tool_util/workflow_state/fixtures/`, the 2 IWC workflows
  from `$GALAXY_ROOT/test/unit/workflows/iwc/`, and the 2 framework workflows from
  `$GALAXY_ROOT/lib/galaxy_test/base/data/` into
  `packages/schema/test/fixtures/workflow-state/fixtures/`
- **`sync-wfstate-expectations`** — Copy `clean.yml`, `validate.yml`,
  `validate_clean.yml`, `export_format2.yml`, `clean_then_validate.yml` from
  `$GALAXY_ROOT/test/unit/tool_util/workflow_state/expectations/` into
  `packages/schema/test/fixtures/workflow-state/expectations/`

Add both to the composite `sync` target.

## Step 2: Makefile — Expand check-sync to cover all synced sources

Currently `check-sync` only covers gxformat2 workflow fixtures/expectations. Add:

- **`check-sync-wfstate-fixtures`** — Diverged/missing/extra for Galaxy workflow_state fixtures
- **`check-sync-wfstate-expectations`** — Same for expectations
- **`check-sync-param-spec`** — Diff `parameter_specification.yml` against `$GALAXY_ROOT`
- **`check-sync-golden`** — Diff golden cache against `$GALAXY_ROOT` (or rely on `verify-golden` checksums)
- **`check-sync-schema-sources`** — Diff schema-salad YAML sources against `$GXFORMAT2_ROOT`

Update composite `check-sync` to be tolerant of missing env vars — run whichever
checks are possible given the vars set, skip gracefully otherwise. This is better for
CI where you might only have one upstream checkout.

## Step 3: Shared declarative test utilities

Extract reusable pieces from `declarative-normalized.test.ts` (~367 lines) into a
shared module `packages/schema/test/declarative-test-utils.ts`:

- `navigate()` — path-based object navigation (`$length`, `{field: value}`, index, key)
- `FIELD_ALIASES` — Python→TS field name mapping (`in_` → `in`, `type_` → `type`, etc.)
- Assertion functions: `assertValue`, `assertValueContains`, `assertValueSet`
- **New**: `assertValueType` — maps `value_type: dict` → object check, `list` → array, `str` → string
- **New**: `assertValueTruthy`, `assertValueAbsent` (currently inline in the test runner)
- Types: `Assertion`, `TestCase`
- `loadExpectations(dir)` — generic expectation loader from a directory of YAMLs

Both `declarative-normalized.test.ts` and the new `declarative-wfstate.test.ts` import
from this shared module. The existing gxformat2 tests gain `value_type` support
automatically.

## Step 4: Create declarative-wfstate.test.ts

New test file: `packages/schema/test/declarative-wfstate.test.ts`
(or `packages/core/test/` if ToolCache dependency pushes it there).

Structure mirrors Galaxy's `test_declarative.py`:

- Load expectations from `fixtures/workflow-state/expectations/`
- Load fixtures from `fixtures/workflow-state/fixtures/`
- Register operations: `clean`, `validate`, `validate_clean`, `export_format2`, `clean_then_validate`
- Initially **all operations in UNSUPPORTED_OPERATIONS** — tests skip, validating sync infrastructure before implementing anything

## Step 5: Implement TS operations (incremental, red-to-green)

Each operation depends on `ToolCache` for tool info. Ordered by dependency:

### 5a. `validate` operation

Most infrastructure exists in `packages/cli/src/commands/validate-workflow.ts`. Extract
validation logic into a testable function separate from CLI concerns. Needs:

- `ToolCache` for tool info
- `state-merge.ts` for connection injection
- Effect Schema validation (already exists)
- Port Galaxy's precheck (detecting legacy JSON-encoded tool_state)

### 5b. `clean` operation

Port from Galaxy's `workflow_state/stale_keys.py` + `clean.py`:

- Stale key classification (BOOKKEEPING, RUNTIME_LEAK, STALE_ROOT, STALE_BRANCH)
- `StaleKeyPolicy` system (`.for_clean()` / `.for_validate()`)
- `clean_stale_state()` — walk steps, classify keys against tool parameter models, strip

### 5c. `validate_clean` operation

Composition: clean on internal copy, then validate. Trivial once 5a + 5b exist.

### 5d. `clean_then_validate` operation

Composition: mutating clean, then validate. Trivial once 5a + 5b exist.

### 5e. `export_format2` operation

State-aware native → format2 conversion. **Distinct from** gxformat2's `toFormat2`
(which is format-level only, no tool info). Port Galaxy's
`export_workflow_to_format2()` which uses tool info to convert tool_state
representations during export.

## Dependency graph

```
Step 1 (sync targets) ──┐
Step 2 (check-sync)  ───┤──> Step 4 (test file, all skipped) ──> Step 5a-5e (operations)
Step 3 (shared utils) ──┘
```

Steps 1-3 are independent. Step 4 depends on all three. Step 5 substeps are incremental.

## Progress

| Step                                | Status      | Notes                                                                   |
| ----------------------------------- | ----------- | ----------------------------------------------------------------------- |
| 1. Makefile sync targets            | **Done**    | `3e5a0e2`                                                               |
| 2. check-sync expansion             | **Done**    | `3e5a0e2`                                                               |
| 3. Shared declarative test utils    | **Done**    | `3e5a0e2`                                                               |
| 4. declarative-wfstate.test.ts stub | **Done**    | `3e5a0e2`                                                               |
| 5a. `validate`                      | **Done**    | 7/7 pass, `3e5a0e2`                                                     |
| 5b. `clean`                         | **Done**    | 13/13 pass. `clean.ts` — recursive stale key strip + legacy JSON decode |
| 5c. `validate_clean`                | **Done**    | 6/6 pass. Composition: clean copy → validate → return original          |
| 5d. `clean_then_validate`           | **Done**    | 6/6 pass. Composition: clean → validate → return cleaned                |
| 5e. `export_format2`                | Not started | 9 tests skip. State-aware native→format2 using tool info                |

## Resolved questions

1. **Where does clean live?** `packages/schema/src/workflow/` — new file(s) near
   `legacy-encoding.ts`. Test stays in `packages/schema/test/`.
2. **StaleKeyPolicy system?** No — simplified approach. All stale keys (bookkeeping,
   runtime leaks, stale branches) are simply dropped. No warn/error distinction needed now.
3. **JSON-encoded tool_state?** Parse on ingest, clean the parsed dict, keep as dict
   (don't re-serialize). Clean produces better structure.
4. IWC fixtures — synced from Galaxy's cached copies. Done.
5. Shared test utils stay as test-only module in schema package. Done.

## Implementation notes

**clean.ts stale key sets:**
- Bookkeeping: `__page__`, `__rerun_remap_job_id__`
- Runtime leaks: `chromInfo`, `__input_ext`
- Internal indexing: `__current_case__`, `__index__`

All stripped recursively at every depth of tool_state. Legacy JSON-encoded
tool_state strings are decoded — nested compound values (objects/arrays)
are recursively parsed, primitive JSON strings kept as-is.

**Composite ops** are trivial wrappers in the test file, not in clean.ts —
they compose `cleanWorkflow()` + `validateOp()`.

## Remaining unresolved questions

1. `detectFormat()` is duplicated between `clean.ts` and the test file —
   should it be extracted to a shared utility?
2. `export_format2` (step 5e) — scope TBD. Distinct from existing `toFormat2()`
   which is format-level only. Needs tool info for state-aware conversion.
