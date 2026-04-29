# WF_VIZ_2 — Layout Algorithms in CLI + Runtime Renderer Swap in gxwf-ui

Goal: let users swap between Mermaid and Cytoscape views at runtime in `gxwf-ui`, with both renderers honoring the same edge annotations and looking sensible on workflows that lack `position` metadata. Layout strategy is decided at the **CLI / builder layer** with byte-compatible behavior across the TypeScript port and the Python `gxformat2` source-of-truth.

Repos:
- TS: `~/projects/worktrees/galaxy-tool-util/branch/connections`
- Python: `~/projects/worktrees/gxformat2/branch/abstraction_applications`

Predecessors: WF_VIZ_1 (Phase A port + Phase B map/reduce encoding, both shipped).

---

## Motivating problem

Cytoscape's HTML template uses `layout: { name: 'preset' }`, which honors `data.position` exactly. When `position` is absent (most `.gxwf.yml` fixtures, IWC), the Python builder falls back to `(10*i, 10*i)` — workflows render as a useless diagonal line. Mermaid sidesteps this because it auto-lays-out from declaration order, so the renderer-swap UX is asymmetric until cytoscape gets a layout story.

Decision: positioning is a builder/CLI concern, not a UI concern. We pick a strategy that produces the same output from TS and Python so JSON consumers (UI, downstream tools, anyone post-processing workflow viz) see identical bytes.

---

## Strategy: layout name + shared topological fallback

The Cytoscape JSON schema doesn't carry layout intent today — positions are baked in. We extend it minimally:

1. **`--layout <name>`** CLI flag on both `gxwf cytoscapejs` (TS) and `gxformat2 gxwf-viz` (Python). Names match cytoscape.js layout vocabulary: `preset` (default — today's behavior), `topological` (server-side computed; bakes coordinates), `dagre`, `breadthfirst`, `grid`, `cose`, `random`.
2. **Two emission modes:**
   - **Coordinate-baking** (`preset`, `topological`): positions are computed at build time and written into `data.position`. Both languages must produce byte-identical coordinates for a given workflow.
   - **Hint-only** (`dagre`, `breadthfirst`, `grid`, `cose`, `random`): `data.position` is omitted; the JSON gains a top-level `layout: { name: "<n>" }` hint that the HTML template / UI honors at runtime via cytoscape's layout extensions. JSON-only consumers fall back to `topological` if they can't run a layout engine.
3. **`topological`** is the shared, language-agnostic fallback: a tiny longest-path topological layering algorithm (~30 LOC). Specified precisely below so TS and Python round-trip byte-equal.

Why this carve-up:
- `preset` keeps current behavior (don't break Galaxy-exported workflows that already have positions).
- `topological` solves the IWC / positionless-workflow problem without taking on a layout engine dependency in either language.
- `dagre`/`breadthfirst`/etc. are runtime-only — Python doesn't gain a graphviz dep, TS doesn't bundle dagre into the CLI. The HTML template already has Cytoscape; we just change its `layout:` config and lazily inject the relevant extension `<script>`.

---

## Phase 1 — TS: `--layout` flag on `gxwf cytoscapejs` ✅/⏳

**Source of truth for the topological algorithm lives here** (Python copies it).

### 1.1 Spec the topological layering algorithm

In `packages/schema/src/workflow/cytoscape-layout.ts`:

```ts
// Longest-path layering. Each node is placed in column = (max column of any
// upstream node) + 1. Inputs (nodes with no incoming edges) start at column 0.
// Within a column, nodes are ordered by the index they had in the
// CytoscapeElements.nodes array (i.e. NF2 declaration order: inputs first,
// then steps in `nf2.steps` order).
//
// Coordinates: x = column * COL_STRIDE, y = row * ROW_STRIDE.
//   COL_STRIDE = 220
//   ROW_STRIDE = 100
// Both ints. No float math. No randomization.
//
// Edges that reference unknown source nodes are ignored (consistent with
// builder behavior that emits edges before validating).
export function topologicalPositions(elements: CytoscapeElements): Map<string, { x: number; y: number }>;
```

Constants are written into a shared spec doc (`docs/specs/cytoscape-layout.md`) so the Python port has a single reference. Stride values picked once and frozen — changing them is a breaking visual diff.

### 1.2 Plumb `LayoutName` through the builder

`packages/schema/src/workflow/cytoscape.ts`:

```ts
export type LayoutName = "preset" | "topological" | "dagre" | "breadthfirst" | "grid" | "cose" | "random";

export interface CytoscapeOptions {
  edgeAnnotations?: ...;
  layout?: LayoutName;            // default "preset"
}

export interface CytoscapeElements {
  nodes: ...;
  edges: ...;
  layout?: { name: LayoutName };  // present only when layout !== "preset"
}
```

Builder rules (one branch per layout family):
- `preset` (default): keep today's behavior — `data.position` from `step.position` or `(10*i, 10*i)` fallback. No top-level `layout` key. **Byte-identical to today's output.**
- `topological`: compute via `topologicalPositions`, overwrite `data.position` for every node (including inputs). Set `elements.layout = { name: "topological" }` so consumers can tell. (Optional: gate this behind `--layout topological` *and* missing positions vs. always-overwrite. Decision: always-overwrite when flag is set; users opt in explicitly.)
- Hint-only layouts: omit `data.position` from every node; set `elements.layout = { name: <n> }`.

`elementsToList()` continues to flatten nodes+edges; the new `layout` field ships in the **HTML template's substitution context**, not in the flat list. So JSON output gets a wrapper:
```json
{ "elements": [...flat list...], "layout": { "name": "topological" } }
```
**Open Q (P1.A):** does adding the wrapper break Python parity for JSON output? It will until Python mirrors the change. Resolution: the wrapper is only emitted when `--layout` is non-default; default `--layout preset` continues to write a bare list. Python parity then only matters once the user opts in, at which point Python has the same flag.

### 1.3 CLI flag

`packages/cli/src/commands/cytoscapejs.ts`:

```ts
.option(
  "--layout <name>",
  "Layout strategy: preset (default; honors workflow positions), topological (computed leveled layout), dagre, breadthfirst, grid, cose, random",
  "preset",
)
```

Validate against the `LayoutName` union; reject unknowns with a clear error listing valid names.

### 1.4 HTML template

`packages/cli/src/commands/cytoscapejs/cytoscape.html` substitution gains a second token: `$layout` (defaults to `'preset'` if absent). The `cytoscape({...})` call uses `layout: $layout`. For dagre we add a CDN `<script>` for `cytoscape-dagre` and the dagre core; gated by a server-side string interpolation so we don't bloat the template for users on `preset`.

Lazier: ship one template that always includes all CDN scripts (~50KB extra over CDN, cached). Simpler to maintain. **Decision: ship-all-CDNs**, mirror in Python.

CDN bumps: cytoscape 3.33, cytoscape-dagre 2.5, dagre 0.8.5. Document in the same gxformat2 PR that mirrors this work.

### 1.5 Tests

- Unit on `topologicalPositions` with ~5 workflows: linear chain, diamond, fan-out, fan-in, disconnected components. Hard-coded expected coordinates — these are the contract Python must hit.
- Declarative cases in `cytoscape.yml` for `--layout topological` on existing fixtures (assert presence/absence of `position` keys + `layout.name`). Mark `ts_only: true` until Python lands.
- CLI snapshot for `gxwf cytoscapejs --layout topological fixture.gxwf.yml`.

### 1.6 Docs + changeset

- `docs/packages/cli.md`: `--layout` table + algorithm pointer.
- `docs/specs/cytoscape-layout.md`: **new file**, the cross-language algorithm spec.
- `pnpm changeset` minor for `schema` + `cli`.

---

## Phase 2 — Python: mirror `--layout` on `gxformat2 gxwf-viz`

### 2.1 Port the algorithm verbatim from the spec

`gxformat2/cytoscape/_layout.py`:

```python
COL_STRIDE = 220
ROW_STRIDE = 100

def topological_positions(elements: CytoscapeElements) -> dict[str, tuple[int, int]]:
    # Same algorithm as docs/specs/cytoscape-layout.md.
```

### 2.2 Wire into builder

`_builder.py`: `cytoscape_elements(workflow, *, layout: str = "preset")`. Branches mirror TS exactly:
- `preset`: today's path, no `elements.layout` key.
- `topological`: compute, overwrite positions, set `elements.layout = CytoscapeLayout(name="topological")`.
- Hint-only: drop `position`, set `elements.layout`.

`models.py`: add `CytoscapeLayout` Pydantic model + optional `layout` field on `CytoscapeElements`. `to_list()` keeps the flat-list contract; the wrapper only appears in JSON output when layout is non-default — `to_dict()` (new) returns `{"elements": to_list(), "layout": ...}` and `_cli.py` chooses based on `--layout`.

### 2.3 CLI

`_cli.py` argparse gains `--layout` matching the TS choices. Default `preset`. Unknown values fail fast.

### 2.4 Template bump + parity

Sync `cytoscape.html` to the same CDN-bumped, all-extensions-loaded version as TS. Both repos check in identical files; TS has a sync target already (P1's `--layout` work updates the template in TS, then this Phase mirrors).

### 2.5 Tests

- Mirror the 5 unit tests on `topological_positions` with **identical expected coordinates** as TS. This is the parity contract.
- Add a parity test in TS: read a Python-generated `--layout topological` JSON for a known fixture, assert byte-equality with TS output (sync as a golden under `packages/schema/test/fixtures/cytoscape-layout/`). Skip until Python lands.
- Update `cytoscape.yml` declarative cases — drop the `ts_only: true` gate from layout cases.

### 2.6 PR + sync

gxformat2 PR with the spec-doc URL in the description so reviewers can verify algorithm parity. After merge, run `make sync-workflow-expectations` in TS to pick up the un-gated `cytoscape.yml` cases.

---

## Phase 3 — gxwf-ui: runtime renderer swap

Pre-req: Phases 1 + 2 merged so the layout story is consistent across CLI and UI. UI will lean on the same `cytoscapeElements()` from `@galaxy-tool-util/schema` and use cytoscape.js layouts at runtime (so UI doesn't need `topological` — runtime dagre/breadthfirst is better when it's available).

### 3.1 Add cytoscape deps to gxwf-ui

`packages/gxwf-ui/package.json`:
- `cytoscape` (~400KB min+gz)
- `cytoscape-dagre` + `dagre` (for runtime auto-layout)
- `cytoscape-popper` + `tippy.js` + `@popperjs/core` (tooltips, parity with HTML template)

All loaded via dynamic import inside the composable so initial-bundle size is unchanged for users staying on Mermaid.

### 3.2 New `useCytoscape.ts` composable

Mirror of `useMermaid.ts`:

```ts
export function useCytoscape() {
  const elements = ref<CytoscapeElements | null>(null);
  // ...build from fetched workflow content via cytoscapeElements()
  // Pass edgeAnnotations through (see 3.4)
}
```

Uses `cytoscapeElements(parsed, { edgeAnnotations, layout: "preset" })` — the UI runs the layout itself at render time, so we leave coordinates from `preset` alone if present and rely on cytoscape-dagre when they're absent.

### 3.3 `WorkflowDiagram.vue` refactor

- New prop / store-driven `renderer: "mermaid" | "cytoscape"`.
- Toolbar `<SelectButton>` above the canvas to switch.
- Persist choice in `localStorage` (`gxwf-ui:diagram-renderer`).
- Cytoscape branch mounts to a `<div ref="canvas">`, instantiates cytoscape with: `layout: hasPositions(elements) ? { name: 'preset' } : { name: 'dagre', rankDir: 'LR' }`. Auto-detection means users don't have to choose layout in the UI.

### 3.4 Edge annotation threading (both renderers)

Today `useMermaid` doesn't pass `edgeAnnotations` to `workflowToMermaid`. Fix:

1. New backend route `POST /workflows/{path}/edge-annotations` in gxwf-web (`router.ts` + `workflows.ts::operateEdgeAnnotations`) that runs `resolveEdgeAnnotationsWithCache` against the server's existing `ToolCache` and returns the annotation map as a JSON object (`Record<string, EdgeAnnotation>`).
2. `resolveEdgeAnnotations` in `cli/src/commands/annotate-connections.ts` is split: the existing CLI entry point still owns its own Node tool-cache, and a new `resolveEdgeAnnotationsWithCache(data, cache)` is exported for callers (gxwf-web) that already have a `ToolCache`. Both are re-exported from `@galaxy-tool-util/cli`.
3. New composable `useEdgeAnnotations()` calls the route with `fetch` and reconstructs a `Map<string, EdgeAnnotation>` from the response. No client-side validator wiring — the browser bundle no longer pulls in `@galaxy-tool-util/connection-validation`.
4. `useMermaid` accepts an optional `edgeAnnotations` ref; passes through to `workflowToMermaid({ edgeAnnotations })`.
5. `useCytoscape` does the same.
6. Toolbar gets a "Show map/reduce" toggle (off by default to match CLI). Toggling re-runs `build()` with annotations attached. Persist in `localStorage` (`gxwf-ui:diagram-annotate`).

Why server-side: the validator's annotations only become meaningful when tool input/output specs are available — without them, `mapDepth` stays 0 and `reduction` stays false on every tool→tool edge, and the toggle is functionally a no-op. The server already loads tools via `makeNodeToolInfoService`, so reusing that cache gives full fidelity for free. The browser-side path was prototyped first with a no-op `GetToolInfo` and rejected once it became clear it produced empty annotation maps for IWC-style workflows (no labels alone are enough; the input collection-type metadata lives in `ParsedTool`).

### 3.5 Theming

Mermaid re-init handles dark mode. Cytoscape doesn't:
- Build a `cytoscapeStyle(theme: "light" | "dark"): cytoscape.Stylesheet[]` helper colocated with the composable.
- Watch `document.documentElement.classList` (mirrors mermaid's pattern). On change, call `cy.style().fromJson(newStyle).update()` — no remount.
- Style picks colors from the CSS variable surface (`--p-content-background`, `--p-text-color`, etc.) where possible; explicit fallbacks otherwise.
- Edge-annotation classes (`mapover_<n>`, `reduction`) get theme-aware widths/colors in both stylesheets.

### 3.6 Tests

- Vitest: composable smoke tests for `useCytoscape` (mock `cytoscape` import).
- Vitest: theme switch updates the stylesheet (assert `cy.style` was called with the dark variant).
- Manual: walk through IWC workflows in the dev instance with both renderers, light + dark, annotations on + off. Document in the changeset.

### 3.7 Docs + changeset

- Update CLAUDE.md dev-server section if any new env var.
- `pnpm changeset` minor for `gxwf-ui`, `gxwf-web`, and `cli` (new exported helper).

---

## Phase 4 — convergence cleanup

- File a galaxyproject/galaxy issue asking the workflow editor / runner to also surface the `layout` hint when it consumes cytoscape JSON (low priority; out of scope here).
- Once Python ships Phase 2 and TS de-gates the declarative cases, drop `ts_only: true` annotations from `cytoscape.yml`.
- Decide whether `topological` should become the default for positionless workflows in `preset` mode (i.e. swap `(10*i, 10*i)` for the leveled layout). Defer until both CLIs have soaked.

---

## Suggested commit slices

**Phase 1** (TS)
1. `cytoscape: spec topological layout (docs + algo)`
2. `cytoscape: thread LayoutName through builder + emit layout hint`
3. `cli: --layout flag on gxwf cytoscapejs`
4. `cytoscape: HTML template — load layout extensions, honor $layout`
5. `tests: topological coordinates + cli snapshot`
6. `docs/changeset: --layout`

**Phase 2** (Python)
1. `cytoscape: port topological layout from spec`
2. `cytoscape: --layout flag + layout-aware emission`
3. `cytoscape: bump CDN + load extensions`
4. `tests: parity with TS coordinates`

**Phase 3** (UI)
1. `gxwf-ui: useCytoscape composable + cytoscape deps`
2. `gxwf-ui: renderer toggle in WorkflowDiagram`
3. `cli: export resolveEdgeAnnotationsWithCache for reuse`
4. `gxwf-web: edge-annotations endpoint (operateEdgeAnnotations)`
5. `gxwf-ui: useEdgeAnnotations + thread edgeAnnotations into useMermaid + useCytoscape + toolbar toggle`
6. `gxwf-ui: dark/light cytoscape stylesheet + shared useTheme`
7. `docs/changeset: runtime renderer swap`

---

## Test strategy summary

- Phase 1: hand-curated coordinate assertions for `topologicalPositions` form the cross-language contract.
- Phase 2: identical coordinates re-asserted in Python, plus a sync'd JSON golden fixture round-tripped between languages.
- Phase 3: Vitest smoke + manual dev-server pass; no new declarative harness work because the UI consumes the same builder output that Phase 1/2 already cover.
- Throughout: no regression on existing `cytoscape.yml` / `mermaid.yml` declarative suites — `--layout preset` and no-annotations stay byte-identical to today.

---

## Risks / things to verify

1. **Wrapper-vs-flat-list JSON shape change.** Emitting `{elements, layout}` instead of a bare list when `--layout != preset` is a breaking change for any external consumer that calls `gxformat2 gxwf-viz` and expects a flat list. Mitigation: gate the wrapper strictly on non-default layout. Document in both CLI helps.
2. **Coordinate parity drift.** Any post-merge tweak to stride constants or tie-breaking in either language silently desyncs the JSON. Mitigation: spec doc is normative; PR template references it; CI parity test catches regressions.
3. **Disconnected components.** Topological layering on a forest needs deterministic ordering between roots — spec must pin this (proposal: roots in NF2 declaration order; row counter is global, not per-component, so components stack vertically).
4. **Cycle handling.** Galaxy workflows are DAGs by construction, but malformed inputs exist. Spec: cycles → fall back to declaration-index column (i.e. assign `column = node_index` for any node not reachable via topo sort). Don't crash.
5. **CDN extension loading in standalone HTML.** If a user opens `output.html` offline, dagre won't load and cytoscape will error. Mitigation: catch the layout error in the template's bootstrap, fall back to `preset` with declaration-order positions, surface a warning banner.
6. **gxwf-ui bundle size.** Cytoscape + dagre + popper + tippy is ~600KB. Strict dynamic import, gated on the user opening the cytoscape view.
7. **Edge annotations endpoint authentication.** gxwf-web is local-dev-only today; if it ever becomes shared, the new endpoint inherits whatever auth surface gxwf-web has. Note for follow-up but not a blocker.

---

## Resolved up-front

- **Layout names** match cytoscape.js vocabulary so the hint is meaningful to anyone who knows cytoscape.
- **Coordinate-baking vs. hint-only** carve-up keeps Python free of layout-engine deps.
- **`preset` stays default** — no silent change to existing fixtures or downstream tools.
- **TS ships first**, Python mirrors against the spec doc.

## Unresolved questions

- Strides 220/100 — pin to current proposal or measure against IWC's typical workflow density first?
- Should `topological` always overwrite `position`, or only when `position` is missing? (Plan: always overwrite when flag set.)
- For the UI auto-detect, `dagre` rankDir: `LR` or `TB`? Galaxy's editor uses LR-ish; mermaid's `flowchart TD` is top-down — pick one and document.
- Disconnected-components stacking direction in `topological` — vertical stack (proposed) vs. horizontal? Vertical keeps column counters simple.
- Cytoscape extension delivery in `gxwf-ui`: bundle via npm or CDN-load to mirror the standalone HTML? Bundling = reproducible offline; CDN = same bytes as standalone HTML. Lean bundle.
