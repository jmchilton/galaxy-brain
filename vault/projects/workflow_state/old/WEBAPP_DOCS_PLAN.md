# galaxy-workflow-development-webapp — Docs Overhaul Plan

## Context

`galaxy-workflow-development-webapp` is a thin FastAPI shell over
`galaxy.tool_util.workflow_state` (from the Galaxy `wf_tool_state` branch) plus a
Jupyter-Contents-API-compatible file surface. ~850 LoC across 6 modules in
`src/galaxy_workflow_dev_webapp/`:

- `app.py` — FastAPI routes. Two surfaces: `/workflows/{path}/{op}` (validate,
  clean, to-format2, to-native, roundtrip, lint) and `/api/contents/...`
  (Jupyter CRUD + checkpoints + `If-Unmodified-Since` conflict detection).
- `operations.py` — delegates to `*_single()` entry points in
  `galaxy.tool_util.workflow_state`.
- `contents.py` — Jupyter Contents API impl: read/write/create-untitled/rename/
  delete + `.checkpoints/` mirrored tree, path-escape guard, mtime conflict.
- `models.py` — Pydantic request/response models.
- `__main__.py` — uvicorn launcher, `--output-schema` dumps OpenAPI.

Role in the broader workflow_state project (see `PROBLEM_AND_GOAL.md` +
`CURRENT_STATE.md`): HTTP frontend over deliverables D1–D8. Not itself a named
deliverable, but acts as the HTTP surface that frontend tooling (and eventually
D9 VSCode / D10 IWC) can use to exercise validate / clean / roundtrip /
export-format2 / lint and edit workflow files over HTTP.

gxformat2's `abstraction_applications` branch recently gained a Galaxy-styled
sphinx docs setup — `pydata_sphinx_theme` + `_static/css/galaxy.css` (Atkinson
Hyperlegible font, Galaxy brand tokens `#25537b` / `#2c3143` / `#ffd700`, light
and dark mode, sphinx-design card styling). We'll mirror that styling here.

## Goals

1. Rename `README.rst` → `README.md`, rewrite as a mental-model doc.
2. Overhaul sphinx docs to adopt gxformat2 Galaxy styling.
3. Write new content docs that help the reader "grip" the architecture, the
   two API surfaces, and the relationship to the `workflow_state` stack.
4. Auto-generated API reference via `sphinxcontrib-openapi` fed from committed
   `docs/_static/openapi.json`.

## Resolved decisions

1. pyproject `readme` field update to `README.md` — ok.
2. Drop `sphinx_rtd_theme` entirely.
3. API reference via `sphinxcontrib-openapi`.
4. Commit `docs/_static/openapi.json`; Makefile target regenerates it.
5. Skip intersphinx target for gxformat2 (no objects.inv yet).
6. Convert `CONTRIBUTING.rst` and `HISTORY.rst` to Markdown as well.
7. Include "Relationship to wf_tool_state branch" section in `architecture.md`
   (will become stale once merged — acceptable for now).

---

## 1. README rewrite: `README.rst` → `README.md`

- `git mv README.rst README.md`; rewrite as MyST-compatible Markdown so sphinx
  can include it.
- `pyproject.toml`: `readme = "README.md"`.
- Sections:
  1. **What it is / why it exists** — one paragraph positioning the webapp as
     the HTTP layer over `galaxy.tool_util.workflow_state`, used as a backing
     service for frontend workflow-development tooling (and eventually VSCode /
     IWC surfaces). Link up to gxformat2, galaxy-tool-util, IWC, Tool Shed 2.0.
  2. **Architecture at a glance** — Mermaid diagram:
     Frontend/VSCode → `/api/contents` + `/workflows/{path}/{op}` →
     `operations.py` → `workflow_state.*_single` → `ToolShedGetToolInfo` →
     Tool Shed 2.0. Shows the two API surfaces side-by-side.
  3. **API surface overview** — table: endpoint → one-liner → delegated
     `_single()`.
  4. **Install / Run** — `pip install`, `make setup-venv`,
     `galaxy-workflow-dev <dir>`, `--output-schema`.
  5. **Development** — `make setup-venv`, `make lint`, `make test`, link to
     `CONTRIBUTING.md`.
  6. **Relationship to the broader workflow_state stack** — pointer to
     gxformat2 docs, `galaxy.tool_util.workflow_state` package, `gxwf-*` CLI,
     `galaxy-tool-cache`.

Keep concise: replaces the marketing blurb with the mental-model doc.

## 2. Convert other top-level docs to Markdown

- `CONTRIBUTING.rst` → `CONTRIBUTING.md`.
- `HISTORY.rst` → `HISTORY.md`.
- Update any references (sphinx toctrees, pyproject) accordingly.

## 3. Sphinx: theme + extensions

### 3a. conf.py
- Theme: `sphinx_rtd_theme` → `pydata_sphinx_theme`.
- Extensions: keep `myst_parser`, `sphinx.ext.autodoc`, `intersphinx`,
  `viewcode`, `sphinxarg.ext`. Add `sphinx_design`, `sphinxcontrib.mermaid`,
  `sphinxcontrib.openapi`.
- Port `html_theme_options` from gxformat2's `conf.py`: logo text, header
  links, icon links (GitHub repo URL from `pyproject.toml`, Galaxy Project),
  `navbar_align`, `secondary_sidebar_items`, `navigation_with_keys`.
- `html_css_files = ["css/galaxy.css"]`; set `html_title`, `html_short_title`.
- `pygments_style = "default"` to match gxformat2.
- intersphinx: `python`, `pydantic`, `fastapi`. Skip gxformat2 (no objects.inv
  yet).

### 3b. Requirements
- `docs/requirements.txt` and `[dependency-groups].docs` in `pyproject.toml`:
  `sphinx`, `myst-parser`, `sphinx-argparse`, `sphinx-design`,
  `sphinxcontrib-mermaid`, `sphinxcontrib-openapi`, `pydata-sphinx-theme`.
- Remove `sphinx-rtd-theme`.

### 3c. Styling assets
- Copy `docs/_static/css/galaxy.css` verbatim from
  `worktrees/gxformat2/branch/abstraction_applications/docs/_static/css/galaxy.css`.

## 4. Docs content

Rewrite `docs/index.rst` (or convert to `index.md`) to mirror gxformat2's
grid-card landing page with these cards:

- **Getting Started** → `installation.md`
- **Architecture** → `architecture.md` (new — the brain-gripping doc)
- **Workflow Operations** → `workflow_ops.md` (new)
- **Contents API** → `contents_api.md` (new)
- **API Reference** → `api.md` (new — `sphinxcontrib-openapi`)
- **CLI** → `cli.md` (regenerated via `sphinxarg.ext`)
- **Development / Contributing / History** — carried over, converted to .md

Hidden toctree mirrors gxformat2's layout.

### 4a. `architecture.md` — the payoff doc
- Module map (FastAPI → `operations.py` → `workflow_state` → `tool_util` →
  Tool Shed) as a layered block diagram, adapted from gxformat2's `usage.md`
  ensure_/normalized/schema layer diagram.
- Mermaid sequence diagram for a validate call: client → FastAPI →
  `_get_workflow` → `run_validate` → `validate_single` → `ToolShedGetToolInfo`
  → ToolShed 2.0 API.
- Mermaid diagram for the Contents API write path (incl. checkpoint + mtime
  conflict).
- Table: each public endpoint → delegated `workflow_state` function → returned
  Pydantic report model.
- Subsection: "How this fits in the workflow_state deliverables" — reference
  D1–D10 by name, state the webapp is the HTTP surface over D1–D8, enables
  D9 / D10 indirectly. Use deliverable vocabulary from `PROBLEM_AND_GOAL.md`
  for consistency.
- Subsection: "Relationship to wf_tool_state branch" — point at the Galaxy
  `wf_tool_state` branch (`/Users/jxc755/projects/worktrees/galaxy/branch/wf_tool_state`)
  and gxformat2 `abstraction_applications` branch
  (`/Users/jxc755/projects/worktrees/gxformat2/branch/abstraction_applications`),
  explain that the webapp currently pins both via `[tool.uv.sources]` in
  `pyproject.toml`. Noted as temporary — will be stale once merged.

### 4b. `contents_api.md`
- Jupyter Contents API compatibility layer. Nothing in the codebase documents
  this — least obvious part.
- Path shape, `content=0|1`, `format=text|base64`, untitled creation rules,
  checkpoints tree layout (`.checkpoints/<rel_path>/<id>`),
  `If-Unmodified-Since` conflict detection (RFC 7232), path-escape +
  ignore-list safety.
- Table of routes: method, path, status codes, 1-line semantics.

### 4c. `workflow_ops.md`
- Document validate / clean / lint / to-format2 / to-native / roundtrip.
- Per endpoint: inputs, params (`strict`, `connections`, `mode`, `allow`,
  `deny`, `preserve`, `strip`), returned Pydantic report model, 1-line
  semantics.
- Cross-link each to the analogous `gxwf-*` CLI in
  `galaxy.tool_util.workflow_state` (e.g. `gxwf-state-validate`,
  `gxwf-roundtrip-validate`) so readers see the webapp is a thin HTTP layer
  over those.
- Skip semantics (legacy encoding → 422 on to-format2).
- Quickstart: "validate an IWC workflow via curl" snippet.

### 4d. `api.md` — auto-generated OpenAPI reference
- Single `openapi::` directive from `sphinxcontrib-openapi`, pointed at
  committed `docs/_static/openapi.json`.
- Regenerated via Makefile target before every docs build.

### 4e. `installation.md`
- venv setup, tool cache population knob, pointing at an IWC clone, pointing
  at `wf_tool_state` Galaxy worktree and gxformat2 `abstraction_applications`
  branch via `[tool.uv.sources]`.

### 4f. `cli.md`
- Regenerate via `sphinxarg.ext` targeting `_build_parser` in `__main__.py`.

## 5. Makefile additions

- `docs-openapi`: `galaxy-workflow-dev --output-schema docs/_static/openapi.json`
- `docs`: depends on `docs-openapi`, then
  `sphinx-build -W -b html docs docs/_build/html` (warnings-as-errors).
- `docs-clean`
- `docs-serve`: `python -m http.server` from `docs/_build/html`

## 6. Execution order (red-to-green)

1. README.md rewrite + `pyproject.toml` `readme` field update. Verify
   `pip install -e .` still works.
2. Convert `CONTRIBUTING.rst` + `HISTORY.rst` to Markdown.
3. `docs/requirements.txt` + `[dependency-groups].docs` → pydata /
   sphinx-design / mermaid / openapi. Drop `sphinx-rtd-theme`.
4. Copy `galaxy.css` from gxformat2, port `conf.py` theme options. Rebuild
   existing (empty) docs to confirm the theme loads — green baseline before
   adding content.
5. Rewrite `index` as grid cards + hidden toctree. Build, confirm grid
   renders.
6. Add `architecture.md` first — payoff doc. Build + eyeball Mermaid.
7. Add `contents_api.md`, `workflow_ops.md`.
8. Wire `--output-schema` dump + commit `docs/_static/openapi.json`. Add
   `api.md` with `openapi::` directive. Add Makefile targets.
9. Refresh `installation.md`, `cli.md`, `developing.md`, `contributing.md`,
   `history.md`.
10. `make docs` with `-W`; fix myst/autodoc warnings.

## 7. Testing

- `sphinx-build -W` catches broken refs.
- Manual: eyeball Mermaid diagrams, verify grid cards link, confirm
  `galaxy.css` theming (light + dark).
- `pip install -e .` smoke test after README rename.
- `galaxy-workflow-dev --output-schema /tmp/schema.json` smoke test.
- CI / tox env for docs: out of scope unless requested.

## Unresolved questions

None — all previous questions resolved.
