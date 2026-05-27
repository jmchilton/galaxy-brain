# Draft Workflows — Design Spec Synthesis

## 1. Format summary

A **draft Format2 workflow** is gxformat2 with surgical, wrapper-tier relaxations and a `_plan_*` family of free-text planning fields layered onto tool steps. Topology — workflow inputs, outputs, step set, edges, branches, `when:` guards — is **concrete and final** at the draft stage; only wrapper/parameter decisions are deferred (spec L29-31, L41).

**Allowed TODO sentinels (wrapper-tier, tool steps only)** (spec L34-39):

- `tool_id`, `tool_version` MAY be the literal string `TODO`
- `tool_shed_repository` block MAY be absent
- `tool_state` / `state` MAY be absent
- Step `out[].id` and `in[]` keys MAY be `TODO_<hint>` sentinels (e.g. `TODO_trimmed_paired`, `TODO_input`)
- Top-level `outputs[].outputSource` MAY reference such a sentinel as `step_label/TODO_<hint>`

**`_plan_*` fields** (spec L43-54): per-tool-step, free text, all optional but expected when wrapper is deferred. MUST disappear before the workflow is treated runnable.

- `_plan_state` — parameter binding intent
- `_plan_context` — wrapper selection context (source command, conda, container, pre/postconditions, envvars)
- `_plan_in` — semantic role per input port; likely wrapper-side names
- `_plan_out` — wrapper output surface intent; downstream consumer evidence

**Tier boundary** (spec L52, L41):

- **Topology-tier (concrete, MUST):** `class`, `inputs` (incl. `type`, `format`, `collection_type`, `optional`), workflow `outputs` labels, step `label`s, step set, producer→consumer edges, `when:` guards, subworkflow topology, position/order decisions.
- **Wrapper-tier (relaxed, MAY be TODO):** `tool_id`, `tool_version`, `tool_shed_repository`, `tool_state`, the *names* (but not the *existence*) of step `in:` keys and `out:[].id` slots, and any `_plan_*`.

Two invariants: every TODO/`TODO_*` and every `_plan_*` field MUST disappear before runnable; the connection graph must still resolve syntactically even when port names are sentinels (spec L39).

## 2. Validation surface

A `gxwf draft-validate` MUST be a **strict superset** of `gxwf state-validate --no-tool-state` for topology, and a relaxation of the structural validator for wrapper-tier fields.

### MUST check

- **Class & structural skeleton**: `class: GalaxyWorkflow`, required `inputs/outputs/steps` present and well-formed dicts/lists (defer to `gxformat2-schema`).
- **Workflow inputs concrete**: every input has a non-TODO `type` from the closed enum (`null | boolean | int | long | float | double | string | integer | text | File | data | collection`; gxformat2-schema L37). `collection_type` if `type=collection` must be a real shape string, not `TODO`. `format` if present must be a real datatype id, not `TODO`.
- **Workflow output labels concrete**: every `outputs[].label` (the public API, per testability-design §1) must be non-TODO. `outputSource` must be present and must point at `<step_label>/<port>` where `<step_label>` resolves to a declared step. (`<port>` may be a `TODO_*` sentinel — that's the relaxation.)
- **Step labels concrete**: every step has a non-TODO `label`.
- **Edge graph resolves syntactically**: for every `in: { <key>: <ref> }` and every `outputSource`, the LHS `step_label` half resolves to either a workflow input or a declared step; the RHS port half is either a real declared port or a `TODO_*` sentinel that appears in that step's `out:` block. (See §5.)
- **Strip-readiness preview**: every literal `TODO`/`TODO_*` and every `_plan_*` field is enumerated so the user can see exactly what blocks promotion to runnable.
- **`_plan_*` placement rule** (v1, per user decision 2026-05-22): allowed on all step kinds, never on workflow inputs/outputs, never at top level. Simplifies schema modeling. Future tightening to tool-step-only is on the v2 list.

### MAY check (warn, don't fail)

- **`_plan_*` only where needed** (spec L45: "expected on any step where `tool_id` is `TODO` or `tool_state` is absent"). Per locked decision, **`_plan_*` on a fully-resolved step is a hard error** (not a lint warning). A lint warning if a step has TODO sentinels but **no** `_plan_*` is still desirable (the agent loop benefits from the plan being recorded).
- **TODO sentinel hint quality**: `TODO_<hint>` ideally has a hint (regex `^TODO(_[a-z0-9_]+)?$`). A bare `TODO` as a port name is allowed by spec L39 (`TODO_<hint>` is the form, but bare `TODO` works as a degenerate case for `tool_id`/`tool_version`). Warn on bare `TODO` ports.
- **Output-source port discipline**: outputs that point at `step/TODO_*` are still draft. Surface count as a draft-progress metric.

### MUST NOT enforce

- Tool state validation against tool schemas (no wrapper picked).
- Connection type validation (port shapes unknown; spec L97 "static tooling … still applies to topology and port wiring" — but type-aware connection validation needs a concrete wrapper).
- That `_plan_*` strings are non-empty / well-formed / structured (spec L100: "Free-text `_plan_*` is intentional for v1").
- That `tool_shed_repository` is present (spec L37).

### Open / strictness questions

- **`_plan_*` strictness on placement**: spec is loose. Recommend strict (only on tool steps) — it's a small price and avoids drift.
- **Subworkflows in draft mode**: spec is **silent**. Two interpretations:
  1. Subworkflows must already be concrete (no `run:` block with TODOs nested in it).
  2. Subworkflows can themselves be drafts (recursively).
  Recommend **(2) recursive**: same Format2 file can have `run:` blocks that are themselves drafts. Validator recurses. The agent loop will commonly draft a subworkflow alongside its parent.
- **Tests file format (`*-tests.yml`)**: spec is silent. Reasonable for v1: **draft mode does not apply** to `*-tests.yml`. Tests come *after* the workflow is concrete (testability-design assumes a runnable workflow; CURRENT_STATE.md positions `validate-tests` as schema-only). v2 could allow a `TODO`-tolerant test draft once worked examples appear.

## 3. Concrete subset semantics (`gxwf _draft-concrete-subset`)

Goal: extract the maximal subgraph that is a **runnable gxformat2 workflow** from a partially concretized draft.

### Which steps qualify as "concrete"

A step is concrete iff **all** of:

- `tool_id` is non-TODO and `tool_version` non-TODO
- `tool_state` (or `state`) is present
- No `_plan_*` field present
- Every key in `in:` is a non-`TODO_*` name
- Every `out[].id` is a non-`TODO_*` name (or `out:` is absent and the step is one where Galaxy can infer outputs from `tool_id` — but in draft mode you can't know that without a tool cache, so require explicit `out` when listed)
- For `subworkflow` steps: the nested workflow is itself fully concrete (recursive)

### Propagation rule (the hard question)

A concrete step that **consumes from a TODO step** is **not actually runnable** — its `in:` references a port that doesn't exist yet. Two policy options:

- **(A) Strict / runnable**: drop any step whose `in:` edges trace back (transitively) to a non-concrete step. Output is a runnable subworkflow.
- **(B) Loose / structural**: include any concrete step regardless of edges; let downstream tools complain.

Recommend **(A) strict, with `--loose` flag for (B)**. The downstream Foundry agent loop's purpose for this command is "show me what I can actually execute today", which is (A). Implementation: topological closure — `concrete_set = { s | s is concrete AND every input edge sources from (workflow_input ∪ concrete_set) }`. Iterate to fixpoint.

> **User note 2026-05-22:** the DAG topology should make this case rare in practice — if `draft-next-step` always picks the topologically-earliest unresolved step, the agent loop fills bottom-up and never produces a concrete step depending on a TODO. The propagation logic is a safety net, not a workhorse.

### Outputs with `step/TODO_*` outputSource

If a workflow `outputs[].outputSource` references a port that's still a `TODO_*` sentinel **or** a step that got dropped, **drop that output entry** from the subset. Emit a report of dropped outputs so the agent loop sees what's missing.

### Order preservation

- **Preserve step order as written**. Re-labeling is unnecessary and obscures provenance.
- **Outputs**: preserve order, minus drops.
- **Inputs**: keep all workflow inputs verbatim (they're concrete by definition). Don't drop unused inputs — the agent may still be wiring them up; surface as a warning instead.

### Subworkflow support

- Recurse into `run:` blocks. A subworkflow itself must pass the same concrete-subset filter to be included.
- If a subworkflow step has a fully-concrete inline `run:` block, keep it as one node. If the nested workflow has its own draft steps, either:
  - Drop the whole subworkflow step (strict), or
  - Recursively shrink its `run:` to a concrete subset (more useful but more surprising).
  - **Recommend strict for v1**; recursion is a v2.

### Output shape

Emit gxformat2 YAML on stdout (or `-o`). Optionally emit a sidecar JSON report describing what was dropped and why (`--report-json`).

## 4. `draft-next-step` semantics

Goal: tell the agent loop **which step to concretize next** and surface the planning context.

### "Next step" definition

- **Topological-order, not order-as-written**. The agent loop concretizes a step's inputs before the step itself; a topological walk gives the right order. Tie-break by step label alphabetical for determinism.
- A step is "needs work" iff it has any TODO sentinel **or** any `_plan_*` field. (Both signal incompleteness — a concrete step with leftover `_plan_*` is a lint error, not "needs work", but conservatively: treat presence of either as a signal.)
- Emit the **first** needs-work step in topological order.
- If none needs work, emit `{ draft: false }`.

### Step labeling under subworkflows

Spec teaser: `step: [outer_label, subworkflow_label, ...]`. Recommend a JSON Pointer-ish array:

```yaml
step: ["align_reads", "filter_subworkflow", "samtools_filter"]
```

- Empty array prefix on top-level steps → just `["samtools_filter"]`.
- Used everywhere (`work[].step`, `outputSource` parsing, error messages).
- An alternative slash-joined string (`align_reads/filter_subworkflow/samtools_filter`) is cheaper to print but ambiguous with `outputSource` syntax — prefer the array.

### `work[]` shape

> **User decision 2026-05-22:** v1 ships **raw strings** in `work[]` — just the TODO text or `_plan_*` values verbatim. Matches the original sketch. Downstream agent parses.

Reference v1 raw-string contents for one step:

```json
{
  "draft": true,
  "step": ["fastp"],
  "work": [
    "tool_id: TODO",
    "in.TODO_input",
    "out.TODO_trimmed_paired",
    "out.TODO_html_report",
    "_plan_state: adapter trimming on, quality cutoff ~Q20, min length ~50.\npreserve paired-end pairing for downstream alignment.",
    "_plan_context: upstream: nf-core FASTP module. conda: bioconda::fastp=0.23.4 ...",
    "_plan_in: single semantic port `reads`: feeds workflow `reads` (list:paired). ...",
    "_plan_out: need a paired output that preserves list:paired shape ..."
  ]
}
```

(Exact string-shape conventions for sentinel work items — `"in.TODO_input"` vs `"in[TODO_input]"` vs just `"TODO_input"` — are an implementation-level decision; see Open Question 14.)

A future v2 may upgrade to structured `{ kind, location, hint, plan_text? }` once worked examples motivate it (spec L106). v1 keeps it minimal.

### Idempotence / stability

- **Yes, idempotent** for a given input file. Pure function: input draft YAML → `next-step` JSON. No clock, no RNG.
- Topological tie-break by label string ensures stability.
- The agent loop relies on this for re-runs after a partial fix.

### Output

JSON to stdout (machine-readable). `--format markdown` for human-readable. JSON shape lives in `report-models.ts` (per GXWF_AGENT.md convention — Python and TS report models stay in sync).

## 5. Connection / dataflow validation in draft mode

The spec's core promise (L39, L97): the **graph is well-formed** even with `TODO_*` port names. The validator can do syntactic edge resolution but not type-aware checks.

### Syntactic edge check (MUST, v1)

For every `step.in[<consumer_key>]: <source_ref>`:

- Parse `<source_ref>` into `(source_step_or_input, source_port?)`. Accept the gxformat2 shorthand variants (bare input name, `step/port`, dict with `source:`).
- `source_step_or_input` must resolve to a declared workflow input **or** a declared step label.
- If `source_port` is given, it must appear in that step's `out[].id` list — but `TODO_<hint>` ports count as declared if listed in `out:`.
- Same logic for `outputs[].outputSource`.

Failure modes:

- Reference to undeclared step label → **error**.
- Reference to a port not in any `out:` block → **error** (even if it's a `TODO_*` — the sentinel must be *declared* in `out:` to be referenceable).
- Self-cycle / cycle → **error**.

### Partial connection validation on the concrete subgraph (MAY, v2)

Once a meaningful subset of steps is concretized, the existing `connection_validation.py` engine (CURRENT_STATE.md) could run on the subgraph defined by concrete-subset semantics:

- Build `connection_graph` over concrete steps only.
- For each edge whose **source** is concrete (real port with a real type) **and** consumer is concrete: run normal type-aware validation.
- Skip edges that touch any TODO port.

Recommend: **defer to v2**. v1 ships syntactic only. This is consistent with the Python side's tiered strictness (`--strict-state` vs `--strict-structure`); a draft-mode tier sits even below `--strict-structure`.

### What we lose

- Collection shape propagation (map-over, reduction) — can't compute without wrapper output types.
- `paired_or_unpaired` / `collection_type_source` resolution.
- Datatype compatibility.

These all wait until the wrapper is picked; that's exactly the point of the tier separation.

## 6. Open questions

### Spec-level (resolved 2026-05-22 interview rounds 1 + 2)

1. **Subworkflow drafts**: are nested `run:` blocks allowed to be drafts themselves? **Yes, recursive** — step path is `[outer, sub, ...]`.
2. **Strict vs loose `_plan_*` placement on resolved steps**: **Strict — error** if `_plan_*` on a fully-resolved step.
3. **Tests file in draft mode**: **v1-skip.** Tests come after concretization.
4. **Bare `TODO` as a port name**: **Warn-level in v1.** `TODO_<hint>` is canonical; bare `TODO` for ports is unusual but not blocking.
5. **`_plan_*` on non-tool steps** (subworkflow / pause / pick_value): **Allowed in v1.** Simplifies the schema-salad modeling; may tighten later once we see usage.
6. **Schema strategy** (spec L107): **Model upstream in gxformat2** with an explicit `TodoSentinel` schema-salad type and `_plan_*` as optional fields on `WorkflowStep`. **Publish a sibling `format2-draft.schema.json`** alongside the existing `format2.schema.json` for non-Python consumers (VS Code, external tooling). Regenerate the TS Effect schema via `make sync`.
7. **Concrete-subset propagation policy default**: **Strict — cascade-drop transitive dependents** with a warning.
8. **`gxwf validate` (concrete validator) on a draft file**: **Fails as today.** No auto-route, no hint logic. Draft files must be invoked through `draft-validate` explicitly.
9. **`gxwf lint` on draft files**: **Skip with a clear "this is a draft" message in v1.** Many best-practice rules don't make sense pre-wrapper.
10. **`_draft-extract` exit code when output is empty**: **`0`** — empty extract is a valid stage of the agent loop.

### Implementation-level (we choose)

- CLI shape: flat (`gxwf draft-validate`, `gxwf draft-next-step`, `gxwf _draft-extract`). Matches Python style.
- Single-file only for v1, no tree variants.
- Output shape: JSON-first, markdown via Jinja/Nunjucks (defer markdown templates).
- `_plan_*` field strings: no validation in v1 — pure passthrough.
- Effect schema regen: relies on workstream A landing in upstream gxformat2 first; fallback is a post-codegen augmentation in the TS monorepo.
- Report models: add `SingleDraftValidationReport`, `NextStepSuggestion`, `DraftExtractReport` to `packages/schema/src/workflow/report-models.ts`. Snake_case fields per existing convention (pre-pave Python parity).
- Raw-string item conventions in `work[]`: **prompt-shaped** — `TODO[<location>]: <description>` for sentinels; `<field_name>: <verbatim text>` for plan fields. Stable order: tool_id → tool_version → in ports → out ports → _plan_state → _plan_context → _plan_in → _plan_out. See INDEX.md workstream D for the exact convention.

### v2-deferred (out of scope)

- Structured `_plan_state` / `_plan_context` / `_plan_in` / `_plan_out` shapes (spec L104-106).
- Type-aware connection validation on the concrete subgraph.
- Tree variants (`*-tree`) for the draft commands.
- Tests file draft format.
- Recursive concrete-subset (shrink subworkflows in place).
- "Diff between two drafts" (progress over time) — likely a separate command.
- HTML output via Nunjucks (per GXWF_AGENT.md, planned but not implemented anywhere yet).
- Integration with `discover-shed-tool` mold to actually pick a wrapper given a `_plan_state`.

## 7. Recommended v1 scope

The **minimum** to unblock the Foundry agent loop (template Mold → per-step implementation Mold):

### Ship in v1

1. **`gxwf draft-validate <file>`**
   - Sibling Effect schema (or augmented existing schema; see Open Q6) that relaxes wrapper-tier; allows `_plan_*`.
   - All MUST checks from §2 (structural skeleton + concrete topology + syntactic edge resolution).
   - MAY-checks for `_plan_*` placement (warn-level), with strict-mode error if `_plan_*` on concrete step per user decision.
   - Strip-readiness preview enumerating remaining TODOs + `_plan_*`.
   - JSON + text output. Markdown via the same Jinja/Nunjucks infra used for `state-validate`.
2. **`gxwf draft-next-step <file>`**
   - Topological walk, first needs-work step.
   - `work[]` as raw strings (v1 shape per user decision).
   - Subworkflow-aware `step:` path arrays.
   - JSON output (markdown nice-to-have).
   - Idempotent, deterministic tie-break.
3. **`gxwf _draft-concrete-subset <file>`**
   - Strict propagation policy (drop dependents-on-TODO with warning).
   - Subworkflow recursion in scope (per user decision on subworkflows v1).
   - Drops dangling `outputs[]` entries.
   - Emits gxformat2 YAML to stdout; sidecar JSON report of drops.

### Defer

- Type-aware connection checks on subgraph.
- Structured `_plan_*` shapes.
- Tree variants.
- Draft `*-tests.yml`.

### Cross-cutting

- Add `report-models.ts` entries; mirror in Python `_report_models.py` per GXWF_AGENT.md convention.
- Markdown templates under `templates/reports/` (TS side: Nunjucks).
- New declarative YAML fixtures under `packages/cli/test/fixtures/draft/` covering: draft-valid, draft-invalid (dangling edge), concrete-subset with dropped step, next-step on simple chain, next-step on subworkflow, all-concrete (next-step = done).
- Tests for: idempotence of `next-step`, that `draft-validate` ⊇ `state-validate --no-tool-state` on fully-concrete inputs, that `concrete-subset` of a fully-concrete workflow is identity, that `concrete-subset` output passes `state-validate`.

### Why this minimum unblocks the loop

The Foundry agent loop is: template Mold emits a draft → loop picks `next-step` → per-step Mold fills it (via `discover-shed-tool` + tool-cache + wrapper resolution) → repeat → eventually full-concrete → hand off to runnable gxformat2. Steps 1, 2, and 4 (validate, pick next, hand off) are the three v1 commands. Step 3 (the actual filling) is owned by the per-step Mold and discover-shed-tool, **not** by gxwf. Concrete-subset is the bonus that lets the agent run the partially-filled workflow against real Galaxy mid-loop to catch shape errors early — high-leverage, low-cost.
