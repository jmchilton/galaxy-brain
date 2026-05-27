# Draft Workflows — TS Validation Infrastructure Survey

## 1. Format2 validation today — what the pipeline looks like

The Effect schema lives at `packages/schema/src/workflow/raw/gxformat2.effect.ts` — auto-generated from schema-salad-plus-pydantic (top banner "do not edit"). The relevant shapes for the draft work:

- `GalaxyWorkflowSchema` (gxformat2.effect.ts:796) — top-level. `class: "GalaxyWorkflow"` is required; `steps` is `Array | Record<string, WorkflowStep>`. Outputs come in via `ProcessSchema.outputs` (gxformat2.effect.ts:528) which is `Array<WorkflowOutputParameter>` or a record.
- `WorkflowOutputParameterSchema` (gxformat2.effect.ts:433) — has `outputSource: Schema.optional(Schema.Union(Schema.Null, Schema.String))`. Currently no shape constraint on the string.
- `WorkflowStepSchema` (gxformat2.effect.ts:902) — spreads `ReferencesToolSchema` (gxformat2.effect.ts:563) which already makes `tool_id`, `tool_version`, `tool_shed_repository` all `Schema.optional(Schema.Union(Schema.Null, …))`. So those three are *already* schema-optional at the structural level. The `state` / `tool_state` fields are already optional too (gxformat2.effect.ts:933/937).
- `WorkflowStepInputSchema` (gxformat2.effect.ts:626) — step `in` is a record whose keys are arbitrary strings; key shape (`TODO_<hint>` vs real port name) is not constrained.
- `WorkflowStepOutputSchema` (gxformat2.effect.ts:871) — out entries with optional `id: Union(Null, String)`. Again no string-shape constraint.

The dispatch entry point is `validators.ts:63` `validateFormat2(wf)` which decodes with `onExcessProperty: "ignore"` and then calls `validateWorkflowSemantics`. `validateFormat2Strict` (validators.ts:71) is the same with `onExcessProperty: "error"`. `withClass` (validators.ts:29) injects the `class` discriminator if missing — recursively into format2 `step.run` subworkflows and native `step.subworkflow`.

Validation passes (each module's role in one line):

- **Structural decode** — `decodeStructureErrors` in `validate-workflow.ts:58`. `S.decodeUnknownEither(GalaxyWorkflowSchema, { onExcessProperty: "ignore" })` against the Effect schema.
- **Semantic validators** — `semantic-validators.ts:119` `validateWorkflowSemantics`. Cross-field structural checks Effect can't express on its own: `column_definitions` requires sample-sheet collection inputs; `restrictions`/`suggestions`/`restrictOnConnections` only on text inputs; `fields` only on record collections. Walks workflow inputs + recurses into inline `step.run` subworkflows. Throws on violation.
- **Schema rules** — `schema-rules.ts` parses `schema_rules.yml` into a catalog where each rule has positive/negative fixtures, a `severity`, `applies_to` (`format2`|`native`), and a `scope` (`both`|`strict`|`lax`). The catalog is fixture-driven, not introspective — rules are tested end-to-end by running the validator over fixtures (schema-rules.ts:6-12).
- **Strict checks** — `strict-checks.ts:91` `checkStrictStructure` decodes with `onExcessProperty: "error"`, catching unknown keys at envelope/step level. `checkStrictEncoding` (strict-checks.ts:70) dispatches to native (`tool_state` must not be a JSON string) or format2 (`tool_state` field disallowed when `state` exists).
- **Lint rules** — `lint-rules.ts` declares severity/applies_to/profile metadata as `Linter` subclasses; `lint.ts:244/260/276` runs them. Best-practice variants at lint.ts:409/427. Emissions go through `linting.ts` `LintContext`. Distinct from semantic-validators: style/best-practice, not structural.

There is also `stateful-validate.ts:66/97/136` for runtime tool-state validation against cached tool definitions — orthogonal to the structural pipeline, used by `lint` and the tool-state branch of `validate`.

## 2. Report models and CLI rendering

Types live in `packages/schema/src/workflow/report-models.ts`. Field names mirror Python `galaxy.tool_util.workflow_state._report_models` byte-for-byte for shared frontend rendering. Key shapes for our purposes:

- `ValidationStepResult` (report-models.ts:23) — `{ step, tool_id, version, status, errors }` with `StepStatus = "ok" | "fail" | "skip_tool_not_found" | "skip_replacement_params"`.
- `SingleValidationReport` (report-models.ts:100) — `{ workflow, results, connection_report, skipped_reason, structure_errors, encoding_errors, summary, clean_report? }`.

CLI flow in `validate-workflow.ts`:
1. `readWorkflowFile` + `resolveFormat` (validate-workflow.ts:85-88).
2. Optional strict encoding/structure pre-checks (validate-workflow.ts:107-126).
3. `decodeStructureErrors` (validate-workflow.ts:58) — Effect decode.
4. Optional `validateNativeSteps`/`validateFormat2Steps` for tool-state validation (validate-workflow.ts:165-169).
5. Optional `buildConnectionReport` (validate-workflow.ts:182).
6. `buildSingleValidationReport` aggregates; rendering via `renderStepResults` (render-results.ts:12) for console, `writeReportHtml("validate", …)` for HTML (report-output.ts:85). HTML embeds a `__GXWF_REPORT__` payload and pulls a CDN-hosted IIFE bundle (report-output.ts:63).

A new `draft-validate` command can reuse `SingleValidationReport` essentially as-is — the existing renderer will produce useful console output without modification. The natural extension is one new field on the report (e.g. `draft_state?: { todo_count, todo_paths[], plan_step_count }`) plus a new report type literal `"draft-validate"` in `ReportType` (report-output.ts:12) if you want a custom HTML view; otherwise reuse `"validate"`.

## 3. What the draft relaxations require, mapped to schema

Important finding: most "relaxations" in the spec are already non-constraints today.

| Spec relaxation | Current schema position | Action needed |
|---|---|---|
| `tool_id`/`tool_version` may be `"TODO"` | already `optional(Union(Null, String))` at gxformat2.effect.ts:565/569 — accepts any string | **none** structurally; only matters if we add a positive-shape constraint somewhere |
| `tool_shed_repository` absent | already optional at gxformat2.effect.ts:567 | **none** |
| `tool_state`/`state` absent | already optional at gxformat2.effect.ts:933/937 | **none** |
| `out[].id` matches `/^TODO_/` | `WorkflowStepOutputSchema.id` is optional string, no shape (gxformat2.effect.ts:871) | **none** |
| `in[]` keys match `/^TODO_/` | `in` is `Record<string, …>` with arbitrary key (gxformat2.effect.ts:911) | **none** |
| `outputSource` = `step/TODO_<hint>` | `outputSource: optional(Union(Null, String))` (gxformat2.effect.ts:442) | **none** |
| `_plan_state`, `_plan_context`, `_plan_in`, `_plan_out` on steps | not in `WorkflowStepSchema` fields | passes under lax (`onExcessProperty: "ignore"`); **fails under strict** |

So the lax structural pipeline already accepts essentially everything in the draft spec — the only place it breaks is `validateFormat2Strict`/`checkStrictStructure` rejecting `_plan_*` as unknown keys. The "draft validator" is already mostly free if we just don't go strict.

What *does* differ between draft and concrete is **what the validator should warn or fail on**, not the structural acceptance: a concrete validator should reject `tool_id === "TODO"` and any `TODO_*` keys; a draft validator should treat them as expected. That's a small layer of *positive* checks, not schema relaxations.

## 4. Recommended approach

**Option (a): Extend the existing schema with `_plan_*` and add a separate draft-aware check layer. Don't fork the schema; don't pre-pass-rewrite.**

Concrete shape:

1. In `gxformat2.effect.ts` — this is auto-generated, so the cleanest path is to add `_plan_state`, `_plan_context`, `_plan_in`, `_plan_out` to `WorkflowStepSchema` either (i) upstream in schema-salad-plus-pydantic so `make sync` regenerates them, or (ii) in a small post-generation augmentation step the codegen pipeline already supports. Each as `Schema.optional(Schema.Union(Schema.Null, Schema.String))`. Concrete-only fixtures keep passing; strict structural validation of draft workflows stops rejecting the extras.
2. New module `packages/schema/src/workflow/draft-checks.ts` (sibling of `semantic-validators.ts`): exports `detectDraft(workflow): DraftReport` returning `{ draft: boolean, todos: Array<{ path, kind, hint? }>, plan_step_labels: string[] }`. `kind ∈ "tool_id" | "tool_version" | "out_id" | "in_key" | "outputSource" | "plan_field"`. A `draft: false` verdict requires zero TODOs and zero `_plan_*` fields. This is the workhorse for both `draft-validate` and `draft-next-step`.
3. New entry points in `validators.ts`: `validateFormat2Draft(wf)` runs the lax structural decode + `validateWorkflowSemantics` exactly like today, then layers `detectDraft` purely as enrichment (never fails on TODOs). `validateFormat2Concrete(wf)` runs the existing strict pipeline *and* a positive check that rejects any TODO sentinel / `_plan_*` field.

Why this over the alternatives:

- **(b) sibling schema that wraps gxformat2:** redundant given the structural relaxations are already in the base schema. You'd be maintaining a near-identical duplicate just to add four optional string fields.
- **(c) TODO→placeholder pre-pass + concrete validate:** loses information (you can't tell the report layer which fields were sentinels), corrupts downstream tools that consume the workflow object (e.g. mermaid renderer, connection validator), and the strict path would then need a second pass to strip placeholders before serialization. Pre-pass rewriting also leaks into roundtrip and clean.

> **Cross-ref:** the design-spec synthesis (Open Q6) defaults to a sibling JSON Schema. The two recommendations are not in conflict — TS Effect Schema can be extended in-place while still exporting a separate `format2-draft.schema.json` as the canonical published artifact for non-TS consumers (VS Code, Python tooling). See INDEX.md "Open scoping questions" for resolution.

**Smallest possible change** (3-5 files):

- `gxformat2.effect.ts` — add four `_plan_*` optional string fields on `WorkflowStepSchema` (either via codegen or as a tiny post-gen patch).
- `draft-checks.ts` (new) — `detectDraft`, sentinel regexes, path collection.
- `validators.ts` — `validateFormat2Draft`, `validateFormat2Concrete`.
- `validate-workflow.ts` or `draft-validate.ts` (new) — CLI handler `runDraftValidate`, `runDraftNextStep`, `runDraftConcreteSubset`.
- `gxwf.json` + `gxwf.ts` — three new command entries + handler registry entries.

Non-obvious risk: the `outputSource` value `step/TODO_<hint>` won't be flagged as malformed by anything in the current pipeline — but the `connection-validation.ts` connection report will resolve it to "no such output" once tool definitions are consulted. The draft validator should explicitly **disable** the connections check (or treat unresolved connections as expected when the source side is a `TODO_` sentinel). Same applies to the lint best-practices pass — it currently doesn't know `_plan_*` and may flag the structure (worth a sweep).

## 5. Routing draft vs. concrete

`detectFormat` (detect-format.ts:5) returns `"native" | "format2"`. Native workflows have no draft notion (the spec is gxformat2-only), so the draft path is format2-only. The right place to route is at command boundary, not deep inside the validator — the user has chosen `draft-validate` vs `validate`.

`precheck.ts` is *not* a useful routing surface here — it's about whether native `tool_state` can be schema-walked for stateful conversion, and gates only the native conversion path (precheck.ts:48-81).

`strict-checks.ts` is the right module to mirror: the draft pipeline wants its own "strict draft" mode where any TODO that should already be resolved is an error. Wire it as a parallel function `checkConcreteStructure` that re-uses the schema but adds positive sentinel-rejection. `detect-format.ts` only needs a one-line extension if you want to auto-route `validate` to draft mode when `_plan_*` is detected — recommend *not* doing that auto-route; keep draft a deliberate user opt-in.

## 6. Concrete subset extraction

The `_draft-concrete-subset` command needs to (a) drop `_plan_*` fields and (b) drop steps where `tool_id === "TODO"` (or any TODO sentinel) while preserving graph integrity for the rest.

Reusable pieces:

- `serialize.ts:28` `serializeWorkflow` — final YAML/JSON emission keyed off format. Reuse as-is.
- `clean.ts:411` `cleanWorkflow` — already mutates the workflow dict in place, walks both format2 step shapes (list and dict), already calls `stripStructuralStep`. The cleanest hook is to add a `stripPlanFields?: boolean` option to `CleanWorkflowOptions` (clean.ts:384) and a small helper `stripPlanStep(stepDef)` that deletes `_plan_state`/`_plan_context`/`_plan_in`/`_plan_out` keys. This keeps draft cleanup in the same module that already handles structural strip — and you can re-use the CleanStepResult `removed_keys` accounting to surface what was dropped.
- `normalized/expanded.ts` / `normalized/toFormat2.ts` are not the right tool — they normalize toward a stricter type, which means TODO sentinels will likely round-trip awkwardly. For the concrete-subset case, work on the raw dict like `cleanWorkflow` does.

**Step removal and edge integrity is the real risk.** Dropping a step whose outputs are consumed by other steps produces a workflow that schema-validates (downstream `source: "fastp/whatever"` is still a string) but is semantically broken at runtime. Concrete options, in order of safety:

1. **Refuse** to emit a concrete subset if any non-TODO step downstream consumes a TODO step's output, or if any `outputSource` references a TODO step. Return a structured error listing the blocking edges. Conservative default; easiest to reason about.
2. **Cascade drop** — also drop any step whose `in.*.source` resolves to a removed step, transitively. Then drop workflow outputs whose `outputSource` resolves to a removed step. Each cascade should be logged in the report. Produces a runnable workflow but may surprise the user by silently shrinking the output set.
3. **Stub-with-input** — replace each removed step's outputs with a workflow input parameter. Most permissive but invents topology, contradicts the spec which says topology is settled.

> **User decision 2026-05-22:** (2) cascade drop with a warning. The user observed that since the workflow is a DAG, ordering `draft-next-step` topologically should make the dependent-on-TODO case rare in practice — the propagation is a safety net.

## 7. CLI wiring

`packages/cli/spec/gxwf.json` is the source of truth for the commander surface. `programs/gxwf.ts` maps handler names to action functions via a `HandlerRegistry`. `spec/build-program.ts` turns the JSON spec into a commander `Command` tree, asserting that every `handler` referenced in the spec exists in the registry (build-program.ts:38).

To add a new subcommand:

1. Append a `commands[]` entry to `packages/cli/spec/gxwf.json` next to `"validate"` (gxwf.json:27). Required keys: `name`, `description`, `handler` (camelCase string), `args[]`, optional `options[]`, optional `optionGroups[]`. For draft commands, reuse the `<file>` arg shape from `validate`. Likely options: `--json`, `--report-html [file]`, `--format <fmt>`. Don't apply `optionGroups: ["strict"]` — the strict group contains tool-state strictness that's meaningless for draft.

2. Add the handler import + registry entry in `programs/gxwf.ts:32-82`. e.g. `draftValidate: runDraftValidate`, `draftNextStep: runDraftNextStep`, `draftConcreteSubset: runDraftConcreteSubset`. Implement those in `packages/cli/src/commands/draft-validate.ts`, `draft-next-step.ts`, `draft-concrete-subset.ts`.

3. The spec is bundled into `meta/specs.ts` (`gxwfSpec` import at programs/gxwf.ts:30). Running `make gen-skill` regenerates the CLI skill from commander introspection, and `make check` will catch missing handlers via `validateSpec` (build-program.ts:30).

Naming nit specific to original phrasing: the user's spec says `_draft-concrete-subset` (with the underscore prefix). Commander accepts this; if you want to mark it as experimental, the underscore is fine but consider `draft-concrete-subset` and a separate `experimental: true` field, or just call it `draft-extract`. Worth a one-line confirmation before encoding the `_draft-` prefix into the spec since this is the kind of naming choice that gets baked in for a long time.

## Unresolved questions

- `_plan_*` codegen: add upstream to schema-salad-plus-pydantic, or post-gen patch?
- `_draft-concrete-subset` underscore prefix intentional, or use `draft-extract` / `draft-concrete-subset`?
- Default behavior when concrete extraction would orphan workflow outputs: cascade-drop outputs (user-chosen), require explicit `--cascade` flag, or warn-only?
- Should `gxwf validate` of a workflow containing `_plan_*` or TODO sentinels auto-suggest `draft-validate`, or fail hard?
- Per-step `_plan_*` only on `tool` steps, or also on `subworkflow`/`pause`/`pick_value`? Spec implies tool-only — should non-tool steps with `_plan_*` be a draft-validator error?
