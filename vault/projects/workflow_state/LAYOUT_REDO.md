# Layout Redo: property-tested layered layout for `gxwf-layout`

**Repo:** `gxformat2` · **Branch:** `layout` (already has the v1 `gxwf-layout` feature committed as `dd231d4`, pushed to `jmchilton/layout`)
**Date:** 2026-06-30
**Scope:** drop the byte-identical cross-language coordinate contract for the *bake* path, replace it with a property-based declarative test contract, and add a second, nicer in-house layout strategy (`layered`, barycenter Sugiyama) alongside the existing `topological`.

---

## Why

`gxwf-layout` (new in this branch) bakes `{left, top}` position records into Format2/native workflow docs, retiring the degenerate `(10*i, 10*i)` diagonal fallback. v1 ships exactly one strategy, `topological`, because it was the only layout that:

1. computes coordinates in pure Python (cytoscape's `dagre`/`cose`/etc. are JS, render-time only — see `cytoscape/_layout.py:bakes_coordinates`), **and**
2. is byte-identical with the TypeScript port (`galaxy-tool-util-ts` cytoscape-layout spec).

`topological` is a strict Kahn topo-sort: column = longest-path depth, row = declaration order within column. It has **no crossing minimization** — legible but plain, more edge crossings than dagre on wide/real (IWC) workflows.

We are **uninterested in byte-identical** for the bake path. Dropping it unlocks a better layout in Python without a lockstep JS port. The cross-language guarantee becomes "both implementations satisfy the same *structural properties*," tested via the existing declarative YAML framework, extended with graph-level predicates.

---

## Decisions locked

- **Go property-based** (declarative option A). Replace coordinate goldens (as the *cross-language contract*) with named structural properties any conforming layered layout must satisfy.
- **Cycles must fail.** Cyclic workflows are invalid in Galaxy (rejected at load). `gxwf-layout` should raise on a cycle, not lay it out. This removes the "monotonicity caveat" — `downstream_right_of_upstream` becomes unconditional.
- **Implement the layered layout ourselves** (barycenter crossing reduction on top of the existing layering) rather than depend on `grandalf`. `grandalf` is the only clean pure-Python Sugiyama import, but it is **lightly maintained (last PyPI release ~0.8, ~2020)**; we already own the layering half, determinism matters and we control it, and zero new deps is preferable. The barycenter-pass source comments **must explicitly note grandalf's apparent unmaintained status** as the rationale for the in-house implementation.
- **Naming:** new strategy is `layered` (or `sugiyama`), **not** `dagre` — calling it `dagre` would falsely imply cytoscape-dagre byte-output. `topological` stays as the simple no-crossing-reduction strategy and the dependency-free default.
- **Keep a few exact-coordinate goldens, but Python-local** (in `tests/test_layout.py`), as single-impl snapshot/regression signal. They are no longer a cross-language obligation.

---

## Architecture

Two contracts, kept cleanly separate:

| Layer | File | Contract |
|---|---|---|
| `topological` coordinate math | `gxformat2/cytoscape/_layout.py` | byte-identical with TS port; **untouched this pass** — cycle policy enforced upstream in the layout module, not here |
| `layered` (barycenter Sugiyama) | `gxformat2/layout/_sugiyama.py` (new) | **not** byte-identical; validated by structural properties only |
| property checkers | `gxformat2/testing.py` (extended) | language-agnostic spec; each language reimplements checkers |

`gxformat2/layout/_builder.py:layout_positions()` dispatches on `strategy`:
- `topological` → `cytoscape.topological_positions(elements)` (existing path)
- `layered` → `gxformat2.layout._sugiyama.layered_positions(elements)` (new)

Both reuse `cytoscape_elements(nf2, layout="preset")` for node/edge extraction, so there is one node-id + edge derivation, not a third (continues the single-source theme from the v1 review).

---

## Work breakdown (red → green per phase)

### Phase 1 — Cycles fail (cycle policy lives in `gxformat2/layout`, cytoscape untouched)
- **Decision (Q1):** detect cycles in the **layout module**, leave `cytoscape/_layout.py:topological_positions` (and its viz fallback) untouched. Avoids a lockstep change to the byte-identical TS-mirrored file, keeps `gxwf-viz` resilient on malformed input (a visualization tool arguably *should* still render a best-effort diagonal for a cyclic graph), and puts "must fail" exactly where it matters — the bake path that would otherwise write garbage positions.
- **Add** `gxformat2/layout/_sugiyama.py` (or a small `_layering.py`) with a shared longest-path layering routine that **raises `LayoutCycleError`** when `len(visited) != len(node_ids)` after the Kahn sweep. New exception in `gxformat2/layout/`.
- **`layout_positions()` runs cycle detection up front for *both* strategies.** For `topological`, detect-and-raise first, then call cytoscape's existing `topological_positions` (now guaranteed acyclic, so its fallback branch is never reached). For `layered`, the shared layering raises directly.
- **Red:** add synthetic cyclic fixture (`synthetic-cycle.gxwf.yml`) + declarative case `expect_error: true` on `layout_format2`; today it silently lays out a diagonal instead of raising.
- **Green:** raise; case passes. Also imperative `pytest.raises(LayoutCycleError)` in `test_layout.py`.

### Phase 2 — `graph_property` assertion category in `testing.py`
- **Extend** `gxformat2/testing.py`: add `graph_properties: List[str]` to `TestCase` (or a sibling list of `{property: name}` assertions). Each name maps to a registered checker `(result) -> None` (raises `AssertionError` on violation).
- Checker inputs: the operation result (laid-out workflow dict). Derive **edges** via `cytoscape_elements(result, layout="preset")` (reliable node-id-keyed source→target), and **positions** by reading each node's `position` from the doc (keyed by the same node ids). Do **not** trust cytoscape preset to synthesize positions for `all_nodes_positioned`.
- **Checkers (the cross-language contract):**
  - `downstream_right_of_upstream` — for every edge, `target.left > source.left` (strict). Core layered-layout correctness.
  - `all_nodes_positioned` — every input/step in the doc has a `position`. (Also catches v1 review finding #4, silent-skip-on-id-mismatch, for free.)
  - `no_position_collisions` — no two nodes share identical `{left, top}`.
  - `roots_leftmost` — nodes with no incoming edge are at `min(left)` (== 0).
- **`deterministic` is NOT a graph_property** (needs two runs) → test imperatively in `test_layout.py` instead. *(Open Q2.)*
- **Red:** write the four checkers' tests against a deliberately-broken stub layout (e.g. a layout that returns column-0 for everything) → violations fire.
- **Green:** real layouts pass.

### Phase 3 — `layered` strategy (in-house barycenter Sugiyama)
- **New** `gxformat2/layout/_sugiyama.py:layered_positions(elements) -> dict[str, CytoscapePosition]`.
- Algorithm (Sugiyama, phases mapped to what we have):
  1. *Cycle removal* — N/A (Phase 1 already raises).
  2. *Layer assignment* — reuse longest-path layering (`column = max(source col)+1`), same as topological.
  3. **Crossing minimization** — barycenter/median heuristic: sweep layer-by-layer (down then up), order each free layer by the mean ordinal position of its fixed-layer neighbors; repeat N sweeps keeping the best crossing count; optional adjacent-swap transpose. ~100–150 lines. **Deterministic** (fixed input order, stable tie-breaks on declaration index).
  4. *Coordinate assignment* — **Decision (Q3): ship the simple pass first** — order-index × `ROW_STRIDE` within layer (reuse strides 220/100). The four properties don't require nudging (they hold for ordered rows); priority/barycenter nudging toward neighbor mean is pure aesthetics and a later follow-up that won't change the property contract.
- **Comments requirement:** module docstring + the barycenter function comment state plainly that this exists in-house because `grandalf` (the pure-Python Sugiyama lib) appears unmaintained (~2020), and that we already owned the layering half.
- **Wire** `_builder.py:layout_positions` to dispatch `layered`; add `"layered"` to `_cli.py` `--strategy` choices and the v1 hardcoded `choices=["topological"]`.
- **Red:** declarative property cases for `layered` on a fixture that *has* crossings under topological → assert the four properties hold.
- **Green:** algorithm satisfies them. Add a Python-local exact-coordinate golden in `test_layout.py` for one small `layered` case.

### Phase 4 — Rewrite `expectations/layout.yml` to properties
- **Decision (Q4): separate named operations, no runner change.** The runner calls `operation(fixture)` with one arg and `TestCase` has no `params` field; adding `params:` would change the runner signature and every op. Instead register `layout_layered_format2` / `layout_layered_native` in `tests/test_interop_tests.py` alongside the existing `layout_format2` / `layout_native` (which stay `topological`-by-default). Matches the established named-operation style (`to_native`, `validate_format2_strict`, …).
- Convert existing `layout_basic_format2` / `layout_chain_format2` / `layout_basic_native` from exact `value:` coordinate assertions to `graph_properties:`, and add parallel `_layered` cases.
- Move a couple of exact-coordinate snapshots into `tests/test_layout.py` (Python-local).
- Add the cyclic `expect_error` case from Phase 1.

### Phase 5 — Docs + lint/type/test sweep
- Update `docs/cli_layout.rst` (argparse autodoc picks up the new `--strategy` choice automatically; add prose on `topological` vs `layered`).
- Catalog: register any new fixtures (`synthetic-cycle`, a crossing-heavy fixture) in `gxformat2/examples/catalog.yml` with `tests/test_layout.py` + `tests/test_interop_tests.py`.
- Run: `pytest tests/`, `ruff`, `flake8`, `black --check`, `mypy gxformat2`.

---

## Files touched

| File | Change |
|---|---|
| `gxformat2/cytoscape/_layout.py` | **untouched** (Q1) — keeps its viz fallback + TS byte-identical contract |
| `gxformat2/layout/_sugiyama.py` | **new** — shared layering (raises `LayoutCycleError`) + barycenter `layered_positions`; grandalf-unmaintained comment |
| `gxformat2/layout/_builder.py` | up-front cycle detection for both strategies; dispatch `layered`; `layout_positions` strategy branch |
| `gxformat2/layout/_cli.py` | add `layered` to `--strategy` choices |
| `gxformat2/layout/__init__.py` | export `layered_positions`, `LayoutCycleError` |
| `gxformat2/testing.py` | `graph_properties` assertion category + 4 registered checkers |
| `gxformat2/examples/expectations/layout.yml` | properties instead of exact coords; `_layered` cases; cyclic `expect_error` |
| `tests/test_layout.py` | Python-local exact-coord goldens + determinism + cycle `raises` |
| `tests/test_interop_tests.py` | register `layout_layered_format2` / `layout_layered_native` operations |
| `gxformat2/examples/format2/synthetic-cycle.gxwf.yml` | **new** cyclic fixture |
| `gxformat2/examples/format2/synthetic-crossing-*.gxwf.yml` | **new** crossing-heavy fixture |
| `gxformat2/examples/catalog.yml` | register new fixtures |
| `docs/cli_layout.rst` | `topological` vs `layered` prose |

---

## Testing strategy

- **Cross-language contract:** `graph_properties` in `expectations/layout.yml`, run by `tests/test_interop_tests.py` (Python) and later mirrored by the TS runner. Language-agnostic.
- **Python-local:** exact-coordinate goldens, determinism, cycle-raises, ruamel comment preservation, `auto`/overwrite policy — all imperative in `tests/test_layout.py` (these are single-impl concerns, per the CLAUDE.md guidance on when imperative tests are appropriate).
- Red-to-green throughout: write the failing property/exception case first, then implement.
- Final full sweep incl. IWC corpus if `GXFORMAT2_TEST_IWC_DIRECTORY` is set (good real-world crossing stress for `layered`).

---

## Resolved decisions (were open questions)

1. **Cycle raise location** → **layout module, cytoscape untouched.** `layout_positions` detects cycles up front and raises `LayoutCycleError` for both strategies; `cytoscape/_layout.py` keeps its viz fallback and TS byte-identical contract. No lockstep coordination this pass.
2. **`deterministic` property** → **Python-local imperative test** in `test_layout.py`, not a `graph_property` (the runner yields a single result; determinism needs two runs).
3. **`layered` coordinate pass** → **simple order-index rows first.** Properties hold without nudging; priority/barycenter nudging is an aesthetic follow-up that won't change the contract.
4. **Strategy in declarative tests** → **separate named operations** (`layout_layered_format2` / `layout_layered_native`), no runner change. The runner calls `operation(fixture)` with one arg and `TestCase` has no `params` field; named ops match existing style.
5. **CLI default** → **keep `topological` default** (dep-free, simplest); `layered` is opt-in. Revisit flipping once `layered` is proven on the IWC corpus.
6. **`gxwf-viz` exposure** → **`gxwf-layout`-only this pass.** Don't add `layered` to cytoscape viz now (consistent with leaving `cytoscape/_layout.py` untouched).

## Remaining open questions

- **None blocking.** Naming nit to confirm at implementation time: `layered` vs `sugiyama` for the strategy id (leaning `layered` — more self-explanatory to users). Flag if `sugiyama` is preferred.
