# Cross-Project Workflow Linting: Testing Alignment Plan

Workflow linting exists in three places that evolved independently and need to be reconciled — not at the implementation level, but at the level of **which rules exist** and **how they are tested**. This document is the living plan + the rule inventory.

## Projects in Scope

| Project | Path (worktree) | Lint entry points |
|---|---|---|
| **gxformat2** (Python) | `worktrees/gxformat2/branch/abstraction_applications` | `gxformat2/lint.py`, `gxformat2/linting.py` |
| **galaxy-tool-util** (TS) | `worktrees/galaxy-tool-util/branch/gxwf-web` (this repo) | `packages/schema/src/workflow/lint.ts` |
| **galaxy** wf_tool_state (Python) | `worktrees/galaxy/branch/wf_tool_state` | `lib/galaxy/tool_util/workflow_state/lint_stateful.py` (composes gxformat2 + stateful checks) |
| **galaxy-workflows-vscode** | `worktrees/galaxy-workflows-vscode/branch/wf_tool_state` | `server/packages/server-common/src/providers/validation/` + per-format `validation/rules/` |

Note: the Galaxy Python wf_tool_state backend is not a separate linter — it wraps gxformat2's lint and adds stateful tool-state validation. It is listed here because its CLI reports surface lint results and because it's the source of truth for the `lint_stateful` fixtures under `packages/schema/test/fixtures/workflow-state/`.

## Premise Check (Why Linting ≠ Validation ≠ Shared Impl)

- **gxformat2 linting is older than VS Code linting.** The `lint.py` / `linting.py` module predates the LSP server by years, so the two sets of rules evolved on separate tracks. There is no expectation that either project is a superset of the other.
- **VS Code cannot consume gxformat2's TS port directly.** The galaxy-tool-util TS `lintFormat2()` returns `{errors: string[], warnings: string[]}` — a flat bag with no source positions. VS Code `ValidationRule`s must emit `Diagnostic` objects with `range: {start, end}` pointing at specific nodes (see `InputTypeValidationRule.ts:32-36`). Sharing *logic* requires per-rule functions that can be wrapped by an AST walker; sharing *string outputs* isn't workable.
- **There is one precedent for shared primitives:** VS Code's `ToolStateValidationService` already calls `validateFormat2StepStateStrict()` from `@galaxy-tool-util/schema` and then remaps the errors onto source ranges itself. That's the pattern — galaxy-tool-util supplies the check, VS Code supplies the positioning. This plan is not about lift-and-shift; it's about **aligning the rule inventory and the test fixtures**.
- **VS Code has two validation profiles** (`basic`, `iwc`), selected via `galaxyWorkflows.validation.profile`. gxformat2 has an analogous split via `--skip-best-practices`. The table below tracks profile membership explicitly.

## Plan Steps

### Step 1 — Rule inventory table (this document)

Enumerate every lint operation anywhere in the three projects. For each: description, severity, implementation status per project, VS Code profile membership, and pointers to positive/negative declarative fixtures. Deliverable is the tables in the next section — see **Rule Inventory** below. Step 1 will not be fully filled in on first pass; the TODO cells are tracking debt that Step 3 iterates on.

### Step 2 — Share declarative fixtures

Pick **one** of two approaches (open question):

- **Option A — Publish fixtures from galaxy-tool-util:** Ship `packages/schema/test/fixtures/{workflows,expectations}/` as a consumable artifact (e.g. a small `@galaxy-tool-util/workflow-fixtures` package or a tarball attached to releases). VS Code `server/*/tests/` adds a dev dep on it and runs a new declarative test harness modeled on `packages/schema/test/declarative-normalized.test.ts`.
- **Option B — Migrate the sync targets into VS Code:** Duplicate the `sync-workflow-fixtures` / `sync-workflow-expectations` Makefile targets into galaxy-workflows-vscode and keep three consumers of gxformat2's examples. More divergence risk; rejected unless A proves infeasible.

Either way, VS Code needs a new test file that loads expectation YAMLs and asserts that (a) baseline validation + (b) each profile's rules produce the expected diagnostics. The assertion shape differs from the TS side because diagnostics include ranges, so the YAML format may need a `diagnostics: [{message_contains, range_hint}]` extension.

### Step 3 — Fill in the gaps

Document the architecture (this file) and iterate: for each rule in the table where any of the "Implemented" columns is `no` or any fixture column is `—`, open a targeted task. Most are either "add a missing rule to the weaker project" or "add an isolated fixture for a rule that currently only has a composite fixture".

---

## Rule Inventory

Legend for "Implemented" columns:
- `Y` — has a dedicated implementation
- `baseline` — runs automatically as part of schema/syntax validation (not a pluggable rule)
- `—` — not implemented
- `ind` — indirect (e.g. galaxy-python via gxformat2)

VS Code column format: `basic|iwc` per format (f2 = format2, ga = native) — e.g. `iwc(f2+ga)` means IWC profile, both formats.

### A. Structural Lint (core correctness)

"Schema?" column: **YES** = the rule is fully redundant with JSON-schema/Effect-decode validation (candidate for deletion as a separate lint check); **partial** = schema enforces presence/type but not the specific value or cross-reference; **NO** = schema cannot express this check.

| #   | Rule                                        | Severity | Schema?                                                                   | gxformat2                       | gtutil-ts               | galaxy-py | VS Code                                                 | Positive fixture                                                                                                                     | Negative fixture                                                                         |                            |
| --- | ------------------------------------------- | -------- | ------------------------------------------------------------------------- | ------------------------------- | ----------------------- | --------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- | -------------------------- |
| A1  | missing `class` (format2)                   | error    | **YES** (`Schema.Literal("GalaxyWorkflow")`)                              | `lint_format2`                  | `lintFormat2`           | ind       | baseline schema (f2)                                    | `synthetic-lint-no-class.gxwf.yml`                                                                                                   | `synthetic-basic.gxwf.yml`                                                               |                            |
| A2  | missing `steps` (format2)                   | error    | **YES** (`steps` is required, not optional)                               | `lint_format2`                  | `lintFormat2`           | ind       | baseline schema (f2)                                    | `synthetic-missing-steps.gxwf.yml`                                                                                                   | `synthetic-basic.gxwf.yml`                                                               |                            |
| A3  | missing `a_galaxy_workflow` (native)        | error    | **YES** (required `Schema.String`)                                        | `lint_ga`                       | `lintNative`            | ind       | baseline schema (ga)                                    | `synthetic-lint-bad-marker.ga`                                                                                                       | `real-unicycler-assembly.ga`                                                             |                            |
| A4  | `a_galaxy_workflow` value != "true"         | error    | **YES** (`Literal['true']` in pydantic + Effect schemas — see note below) | `lint_ga`                       | `lintNative`            | ind       | baseline schema (ga)                                    | `synthetic-missing-marker.ga` (TODO verify)                                                                                          | —                                                                                        |                            |
| A5  | missing `format-version` (native)           | error    | **YES** (required, no default)                                            | `lint_ga`                       | `lintNative`            | ind       | baseline schema (ga)                                    | TODO                                                                                                                                 | `real-unicycler-assembly.ga`                                                             |                            |
| A6  | `format-version` != "0.1"                   | error    | **YES** (`Literal['0.1']` in pydantic + Effect schemas)                   | `lint_ga`                       | `lintNative`            | ind       | baseline schema (ga)                                    | `synthetic-lint-bad-format-version.ga`                                                                                               | `real-unicycler-assembly.ga`                                                             |                            |
| A7  | step key not integer (native)               | error    | **partial** (depends on whether keys are typed `Dict[int,...]`)           | `lint_ga`                       | `lintNative`            | ind       | —                                                       | `synthetic-lint-non-integer-step.ga`                                                                                                 | `real-unicycler-assembly.ga`                                                             |                            |
| A8  | subworkflow missing/empty steps             | error    | **partial** (presence enforced; emptiness not)                            | `lint_format2`, `lint_ga`       | `lint{Format2,Native}`  | ind       | —                                                       | `synthetic-lint-nested-no-steps.gxwf.yml`, `synthetic-lint-nested-no-steps.ga`                                                       | `synthetic-nested-subworkflow.gxwf.yml`                                                  |                            |
| A9  | step has export error (`step.errors`)       | warning  | **NO** (semantic — schema permits the field)                              | `_lint_step_errors`             | `lintStepErrors`        | ind       | `StepExportErrorValidationRule` — `basic                | iwc(f2+ga)`                                                                                                                          | `synthetic-lint-step-errors.gxwf.yml`, `real-hacked-unicycler-assembly-no-tool.ga`       | `synthetic-basic.gxwf.yml` |
| A10 | step uses testtoolshed tool                 | warning  | **NO** (substring policy)                                                 | `_lint_tool_if_present`         | `lintToolIfPresent`     | ind       | `TestToolshedValidationRule` — `basic                   | iwc(f2+ga)` (error in VS Code)                                                                                                       | `synthetic-lint-testtoolshed.gxwf.yml`, `real-hacked-unicycler-assembly-testtoolshed.ga` | `synthetic-basic.gxwf.yml` |
| A11 | no outputs (native)                         | warning  | **NO** (semantic — empty is schema-valid)                                 | `lint_ga`                       | `lintNative`            | ind       | —                                                       | `real-shed-tools-raw.ga`, `synthetic-minimal-tool.ga`                                                                                | `real-unicycler-assembly.ga`                                                             |                            |
| A12 | output without label (native)               | warning  | **NO** (`label` is optional in schema)                                    | `lint_ga`                       | `lintNative`            | ind       | `WorkflowOutputLabelValidationRule` — `iwc(ga)` (error) | `synthetic-lint-output-no-label.ga`                                                                                                  | `real-unicycler-assembly.ga`                                                             |                            |
| A13 | outputSource references nonexistent step    | error    | **NO** (cross-reference, not expressible in JSONSchema)                   | `_validate_output_sources` (f2) | `validateOutputSources` | ind       | —                                                       | `synthetic-lint-bad-output-source.gxwf.yml`                                                                                          | `synthetic-basic.gxwf.yml`                                                               |                            |
| A14 | input `default` type mismatch               | error    | **NO** (default is `Any`, type is sibling field)                          | `_validate_input_types` (f2)    | `validateInputTypes`    | ind       | `InputTypeValidationRule` — `iwc(f2)`                   | `synthetic-lint-bad-int-default.gxwf.yml`, `synthetic-lint-bad-float-default.gxwf.yml`, `synthetic-lint-bad-string-default.gxwf.yml` | `synthetic-float-input-default.gxwf.yml`                                                 |                            |
| A15 | report markdown not a string                | error    | **YES** (`markdown: Schema.String`)                                       | `_validate_report`              | `validateReport`        | ind       | —                                                       | `synthetic-lint-report-bad-type.gxwf.yml`, `synthetic-lint-report-bad-type.ga`                                                       | `synthetic-lint-report.gxwf.yml`                                                         |                            |
| A16 | report markdown galaxy-directive validation | error    | **NO** (semantic content check)                                           | `_validate_report`              | — (not ported)          | ind       | —                                                       | TODO                                                                                                                                 | `synthetic-lint-report.gxwf.yml`                                                         |                            |
| A17 | schema strict extra-field (pydantic)        | warning  | **= schema** (this *is* the strict pass)                                  | `lint_pydantic_validation`      | — (not ported)          | ind       | baseline (f2 + ga)                                      | `synthetic-extra-field.gxwf.yml`, `synthetic-extra-field.ga`                                                                         | `synthetic-basic.gxwf.yml`                                                               |                            |
| A18 | schema lax type/structural errors           | error    | **= schema** (this *is* the lax pass)                                     | `lint_pydantic_validation`      | — (baseline via Effect) | ind       | baseline (f2 + ga)                                      | TODO                                                                                                                                 | `synthetic-basic.gxwf.yml`                                                               |                            |

### B. Best-Practices Lint (style / IWC)

Almost everything in this table is **NO** for "Schema?" — best-practice rules check for *absence* of optional fields, which schemas can't express.

| #   | Rule                                         | Severity  | Schema?                     | gxformat2                                                       | gtutil-ts                                              | galaxy-py | VS Code                                                                     | Positive fixture                                                                   | Negative fixture                                |
| --- | -------------------------------------------- | --------- | --------------------------- | --------------------------------------------------------------- | ------------------------------------------------------ | --------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------- |
| B1  | workflow `doc` / `annotation` missing        | warning   | NO                          | `lint_best_practices`                                           | `lintBestPractices`                                    | ind       | `RequiredPropertyValidationRule("doc" f2 / "annotation" ga)` — `iwc(f2+ga)` | `synthetic-bp-no-annotation.gxwf.yml`, `synthetic-minimal-tool.ga`                 | `synthetic-tags.gxwf.yml` (TODO verify has doc) |
| B2  | workflow `creator` missing                   | warning   | NO                          | `lint_best_practices`                                           | `lintBestPractices`                                    | ind       | `RequiredPropertyValidationRule("creator")` — `iwc(f2+ga)`                  | `synthetic-basic.gxwf.yml`, `synthetic-minimal-tool.ga`                            | TODO (no fixture currently has creator)         |
| B3  | workflow `license` missing                   | warning   | NO                          | `lint_best_practices`                                           | `lintBestPractices`                                    | ind       | `RequiredPropertyValidationRule("license")` — `iwc(f2+ga)`                  | `synthetic-basic.gxwf.yml`, `synthetic-minimal-tool.ga`                            | TODO                                            |
| B4  | workflow `release` missing                   | **error** | NO                          | —                                                               | —                                                      | —         | `RequiredPropertyValidationRule("release")` — `iwc(f2+ga)`                  | TODO (VS Code only, not yet in declarative fixtures)                               | TODO                                            |
| B5  | creator identifier not a URI                 | warning   | NO (semantic)               | `lint_best_practices`                                           | `lintBestPractices`                                    | ind       | —                                                                           | `synthetic-unlinted-best-practices-bad-identifier.ga`                              | TODO                                            |
| B6  | step has no label                            | warning   | NO                          | `_lint_step_best_practices`                                     | `lintStepBestPractices`                                | ind       | —                                                                           | `synthetic-bp-step-no-label.gxwf.yml`                                              | `synthetic-basic.gxwf.yml`                      |
| B7  | step has no annotation/doc                   | warning   | NO                          | `_lint_step_best_practices`                                     | `lintStepBestPractices`                                | ind       | `ChildrenRequiredPropertyValidationRule("steps","doc")` — `iwc(f2)`         | `synthetic-unlinted-best-practices.gxwf.yml` (TODO verify)                         | TODO                                            |
| B8  | step input disconnected                      | warning   | NO (cross-ref)              | `_lint_step_best_practices`, `_lint_native_step_best_practices` | `lintStepBestPractices`, `lintNativeStepBestPractices` | ind       | —                                                                           | `synthetic-bp-disconnected-input.gxwf.yml`, `synthetic-unlinted-best-practices.ga` | `synthetic-basic.gxwf.yml`                      |
| B9  | step tool_state has untyped param (`${...}`) | warning   | NO (string-content pattern) | `_lint_step_best_practices`                                     | `lintStepBestPractices`                                | ind       | —                                                                           | `synthetic-unlinted-best-practices.ga`                                             | TODO                                            |
| B10 | step PJA has untyped param                   | warning   | NO                          | `_lint_native_step_best_practices`                              | `lintNativeStepBestPractices`                          | ind       | —                                                                           | `synthetic-unlinted-best-practices.ga`                                             | `synthetic-pja-hide-rename.gxwf.yml`            |
| B11 | training-workflow missing tag                | warning   | NO                          | `_lint_training`                                                | — (not ported)                                         | ind       | —                                                                           | TODO                                                                               | TODO                                            |
| B12 | training-workflow missing doc                | warning   | NO                          | `_lint_training`                                                | — (not ported)                                         | ind       | —                                                                           | TODO                                                                               | TODO                                            |

### C. Stateful Lint (tool-state against cached tool defs)

Only present in galaxy-python `lint_stateful.py` and in galaxy-workflows-vscode `ToolStateValidationService`. galaxy-tool-util **is** the primitive both call — `validateFormat2StepStateStrict`. gxformat2 does not do stateful validation.

| # | Rule | Severity | gxformat2 | gtutil-ts | galaxy-py | VS Code | Positive fixture | Negative fixture |
|---|---|---|---|---|---|---|---|---|
| C1 | unknown tool parameter (excess prop) | warning | — | `validateFormat2StepState*` | `lint_stateful` | baseline (f2, via ToolStateValidationService) | `synthetic-cat1-stale.ga`, `synthetic-cat1-stale.gxwf.yml` | `synthetic-cat1-clean.ga`, `synthetic-cat1.gxwf.yml` |
| C2 | invalid value for tool parameter | error | — | `validateFormat2StepStateStrict` | `lint_stateful` | baseline (f2) | TODO | TODO |
| C3 | tool not in cache | info | — | — | `lint_stateful` (precheck) | baseline (f2) — emits info diagnostic | TODO | TODO |
| C4 | stale keys (category policy) | warning | — | — | `lint_stateful` (StaleKeyPolicy) | — | `synthetic-cat1-stale.ga` | `synthetic-cat1-clean.ga` |
| C5 | step input connections consistency | warning | — | — | `lint_stateful --connections` | — | TODO | TODO |

### D. Baseline Syntax / Schema (always runs in VS Code)

These are not pluggable rules in VS Code but appear here because they overlap with explicit lint checks in gxformat2.

| # | Check | gxformat2 | gtutil-ts | galaxy-py | VS Code |
|---|---|---|---|---|---|
| D1 | YAML syntax errors | via `ordered_load` | via `yaml.parse` | ind | `"YAML Syntax"` diagnostic (f2) |
| D2 | JSON syntax errors | via `json.load` | via `JSON.parse` | ind | `vscode-json-languageservice` (ga) |
| D3 | Format2 schema validation | `lint_pydantic_validation(format2=True)` | Effect `GalaxyWorkflowSchema` decode | ind | `"Format2 Schema"` via `@galaxy-tool-util/schema` |
| D4 | Native schema validation | `lint_pydantic_validation(format2=False)` | Effect `NativeGalaxyWorkflowSchema` decode | ind | `"Native Workflow Schema"` via vscode-json-languageservice |

---

## Pruning Candidates (Schema-Redundant Rules)

A rule that's `Schema? = YES` is doing the same job as the baseline schema decode pass. The schema pass *always* runs (in gxformat2 via `lint_pydantic_validation`, in the TS port via Effect decode, in VS Code as the `"Format2 Schema"` / `"Native Workflow Schema"` baseline diagnostic, in galaxy-python via gxformat2). Keeping a hand-rolled lint rule for the same condition just means: (a) two error messages for the same input, (b) drift risk when the schema gets stricter, and (c) extra cells to maintain in this table.

Recommended drops:

| Rule | What replaces it | Notes |
|---|---|---|
| A1 missing `class` | Format2 schema decode | Schema literal `"GalaxyWorkflow"` already errors. |
| A2 missing `steps` (format2) | Format2 schema decode | `steps` is required. |
| A3 missing `a_galaxy_workflow` (native) | Native schema decode | Required field. |
| A5 missing `format-version` (native) | Native schema decode | Required field. |
| A15 report `markdown` not a string | Format2 schema decode | `markdown: Schema.String`. |
| A17 strict-extra-field | Strict-mode schema decode | This is literally the strict pass — fold into the harness, not into a separate "lint rule". |
| A18 lax structural error | Lax schema decode | Same. |

**A4 / A6 update (April 2026):** Pydantic schemas in gxformat2 (`schema/native_v0_1/workflow.yml`) now use `pydantic:type: "Literal['true']"` and `pydantic:type: "Literal['0.1']"`. Both `gxformat2/schema/native.py` and `native_strict.py` were regenerated. The single-quote form is deliberate: schema-salad-plus-pydantic's codegen auto-injects a `default=` for any field whose type annotation matches the regex `^Literal\["(.+)"\]$` — i.e. **double-quoted** Literals only — and the auto-default would mask missing-field errors (A3/A5). Single-quoted `Literal['true']` is the same Python type but doesn't trip the regex, so no default is added and pydantic still rejects missing fields. The TS Effect-schema codegen needs the same treatment when this gets resynced (run `make generate-schemas` after `make sync-schema-sources`).

Recommended **keep** (still NOT schema-redundant):

- **A7** (step key not integer) — depends on whether the native steps map is typed. Verify.
- **A8** (subworkflow has empty steps) — schema enforces presence but not non-emptiness. Could be fixed with a `Schema.NonEmptyArray`/`minProperties` constraint; until then, keep.

Everything in **Table B** stays — best-practice rules check absence-of-optional, which schemas can't express.

The cleanup pattern this implies:

1. Tighten the schemas (A4, A6, A8) so more rules become **YES** rather than **partial**.
2. Drop the redundant rules from `lint.py` and `lint.ts` once their schema replacement is in place.
3. The rule inventory shrinks; the test fixtures still exercise the schema baseline (the operation key in the YAML just changes from `lint_format2` to `validate_format2`).

This is a behavior change for users who run `gxwf lint --skip-best-practices` and expect structural-only errors. After pruning, those errors come from the schema decode pass instead — same content, possibly different message text. Worth flagging in a changeset.

## Test Harness Shape per Project

| Project | Runner | Fixture location | Driver |
|---|---|---|---|
| gxformat2 | pytest | `gxformat2/examples/` + `gxformat2/examples/expectations/*.yml` | `tests/test_declarative_normalized.py` |
| galaxy-tool-util TS | vitest | `packages/schema/test/fixtures/{workflows,expectations}/` (synced from gxformat2) | `packages/schema/test/declarative-normalized.test.ts` |
| galaxy wf_tool_state | pytest | `test/unit/tool_util/workflow_state/fixtures/` + `expectations/` | `test/unit/tool_util/workflow_state/test_*.py` |
| galaxy-workflows-vscode | mocha (per package) | `server/*/tests/integration/`, imperative | *no declarative harness yet — this is the gap Step 2 closes* |

---

## Architecture for Shared Fixtures (Step 2 target)

```
                            ┌──────────────────────────────┐
                            │        gxformat2             │
                            │  examples/ + expectations/   │  (source of truth)
                            └──────────────┬───────────────┘
                                           │ make sync-workflow-{fixtures,expectations}
                                           ▼
                    ┌────────────────────────────────────────┐
                    │   galaxy-tool-util/packages/schema     │
                    │   test/fixtures/{workflows,expectations}│  ← already wired
                    └──────────────┬─────────────────────────┘
                                   │   Step 2: publish as npm artifact
                                   │   (@galaxy-tool-util/workflow-fixtures)
                                   │   OR per-release tarball
                                   ▼
        ┌──────────────────────────┴───────────────────────────┐
        ▼                                                       ▼
┌──────────────────┐                        ┌────────────────────────────┐
│ galaxy-workflows │                        │   galaxy wf_tool_state     │
│    -vscode       │                        │ (already has its own       │
│                  │                        │  synced fixtures for       │
│ new declarative  │                        │  stateful checks)          │
│  test harness    │                        └────────────────────────────┘
│  loads fixtures  │
│  + asserts       │
│  diagnostics     │
└──────────────────┘
```

The assertion YAML may need to grow a VS-Code-specific extension for range hints, since a lint result in VS Code is `{message, range, severity}` not a flat string. Proposed extension (backwards compatible — ignored by pytest/vitest):

```yaml
test_lint_format2_bad_int_default:
  fixture: synthetic-lint-bad-int-default.gxwf.yml
  operation: lint_format2
  assertions:
    - path: [error_count]
      value: 1
    - path: [errors, 0]
      value_contains: "invalid type"
  # new:
  diagnostics:
    - severity: error
      source: "Input Type"
      message_contains: "invalid type"
      at_path: ["inputs", 0, "default"]   # JSONPath-ish — resolved to range by VS Code harness
```

## Branches to Hack On

| Project | Branch |
|---|---|
| galaxy-tool-util | `gxwf-client` (this worktree) or a new `cross-lint-testing` branch |
| gxformat2 | `abstraction_applications` — add missing isolated fixtures (e.g. for B2/B3 negative cases, B4, B11, B12) |
| galaxy wf_tool_state | `wf_tool_state` — minimal touches, mostly consumer |
| galaxy-workflows-vscode | `wf_tool_state` (or fresh feature branch off main) — new declarative test harness + fixture consumption |

---

## Unresolved Questions

- Option A vs B for fixture distribution (npm pkg vs. in-tree sync)?
- Source-range extension format — `at_path` JSON-pointer, or richer? Who owns it?
- Should A17/A18 (pydantic schema strict/lax) be a lint rule in the TS port, or left to baseline Effect decode + a thin wrapper that categorizes the Effect failures into strict-extra vs structural?
- A16 (galaxy-directive markdown validation) — port to TS or drop from the inventory?
- B4 (`release` required) — backport to gxformat2 best practices? Currently VS-Code-only.
- Native-side structural rules A4/A7/A11/A12/A13 have no VS Code analogue — add them as Native validation rules, or accept that they're CLI-only checks?
- Who maintains the rule table — is there a generator (parse the `profiles.ts`, `lint.py`, `lint.ts` and diff against this doc) or is it hand-curated?
- C3 ("tool not in cache") is emitted by VS Code as an *info* diagnostic with an action, not as a lint error. Does it belong in the inventory or in a separate "diagnostics-only" section?
- ~~Tighten `a_galaxy_workflow` and `format-version` to `Schema.Literal`~~ **Done in pydantic schema** — TS Effect schemas need a resync (`make sync-schema-sources && make generate-schemas`).
- Confirm whether native `steps` keys are typed `int` in the schema (drives A7).
- Add a non-empty constraint to subworkflow `steps` (drives A8)?
- After dropping schema-redundant lint rules, do CLI exit codes need to keep mapping schema decode failures to `EXIT_CODE_FORMAT_ERROR` (today set by `lint.py` based on `lint_context.found_errors`)?
