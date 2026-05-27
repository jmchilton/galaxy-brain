# Workstream A - Upstream gxformat2 Schema Modeling

## Goal

Make upstream gxformat2 explicitly aware of draft workflow markers so downstream TS codegen has a principled model to sync from. This workstream is deliberately upstream-first: B-E must not patch around missing draft fields in generated TS artifacts.

## Inputs

- Metaplan: [INDEX.md](./INDEX.md)
- Draft format spec: `/Users/jxc755/projects/worktrees/foundry/branch/design/content/research/galaxy-workflow-draft-format.md`
- gxformat2 worktree: `/Users/jxc755/projects/worktrees/gxformat2/branch/abstraction_applications`
- Schema-salad source: `schema/v19_09/workflow.yml`
- Shared tool fields: `schema/common/common.yml`
- Pydantic / schema build: `build_schema.sh`

## Modeling Decisions

- `TodoSentinel` is a constrained string shape, not a plain `string` alias.
- Intended sentinel pattern: `^TODO(_[a-z0-9_]+)?$`.
- Bare `TODO` is legal for `tool_id` and `tool_version`.
- `TODO_<hint>` is canonical for wrapper-determined port names in `in:` keys, `out[].id`, and the port half of `outputs[].outputSource`.
- `_plan_state`, `_plan_context`, `_plan_in`, and `_plan_out` are optional string fields on `WorkflowStep`.
- `_plan_*` fields are allowed on all step kinds in v1, including `subworkflow`, `pause`, and `pick_value`, until real examples show a reason to tighten.
- `format2-draft.schema.json` is downstream TS package work. Upstream gxformat2 should not block on packaging that artifact.

## Plan

1. Confirm codegen support for `TodoSentinel`.
   - Add a local spike type in schema-salad that attempts to express a string with pattern `^TODO(_[a-z0-9_]+)?$`.
   - Run the pydantic and TS schema generation paths.
   - Inspect whether generated Python, strict Python, and TS artifacts preserve the constraint or erase it to `string`.
   - Record the outcome in this subplan before doing the final schema edit.

   **Outcome 2026-05-22:** schema-salad rejects a named primitive `type: string`
   with `pattern`, and schema-salad-plus-pydantic emits references to such a
   type without defining it. `TodoSentinel` cannot currently be represented as a
   true schema-salad constrained string through the existing codegen path.
   Upstream now owns the sentinel contract as metadata/constants; downstream
   draft-checks enforce the pattern semantically.

2. Add explicit `_plan_*` fields to `WorkflowStep`.
   - Edit `schema/v19_09/workflow.yml`.
   - Use optional string types.
   - Document that these fields are draft-only and must be stripped before runnable workflow validation/import.
   - Keep them on `WorkflowStep`, not a tool-step-only subtype, because v1 allows planning notes on non-tool steps.

   **Outcome 2026-05-22:** direct leading-underscore schema field names generate
   invalid Pydantic fields unless patched after codegen. The upstream schema now
   uses the real serialized names (`_plan_state`, `_plan_context`, `_plan_in`,
   `_plan_out`). `scripts/patch_generated_pydantic.py` rewrites the generated
   Pydantic attributes to Python-safe names (`plan_state`, `plan_context`,
   `plan_in`, `plan_out`) with aliases preserving the serialized keys. The
   generated Effect schema exposes the draft keys with leading underscores.

3. Model TODO-bearing fields where codegen can preserve useful structure.
   - `tool_id` and `tool_version` live in `schema/common/common.yml` under `ReferencesTool`.
   - `out[].id` comes from `WorkflowStepOutput` extending `cwl:Identified`.
   - `outputSource` is `WorkflowOutputParameter.outputSource`.
   - `in:` keys are record keys via the `mapSubject: id` shape; if schema-salad cannot constrain keys here, document the intended sentinel shape and leave key validation to downstream draft-checks.
   - Do not make the base schema reject normal strings in any of these positions. Draft sentinels are additional allowed values, not a replacement for concrete gxformat2 values.

4. Regenerate upstream schema artifacts.
   - Run `SKIP_JAVA=1 SKIP_TYPESCRIPT=1 bash build_schema.sh` for the fast pydantic-only path while iterating.
   - Run the full build path before landing if the environment supports Java and TS codegen.
   - Verify regenerated `gxformat2/schema/gxformat2.py` and `gxformat2/schema/gxformat2_strict.py` contain `_plan_*` fields.
   - Verify strict pydantic validation no longer rejects `_plan_*` on `WorkflowStep`.

5. Add upstream fixtures/tests.
   - Positive: draft tool step with `tool_id: TODO`, TODO input key, TODO output id, and full `_plan_*` block validates structurally.
   - Positive: `_plan_*` on a subworkflow step validates structurally.
   - Positive: fully concrete workflow without any draft markers still validates exactly as before.
   - Negative: `_plan_*` outside `WorkflowStep` is rejected by strict validation if strict schema can enforce unknown-field rejection at that location.
   - If `TodoSentinel` constraints survive codegen, add negative cases for malformed sentinel spellings. If they do not survive, leave malformed sentinel tests to downstream draft-checks.

6. Expose sentinel metadata for downstream sync if feasible.
   - Prefer a generated or source-owned constant for the pattern so TS draft-checks can import rather than redeclare it.
   - If the schema/codegen path cannot expose a constant cleanly, document the pattern in a stable upstream module or schema metadata location and let the TS agent decide whether importing it is practical.

7. Version and release coordination.
   - Add a `HISTORY.rst` entry describing draft workflow schema fields.
   - Bump gxformat2 according to existing release practice.
   - After upstream lands, run the TS monorepo `make sync` and verify the generated Effect schema includes `_plan_*`.

## Acceptance Criteria

- `WorkflowStep` has explicit optional `_plan_state`, `_plan_context`, `_plan_in`, and `_plan_out` fields in schema-salad source.
- Regenerated strict Python pydantic models accept `_plan_*` on workflow steps.
- Existing concrete gxformat2 fixture tests still pass.
- New draft schema fixtures prove the upstream model accepts the v1 draft markers it owns.
- The subplan records whether `TodoSentinel` survived codegen as a constrained string or had to be enforced downstream.
- No upstream task claims ownership of publishing `format2-draft.schema.json`.

## Risks

- Schema-salad may not express regex-constrained string subtypes in a way that survives pydantic and TS codegen.
- `in:` keys are map keys, so the schema layer may not be able to represent `TodoSentinel` there directly.
- `outputSource` is a compound string (`step_label/port`), so a pure `TodoSentinel` type cannot model only the port half without a separate downstream syntactic validator.
- The generated artifacts may accept `_plan_*` structurally but still provide no useful way to export the sentinel regex as a constant. That is acceptable as long as it is documented and downstream draft-checks own enforcement.
