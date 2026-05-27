# Draft Workflows — Metaplan

**Goal:** ship three `gxwf` subcommands in the TS monorepo (`galaxy-tool-util-ts`) that let a downstream agent loop (Foundry) iteratively concretize a draft Format2 workflow.

**Commands (final v1 surface):**
- `gxwf draft-validate <file>` — validate a draft Format2 workflow (TODO sentinels + `_plan_*` allowed; topology must be concrete).
- `gxwf draft-next-step <file>` — emit JSON describing the next step needing work (topologically first), with raw `work: [...]` strings.
- `gxwf _draft-extract <file>` — extract the concrete-runnable subgraph (cascade-drops any step that transitively depends on a TODO step). Underscore prefix = hidden from `--help`.

**Inputs ingested:**
- Spec: `/Users/jxc755/projects/worktrees/foundry/branch/design/content/research/galaxy-workflow-draft-format.md`
- Adjacent: `galaxy-data-flow-draft-contract.md`, `gxformat2-schema.md`, `galaxy-workflow-testability-design.md` (same dir).
- Downstream agent guidance: `/Users/jxc755/projects/repositories/galaxy-brain/vault/projects/workflow_state/projects/workflow_state/GXWF_AGENT.md` (workflow state agent persona).

**Research white papers** (read before subplanning):
- [01-design-spec-synthesis.md](./01-design-spec-synthesis.md) — restates the spec; defines validation surface, concrete-subset semantics, next-step semantics, draft connection validation, open questions, v1 scope.
- [02-ts-validation-infra.md](./02-ts-validation-infra.md) — surveys the existing TS schema/validation pipeline; recommends draft-checks layer + Effect schema extension; identifies reusable pieces in `clean.ts`, `serialize.ts`, `validators.ts`.
- [03-cli-wiring-and-python-parity.md](./03-cli-wiring-and-python-parity.md) — surveys the JSON-driven commander spec, handler registry, report-output layer, tree pattern, skill regen; recommends Python parity deferred.

---

## Locked scope decisions (2026-05-22 interview, two rounds)

| Decision | Outcome |
|---|---|
| `_plan_*` on a fully-resolved step | **Strict — error.** Forces clean handoff to runnable. |
| `_plan_*` on non-tool steps (subworkflow / pause / pick_value) | **Allowed in v1.** Simplifies schema modeling. May tighten later. |
| `_draft-extract` when concrete step consumes from TODO step | **Cascade-drop transitive dependents** with warning. DAG + topological `next-step` should make this rare; cascade logic is a safety net. |
| `_draft-extract` exit code when output is empty | **`0`.** Empty output is a valid stage of the loop, not an error. |
| Subworkflows in v1 | **Yes, recursive.** Step path is `[outer, sub, ...]`. Draft mode propagates into nested `run:` blocks. |
| `work[]` shape | **Prompt-shaped raw strings.** Goal: items concatenate into a useful prompt for the next agent. Convention defined in workstream D. |
| `gxwf validate` (concrete validator) on a draft file | **Fails as today.** No auto-route, no hint logic — keep concrete validator clean. Draft files must be invoked through `draft-validate`. |
| `gxwf lint` on draft files | **Does not run / skips drafts in v1.** Many best-practice rules don't make sense pre-wrapper. Wire as an early skip with a clear "this is a draft, use `draft-validate`" message. |
| Python parity | **Deferred entirely.** TS-only v1. Schema-level modeling happens upstream (see below) so Python gets it for free later. |
| Schema strategy | **Model the relaxations + `_plan_*` fields in upstream gxformat2 schema-salad source using an explicit `TodoSentinel` type where the schema/codegen can preserve it.** `TodoSentinel` is a constrained string shape, not a plain alias: `^TODO(_[a-z0-9_]+)?$`. `_plan_*` are explicit optional fields on `WorkflowStep`. Regenerate the TS Effect schema via existing `make sync`. |
| Sibling JSON Schema artifact | **Defer to downstream TS package.** Upstream gxformat2 should expose the schema model clearly enough for the TS package to publish/derive `format2-draft.schema.json`; do not block workstream A on packaging that artifact from gxformat2 itself. |
| Command name for extract | **`_draft-extract`** (underscore prefix → hidden from `--help`, shorter than `_draft-concrete-subset`). Requires adding `hidden: true` support to `SpecCommand` types. |
| Tree variants | **Single-file only for v1.** No `draft-validate-tree` etc. |

---

## Big pieces (workstreams)

Numbered in dependency order. Each workstream has a stub link to a subplan to be filled in.

### A. Upstream gxformat2 schema modeling — [subplan A](./A-upstream-gxformat2.md) (TBD)

**Why first:** locks the data model across both languages and unblocks B–E. Per user decision, modeling the relaxations + `_plan_*` fields belongs upstream so the eventual Python port inherits it.

**Worktree:** `/Users/jxc755/projects/worktrees/gxformat2/branch/abstraction_applications`

**Scope:**
- Define a `TodoSentinel` schema-salad type if schema-salad / schema-salad-plus-pydantic / TS codegen can preserve it as a constrained string. It is **not** just an alias for `string`; its intended shape is `^TODO(_[a-z0-9_]+)?$` (bare `TODO` for tool_id/tool_version; `TODO_<hint>` for port names).
- Model TODO-accepting fields with `TodoSentinel` where feasible:
  - `tool_id`, `tool_version` — value-position TODOs (bare `TODO` legal).
  - `out[].id` — port-name TODOs (`TODO_<hint>` form).
  - `outputSource` on `WorkflowOutputParameter` — the string is `step_label/port`; the port half may be a TODO sentinel.
  - `in:` keys — record-key position; sentinel form must be expressible at the schema-salad layer (may require helper).
- Add `_plan_state`, `_plan_context`, `_plan_in`, `_plan_out` as optional string fields on `WorkflowStep`. Allow on all step kinds (per locked decision) — keeps modeling simple.
- If constrained sentinel types cannot be represented cleanly in generated artifacts, keep the upstream type/field documentation explicit and let downstream draft-checks enforce sentinel semantics. Do not reduce `TodoSentinel` to an undocumented plain-string alias.
- Add positive/negative fixture pairs to gxformat2's fixture suite (matching the v1 fixture cases in workstream F).
- Roll changes upstream; bump gxformat2 version; coordinate release.

**Cross-package contract:** define exactly what TS sees after `make sync` runs:
- Regenerated `gxformat2.effect.ts` includes the `_plan_*` optional fields.
- Regenerated artifacts include a usable `TodoSentinel` representation if schema-salad / pydantic / TS codegen can preserve it; if not, subplan A records the limitation and downstream draft-checks own semantic enforcement.
- Sentinel patterns are exposed as constants or stable upstream metadata if feasible, so the draft-checks module can import rather than re-declare the regex. If this is not feasible, record the limitation in subplan A and let the TS implementation agent push back.
- The TS package owns publishing/deriving `format2-draft.schema.json`; upstream gxformat2 only needs to model enough structure for that derivation to be principled.

**No fallback / no shortcuts.** We own gxformat2 — anything that belongs in the schema-salad source belongs there. Implementation agents working on B–E MUST NOT patch around an upstream gap with a post-codegen augmentation or other local workaround before A has proven the upstream/codegen limit. If something is missing in the regenerated artifacts, pause and fix or explicitly document it upstream first.

---

### B. TS draft-checks pure logic — [subplan B](./B-ts-draft-checks.md)

**Why next:** the substrate for all three CLI commands. Pure-logic in `@galaxy-tool-util/schema`, no I/O.

**New module:** `packages/schema/src/workflow/draft-checks.ts`

**Exports (rough sketch):**
- `detectDraft(workflow): DraftSurvey` — walks a Format2 workflow, collects every TODO sentinel and every `_plan_*` field, returns paths + classification.
- `validateDraft(workflow): DraftValidationResult` — runs lax structural decode + semantic validators + concrete-topology checks (workflow inputs / outputs / step labels non-TODO; syntactic edge resolution).
- `nextDraftStep(workflow): NextStepResult` — topological walk, returns first step with TODOs or `_plan_*`, with raw-string `work: [...]` and subworkflow-aware `step: [outer, ...]` path array. Idempotent. Tie-break by label.
- `extractConcreteSubset(workflow): ExtractResult` — fixpoint loop: a step survives iff it's concrete AND all input edges source from `workflow_inputs ∪ surviving_steps`. Cascade-drops dependents. Drops `outputs[]` entries whose `outputSource` resolves to a dropped step or a still-TODO port. Returns the trimmed workflow dict + a structured drop report.

**Strictness rules to encode:**
- Topology-tier (input types, output labels, step labels, edge structure) MUST be concrete; `TODO` here → error.
- `_plan_*` on a fully-resolved step → error (per locked decision).
- `_plan_*` on non-tool steps → **allowed in v1** (per locked decision; revisit later).
- Syntactic edge resolution: every `step/port` ref must point at a declared step + declared port (sentinel `TODO_*` ports count if listed in step's `out:`).
- No type-aware connection validation in draft mode (defer to v2).

**Sentinel conventions** (mirroring schema-salad `TodoSentinel` from workstream A):
- Bare `TODO` legal only for `tool_id` / `tool_version`.
- `TODO_<hint>` legal for port names; warn on bare `TODO` port.
- Hint regex: `^TODO(_[a-z0-9_]+)?$`.

**Tests:** vitest unit tests + declarative YAML fixtures (see workstream F).

---

### C. CLI command `draft-validate` — [subplan C](./C-cli-draft-validate.md)

**New files:**
- `packages/cli/src/commands/draft-validate.ts` exporting `runDraftValidate(file, opts)`
- Entry in `packages/cli/spec/gxwf.json`
- Entry in `packages/cli/src/programs/gxwf.ts` handler registry

**Options:** `--json`, `--report-html [file]`, `--format <fmt>`. **No `optionGroups: ["strict"]`** (strict tool-state is meaningless for draft).

**Report model:** add `SingleDraftValidationReport` to `packages/schema/src/workflow/report-models.ts` (snake_case fields to pre-pave Python parity). Likely shape: `{ workflow, structure_errors, semantic_errors, topology_errors, draft_state: { todo_count, todo_paths[], plan_step_labels[] }, summary }`.

**Output modes:** text (default), JSON (`--json`), HTML (`--report-html`). Reuse `writeReportHtml` and `renderStepResults` infrastructure.

**Exit codes:** `0` clean draft, `1` validation errors, `2` strict structural failure.

---

### D. CLI command `draft-next-step` — [subplan D](./D-cli-draft-next-step.md)

**New files:**
- `packages/cli/src/commands/draft-next-step.ts` exporting `runDraftNextStep(file, opts)`
- Spec entry + handler registry entry

**Options:** `--json` (default JSON-to-stdout anyway), `--format markdown` (nice-to-have).

**Output shape (locked decisions):**

The `work[]` strings are **prompt-shaped**: each line is a self-contained instruction so concatenating `work[]` produces a usable prompt for the next agent. Recommended convention (open to revision while subplanning, but ship something close to this):

```json
{
  "draft": true,
  "step": ["outer_label", "subworkflow_label", "innermost_step"],
  "work": [
    "TODO[tool_id]: pick a Galaxy Tool Shed wrapper for this step",
    "TODO[tool_version]: pick the wrapper version",
    "TODO[in.TODO_input]: assign the real wrapper input port name (semantic hint: 'input')",
    "TODO[out.TODO_trimmed_paired]: assign the real wrapper output port name (semantic hint: 'trimmed_paired'; referenced by workflow output 'trimmed')",
    "_plan_state: adapter trimming on, quality cutoff ~Q20, min length ~50. preserve paired-end pairing for downstream alignment.",
    "_plan_context: upstream: nf-core FASTP module. conda: bioconda::fastp=0.23.4 ...",
    "_plan_in: single semantic port `reads`: feeds workflow `reads` (list:paired). ...",
    "_plan_out: need a paired output that preserves list:paired shape ..."
  ]
}
```
or
```json
{ "draft": false }
```

**v1 conventions:**
- TODO items use the form `TODO[<location>]: <description>` where `<location>` is one of `tool_id`, `tool_version`, `in.<sentinel>`, `out.<sentinel>`, or `outputs.<output_label>` (for workflow outputs pointing at a TODO port).
- Plan fields use the form `<field_name>: <verbatim plan text>`. Plan text is passed through unchanged.
- `work[]` order is stable across runs: tool_id → tool_version → in ports (source order) → out ports (source order) → _plan_state → _plan_context → _plan_in → _plan_out.

**Report model:** `NextStepSuggestion` interface in `report-models.ts`.

**Idempotence:** pure function input → output. Topological tie-break by step label alphabetical.

---

### E. CLI command `_draft-extract` — [subplan E](./E-cli-draft-extract.md)

**New files:**
- `packages/cli/src/commands/_draft-extract.ts` (note leading-underscore in filename to match command name; commander handler key in camelCase: `draftExtract`)
- Spec entry + handler registry entry

**Spec-types extension:** add `hidden?: boolean` to `SpecCommand` in `packages/cli/src/meta/spec-types.ts`. In `build-program.ts`, when `hidden: true`, call commander's `.command(...).helpCommand(false)` or equivalent so it's suppressed from `--help`.

**Options:** `-o, --output <file>` (default stdout), `--report-json [file]` (sidecar drop report), `--format <fmt>`.

**Logic:**
1. Run `extractConcreteSubset(workflow)` from workstream B.
2. Strip `_plan_*` fields from surviving steps (reuse `clean.ts` with a new `stripPlanFields: true` option).
3. Serialize the trimmed workflow via `serialize.ts:28` (`serializeWorkflow`).
4. Emit YAML to stdout (or `-o`); emit sidecar JSON report listing dropped steps, dropped outputs, and the reason for each drop.

**Subworkflow recursion:** per locked decision, recurse into `run:` blocks. A subworkflow step survives only if its inline `run:` extracts to a fully-concrete subworkflow. If the subworkflow has any TODOs after extraction, drop the parent step too (and cascade).

**Exit code:** `0` regardless of whether output is non-empty (per locked decision — empty extract is a valid stage of the agent loop, not an error). Reserve non-zero exit codes for actual extraction failures (parse error, malformed workflow).

---

### F. Fixtures & declarative expectation tests — [subplan F](./F-fixtures.md)

**Convention reminder (GXWF_AGENT.md):** declarative YAML fixtures are the source of truth.

**New fixture dir:** `packages/schema/test/fixtures/workflows/format2/draft/` (TS), mirrored in `gxformat2/examples/format2/draft/` (upstream).

Cases to cover (each as input + golden output):
- **draft-valid-simple.yml** — single tool step, all wrapper-tier TODOs, full `_plan_*` block. `draft-validate` passes; `draft-next-step` returns that step; `_draft-extract` returns empty workflow.
- **draft-valid-chain.yml** — three tool steps in a chain, first concretized, second + third still draft. `next-step` returns step 2. `_draft-extract` returns workflow containing only step 1.
- **draft-valid-subworkflow.yml** — outer workflow with a subworkflow step; subworkflow itself has draft tool steps. Exercises step path `[outer, inner_step]`.
- **draft-invalid-todo-label.yml** — step `label: TODO`. `draft-validate` fails (topology-tier violation).
- **draft-invalid-dangling-edge.yml** — `in:` references nonexistent step. `draft-validate` fails (syntactic edge resolution).
- **draft-invalid-plan-on-concrete.yml** — fully-resolved step still has `_plan_state`. `draft-validate` fails (per locked decision).
- **draft-valid-plan-on-subworkflow.yml** — `_plan_*` on a subworkflow step. `draft-validate` passes in v1 because planning fields are allowed on non-tool steps until usage shows a reason to tighten.
- **draft-extract-cascade.yml** — step B is concrete but consumes from step A (TODO). `_draft-extract` cascade-drops B. Sidecar JSON lists both A (TODO) and B (cascaded) as drops.
- **draft-fully-concrete.yml** — workflow with no TODOs and no `_plan_*`. `draft-validate` passes; `next-step` returns `{ draft: false }`; `_draft-extract` returns the identity (and the resulting workflow passes `state-validate`).
- **draft-next-step-topological-tiebreak.yml** — two unresolved steps at the same topological level; tie-break by label string. Asserts deterministic output across runs.

**Cross-check:** for each `draft-fully-concrete.yml`-style fixture, also assert that `gxwf state-validate --no-tool-state` passes on the same file (draft-validate ⊇ state-validate --no-tool-state on concrete inputs).

---

### G. Wiring, docs, release plumbing — [subplan G](./G-wiring-and-release.md) (TBD)

**Build + skill regen:**
- `make check && make test` after each landing.
- `make gen-skill` regenerates `docs/skills/gxwf-cli/SKILL.md` from commander introspection (requires a prior build).

**Changesets:** per project `CLAUDE.md`, every commit touching `packages/*/src/` requires `pnpm changeset` (or `pnpm changeset --empty` for non-bumping commits). Plan: one changeset per workstream (B, C, D, E) at minor-version bump.

**Documentation:**
- Update `docs/packages/cli.md` with the three new commands.
- Update `docs/packages/schema.md` (or equivalent) describing the draft-checks module and the new report shapes.
- Mention the draft commands in any top-level README or quickstart that lists `gxwf` operations.
- Cross-link this metaplan from `GXWF_AGENT.md` once v1 ships.

**Out of scope for v1 release:** HTML report for draft commands beyond what falls out of reusing `writeReportHtml("validate", ...)`. Custom draft templates can land in a follow-up.

---

## Sequencing

```
A (upstream gxformat2 modeling) -----> B (TS draft-checks logic)
                                            |
                                            +--> C (draft-validate CLI)
                                            +--> D (draft-next-step CLI)
                                            +--> E (_draft-extract CLI)
                                                              |
                                                              v
                                       F (fixtures & golden tests, runs alongside C/D/E)
                                                              |
                                                              v
                                                      G (docs + release)
```

**Critical path:** A → B → C/D/E (parallelizable) → F (parallelizable with each command) → G.

**Cross-repo discipline.** We maintain both gxformat2 and galaxy-tool-util-ts. When implementing B–G, if something feels like it should live in gxformat2 (schema shape, sentinel type, fixture, helper, terminology), the answer is to fix it in gxformat2 — not to work around it in this monorepo. Short-term TS patches that duplicate or paper over gxformat2 modeling will rot quickly and undermine the cross-language story. No fallback path is needed because A is on our critical path and we control it.

---

## Cross-cutting open questions

All round-one open questions are now resolved. Remaining items live inside subplans rather than at the meta level:

- **Tests file (`*-tests.yml`) draft mode:** still v1-skip. Tests come after concretization. (No user input requested — recommendation stands.)
- **Bare `TODO` as port name:** warn-level in v1 (`TODO_<hint>` is the canonical port form; bare `TODO` is reserved for value-position fields like `tool_id`). Encoded in workstream B.
- **`v2-track` followups** (not v1 scope, captured for memory):
  - Structured `_plan_*` shapes once worked examples accrue.
  - Type-aware connection validation on the concrete subgraph.
  - Tree variants for `draft-validate`.
  - Draft mode for `*-tests.yml`.
  - Recursive subworkflow shrinking in `_draft-extract` (rather than drop-whole).
  - Tightening: `_plan_*` on non-tool steps may move from "allowed" to "error" once we see usage patterns.

Subplan-level open items (resolve when each subplan is written):
- Exact schema-salad expression of `TodoSentinel` for record-key positions (`in:` keys) — schema-salad's native expressiveness here may need a workaround.
- Exact downstream strategy for deriving/publishing `format2-draft.schema.json` from the regenerated gxformat2 model.
- Markdown-output templates for draft commands (defer until JSON output stabilizes).

---

## Status

- [x] Research subagents run (3 white papers)
- [x] Scope interview rounds (locked decisions above)
- [x] Metaplan drafted (this file)
- [x] Subplan A drafted; A landed upstream in gxformat2 PR #219 (still WIP / pending merge)
- [x] Subplan B drafted (`B-ts-draft-checks.md`); B implementation landed (commits 0–5 on branch `draft-checks-fixups`)
- [x] Subplans C, D, E drafted (`C-cli-draft-validate.md`, `D-cli-draft-next-step.md`, `E-cli-draft-extract.md`)
- [x] Subplan F drafted + implemented (`F-fixtures.md`); F2–F6 changes pending commit in both `galaxy-tool-util-ts` and `gxformat2` PR #219 worktrees
- [ ] Subplan G (TBD — to be written as its workstream starts)
- [ ] Implementation of C / D / E
- [ ] Docs + release

### Step A landed — two shape shifts subplans B–G must build against

The implementation in gxformat2 PR #219 diverged from the literal subplan-A text in two ways. Both are improvements; downstream subplans should reference these, not the original wording.

1. **Draftness is a class discriminator.** Instead of putting `_plan_*` on the base `WorkflowStep`, Step A introduced `class: GalaxyWorkflowDraft` + `DraftWorkflowStep extends WorkflowStep`. The strict `GalaxyWorkflow` schema rejects `_plan_*` structurally, which covers the case where someone hand-writes a concrete workflow with `_plan_*` on it. For the "`_plan_*` on a fully-resolved step within a draft document → error" half of the locked decision, `DraftWorkflowStep` allows `_plan_*` unconditionally (it has to — drafty steps need it), so the constraint is enforced semantically in TS `validateDraft` (added in workstream F4). A Python parity check follows when the Python port lands.
2. **`TodoSentinel` did not survive schema-salad codegen** (recorded in A-upstream L34–39). Upstream now owns the sentinel contract as Python constants in `gxformat2/draft.py` (`TODO_SENTINEL_PATTERN`, `PLAN_FIELDS`, `is_todo_sentinel`). Downstream draft-checks redeclare the regex and own semantic enforcement, with a drift check against the upstream constants.

A third item is a B-scoped pipeline gap, not a shape shift: the TS `Makefile`'s `sync-schema-sources` and `generate-schemas` do not yet copy or process `v19_09/draft_workflow.yml`. Subplan B closes this in commit 0.
