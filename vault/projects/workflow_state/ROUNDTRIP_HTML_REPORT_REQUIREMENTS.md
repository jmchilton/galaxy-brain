# Roundtrip HTML Report Tool: Requirements

**Date:** 2026-03-26
**Scope:** A library + thin CLI tool that generates a standalone HTML report for visually assessing GA -> Format2 -> GA roundtrip conversions across a directory of workflows.

---

## 1. Purpose

Provide a rich, self-contained HTML page that lets a developer visually assess the fidelity of native -> format2 -> native roundtrip conversion for a corpus of Galaxy workflows. The report should support progressive disclosure: start with a high-level dashboard, drill into per-workflow summaries, then into per-step three-way comparisons.

---

## 2. Architecture

The system has three layers: a **Python data collection library** (in Galaxy), a **TypeScript data model** (npm package), and a **Vue 3 viewer app** (npm package). The Python CLI generates JSON conforming to the TS model, then wraps it in an HTML shell that loads the Vue viewer.

### 2.1 Three-Project Structure

```
┌─────────────────────────────────────────────────────────────────┐
│  Galaxy (Python)                                                │
│  galaxy.tool_util.workflow_state.roundtrip_report               │
│  - Orchestrates validation, conversion, roundtrip               │
│  - Produces JSON conforming to the TS model                     │
│  - galaxy-workflow-roundtrip-report CLI                         │
│  - Wraps JSON + viewer assets into HTML                         │
└──────────────────────────┬──────────────────────────────────────┘
                           │ JSON blob
┌──────────────────────────▼──────────────────────────────────────┐
│  @galaxy-project/roundtrip-report-model (npm, TypeScript)       │
│  - Zod schemas mirroring the Pydantic models                    │
│  - Runtime validation of JSON blobs                             │
│  - Exported TypeScript types consumed by the viewer             │
│  - Independently useful — other tools can consume the model     │
└──────────────────────────┬──────────────────────────────────────┘
                           │ types + validation
┌──────────────────────────▼──────────────────────────────────────┐
│  @galaxy-project/roundtrip-report-viewer (npm, Vue 3)           │
│  - Vue 3 + PrimeVue (unstyled) + Shiki + VueUse                │
│  - Builds to a single JS bundle + CSS file via Vite             │
│  - Reads JSON from <script type="application/json"> on mount    │
│  - Published to npm → auto-mirrored by unpkg/jsdelivr CDNs     │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Python Side: Library + Thin CLI

**Library function** in `galaxy.tool_util.workflow_state` that:
- Accepts a directory path (or list of workflow paths) and returns a structured report model (Pydantic)
- Orchestrates calls to existing APIs directly (no subprocess invocation):
  - `validate_workflow` / `validate_native_step_against` for pre-conversion validation
  - `convert_state_to_format2` / `convert_state_to_format2_using` for forward conversion
  - `roundtrip_native_workflow` / `roundtrip_native_step` for full roundtrip
  - `clean_stale_state` / `classify_stale_keys` for stale key analysis
  - `discover_workflows` for directory traversal
  - `setup_tool_info` / `ToolCacheOptions` for tool metadata resolution
  - `make_convert_tool_state` / `make_encode_tool_state` for gxformat2 callback injection

**Thin CLI wrapper** registered as `galaxy-workflow-roundtrip-report` console_script. Accepts a directory path, cache options (same `_cli_common.py` pattern), and output path for the HTML file.

**HTML assembly:** The CLI produces the final HTML by:
1. Serializing the Pydantic report model to JSON
2. Loading the pre-built viewer assets (JS bundle + CSS)
3. Injecting both into an HTML shell template

### 2.3 TypeScript Model Package

**Package:** `@galaxy-project/roundtrip-report-model`

- Zod schemas that mirror the Pydantic models (sections 3.1–3.5)
- Exported inferred TypeScript types (`RoundtripHtmlReport`, `WorkflowReport`, `StepReport`, `ParameterNode`, etc.)
- `parseReport(json: unknown): RoundtripHtmlReport` — validates a raw JSON blob at runtime
- Enum types for `DiffType`, `DiffSeverity`, `FailureClass`, `StepStatus`, etc.
- No Vue dependency — pure TypeScript + Zod. Usable by any JS/TS consumer.
- The Pydantic models (Python) and Zod schemas (TS) are the **canonical contract** between data producer and viewer. Changes to one must be reflected in the other.

### 2.3.1 Pydantic → Zod Automation

Zod schemas are generated from Pydantic via a **JSON Schema intermediary pipeline**:

1. **Pydantic → JSON Schema**: `model_json_schema(mode='serialization')` (includes `computed_field`, handles all types)
2. **JSON Schema → Zod**: `json-schema-to-zod` npm package converts to Zod code
3. **Build script**: A Python+Node script runs the pipeline and writes `.ts` files. Invoked during development, output committed to the TS model package.

**What works automatically:** basic types, optionals, enums, nested models, lists, dicts, literals, computed fields.

**What needs manual maintenance:**
- **Recursive models** (`ParameterNode` references itself) — `json-schema-to-zod` has a recursion depth limit and falls back to `z.any()`. The `ParameterNode` Zod schema needs a manual `z.lazy()` wrapper.
- **Complex unions** (`anyOf`/`oneOf`) may need touch-up.

**Drift prevention:** A CI test roundtrips sample JSON fixtures through both Pydantic (`model_validate`) and Zod (`parseReport`) to catch schema drift between the two.

**Note:** `json-schema-to-zod` is flagged as pending deprecation awaiting Zod v4. If Zod v4 ships native JSON Schema support (`z.fromJSONSchema()`), the intermediary package becomes unnecessary. Design the build script to be replaceable.

### 2.4 Vue 3 Viewer Package

**Package:** `@galaxy-project/roundtrip-report-viewer`

**Stack:**
- **Vue 3** (Composition API) — ~45KB gzipped
- **PrimeVue 4 (unstyled mode)** — Tree, TreeTable, Accordion, DataTable, Panel. MIT licensed, all components free. Unstyled mode gives full CSS control.
- **Shiki** — syntax highlighting for JSON/YAML in comparison views (~200KB, can be subset to just json+yaml grammars)
- **VueUse** — `useClipboard`, `useUrlSearchParams` for hash state. Tree-shakeable, only import what's used.
- **Vite** — build tool. Produces a single JS bundle + CSS file via `vite build --mode lib` or a custom build config.

**Build output:** Two files:
- `roundtrip-report-viewer.js` — self-contained JS bundle (Vue + PrimeVue + Shiki + app code)
- `roundtrip-report-viewer.css` — all styles

Estimated bundle: ~150-300KB JS + ~20KB CSS before gzip. Negligible vs the 25-50MB data blob.

**How the viewer initializes:**
```js
// In the built bundle's entry point:
import { createApp } from 'vue'
import App from './App.vue'
const el = document.getElementById('app')
const dataEl = document.getElementById('report-data')
const report = JSON.parse(dataEl.textContent)
createApp(App, { report }).mount(el)
```

**Dev mode:** `vite dev` serves the app with hot-reload. A `public/sample-report.json` provides test data. During dev, the app loads the sample JSON instead of reading from `<script>` tag.

### 2.5 Rendering Modes: Inline vs CDN

The CLI supports two modes for how the viewer is loaded in the generated HTML:

**Inline mode (default):** `galaxy-workflow-roundtrip-report <path> -o report.html`
- Viewer JS + CSS inlined directly into the HTML file
- Fully self-contained, works offline, shareable as a single file
- Viewer assets are shipped as **package data** inside `galaxy-tool-util` (vendored from npm build)

**CDN mode:** `galaxy-workflow-roundtrip-report <path> -o report.html --cdn`
- Viewer loaded via `<script>` / `<link>` tags pointing to unpkg or jsdelivr:
  ```html
  <link rel="stylesheet" href="https://unpkg.com/@galaxy-project/roundtrip-report-viewer@1/dist/style.css">
  <script src="https://unpkg.com/@galaxy-project/roundtrip-report-viewer@1/dist/index.js"></script>
  ```
- HTML file is tiny (just the JSON data blob + a few tags)
- Requires network to view, but viewer updates automatically when a new version is published to npm
- Version pinning: major version pinned (`@1`), picks up patch/minor fixes automatically

Both modes use the same JSON data format and the same viewer code — the only difference is where the browser loads the JS/CSS from.

### 2.6 Asset Pipeline: npm → Galaxy

The built viewer assets need to be available to the Python CLI for inline mode. Options (in order of preference):

1. **Vendored in galaxy-tool-util**: A script (or CI step) runs `npm pack @galaxy-project/roundtrip-report-viewer`, extracts the dist files, and commits them to `lib/galaxy/tool_util/workflow_state/_viewer_assets/`. The Python `render_html()` reads these files. Simple, no runtime dependency on npm. Update by re-running the script when the viewer is updated.

2. **Separate Python package**: Publish `galaxy-roundtrip-report-assets` to PyPI containing just the built JS/CSS. The CLI `pip install`s it and reads the files via `importlib.resources`. Cleaner separation but more packages to manage.

3. **Fetch at CLI runtime**: The CLI downloads from unpkg/jsdelivr on first use and caches locally. Adds network dependency to report generation (mitigated by cache). Most flexible but least reliable.

**Recommendation:** Option 1 (vendored) for v1. The viewer assets are ~300KB — trivial to commit. CI can automate the update.

---

## 3. Data Model

### 3.1 Report Root

```
RoundtripHtmlReport:
  generated_at: datetime
  root_path: str                    # directory scanned
  tool_cache_dir: str               # cache location used
  options: dict                     # CLI options used for this run
  summary: CorpusSummary
  workflows: list[WorkflowReport]
```

### 3.2 Corpus Summary (Dashboard Level)

```
CorpusSummary:
  total_workflows: int
  validation: {ok, fail, skip}
  conversion: {success, partial, failed}
  roundtrip: {clean, benign_only, errors, failed}
  stale_keys: {total_keys, affected_workflows, clean_workflows}
  diff_category_breakdown: dict[str, int]   # benign artifact type -> count
  step_failure_distribution: dict[str, dict[str, int]]  # tool_id -> {failure_class -> count}
```

### 3.3 Per-Workflow Report

```
WorkflowReport:
  path: str
  relative_path: str
  category: str                     # directory grouping
  format: str                       # "native" (v1 only; future: "format2")
  workflow_name: str

  # Full workflow dicts (embedded)
  original_workflow: dict           # original .ga content
  format2_workflow: dict|null       # converted format2 dict (null if conversion failed entirely)
  roundtripped_workflow: dict|null  # roundtripped native dict (null if reimport failed)

  # Step ID mapping used for comparison
  step_id_mapping: dict[str, str]   # original_step_id -> roundtripped_step_id
  step_id_match_methods: dict[str, str]  # step_id -> match method (label+type, same-id, tool_id)

  # Phase results
  validation: WorkflowValidationSummary
  stale_keys: StaleKeySummary
  conversion: ConversionSummary
  roundtrip: RoundtripSummary

  # Per-step detail
  steps: list[StepReport]
```

### 3.4 Per-Step Report

```
StepReport:
  step_id: str
  step_label: str|null
  tool_id: str|null
  tool_version: str|null
  step_type: str                    # tool, subworkflow, input, pause, etc.

  # Three-way state comparison
  original_state: dict|null         # decoded native tool_state
  format2_state: dict|null          # format2 state dict
  roundtripped_state: dict|null     # decoded roundtripped tool_state

  # Connections comparison
  original_connections: dict|null
  format2_connections: dict|null    # in/connect block
  roundtripped_connections: dict|null

  # Graphical metadata comparison
  position: {original, roundtripped}
  label: {original, roundtripped}
  annotation: {original, roundtripped}

  # Status
  validation_status: "ok"|"fail"|"skip"
  pre_conversion_errors: list[str]   # validation errors before conversion (native state invalid)
  post_conversion_errors: list[str]  # validation errors after conversion (format2 state invalid)
  conversion_status: "success"|"failed"|"skipped"
  conversion_error: str|null
  failure_class: str|null           # from FailureClass enum
  has_replacement_params: bool      # step contains ${...} params (skips post-conversion validation)

  # Diffs
  diffs: list[StepDiff]            # from roundtrip comparison
  skipped_keys: list[str]          # keys in SKIP_KEYS that were present but excluded from comparison
  stale_keys_found: list[str]      # stale keys detected in original
  stale_keys_stripped: list[str]   # stale keys actually removed before conversion
  stale_key_classifications: dict[str, str]  # key -> category

  # Structural tree (parameter hierarchy)
  parameter_tree: ParameterNode|null  # recursive tree of params with values at leaves
```

### 3.5 Parameter Tree Node (for Structural Tree View)

```
ParameterNode:
  name: str
  param_type: str                  # "section"|"conditional"|"repeat"|"leaf"
  tool_param_type: str|null        # "integer"|"float"|"select"|"boolean"|"data"|...

  # For conditionals
  test_param: str|null
  test_value: str|null
  declared_when_values: list[str]  # all when values from tool definition
  active_branch: str|null          # which when branch matched
  no_branch_matched: bool          # true if test_value didn't match any when

  # For repeats
  instances: list[list[ParameterNode]]

  # For leaves — three-way values
  original_value: any
  format2_value: any
  roundtripped_value: any

  # Match status
  match_status: "match"|"mismatch"|"missing"|"added"|"benign"
  diff: StepDiff|null

  children: list[ParameterNode]
```

---

## 4. HTML Report Structure

### 4.1 Page Layout

**Header bar:** Report title, generated timestamp, root path, summary stats pill badges.

**Dashboard section (top of page):**
- Status heatmap/grid: workflows x status dimensions (validation, conversion, roundtrip) with color-coded cells. Click a cell to jump to that workflow.
- Diff category breakdown: bar or table showing count per benign artifact type + error count.
- Step failure distribution: table of tool_ids sorted by failure frequency, with failure class breakdown per tool (e.g. "cutadapt: 5 tool_not_found, 2 conversion_error").
- All three visualizations are collapsible.

**Workflow list (main body):**
- Grouped by category (directory).
- Each workflow is a collapsible card showing the summary (see 4.2).
- Expanding a card reveals the deep-dive view (see 4.3).

### 4.2 Per-Workflow Summary Card (Collapsed)

Each card shows a single row with:
- Workflow name/path
- **Validation status:** ok/fail/skip step counts with colored badges
- **Conversion status:** success/partial/failed indicator
- **Roundtrip diff summary:** clean / N benign / N errors — the headline
- **Stale key summary:** N keys found (or "clean")
- Overall status icon: green check (clean), yellow warning (benign only), red X (errors), gray skip

### 4.3 Per-Workflow Deep Dive (Expanded)

Expanding a workflow card reveals:

**Step ID Mapping table** (collapsible): Shows `original_step_id -> roundtripped_step_id` with the match method used (label+type, same-id, tool_id fallback). Essential for diagnosing connection comparison issues — if the mapping is wrong, every connection diff for that step is misleading.

**Step list** with status badges per step. Each step is itself collapsible.

**Per-step expanded view** contains:

#### 4.3.1 Three-Column State Comparison
- **Column 1: Original Native** — decoded `tool_state` dict, syntax-highlighted JSON
- **Column 2: Format2** — `state` dict, syntax-highlighted YAML or JSON
- **Column 3: Roundtripped Native** — decoded `tool_state` dict, syntax-highlighted JSON
- Diff highlighting: mismatched values highlighted in columns 1 and 3. Missing keys highlighted. Benign diffs in yellow/amber, errors in red.
- For deeply nested tools where three columns become cramped: provide a tabbed alternative (original | format2 | roundtripped) as a per-step toggle. Also provide a "diff-only" mode showing only keys where values differ.

#### 4.3.2 Structural Tree View
- Collapsible tree rendering the parameter hierarchy (sections > conditionals > repeats > leaves)
- Each leaf node shows three values: original / format2 / roundtripped
- Color-coded: green = match, red = error mismatch, amber = benign mismatch, gray = missing/skipped
- Conditionals: show all branches. Active branch expanded and highlighted. Inactive branches collapsed and dimmed. Show the test parameter value, declared `when` values from tool definition, and which branch matched. If no branch matched, highlight in red.
- Repeats: show each instance as a numbered sub-tree

#### 4.3.3 Connections Comparison
- Three-column view: original `input_connections` | format2 `in`/`connect` | roundtripped `input_connections`
- Each column shows connections in that format's native representation (don't translate format2 `in`/`connect` to native `input_connections` — show the actual syntax)
- Diff highlighting on mismatches

#### 4.3.4 Graphical Metadata
- Table showing position, label, annotation for original vs roundtripped
- Diffs highlighted

#### 4.3.5 Diff Summary
- List of all `StepDiff` entries for this step, with severity badges and descriptions
- Per-step diff filtering: "show all / errors only / benign only" toggle
- Benign diffs default to collapsed summary by category (e.g. "3 all-None sections omitted"). Expand to see individual entries.
- Benign diffs show the artifact reason and link to proving test
- Clicking a diff entry scrolls to and highlights the corresponding key in the three-column comparison (4.3.1) and/or the structural tree view (4.3.2)

### 4.4 Full Workflow JSON (Collapsible)

At the bottom of each workflow's expanded view:
- Three collapsible sections: "Original .ga JSON", "Format2 dict", "Roundtripped .ga JSON"
- Full workflow content, syntax-highlighted, with copy-to-clipboard button
- Embedded in the report (not linked to external paths)

---

## 5. Interaction Design

### 5.1 Progressive Disclosure

All detail is hidden by default. The page loads showing:
1. Dashboard visualizations (heatmap, breakdowns)
2. Collapsed workflow cards with summary badges

User progressively expands: workflow card -> step -> specific comparison tab.

### 5.2 Collapsible Sections

Every detail section is collapsible:
- Dashboard visualizations (each independently)
- Workflow cards
- Steps within a workflow
- Three-column comparison / tree view / connections / metadata (tabbed or accordion within a step)
- Full workflow JSON sections

### 5.3 Navigation

- Clicking a cell in the heatmap scrolls to and expands that workflow
- Clicking a tool_id in the failure distribution filters/highlights workflows containing that tool
- Anchor links for each workflow and step for sharing specific locations
- URL hash state: expand/collapse state reflected in the URL hash so a shared link opens to a specific workflow/step
- "Expand all" / "Collapse all" controls at each level

### 5.4 Filtering & Search

- Filter workflows by status: clean / benign / errors / failed
- Search by workflow name or tool_id
- Filter steps by status within a workflow

---

## 6. Conversion Direction

### 6.1 Primary: GA -> Format2 -> GA

The initial implementation covers native -> format2 -> native roundtrip only. This is the critical path for proving Format2 export fidelity.

### 6.2 Future Extension: Format2 -> Native -> Format2

The data model should be designed so that a format2-native-format2 roundtrip can slot in without redesign. Specifically:
- `WorkflowReport.format` already indicates the source format
- `StepReport` three-way fields are named generically (original/intermediate/roundtripped rather than native/format2/native)
- A `direction` field on the report root distinguishes the two modes
- The library function accepts a direction parameter
- This is a noted future extension, not a v1 requirement

---

## 7. Scale & Performance

### 7.1 Target: IWC Corpus (~120 workflows)

The primary target is the IWC corpus. At this scale:
- All data embedded inline in a single HTML file (including full workflow dicts — three per workflow)
- Acceptable file size: up to ~25-50 MB for the HTML (mostly JSON data; 120 workflows x 3 representations x ~100KB avg)
- No pagination required
- JS renderer should materialize DOM content lazily (only when a section is expanded) to keep initial page load fast despite the large data blob
- JSON blob parsed once on page load; per-workflow rendering deferred until expand

### 7.2 No Architectural Dead Ends

While not optimizing for 500+ workflow repos now, avoid decisions that prevent future scaling (e.g. keep the JSON data blob as a separable concern so it could be loaded from an external file later).

---

## 8. Partial Failure Handling

When conversion partially fails (some steps convert, others don't):
- Render everything available. Steps that converted successfully get full three-way comparison.
- Failed steps show an error card with the failure class (from `FailureClass` enum) and error message.
- Three-way comparison columns show "N/A" or are absent for missing representations.
- The step's status badge clearly indicates the failure state.
- The workflow summary reflects partial success (e.g. "8/12 steps converted, 2 errors, 2 skipped").

---

## 9. CLI Interface

```
galaxy-workflow-roundtrip-report <path> [options]

Arguments:
  path                  Directory or single workflow file to analyze

Options:
  -o, --output FILE     Output HTML file path (default: roundtrip_report.html)
  --json FILE           Also write the raw report JSON to FILE
  --cdn                 Load viewer from CDN (unpkg) instead of inlining assets.
                        Produces a smaller HTML file but requires network to view.
  --populate-cache      Auto-populate tool cache before analysis
  --tool-source {auto,api,galaxy}
  --tool-source-cache-dir DIR
  --strict              Treat benign diffs as errors in status classification
  --strip-bookkeeping   Strip bookkeeping keys before conversion
  -v                    Verbose logging
```

Follows the existing `_cli_common.py` patterns (`ToolCacheOptions`, `build_base_parser`, `setup_tool_info`, `cli_main`).

---

## 10. Library API

```python
from galaxy.tool_util.workflow_state.roundtrip_report import (
    generate_roundtrip_report,
    RoundtripHtmlReport,
    render_html,
)

# Generate report model
report: RoundtripHtmlReport = generate_roundtrip_report(
    path="/path/to/iwc",
    get_tool_info=tool_info,
    strict=False,
    strip_bookkeeping=True,
)

# Serialize to JSON
json_str = report.model_dump_json(by_alias=True)

# Render to HTML
html_str = render_html(report)

# Or render from pre-computed JSON
html_str = render_html_from_json(json_str)
```

The library provides:
1. `generate_roundtrip_report()` — orchestrates the full pipeline, returns a Pydantic model
2. `render_html()` — takes a report model, returns an HTML string
3. `render_html_from_json()` — takes JSON string, wraps it in the HTML shell with the JS renderer
4. The Pydantic report model is the contract between data collection and rendering

---

## 11. Implementation Components

### 11.1 Report Data Collection (`roundtrip_report.py`) — Python/Galaxy

New module in `galaxy.tool_util.workflow_state` that orchestrates:
1. `discover_workflows()` to find all workflows in the directory
2. For each workflow:
   a. Load and decode the workflow
   b. Run native validation (`validate_native_step_against`)
   c. Classify stale keys (`classify_stale_keys`)
   d. Run full roundtrip (`roundtrip_native_workflow` or the lower-level step functions)
   e. Capture intermediate artifacts: format2 dict, roundtripped dict
   f. Build the parameter tree from tool definitions
   g. Assemble `WorkflowReport` and `StepReport` models
3. Compute corpus-level aggregates (`CorpusSummary`)
4. Return `RoundtripHtmlReport`

### 11.2 Parameter Tree Builder — Python/Galaxy

**This is the largest new component.** The existing `_walker.py` walks one state dict at a time. This requires a new three-way walker.

New general-purpose utility (usable by other tools beyond the report) that, given a `ParsedTool` and three state dicts (original, format2, roundtripped):
- Walks the tool's parameter definition tree
- At each node, extracts the corresponding values from all three state dicts (using each format's key conventions)
- Builds a `ParameterNode` tree with match status computed at each leaf
- Handles conditionals: walks all branches, marks which is active (determined by test param value and declared `when` values), flags when no branch matches
- Handles repeats (instance count from the state dicts)
- Handles sections (nested ParameterNode)

The three-way walker should be factored as a reusable utility since the same capability is valuable for Format2 editor tooling, workflow version diffing, etc.

### 11.3 HTML Assembly — Python/Galaxy

The CLI's `render_html()` function:
1. Serializes the Pydantic `RoundtripHtmlReport` to JSON
2. In **inline mode**: reads the vendored viewer assets from `_viewer_assets/` (JS + CSS)
3. In **CDN mode**: generates `<script src>` / `<link href>` tags pointing to unpkg
4. Injects JSON blob + viewer into an HTML shell template (a simple Python string template or Jinja2)
5. Writes the final `.html` file

### 11.4 TypeScript Model Package — `@galaxy-project/roundtrip-report-model`

**Project setup:**
```
roundtrip-report-model/
├── package.json           # name: @galaxy-project/roundtrip-report-model
├── tsconfig.json
├── src/
│   ├── index.ts           # public API exports
│   ├── report.ts          # RoundtripHtmlReport, CorpusSummary
│   ├── workflow.ts        # WorkflowReport, StepReport
│   ├── tree.ts            # ParameterNode
│   ├── diffs.ts           # StepDiff, DiffType, DiffSeverity, BenignArtifact
│   └── enums.ts           # FailureClass, StepStatus, ConnectionStatus
├── tests/
│   └── parse.test.ts      # validation against sample JSON fixtures
└── vitest.config.ts
```

- Each Pydantic model maps to a Zod schema + inferred TS type
- `parseReport()` validates unknown JSON at runtime via Zod `.parse()`
- Published with both ESM and CJS builds
- Sample JSON fixtures exported for testing (extracted from real IWC roundtrip runs)

### 11.5 Vue 3 Viewer App — `@galaxy-project/roundtrip-report-viewer`

**Project setup:**
```
roundtrip-report-viewer/
├── package.json           # name: @galaxy-project/roundtrip-report-viewer
├── vite.config.ts         # builds as lib + standalone entry
├── src/
│   ├── main.ts            # entry point: parse JSON, mount app
│   ├── App.vue            # root component
│   ├── components/
│   │   ├── Dashboard/
│   │   │   ├── StatusHeatmap.vue
│   │   │   ├── DiffCategoryBreakdown.vue
│   │   │   └── StepFailureDistribution.vue
│   │   ├── WorkflowCard.vue
│   │   ├── WorkflowDeepDive.vue
│   │   ├── StepIdMapping.vue
│   │   ├── StepView.vue
│   │   ├── ThreeColumnComparison.vue
│   │   ├── ParameterTreeView.vue      # recursive, uses PrimeVue Tree
│   │   ├── ConnectionsComparison.vue
│   │   ├── GraphicalMetadata.vue
│   │   ├── DiffSummary.vue
│   │   ├── FullWorkflowJson.vue
│   │   └── SyntaxHighlight.vue        # Shiki wrapper
│   ├── composables/
│   │   ├── useReport.ts               # provide/inject report data
│   │   ├── useFiltering.ts            # workflow + step filtering
│   │   ├── useHashState.ts            # URL hash <-> expand state
│   │   └── useDiffNavigation.ts       # click diff -> scroll to key
│   └── styles/
│       └── theme.css                  # PrimeVue unstyled overrides
├── public/
│   └── sample-report.json             # dev mode test data
└── vitest.config.ts
```

**Key Vue components:**

| Component | PrimeVue usage | Role |
|---|---|---|
| `StatusHeatmap` | DataTable | Workflows x status grid, color-coded cells, click-to-navigate |
| `WorkflowCard` | Accordion / Panel | Collapsed summary row, expands to deep dive |
| `ParameterTreeView` | Tree | Recursive parameter hierarchy with three-way values at leaves |
| `ThreeColumnComparison` | — (custom) | Side-by-side JSON with Shiki highlighting + diff marks. Tab toggle for single-column mode. |
| `DiffSummary` | — (custom) | Filterable diff list with cross-linking to tree/comparison views |
| `FullWorkflowJson` | Panel (collapsible) | Syntax-highlighted full workflow with copy-to-clipboard (VueUse) |

**Build configuration (Vite):**

The viewer needs to build in two modes:
1. **Library mode** (`vite build`): produces `dist/index.js` + `dist/style.css` for npm publish and CDN use. Entry point auto-mounts to `#app` and reads JSON from `#report-data`.
2. **Dev mode** (`vite dev`): serves the app with HMR, loads `public/sample-report.json`.

**Renderer resilience:** If a workflow's data is malformed or a field is unexpectedly null, the component degrades gracefully (shows what's available, flags what's missing — never breaks the whole page). Vue's `errorCaptured` hook at the `WorkflowCard` level catches rendering errors per-workflow.

### 11.6 Syntax Highlighting & Diff — Vue Viewer

For the three-column comparison:
- **Shiki** for JSON/YAML syntax highlighting (subset to json + yaml grammars to minimize bundle)
- Diff highlighting: a recursive tree-diff renderer that walks the JSON structure and marks changed subtrees with CSS classes, rather than text-level line diffing
- Three-column and tabbed single-column modes share the same highlighting logic
- "Diff-only" mode filters the tree to show only nodes with differences

---

## 12. Non-Requirements (Explicitly Out of Scope)

- **Snapshot comparison / regression detection** — each report is a single point-in-time. No baseline diffing.
- **Format2 -> Native -> Format2 roundtrip** — future extension, not v1.
- **Server mode / live dashboard** — static HTML file only.
- **Editing / fixing workflows** — read-only report.
- **Large repo optimization** (pagination, external data files) — not needed at IWC scale.
- **Subworkflow deep recursion in comparison** — subworkflow steps show as "subworkflow" type with basic info; recursive comparison of embedded subworkflow steps is a future enhancement.

---

## 13. Resolved Decisions (from review)

- **Parameter tree builder:** general-purpose utility, not scoped to the report
- **Frontend framework:** Vue 3 + PrimeVue (unstyled) + Shiki + VueUse
- **Conditional branches:** show all branches (inactive collapsed/dimmed), not just active
- **Connection format:** show each format's native representation (don't translate format2 to native)
- **Step ID mapping:** surface it per-workflow for debugging connection issues
- **Validation errors:** split pre- vs post-conversion
- **Stale keys:** track both found and stripped
- **File size:** ~25-50MB acceptable, full workflow dicts embedded always
- **Rendering modes:** inline (default, self-contained) + `--cdn` flag for CDN-loaded viewer
- **Asset pipeline:** vendored in galaxy-tool-util for v1
- **TypeScript model:** separate npm package (`@galaxy-project/roundtrip-report-model`) with Zod schemas
- **Vue viewer:** separate npm package (`@galaxy-project/roundtrip-report-viewer`), published to npm, auto-mirrored by unpkg/jsdelivr
- **PrimeVue licensing:** MIT, all needed components (Tree, TreeTable, Accordion, DataTable, Panel, unstyled mode) are in the free core

## 14. Unresolved Questions

### Data & Presentation
1. For the heatmap — rows are workflows, what should columns be? (validation, stale keys, conversion, roundtrip) or finer-grained (per-step)?
2. Should the benign artifact "proven_by" test links be clickable (linking to GitHub source)?
3. How should workflow comments (the graphical annotation boxes, not code comments) be represented in the comparison view?
4. Should the report include timing information (how long each phase took per workflow)?
5. Should we consider a "print-friendly" mode or PDF export capability?
6. Should values that matched only after type coercion (e.g. `"5" == 5`) be surfaced as a diagnostic? Possible "coerced matches" severity level or debug toggle.
7. How should `--strict` mode affect the visual report? Show both normal and strict assessments simultaneously, or just change the classification?

### Project & Build
8. Mono-repo or separate repos for the TS model and Vue viewer? Mono-repo (e.g. Turborepo/pnpm workspaces) simplifies cross-package development. Separate repos give independent release cycles.
9. npm scope: `@galaxy-project/` assumed — does this scope exist on npm? If not, who creates it?
10. Where should the TS/Vue projects live? Under `galaxy` repo (packages/ dir), under a new dedicated repo, or under an existing Galaxy org repo?
11. Shiki bundle size: subset to json+yaml grammars (~50KB) or ship full grammar set (~200KB)?
12. Should the vendored assets be committed to the Galaxy repo or fetched during CI and included in the sdist/wheel only?
