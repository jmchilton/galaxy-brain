# Viz Showcase — Initial Thoughts

Status: scoping / requirements gathering. Captures the investigation that turned "document the visualizations like the Foundry documents workflows" into a broader infrastructure project: a **typed viz-facing API contract** + a **reduced, swappable backend** + a **shared test/screenshot driver**, feeding both a human/agent-facing showcase and Galaxy's in-app viz guidance.

Companion repos (all cloned under `~/projects/repositories/`): `galaxy`, `galaxy-visualizations`, `galaxy-charts`, `foundry`, `training-material`.

---

## 1. Origin and goal

Original intent: replicate the **Foundry pattern** — a "pattern MOC → specific-pattern detail" knowledge structure with typed frontmatter, generated indexes, and **cast skills** — but for **Galaxy visualizations** instead of workflow-construction patterns. See `foundry/docs/ARCHITECTURE.md` and `foundry/docs/GUIDING_PRINCIPLES.md`.

Then `charts.galaxyproject.org` (the `galaxy-charts` repo docs) surfaced as a colleague's existing site. Decision: **do not build a parallel site.** Instead:

- Capture the **specification + examples + screenshots** for the full set of registered visualizations.
- Build a redistributable **MOC + skill** that helps an agent **embed a visualization in a Galaxy Markdown workflow report**.
- **Automate screenshot/metadata generation** rather than hand-maintaining it.

Pursuing "automate screenshots from metadata" exposed that the underlying **test/fixture infrastructure is the real bottleneck.** This doc captures the requirements that fell out.

### Decisions already taken (interview)

| Question | Decision |
|---|---|
| Home for per-viz facts + enrichment | **In `galaxy-visualizations`** (facts + `when_to_use`/examples live with the viz, via a sidecar e.g. `report.yml`). Strongest source-authority. |
| MOC + skill home | **Foundry** — thin citation MOC + cast manifest; cites upstream by URL, mirrors nothing. |
| Metadata schema + validation | **Ships with `galaxy-visualizations`** so authors get red/green CI on their own metadata. |
| Skill consumer | **Both** — portable Mold cast to (a) a Foundry skill and (b) a Galaxy in-app agent prompt fragment. |
| Vertical slice | **`plotly`** (there is no `scatterplot` package; plotly is the generic tabular plotter). |
| Screenshot backend | **Real Galaxy + Playwright** — now refined to a **pluggable minimal-backend / full-Galaxy** harness (see §5–6). |

---

## 2. The corpus and the embedding contract

- All registered visualizations now live in **`galaxyproject/galaxy-visualizations/packages/`** — **48 packages** (igv, plotly + plotly_box/heatmap/histogram/pie/surface, heatmap, molstar, ngl, niivue, vitessce, cytoscape, phylocanvas, venn, openseadragon, openlayers, tiffviewer, h5web, kepler, aladin, seqviz, vtk, vizarr, locuszoom, pca, unipept, hyphyvision, …). Galaxy core ships only a hidden `example`.
- Each package declares a **Galaxy Charts XML** wrapper (`public/<name>.xml`): `name`, `description`, `data_sources` (→ applicable datatypes via `<test test_attr="ext">`), `params`, `settings`/`tracks` (configurable inputs), `<tests>` (test-data URL + ftype), `help`, `tags`, `logo`. Large parts of the "metadata" we want already exist here.
- **Galaxy Markdown embedding** (the thing the skill emits):
  ```galaxy
  visualization(visualization_id=<package_name>, output=<workflow_label>, height=500)
  ```
  Block-only, client-rendered. Dataset bound by `history_dataset_id` (resolved reports/pages), `output=<label>` (workflow report templates), or `history_dataset_collection_id` (collections). Registry: `galaxy/lib/galaxy/managers/markdown_parse.py:66` (`visualization` = `DYNAMIC_ARGUMENTS`). Client render path: `MarkdownGalaxy.vue:252` → `VisualizationWrapper` → `VisualizationFrame.vue` (iframe + `data-incoming`).
- **Gap that motivates the skill:** the `visualization(...)` directive is **absent from Galaxy's own agent prompts** (`galaxy/lib/galaxy/agents/prompts/page_assistant.md`, `workflow_report.md`). Galaxy's assistant doesn't know it can embed these.

### In-flight upstream work (coordinate, don't duplicate)

- **Galaxy #21609** — "Harmonizing AI UX across Galaxy core and visualizations" (guerler, discussion). The design umbrella for where ChatGXY surfaces viz capabilities.
- **Galaxy PR #21615** — "Add Viz Guidance to ChatGXY" (guerler, DRAFT, milestone 26.2). Adds `lib/galaxy/agents/visualization_context.py` with `get_visualization_summaries(trans)` → only `{name, title, description, keywords, url}`. **Missing exactly the metadata we'd add:** applicable datatypes, params, the embed directive, `when_to_use`. Our metadata layer is the natural feed for this.
- **Galaxy #20420** — "Enable visualization in reports for HDCAs" (mvdbeek → guerler). Element-selection for collections in reports; partially built (`DatasetCollectionElementPicker` in `MarkdownGalaxy.vue`).

---

## 3. Why the existing test/screenshot infra forces this project

Findings from `galaxy-visualizations` (all authored by **Aysam Guerler**, the sole contributor to every spec and fixture):

- **Per-viz bespoke Playwright, no central driver.** ~10–11 packages have their own `test.spec.js` + a **copy-paste-identical** `playwright.config.ts` (`webServer: npm run dev` → `localhost:5173`, same `snapshotPathTemplate`, etc.). No root config, no shared spec, **no shared helper** — every import is `@playwright/test` or a local `./test-data/...` file. Coverage plateaus at **11 of 48**.
- **Mocks are hand-captured, hand-edited, and untyped.** Specs intercept the network (`page.route`) and `route.fulfill` from committed JSON. The fixtures are real captures from a local Galaxy (`file_name: /Users/guerler/galaxy/...` baked in) — then **hand-edited** (plotly's `api.datasets.columns.text.number.json` relabels columns `A,B,C…` while the same fixture's `peek` says `Alanine, Arginine…`). igv goes further: `DATASET_DETAILS` is a hand-written **6-field stub** of a ~50-field HDA response.
- **No shared client to mock.** API access is heterogeneous: `GalaxyApi()` (4 API-hitting vizes), raw `fetch` (many), `axios` (katex, openlayers, vitessce), `$.ajax`/jQuery (chiraviz, drawrna, annotateimage) — `mvpapp` uses all three. The only uniform seam is the **network**.
- **The blessed client is untyped.** `galaxy-charts/src/api/client.ts:36` — `GalaxyApi().GET(path)` returns `data = await response.json()` as **`any`**. No OpenAPI, no codegen, no response typing. Nothing catches mock/schema drift at compile time.
- **No capture tooling and no docs.** No `routeFromHAR`, no `.har`, no generator script; no README testing section, no GTN coverage (the `visualization-generic`/`visualization-charts` tutorials in `training-material` say nothing about fixtures). The mechanism is manual DevTools "Copy Response."
- **Even the mocking *technique* isn't uniform** — plotly intercepts the network; igv injects JS dataset objects via `page.evaluate` + reads local `.bed`/`.fa`; cytoscape/openlayers fulfill a CDN URL from a local file.

**Net:** today is *(nothing shared; four bespoke things per viz — config, mock style, fixture format, interaction; ×11)*. The infrastructure cost of each new tested viz is "write a whole new suite," which is why it stalled.

---

## 4. The three requirement tiers (what a viz needs from the backend)

Reframing the data-loading taxonomy by **production** data requirement (test-mode CDN shortcuts hide that several "external" vizes are really display-URL vizes — e.g. cytoscape uses `props.datasetUrl` in production, a CDN only when `datasetId === "__test__"`).

| Tier | Requirement | Backend capability needed | Vizes (illustrative) |
|---|---|---|---|
| **A — data in browser** | renders purely from `incoming` props | none (static dev server) | katex, venn, ngl, polaris, rerunio |
| **B — single display URL** | fetches `/api/datasets/{id}/display` (raw, **groomed** bytes) | serve `display` with faithful content | cytoscape, openlayers, locuszoom, hyphyvision, seqviz, tabulator, alignmentviewer, drawrna, tiffviewer, kepler, phylocanvas |
| **C — GalaxyApi interaction layer** | `/api/datasets/{id}` details + `provider=dataset-column` + histories + genomes, etc. | the reduced API layer | plotly (+variants), heatmap, mvpapp, igv, niivue, molstar |

(Tier assignment is grep/spec-derived — heuristic; verify per viz before relying on it.)

### Fidelity note — Tier B is NOT low-risk

Galaxy **mutates content at upload**, so `/display` bytes ≠ uploaded bytes. Grounded in `galaxy/lib/galaxy/datatypes/sniff.py`: `convert_newlines` (`:111`), `convert_newlines_sep2tabs` (`:203`), and `groom_dataset_content` (`:94`, `if datatype.dataset_content_needs_grooming(...)` → BAM coordinate-sort, historical fastq grooming, etc.), plus sniffing + `set_meta` (which *produces* the Tier-C column metadata). A static-file mock of `/display` skips this pipeline and is unfaithful for any viz sensitive to line endings, tab/space, or sort order. **The minimal backend must serve post-transform content, or it is just mocks-with-extra-steps.**

---

## 5. Design vision

Preserve the **lightweight startup + isolation from Galaxy** that makes the current tests fast and hermetic — but make the substitute **real and typed** instead of hand-frozen.

### 5.1 Fully-typed viz-facing API contract
Define, once, the response types for the small surface vizes consume — **derived from Galaxy's existing pydantic models / OpenAPI** (`HDADetailed`, the dataset-column provider output) so it is a *decomposition* of Galaxy, not a parallel invention. This kills the `data: any` problem and becomes the single source of truth shared by: the minimal backend, full Galaxy, the test driver, guerler's #21615, and the Foundry metadata layer.

Surface inventory (~6–8 endpoints):

| Endpoint | Returns | Tier |
|---|---|---|
| `GET /api/datasets/{id}` | HDA details (extension, `metadata_column_*`, `metadata_dbkey`, `peek`, state, …) | C |
| `GET /api/datasets/{id}/display` (`?to_ext=`, `?__filename=`) | groomed file bytes | B |
| `GET /api/datasets/{id}?provider=dataset-column[&indeces=]` | column-sliced data | C |
| `GET /api/histories/{id}/contents` (+ filters), `current_history_json` | history contents | C (jupyterlite) |
| `GET /api/tools/fetch`, `/api/plugins/{id}`, `/api/version`, `/api/genomes/{dbkey}` | misc | C |

### 5.2 Reduced API layer (not `galaxy-data`)
`galaxy-data` is insufficient — it has the datatype/metadata machinery but **not the API**. The reduced layer needs the **`galaxy-webapp`** stack but **decomposed to just the viz-facing endpoints** (the fetch/upload path + the dataset/history/genome reads above), without the full app surface (jobs, full auth, UI, tool execution). Must run the **real** `sniff` / `set_meta` / `groom` / `display` / column-provider code so Tiers B and C are faithful.

### 5.3 Shared bootstrapper
One bootstrapper that **stands up the correct backend**, configurable as either:
- **full Galaxy** (high fidelity, heavy), or
- **minimal viz backend** (the reduced API layer; lightweight, isolated, faithful).

Both implement the same typed contract, so screenshots and tests are backend-agnostic. The screenshot/test harness picks the backend per run.

### 5.4 Shared test driver
Collapse the copy-pasted per-viz harnesses. Shared: contract + backend + driver (dev-server, fixture/data provisioning, screenshot assertion). **Per-viz reduces to just the genuine difference: the interaction script + the baseline image.** Target shape: *(three shared, one bespoke thing per viz, ×48)*.

### 5.5 Extended test syntax
Extend the viz test declaration (today: `<tests><test><param name="dataset_id" value="<url>" ftype="…"/></test>`) to support:
- **parameter specifications** — settings/tracks values that drive a meaningful render (e.g. `type=scatter`, `x=col1`, `y=col2`), not just a bare dataset. (plotly's `x`/`y`/`label` are `is_auto`, so the bare dataset works for it; many vizes need explicit config.)
- an **optional endpoint** to **drive the test with Playwright** — a hook that points the shared driver at a per-viz interaction script when the default "load + screenshot" isn't enough (plotly clicks "Add New Track," openlayers waits for canvas, igv places dataset elements).

---

## 6. Open questions / design forks

1. **`galaxy-webapp` reducibility (load-bearing).** Can we stand up just the fetch/upload path + `datasets` (details, display, column-provider) + `histories` + `genomes` endpoints without the full app — no job system, minimal/disabled auth, no UI build, sqlite or in-memory? What is the minimal dependency + config closure? This is the make-or-break feasibility unknown.
2. **How does data get in?** The minimal backend needs an ingest path so a `<tests>` dataset URL becomes a groomed, metadata-bearing HDA (so Tier B/C are faithful). Reuse the real upload/`data_fetch` path, or a thinner `sniff`+`set_meta` over a fetched file?
3. **Typed contract generation + home.** Generate types from Galaxy's OpenAPI at build time, or hand-derive and pin? Ship them in the `galaxy-charts` package (where `GalaxyApi` lives) so all vizes can adopt them?
4. **Test-syntax surface.** Does the extended syntax live in the viz XML `<tests>`, a sidecar (`report.yml`?), or a new file? What's the parameter schema? How is the optional Playwright-driver endpoint specified/located?
5. **Coordination with guerler.** He's an excellent implementer but resistant to up-front design. Frame as *less work, surgically scoped* (typed backend only for the Tier-C vizes whose mocks are computed JSON nobody can hand-maintain) rather than "redesign the test architecture." His #21615 and the upstream test infra are the integration points.
6. **Coverage path.** Concrete plan from 11/48 → 48/48 once the shared driver + backend exist (most vizes become "declare params + baseline").
7. **In-report fidelity.** Standalone-viz screenshot vs the in-report iframe embed (`VisualizationFrame`) — is standalone the canonical image, or do we also need report-context captures?

---

## 7. Relationship to the Foundry pattern

| Foundry concept | Viz Showcase analog |
|---|---|
| Pattern note (MOC, cites corpus by URL) | per-viz showcase note citing the `galaxy-visualizations` package |
| `meta_schema.yml` typed frontmatter | per-viz metadata schema (shipped in `galaxy-visualizations`) |
| Corpus-first; source authority beats local copies | extract facts from upstream XML; enrichment authored upstream (`report.yml`); mirror nothing |
| Mold → cast → skill | "embed a visualization in a workflow report" skill, cast to Foundry skill **and** Galaxy prompt fragment |
| Deterministic tools do deterministic work | typed contract + reduced backend + shared driver replace hand-frozen mocks |

---

## 8. Next concrete steps

1. **Feasibility spike (Q6.1):** determine how reducible `galaxy-webapp` is — minimal endpoint subset + dependency/config closure for a standalone datasets/histories API running real `sniff`/`set_meta`/`display`.
2. **Live-drift exhibit:** diff plotly's committed `api.datasets.*` fixtures against a current Galaxy's real `/api/datasets/{id}` + `provider=dataset-column` responses — turn "could drift / is hand-edited" into a demonstrated delta for the guerler conversation.
3. **Typed contract first cut:** enumerate the exact response shapes for the §5.1 surface from Galaxy's pydantic models.
4. **plotly vertical slice:** extract → metadata → (typed backend) screenshot → showcase note → skill snippet, end-to-end, as the proof.
5. **Evidence brief** for #21609/#21615 — the taxonomy, the three exhibits (untyped client, relabeled columns, igv 6-field stub), and the surgically-scoped proposal.

---

_Note: an empty `Untitled.md` sits in this folder (vault scaffold artifact) — safe to delete._
