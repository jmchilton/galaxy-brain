# Workstream B — TS draft-checks pure logic

## Goal

Build the pure-logic substrate the three draft CLI commands (C/D/E) will sit on. Lives in `@galaxy-tool-util/schema`. No I/O. All entry points take a parsed workflow dict and return either a Result-shaped object or an Effect `Either`.

## Inputs

- Metaplan: [INDEX.md](./INDEX.md)
- Subplan A (upstream gxformat2 — landed): [A-upstream-gxformat2.md](./A-upstream-gxformat2.md)
- Step A worktree (source of truth for the upstream contract): `/Users/jxc755/projects/worktrees/gxformat2/branch/abstraction_applications`, PR https://github.com/galaxyproject/gxformat2/pull/219
- TS monorepo: `/Users/jxc755/projects/worktrees/galaxy-tool-util/branch/skills` (this repo)

## What Step A actually shipped (vs. what subplan A said)

Two divergences from the subplan-A text that B must build against, not against the original metaplan wording:

1. **Draftness is a class discriminator, not a TODO-detection inference.** Step A introduced a new document root `class: GalaxyWorkflowDraft` and a new step record `DraftWorkflowStep extends WorkflowStep`. The `_plan_*` fields live only on `DraftWorkflowStep`; the strict `GalaxyWorkflow` schema rejects them. This **auto-enforces** the locked decision "`_plan_*` on a fully-resolved step → error" — no separate semantic check needed for that case.
2. **`TodoSentinel` did not survive schema-salad codegen.** Upstream now owns the sentinel contract as Python constants in `gxformat2/draft.py`:
   - `TODO_SENTINEL_PATTERN = r"^TODO(_[a-z0-9_]+)?$"`
   - `PLAN_FIELDS = ("_plan_state", "_plan_context", "_plan_in", "_plan_out")`
   - `is_todo_sentinel(value)` helper
   B owns semantic enforcement of the sentinel pattern.

## Locked decisions (this subplan)

| Decision | Outcome |
|---|---|
| Draft detection | **Strictly `class: GalaxyWorkflowDraft`.** Any draft-* command on a file lacking that class returns a clear "this is not a draft workflow" error and exits non-zero. No TODO-heuristic fallback. |
| Sentinel pattern source | **Redeclare in TS + drift check.** `packages/schema/src/workflow/draft-checks.ts` declares `TODO_SENTINEL_PATTERN` as a `const`. New make target verifies the TS constant matches the upstream Python constant (`gxformat2/draft.py`). |
| `PLAN_FIELDS` source | **Same.** TS owns its own `PLAN_FIELDS` tuple; drift check covers both. |
| Makefile wiring | **Lands in B as commit 0** — `sync-schema-sources` copies `draft_workflow.yml`, `generate-schemas` invokes the generator on it, prettier sweep, regenerated artifacts checked in. |
| Subworkflow recursion | **Recursive.** `validateDraft`, `nextDraftStep`, `extractConcreteSubset` all descend into `run:` blocks that are themselves drafts. Step path is `[outer, sub, ...]`. Tie-break by step label at each level. |
| Inline subworkflow class | A `run:` block carries its own `class:`. If outer is `GalaxyWorkflowDraft` and inner `run:` is `GalaxyWorkflow`, treat inner as concrete (no descent for draft purposes). If inner is `GalaxyWorkflowDraft`, recurse. Mixed nesting is allowed. |
| Module location | New file `packages/schema/src/workflow/draft-checks.ts`. Schema imports stay in `packages/schema/src/workflow/raw/`. |

## Pipeline gaps B closes

### Commit 0 — Makefile + regen

Goal: after this commit, `make sync` produces a usable Effect schema for the draft root and the regenerated artifacts are checked in.

1. `Makefile:289 sync-schema-sources` — add:
   ```make
   cp $(SCHEMA_SRC_ROOT)/v19_09/draft_workflow.yml $(SCHEMA_DST)/v19_09/
   ```
2. `Makefile:313 generate-schemas` — add two generator invocations mirroring the existing pair:
   ```make
   $(SCHEMA_SALAD_PLUS_PYDANTIC) generate --format typescript     "$(CURDIR)/$(SCHEMA_DST)/v19_09/draft_workflow.yml" -o "$(CURDIR)/$(WF_SCHEMA_DST)/gxformat2-draft.ts"
   $(SCHEMA_SALAD_PLUS_PYDANTIC) generate --format effect-schema  "$(CURDIR)/$(SCHEMA_DST)/v19_09/draft_workflow.yml" -o "$(CURDIR)/$(WF_SCHEMA_DST)/gxformat2-draft.effect.ts"
   ```
3. Run `GXFORMAT2_ROOT=… make sync-schema-sources generate-schemas` once locally to produce `packages/schema/src/workflow/raw/gxformat2-draft.effect.ts`. Commit the generated file.
4. **Verify the generator preserved leading-underscore property keys** (subplan A claims yes — confirm by grepping for `"_plan_state"` in the generated `.effect.ts`). If the generator stripped them à la pydantic, B stops and we either patch the generator or write a post-codegen rewrite (mirroring `scripts/patch_generated_pydantic.py`).
5. Re-export from `packages/schema/src/workflow/raw/index.ts`.

**Acceptance for commit 0:**
- `make sync` clean + idempotent.
- `pnpm --filter @galaxy-tool-util/schema typecheck` passes.
- New file `gxformat2-draft.effect.ts` exports `GalaxyWorkflowDraftSchema`, `DraftWorkflowStepSchema` with `_plan_state` / `_plan_context` / `_plan_in` / `_plan_out` literal keys.

### Commit 0.5 — sentinel drift check

New make target `check-sync-draft-sentinel`:

- Read `TODO_SENTINEL_PATTERN` and `PLAN_FIELDS` from the *next* B commit's `draft-checks.ts` (parse via tiny node script, no runtime import).
- Read the same from `$(GXFORMAT2_ROOT)/gxformat2/draft.py` if `GXFORMAT2_ROOT` is set; otherwise read from a checked-in copy at `schema-sources/v19_09/draft_constants.json` populated by an extended `sync-schema-sources`.
- Fail with a clear message if they differ.

Wired into `check-sync-all`. **Recommendation:** copy the python constants to JSON during `sync-schema-sources` so the drift check works in CI without `GXFORMAT2_ROOT`.

## Module shape — `packages/schema/src/workflow/draft-checks.ts`

```ts
import { Either } from "effect";
import * as S from "effect/Schema";
import { GalaxyWorkflowDraftSchema, DraftWorkflowStepSchema } from "./raw/gxformat2-draft.effect.js";

// Mirrors gxformat2/draft.py TODO_SENTINEL_PATTERN. Drift checked by `make check-sync-draft-sentinel`.
export const TODO_SENTINEL_PATTERN = /^TODO(_[a-z0-9_]+)?$/;
export const PLAN_FIELDS = ["_plan_state", "_plan_context", "_plan_in", "_plan_out"] as const;
export type PlanField = (typeof PLAN_FIELDS)[number];

export function isTodoSentinel(value: unknown): value is string {
  return typeof value === "string" && TODO_SENTINEL_PATTERN.test(value);
}

export function isDraftWorkflow(doc: unknown): boolean {
  return typeof doc === "object" && doc !== null && (doc as { class?: unknown }).class === "GalaxyWorkflowDraft";
}
```

### Exports

#### `detectDraft(workflow): DraftSurvey`

Walks a draft workflow once, collects every TODO sentinel and every `_plan_*` field, returns:

```ts
interface DraftSurvey {
  isDraft: boolean;                       // `class === GalaxyWorkflowDraft`
  todos: Array<{ path: StepPath; location: TodoLocation; sentinel: string }>;
  planFields: Array<{ path: StepPath; field: PlanField; value: string }>;
}
type StepPath = string[];                 // [outer, sub, ..., step_label]
type TodoLocation =
  | { kind: "tool_id" }
  | { kind: "tool_version" }
  | { kind: "in_key"; key: string }
  | { kind: "out_id"; id: string }
  | { kind: "output_source"; output_label: string; port: string };
```

#### `validateDraft(workflow): Either<DraftValidationError, DraftValidationOk>`

Pipeline:
1. **Lax structural decode** against `GalaxyWorkflowDraftSchema` via `Schema.decodeUnknownEither`. Errors → `structure_errors`.
2. **Concrete-topology checks** (these MUST be concrete even in a draft):
   - workflow `inputs[].type` non-TODO
   - workflow `outputs` map keys non-TODO
   - step `label` (if dict-form: the key) non-TODO
   - every `step/port` edge ref resolves syntactically: `step` exists, `port` listed in step's `out:` (sentinel-form `TODO_*` ports count if declared in `out:`)
3. **Sentinel form checks** (warn vs error per metaplan):
   - bare `TODO` in port position → **warn**
   - sentinel that doesn't match `TODO_SENTINEL_PATTERN` → **error** (e.g. `TODO-foo`, `TODOfoo`, `TODO_` with trailing underscore)
4. **Plan-field strictness:** strict schema-discrimination already handles "`_plan_*` on concrete step" by virtue of `_plan_*` only existing on `DraftWorkflowStep`. No semantic check needed. Document this in code so future readers don't re-add it.

Returns either a typed error object (carrying structure_errors / topology_errors / semantic_errors / warnings) or an OK shape carrying the `DraftSurvey`.

#### `nextDraftStep(workflow): NextStepResult`

```ts
type NextStepResult =
  | { draft: false }
  | { draft: true; step: StepPath; work: string[] };
```

Algorithm:
1. Run topological sort of steps (subworkflow-aware: descend `run:` only when inner is `GalaxyWorkflowDraft`).
2. Tie-break by step label alphabetical at each topological level.
3. First step that carries any TODO sentinel or `_plan_*` field → emit its `StepPath` and `work[]`.
4. `work[]` order, per INDEX.md L155: `tool_id → tool_version → in.<sentinel> (source order) → out.<sentinel> (source order) → _plan_state → _plan_context → _plan_in → _plan_out`.
5. `work[]` items follow the locked-decision template (INDEX.md L132–146).
6. If no step needs work → `{ draft: false }`.

**Idempotence:** pure function. Same input → same output, byte-for-byte.

#### `extractConcreteSubset(workflow): ExtractResult`

```ts
interface ExtractResult {
  workflow: unknown;                      // trimmed dict (still `class: GalaxyWorkflowDraft` if anything was draft)
  dropped_steps: Array<{ path: StepPath; reason: DropReason }>;
  dropped_outputs: Array<{ label: string; reason: DropReason }>;
}
type DropReason =
  | { kind: "step_has_todo"; locations: TodoLocation[] }
  | { kind: "step_has_plan_field"; fields: PlanField[] }
  | { kind: "cascade"; depends_on: StepPath[] }
  | { kind: "subworkflow_not_concrete"; inner_drops: StepPath[] };
```

Fixpoint loop per INDEX.md L83–86:
1. Mark every step that has any TODO or `_plan_*` as dropped.
2. Iterate: any surviving step whose `in:` has at least one **dead** required input → mark dropped (cascade). See "Cascade trigger" below — an input is dead iff every `source:` ref it carries points at a dropped step.
3. Fixpoint when no new drops.
4. Drop `outputs[]` entries per "Output-drop rule" below.
5. Recurse into surviving subworkflow steps. See "Subworkflow recursion" below.
6. **Class on the returned dict**: still `GalaxyWorkflowDraft` if any drops happened (the result is still pre-runnable); if zero drops and zero remaining `_plan_*`, the caller may want to flip to `GalaxyWorkflow` — but **that decision is C/E's, not B's**. B always returns `class: GalaxyWorkflowDraft`.

##### Resolved spec details (planning audit, 2026-05-23)

These eight clarifications resolve gaps the planning audit surfaced; the implementer should not have to re-derive them.

1. **Cascade trigger — per-input, not per-source.** A step input (`in.x`) is *dead* iff every `source:` ref it carries points at a dropped step. A step cascades iff it has at least one dead required input. Multi-source inputs (`in: { x: [a/out, b/out] }` or `in: { x: { source: [a/out, b/out] } }`) with at least one surviving ref are rewritten to the surviving subset — string form if 1 ref left, list form if >1. **This is the only in-place shrink B performs in v1.**

2. **`default:`-only fallback.** An input with both `source:` and `default:` whose source becomes dropped loses the `source:` key but keeps the entry (the default still satisfies the port); no cascade. An input with only `source:` that becomes dead cascades the consuming step. Mirrors Galaxy runtime semantics: defaults satisfy required inputs.

3. **Subworkflow recursion + inner-port references.** After recursing a subworkflow step `S`, the set of valid outer refs is the keys of `S.run.outputs` remaining post-drop. Outer-step inputs that reference `S/<port>` with `<port>` no longer present count as dead refs per rule 1, and the surviving-source subset rewrite applies. The outer step itself is **never shrunk in v1** — only the inner workflow shrinks in place. If the outer step cascades, drop it whole.

4. **Output-drop rule — all three shapes.** Reuse `iterateOutputs` / `readOutputSource` / `splitSourceRef` from the existing module. Drop the entry iff: source step is dropped, OR port half matches `TODO_SENTINEL_PATTERN`, OR port is not present in the surviving step's `out:` ids after recursion. Applies uniformly to dict-form `outputs: { lbl: { outputSource: ... } }`, list-form `outputs: [{ id: lbl, outputSource: ... }]`, and string-shorthand `outputs: { lbl: 's/p' }`.

5. **Workflow `inputs:` are preserved verbatim.** Orphan workflow inputs (no surviving consumer) are NOT pruned. They are part of the workflow's declared interface; orphan-input detection is a lint-level concern in a separate command, not an extract concern.

6. **B does NOT strip `_plan_*` from surviving steps.** Returned workflow carries `class: GalaxyWorkflowDraft` and may still have `_plan_*` on surviving steps. The `_plan_*` strip + class flip lives in E (CLI command) via a new `clean.ts` `stripPlanFields: true` option. Implication for test plan: B's test-step-9 cross-check (decoding extract output against `GalaxyWorkflowSchema`) must run against a fixture whose surviving steps carry no `_plan_*`, OR move that cross-check to E's test suite. Pick one when writing the tests.

7. **Determinism — ordering rules.**
   - `dropped_steps` is ordered by **cascade round** (round 0 = direct TODO/plan drops, rounds 1+ = cascade drops), then by **alphabetical step-path** within a round.
   - `dropped_outputs` is alphabetical by output label.
   - Surviving steps / inputs / outputs preserve their **original input iteration order** (skip drops in place). YAML serializer respects insertion order, so this keeps the extract a textual subset of the input where possible.
   - Function is byte-for-byte idempotent across runs.

8. **String-form `run:`.** When `run:` is a string (URL / `@import` path / TRS ref) rather than an inline dict, the subworkflow is treated as **concrete and opaque**: no descent, no inner-port validation. The outer step's drop decision rests purely on its own TODO / `_plan_*` state and its `in:` cascade state (per rules 1–2).

##### DropReason addition

The `DropReason` enum needs one more variant for the multi-source case where a step survives but one branch of an input was pruned. That's not a step drop — it's an in-place rewrite. Track it separately:

```ts
interface ExtractResult {
  // ... same as above plus:
  rewritten_step_inputs: Array<{
    path: StepPath;
    in_key: string;
    removed_refs: string[];    // ["dropped_step/port", ...]
    surviving_refs: string[];  // ["other_step/port", ...]
  }>;
}
```

## Test plan (vitest)

Tests live in `packages/schema/test/workflow/draft-checks.test.ts`. Declarative YAML fixtures under `packages/schema/test/fixtures/draft/` (mirroring the CLI fixtures from workstream F but at the unit-test layer so B is testable in isolation).

Red-to-green order:

1. **Sentinel helper** — table-driven `isTodoSentinel` cases: `TODO` ✓, `TODO_foo` ✓, `TODO_foo_bar_2` ✓, `TODO_` ✗, `TODO-foo` ✗, `TODOfoo` ✗, `todo` ✗.
2. **Draft detection** — `isDraftWorkflow` on `class: GalaxyWorkflowDraft` ✓; `class: GalaxyWorkflow` ✗; missing class ✗.
3. **`detectDraft`** survey on the three upstream synthetic fixtures (`synthetic-draft-tool-step`, `synthetic-draft-plan-subworkflow`, `synthetic-draft-plan-top-level`) — assert exact paths/locations.
4. **`validateDraft` happy paths** — same three fixtures + a fully concrete draft (drafts with no TODOs and no `_plan_*` but `class: GalaxyWorkflowDraft`) pass.
5. **`validateDraft` failure paths** — `label: TODO`, dangling edge ref, malformed sentinel (`TODO-foo`), bare `TODO` in port position (warn-not-error).
6. **`nextDraftStep`** — chain-fixture asserts step ordering; tie-break fixture asserts alphabetical determinism; `{ draft: false }` on fully-concrete draft.
7. **`extractConcreteSubset`** — cascade fixture asserts both directly-drafty + cascaded steps appear in `dropped_steps`; output drop fixture asserts `dropped_outputs`; subworkflow fixture asserts recursive behavior.
8. **Idempotence** — `JSON.stringify(nextDraftStep(wf))` is stable across N runs on each fixture.
9. **Cross-check** — for the "concrete enough to be runnable" extract output, decoding against `GalaxyWorkflowSchema` (concrete schema) must succeed. This is the structural proof that the extract is a valid runnable.

Reuse the synthetic fixtures from gxformat2 PR 219 where possible — copy them into `packages/schema/test/fixtures/draft/` rather than reinventing.

## Out of scope for B (handed to C/D/E or v2)

- Anything that touches the filesystem, CLI args, or report rendering — that's C/D/E.
- HTML report shapes — C owns. B returns plain structured data.
- Type-aware connection validation on the concrete subgraph — v2 (INDEX.md L92).
- Tree variants — v2 (INDEX.md L38).
- Promoting an extract output from `class: GalaxyWorkflowDraft` → `class: GalaxyWorkflow` when zero drops occurred — E decides.

## Acceptance criteria

- `make sync` succeeds and produces a checked-in `gxformat2-draft.effect.ts` with `_plan_*` literal keys.
- `make check-sync-draft-sentinel` succeeds and fails CI if the TS pattern drifts from `gxformat2/draft.py`.
- `packages/schema/src/workflow/draft-checks.ts` exports the four functions above with the documented signatures.
- New vitest suite passes; coverage includes every fixture-case enumerated above.
- `make check && make test` green.
- Changeset entry: minor bump for `@galaxy-tool-util/schema`.

## Sequencing inside B

```
commit 0    ✅ Makefile + regenerated raw/gxformat2-draft.effect.ts (no logic)         5b0b3bed
commit 0.5  ✅ check-sync-draft-sentinel + JSON snapshot of upstream constants         b8e61b0e
commit 1    ✅ draft-checks.ts: types + isTodoSentinel + isDraftWorkflow + detectDraft b8e61b0e
commit 2    ✅ validateDraft                                                            f63f2109
commit 3    ✅ nextDraftStep                                                            001ded9a
            ✅ draft-checks fix-ups from review                                         fcef54fd
commit 4    ✅ extractConcreteSubset                                                    f0f2d0ce
commit 5    ✅ Docs update for packages/schema (draft-checks module description)        0df11e2b
```

Commits 1–4 are independently reviewable. C/D/E unblock as soon as their dependency (commit 1 / 3 / 4 respectively) lands, even before commit 5.

### Deviations from this plan recorded during implementation

- **Commit 4 `DropReason`:** The `subworkflow_not_concrete` variant defined at L159 was not emitted by the implementation. An outer subworkflow step whose inner workflow degrades is signalled via the standard `cascade` reason on the outer step (when its `in:` cascades) plus inner drops surfaced under the outer step's path. The dedicated variant was unnecessary.
- **Commit 4 test-step 9:** The cross-check "decoding extract output against `GalaxyWorkflowSchema`" is intentionally deferred to E. `extractConcreteSubset` always returns `class: GalaxyWorkflowDraft`, so the concrete-schema decode would fail by design without an intervening `clean.ts stripPlanFields: true` + class flip. E owns that conversion and is the right place for the structural cross-check.
- **Commit 4 `DroppedOutput`:** Added a `path: StepPath` field (not in the plan's L155 shape). Inner subworkflow output drops are surfaced with `path: [outerStep, ...]` so callers can distinguish them from top-level output drops; top-level outputs have `path: []`. Driven by the post-implementation adversarial review — silently dropping inner output drops was lossy.
- **Commit 4 ordering:** "Ordered by cascade round, then by alphabetical step-path within a round" applies *within a single workflow level*. Across nesting, a level's drops come first followed by per-surviving-subworkflow drops in source iteration order. Cascade rounds are not comparable across nesting.

## Open questions for B

- Does `schema-salad-plus-pydantic --format effect-schema` actually preserve `_plan_state` as a literal key? Verify in commit 0 — if no, the post-codegen patch script becomes part of commit 0 and a new question opens about whether to upstream a generator fix.
- Should `validateDraft` collect all errors or short-circuit at first structural failure? Recommendation: collect all (matches existing `validators.ts` style); confirm with first reviewer.
- Drift-check storage: JSON snapshot of upstream constants vs. live read when `GXFORMAT2_ROOT` is set? Recommendation: both — live when env present, snapshot otherwise — but happy to drop snapshot if reviewers prefer "env always required, like sync."
- Tie-break "by label alphabetical": for dict-form steps the key IS the label; for list-form steps the `label:` field may be optional. Fall back to step `id`/array index when label absent? Recommend yes, documented in `nextDraftStep`.
