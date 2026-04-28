# WF_VIZ_1 — Cytoscape.js Port + Map/Reduce Encoding for Mermaid & Cytoscape

Goal: port gxformat2's `gxwf-viz` (Cytoscape.js JSON + standalone HTML) into the TS monorepo as a new `gxwf cytoscapejs` subcommand, then thread connection-validation map-over / reduction info into both the Mermaid and the new Cytoscape emitters and encode it visually.

Two phases. Phase A is the port (no map/reduce yet — keep parity with Python first so fixtures are comparable). Phase B layers map/reduce encoding onto both emitters.

**Status: both phases shipped.** Phase A landed in `e0ae7ec9` (Apr 27). Phase B landed in `daa6d39c` (Apr 27).

---

## Discoveries log (2026-04-27)

- **`tests/examples/cytoscape/` in gxformat2 is gitignored.** Originally assumed to be a 100+ fixture golden set; it's actually test-run scratch (the leaky `test_interop_generation` was producing one `tmp*.gxwf.*` pair per pytest run). No committed `.cytoscape.json` golden set exists upstream. Implication: A6 doesn't need a sidecar-golden sync target; declarative parity via `cytoscape.yml` (mirroring how mermaid does it) covers the full need. Leaky test fixed in gxformat2 PR #196.
- **gxformat2 PR #194 (mermaid declarative tests) is the model.** It established `gxformat2/examples/expectations/mermaid.yml` consumed by `DeclarativeTestSuite`; the TS repo already syncs that file via `make sync-workflow-expectations` and runs the cases against `workflowToMermaid`. **gxformat2 PR #196 mirrors this exactly for cytoscape** — `cytoscape.yml` with 13 cases plus three ops (`cytoscape_elements_to_list`, `cytoscape_node_ids`, `cytoscape_edge_ids`).
- **TS NF2 fields confirmed present.** `position` and `tool_shed_repository` are already optional fields in `normalized/format2.ts` and `normalized/native.ts`; `doc` and `type_` likewise. No pre-port enrichment commit needed.
- **Python builder has a latent inconsistency.** `_step_node` strips the `toolshed.g2.bx.psu.edu/repos/` prefix from `tool_id` for the fallback label only; the emitted `data.tool_id` field keeps the unstripped value. The TS port should match this (don't silently fix it here) — preserve byte-parity now, file an issue if you want to clean it up later.

---

## Source-of-truth pointers

- Python cytoscape: `gxformat2/branch/abstraction_applications/gxformat2/cytoscape/{__init__,_builder,_cli,_render,models}.py`, `cytoscape.html`, tests/test_cytoscape.py.
- Python declarative coverage: `gxformat2/examples/expectations/cytoscape.yml` (added in galaxyproject/gxformat2#196 — mirrors mermaid #194). `tests/examples/cytoscape/` is **gitignored** test-run scratch — there is no committed `.cytoscape.json` golden set in gxformat2. The TS port verifies parity by running the synced `cytoscape.yml` against its own builder, not by byte-comparing JSON files.
- Existing TS Mermaid: `packages/schema/src/workflow/mermaid.ts`, CLI `packages/cli/src/commands/mermaid.ts`, fixtures `packages/schema/test/fixtures/expectations/mermaid.yml`.
- Connection results carrying map-over: `packages/connection-validation/src/types.ts` — `StepConnectionResult.mapOver`, `ConnectionValidationResult.mapping`. Reduction is currently an internal branch in `connection-validator.ts:212+` and is *not* surfaced in the result. Phase B-0 adds that.
- Convergence context: `GXWF_AGENT.md`; old plan `old/GXWF_CLI_PLAN.md` documents `gxwf-viz` as Python pass-through. We're now bringing the visualization native into TS.

Naming: command is `gxwf cytoscapejs` (per ask). Internal package surface is `cytoscape` to match the Python module.

---

## Phase A — Port `gxwf-viz` to TS as `gxwf cytoscapejs` ✅

**Done in `e0ae7ec9`.** A1–A7 all landed; A8 (file gxformat2 issue to switch `gxwf viz` from subprocess to in-process call) deferred — separate Python PR, optional.

A red→green workflow with fixtures imported from gxformat2 as the ground truth.

### A1. Decide the package home

Options:
1. New `packages/workflow-viz/` (parallel to `connection-validation`).
2. Add to existing `packages/schema/src/workflow/cytoscape.ts` next to `mermaid.ts`.

**Decided: #2 — `packages/schema/src/workflow/cytoscape.ts` for the builder + models; `packages/cli/src/commands/cytoscapejs/` for the HTML template + render fn.** The Python module is ~150 LOC builder + ~130 LOC HTML template — no reason to spin a package up front. Co-locating with `mermaid.ts` keeps the "workflow → diagram" emitters in one place and reuses `ensureFormat2` / `resolveSourceReference`. HTML render is a CLI-only concern; downstream consumers don't need to ship the template.

### A2. Port the Pydantic models → Effect Schema (or plain TS interfaces)

`gxformat2/cytoscape/models.py` defines `CytoscapePosition`, `CytoscapeNodeData`, `CytoscapeEdgeData`, `CytoscapeNode`, `CytoscapeEdge`, `CytoscapeElements` (with `to_list()`).

- Mirror as `packages/schema/src/workflow/cytoscape-models.ts`. Plain TS interfaces are fine — these are output-only, no validation needed. (Other emitters in this repo don't use Effect Schema for output-only models either.)
- Keep field names snake_case (`tool_id`, `step_type`, `repo_link`) so the JSON is byte-identical to Python's. This is the linchpin that makes the cytoscape JSON fixtures shareable.
- Provide `elementsToList(els): (Node|Edge)[]` mirroring Python's `to_list()`.

### A3. Port the builder

Create `packages/schema/src/workflow/cytoscape.ts`:

- `cytoscapeElements(workflow): CytoscapeElements`
- Same input shape acceptance as `workflowToMermaid` — already-normalized NF2 *or* raw via `ensureFormat2`.
- Port `_input_node`, `_step_node`, `_step_edges` 1:1.
- Position handling: Python uses `step.position.left/top` cast to int, falls back to `(10*i, 10*i)`.
- Tool shed repo link: only present if `step.tool_shed_repository` is populated.

**Resolved**: TS NF2 carries everything we need. `position` and `tool_shed_repository` are both `Schema.optional` in `packages/schema/src/workflow/normalized/format2.ts` (lines 60, 100, 114) and `normalized/native.ts` (lines 63, 66). `doc` and `type_` (→ `step_type`) are also present. No NF2 enrichment commit is needed.

Edge-id format must match Python byte-for-byte: `f"{step_id}__{input_id}__from__{ref.step_label}"`, and `output` is `null` when the resolved source's output name is `"output"` (the default). Don't camelCase these.

### A4. Port the HTML render

- Copy `gxformat2/cytoscape/cytoscape.html` verbatim into `packages/cli/src/commands/cytoscapejs/template.html` (CDN script tags, tippy popper, preset layout).
- TS render fn: `renderHtml(elements): string` — read template at build time. Two options:
  1. Read at runtime via `fileURLToPath(import.meta.url)` + `readFile`.
  2. Inline as a string constant (eslint config allows long strings; the file is 128 lines).
  Lean toward (1) for editability.
- Substitution: Python uses `string.Template.safe_substitute(elements=...)`. JS equivalent: `template.replace("$elements", JSON.stringify(elementsToList(els)))`. Make sure the template's only `$`-prefixed token is `$elements` (it is, per inspection).

### A5. CLI wiring

Add `packages/cli/src/commands/cytoscapejs.ts`:

```
gxwf cytoscapejs <file> [output]
  --html       # force HTML output (default if [output] ends with .html)
  --json       # force JSON output (default if .json or stdout)
```

Mirror `mermaid.ts` shape. If `output` omitted: stdout JSON. If output ends `.html`: HTML render. Add to `gxwf.ts` like the existing `mermaid` command.

**Decided: stdout-JSON when no output path is given.** Document the divergence from Python (which writes `.html` next to input) in the changeset. Matches the `mermaid` CLI norm.

### A6. Fixtures + tests (red→green, declarative)

**Approach decided after gxformat2 PR #196 landed.** No sidecar `.cytoscape.json` goldens, no new sync target. The Python side ships `gxformat2/examples/expectations/cytoscape.yml` (13 declarative cases) consumed by `DeclarativeTestSuite`. The TS port runs the **same YAML** against its own builder; parity is enforced by the assertions, not by byte-equal JSON files.

Steps:
1. **No new Makefile target.** `cytoscape.yml` will sync automatically with the next `make sync-workflow-expectations` (the existing `workflow-expectations` group in `scripts/sync-manifest.json` already globs `*.yml` from `gxformat2/examples/expectations/`).
2. Verify the synced `cytoscape.yml` lands at `packages/schema/test/fixtures/expectations/cytoscape.yml` and that the existing declarative harness (the one driving `mermaid.yml`) picks it up automatically.
3. Implement TS counterparts for the three operations registered in `tests/test_interop_tests.py`:
   - `cytoscape_elements_to_list` — flat list of dicts in cytoscape.js shape
   - `cytoscape_node_ids` — `[el.data.id for el in nodes]`
   - `cytoscape_edge_ids` — `[el.data.id for el in edges]`
   These plug into the harness alongside `workflow_to_mermaid` etc.
4. Hand-written: one tiny test for `renderHtml` that asserts the HTML contains `</body>` and `cytoscape` (mirrors Python's `test_render_html`).

**Limitation of the harness's `path` navigation**: the `{field: value}` finder uses `getattr`, which doesn't work on plain dicts (only on Pydantic-style models with attribute access). Index-based paths like `[2, "data", "id"]` work fine on the list-of-dicts output. Plan accordingly when adding new cases.

**Nullable fields**: for keys like `tool_id: null` and edge `output: null`, use `value: null` (YAML's null → Python None / JS null). `value_absent: true` checks whether the path *resolves*, not whether the value is null — these keys are always present in the dict.

Hard constraint: **TS output shape must match Python byte-for-byte** for the unannotated cases (snake_case fields, edge-id format, `output: null` convention). If they don't, that's a normalization bug to fix in NF2, not a reason to relax assertions.

### A7. Docs + changeset

- Update `docs/packages/cli.md` with `cytoscapejs` examples.
- Update `docs/packages/schema.md` for `cytoscapeElements` / `renderHtml` exports.
- `pnpm changeset` — minor bumps for `schema` + `cli`.

### A8. Convergence note (optional but cheap)

The old `GXWF_CLI_PLAN.md` documents Python's `gxwf` as a subprocess pass-through to `gxwf-viz`. Once the TS `gxwf cytoscapejs` lands, the Python `gxwf viz` should switch from subprocess pass-through to a direct in-process call to `gxformat2.cytoscape.main(...)` — that's a separate small Python PR and not in scope here, but file an issue so we track convergence.

---

## Phase B — Map / Reduce Encoding ✅

**Done in `daa6d39c`.** All steps B0–B6 implemented. Deviations and notes summarized at the end of this section.

Pre-req: Phase A merged so we have both emitters speaking the same node/edge model.

### B0. Surface reductions in the connection-validation result

Today `StepConnectionResult.mapOver` exists, but reductions are detected and consumed inside `_validateConnection` without leaving a trace on `ConnectionValidationResult`. Add:

```ts
interface ConnectionValidationResult {
  ...
  reduction?: boolean;          // true if this connection reduced (list-like → multi=true)
  mapDepth?: number;            // 0 = scalar passthrough, 1 = list, 2 = list:paired, ...
}
```

`mapDepth` is derivable from `mapping` (count colons + 1 when set, 0 otherwise) — make it the canonical field for downstream emitters; `mapping` stays for human-readable text.

Tasks:
1. Extend the type.
2. Populate from `connection-validator.ts`:
   - At the multi-data reduction branch (line ~212), set `reduction: true`.
   - At map-over success path (line ~227), compute `mapDepth` from `mapOver.collectionType`.
   - Scalar matches: `mapDepth: 0`.
3. Update fixtures under `connection-validation/test/` so the report includes the new fields. Sync from the Python side if it grows the same fields; otherwise this is a TS-only enrichment for now (file a Python parity issue).
4. Update `report-builder.ts` to emit the new fields.

### B1. Common contract: an "edge annotation" type

Both emitters benefit from the same lookup. Add to `packages/connection-validation/src/index.ts`:

```ts
interface EdgeAnnotation {
  sourceStep: string;
  sourceOutput: string;
  targetStep: string;
  targetInput: string;
  mapDepth: number;
  reduction: boolean;
  mapping?: string | null;   // textual, e.g., "list:paired"
}

function buildEdgeAnnotations(report: WorkflowConnectionResult): Map<string, EdgeAnnotation>;
// key format: `${sourceStep}|${sourceOutput}->${targetStep}|${targetInput}`
```

This is what both emitters consume. No emitter imports the validator directly; they both take an *optional* `EdgeAnnotation` map / lookup fn.

### B2. Mermaid: encode at source level

Edit `packages/schema/src/workflow/mermaid.ts`:

```ts
export interface MermaidOptions {
  comments?: boolean;
  edgeAnnotations?: Map<string, EdgeAnnotation>;
}
```

Encoding rules (start simple, document the chosen encoding):

| Annotation | Source emitted |
|---|---|
| `mapDepth === 0`, no reduction | `A --> B` (today's behavior) |
| `mapDepth >= 1`, no reduction | `A ==>|"list"\| B`  (thick + label = collection type) |
| `mapDepth >= 2` | `A ==>\|"list:paired"\| B` (thick + nested label) |
| `reduction === true` | `A -. reduce .-> B` (dotted, labeled) |

Plus an optional `linkStyle N stroke:#888,stroke-width:Npx` line per edge keyed off its declaration index — tracked with a counter while emitting edges. Width grows with `mapDepth` (e.g. `2 + mapDepth`).

Emission stability: declaration order = `linkStyle` index, so we can write one consolidated `linkStyle` block at the bottom. Don't intermix.

Fixture additions:
- New synthetic fixtures under `packages/schema/test/fixtures/` exercising: scalar→tool, list→tool (1-deep map), list:paired→tool (2-deep map), list+multi-data→tool (reduction).
- Expectations in `mermaid.yml` keyed `test_mapover_*` and `test_reduction_*`.
- Confirm existing snapshot tests still pass for the no-annotations path.

### B3. Cytoscape: encode at data + style level

Edit `packages/schema/src/workflow/cytoscape.ts`:

- Extend `CytoscapeEdgeData` with `map_depth: number`, `reduction: boolean`, `mapping?: string | null`.
- Extend `CytoscapeEdge.classes` with auto-derived classes: `mapover_<depth>`, `reduction`. Cytoscape selectors can target these directly.

Edit the HTML template (`cytoscape.html`) to add styles:

```js
{ selector: 'edge.mapover_1', style: { width: 4, 'curve-style': 'bezier' } },
{ selector: 'edge.mapover_2', style: { width: 6 } },
{ selector: 'edge.mapover_3', style: { width: 8 } },
{ selector: 'edge.reduction', style: { 'line-style': 'dashed', 'target-arrow-shape': 'tee' } },
```

For a true *ribbon* effect (multiple parallel strands), use `cytoscape-edge-bundling` or render N parallel bezier edges with stepped `control-point-distances`. Cleanest: for each `mapDepth >= 1`, emit N edges with the same source/target but different `id`s (`<base>__strand_<k>`) and offset `control-point-distances`. The first cut should ship with width-encoding only (single edge); add the multi-strand ribbon as a follow-up flag (`--ribbons` or in-template toggle) once the simple version is validated.

Tooltip update in template: include "Map depth: N" / "Reduction" in the edge-tooltip block.

Fixtures:
- Extend `cytoscape.yml` declarative tests with the same map-over / reduction fixtures used in B2.
- Parity with Python: until Python emits these fields, mark TS-only assertions with a `ts_only: true` flag in the expectation file (introduce that flag if not already supported), so syncing fixtures from gxformat2 doesn't fight the new fields.

### B4. Wire the validator into the CLI emitters

`gxwf cytoscapejs` and `gxwf mermaid` both currently load workflow → emit. Add a flag:

```
--annotate-connections    # run connection validator and encode mapDepth/reduction
```

Off by default to keep existing fixtures stable. When on:

1. Build `WorkflowGraph` (same path `gxwf validate --connections` uses).
2. Run `validateWorkflowConnections`.
3. `buildEdgeAnnotations(report)` → pass to emitter via options.

Add to `gxwf.ts`:

```ts
.option("--annotate-connections", "Encode map-over / reduction info on edges (runs connection validator)")
```

Open Q: should `gxwf validate --connections --report-html` pipe its existing report through the cytoscape view as a richer alternative to the plain HTML report? Probably yes — but that's a separate UI track (`gxwf-report-shell`).

### B5. Tests

- Unit: `buildEdgeAnnotations` over a hand-built `WorkflowConnectionResult` — verify keying, depth, reduction.
- Declarative parity: synthetic fixtures with map-over + reduction → assert annotated mermaid lines and annotated cytoscape JSON.
- CLI snapshot: `gxwf mermaid --annotate-connections fixture.gxwf.yml` and `gxwf cytoscapejs --annotate-connections --html fixture.gxwf.yml`.

### B6. Docs + changeset

- `docs/packages/cli.md` — document `--annotate-connections` and the encoding table for both emitters.
- `docs/packages/connection-validation.md` — document `EdgeAnnotation` and `mapDepth` semantics.
- `pnpm changeset` — minor bumps for `schema`, `cli`, `connection-validation`.

---

## Phase B — what actually shipped (`daa6d39c`)

Single squashed commit (not the 7-commit slice in the section below — pragmatic given the small surface).

- **B0**: `mapDepth` + `reduction` added to `ConnectionValidationResult`; `label` added to `StepConnectionResult`. Surfaced as snake_case `map_depth` / `reduction` / `label` on `ConnectionResult` / `ConnectionStepResult` (optional, TS-only ahead of Python parity). Populated in `connection-validator.ts` (reduction branch + `ok()` helper) and `graph-builder.ts` (label thread-through).
- **B1**: `EdgeAnnotation` declared structurally in **two** places — canonical in `connection-validation/src/edge-annotations.ts` (with `buildEdgeAnnotations`), and a structural duplicate in `schema/src/workflow/edge-annotation.ts`. Schema can't depend on connection-validation (dep chain points the other way), so the emitters consume the type structurally.
- **B2**: `MermaidOptions.edgeAnnotations` threads the lookup. `_renderEdge` chooses `==>|"<mapping>"|` (thick green) for map-over and `-. "reduce" .->` (dashed red) for reductions; consolidated `linkStyle` block emitted at bottom.
- **B3**: `CytoscapeOptions.edgeAnnotations` (new) threads the lookup. Edge data gains optional `map_depth` / `reduction` / `mapping`; classes `mapover_<n>` / `reduction` added when annotated. Default emit (no annotations) stays byte-identical with Python. **Template was edited** with `mapover_*` / `reduction` selectors and tooltip lines — the new selectors are inert when the corresponding classes aren't present, so it's a no-op for unannotated payloads. Plan note 6's "coordinated CDN bump" was already done in upstream gxformat2 PR #197 → synced; this commit only adds the annotation styles. Sync with gxformat2 will drift until upstream mirrors the additions (low priority — both sides emit the same JSON for the unannotated case).
- **B4**: `--annotate-connections` (with `--cache-dir`) on both `gxwf mermaid` and `gxwf cytoscapejs`. New `cli/src/commands/annotate-connections.ts` runs the validator and returns the lookup. `connection-validation.ts` was refactored to expose a shared `buildGetToolInfo` helper (avoids duplicating the cache-priming dance).
- **B5**: tests added — `connection-validation/test/edge-annotations.test.ts` (unit on `buildEdgeAnnotations`), `connection-validation/test/map-depth-reduction.test.ts` (fixture-driven assertions on populated fields), `schema/test/edge-annotations.test.ts` (mermaid + cytoscape emitter behavior with and without annotations). 35 connection-validation tests, 4673 schema tests, 195 cli tests pass; `make check` clean.
- **B6**: `docs/packages/cli.md` updated with the encoding tables; changeset at `.changeset/edge-annotations.md`. `connection-validation` doesn't have a docs page yet so the planned `docs/packages/connection-validation.md` update was skipped.

### Loose ends / follow-ups

- File a galaxyproject/galaxy issue to add `map_depth` + `reduction` to Python's `ConnectionValidationResult` / `_report_models.ConnectionResult` (~25 LOC). Until then, the TS report has fields Python doesn't.
- Mirror the cytoscape template additions (`mapover_*` / `reduction` selectors + tooltip lines) into a gxformat2 PR so the synced template stops drifting. No-op for Python — purely keeps the sync clean.
- B7 (multi-strand "ribbon" rendering) — deferred per plan; revisit after real usage of width-encoding.

---

## Suggested commit/PR layout

Squashable into one PR per phase, but the natural commit slices:

**Phase A**
1. `cytoscape: port models + builder`
2. `cytoscape: HTML render + template`
3. `cli: add gxwf cytoscapejs command`
4. `cytoscape: sync fixtures from gxformat2 + parity tests`
5. `docs/changeset: cytoscapejs CLI`

**Phase B**
1. `connection-validation: surface reductions + mapDepth on result`
2. `connection-validation: buildEdgeAnnotations helper`
3. `mermaid: encode mapDepth/reduction (option-gated)`
4. `cytoscape: encode mapDepth/reduction on edge data + classes + style`
5. `cli: --annotate-connections flag wires validator into both emitters`
6. `fixtures: synthetic map/reduce coverage for both emitters`
7. `docs/changeset: edge annotation encoding`

---

## Test strategy summary (matching the project's red→green declarative norm)

- **Phase A**: parity-driven. Every new TS fixture has a paired golden JSON synced from Python; CI fails if they diverge.
- **Phase B**: synthesis-driven for now. Python doesn't emit `map_depth`/`reduction` yet, so these are TS-only fixtures with hand-curated expectations. File a parity issue against gxformat2 to mirror later.
- Keep hand-written unit tests sparse — only for the helpers (`buildEdgeAnnotations`, `_input_type_str`-equivalent). Everything else goes through the declarative harness.

---

## Risks / things to verify before coding

1. ~~**NF2 field coverage.**~~ **Resolved**: TS NF2 already carries `tool_shed_repository`, `position`, `doc`, and `type_` (→ `step_type`).
2. **Snake_case vs camelCase.** Cytoscape JSON must be snake_case to match Python and to interop with the existing HTML template. Be deliberate about not letting the project's general camelCase convention bleed into the output models.
3. ~~**Fixture drift.**~~ **No longer applies**: there is no committed `.cytoscape.json` golden set in gxformat2 (`tests/examples/cytoscape/` is gitignored). Parity is enforced via the synced `cytoscape.yml` declarative cases instead.
4. **Reduction detection completeness.** The validator detects multi-data reductions (`connection-validator.ts:212`); verify there's no other reduction case (e.g. element-identifier, scalar-from-collection) currently silently handled. If there is, B0 must capture them all.
5. **Mermaid label escaping.** Adding `|"list:paired"|` labels — confirm `sanitizeLabel` is applied, since `:` and `"` matter to Mermaid parsers.
6. **HTML template CDN.** Python pins to old versions (cytoscape 3.9.4, tippy 4.0.1, popper 1.14.7, cytoscape-popper 1.0.4). Bumping is a separate gxformat2 PR — the TS port should sync the template as-is via `scripts/sync-manifest.json` (new group `cytoscape-template` pointing at `gxformat2/cytoscape/cytoscape.html`) so the template never forks.
7. **Nullable-key gotcha in the declarative harness.** `value_absent: true` checks whether the path *resolves*, not whether the value is null. For `tool_id`/`output`/`doc`/`repo_link` (always present, sometimes null), use `value: null` not `value_absent`.

---

## Resolved questions (post-discovery)

- ~~Pkg location for builder~~: **`packages/schema/src/workflow/cytoscape.ts`**.
- ~~HTML template location~~: **`packages/cli/src/commands/cytoscapejs/template.html`**, synced from gxformat2 (don't fork).
- ~~Default output of `gxwf cytoscapejs`~~: **stdout-JSON**, diverging from Python.
- ~~CLI subcommand name~~: **`cytoscapejs`** (per user ask).
- ~~Sync goldens vs. declarative parity~~: **declarative** — sync `cytoscape.yml` like `mermaid.yml`, no sidecar JSON.
- ~~NF2 field coverage~~: TS NF2 already has `position`, `tool_shed_repository`, `doc`, `type_`.

## Unresolved questions

- ~~True ribbon (multi-strand) rendering: ship in B3 or as B7 follow-up?~~ **Decided: B7 follow-up.** B3 ships single-edge width-encoding only; ribbons land behind a flag once the simple encoding is validated against real workflows.
- ~~`--annotate-connections` default?~~ Removed — opt-in for at least one release cycle is the standing decision; revisit after real usage.
- ~~Python parity for `map_depth`/`reduction` fields~~ **Decided** (see `WF_VIZ_1_RESEARCH_PARITY_CDN.md`): file low-priority galaxy issue to add the two fields to `ConnectionValidationResult` + `ConnectionResult` (~25 LOC; `connection_validation.py:52,236,266`, `_report_models.py:129`). Defer gxformat2 builder enrichment until TS Phase B encoding stabilizes. Don't block B0.
- ~~CDN bump for `cytoscape.html`~~ **Decided** (see `WF_VIZ_1_RESEARCH_PARITY_CDN.md`): leave pinned. Sync template verbatim. If we touch the template in B3 (adding `mapover_*` / `reduction` selectors), fold a coordinated bump (cytoscape 3.33 + cytoscape-popper 2 + @popperjs/core 2 + tippy 6, ~30min) into that edit. No standalone issue.
