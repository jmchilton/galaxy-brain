# Roundtrip HTML Report Tool: Requirements

**Date:** 2026-03-26
**Scope:** A library + thin CLI tool that generates a standalone HTML report for visually assessing GA -> Format2 -> GA roundtrip conversions across a directory of workflows.

---

## 1. Purpose

Provide a rich, self-contained HTML page that lets a developer visually assess the fidelity of native -> format2 -> native roundtrip conversion for a corpus of Galaxy workflows. The report should support progressive disclosure: start with a high-level dashboard, drill into per-workflow summaries, then into per-step three-way comparisons.

---

## 2. Architecture

### 2.1 Library + Thin CLI

The tool is structured as:
- **Library function** in `galaxy.tool_util.workflow_state` that accepts a directory path (or list of workflow paths) and returns a structured report model (Pydantic). This function orchestrates calls to existing APIs: `validate_workflow`, `convert_state_to_format2`, roundtrip logic from `roundtrip.py`, and stale key classification from `clean.py`.
- **Thin CLI wrapper** registered as `galaxy-workflow-roundtrip-report` console_script. Accepts a directory path, cache options (same `_cli_common.py` pattern), and output path for the HTML file.
- Other tools can call the library to get the report model or HTML fragments.

### 2.2 Integration with Existing APIs

The library calls existing Python APIs directly (no subprocess invocation):
- `validate_workflow` / `validate_native_step_against` for pre-conversion validation
- `convert_state_to_format2` / `convert_state_to_format2_using` for forward conversion
- `roundtrip_native_workflow` / `roundtrip_native_step` for full roundtrip
- `clean_stale_state` / `classify_stale_keys` for stale key analysis
- `discover_workflows` for directory traversal
- `setup_tool_info` / `ToolCacheOptions` for tool metadata resolution
- `make_convert_tool_state` / `make_encode_tool_state` for gxformat2 callback injection

### 2.3 Rendering Approach: Embedded JSON + JS Renderer

The output is a single self-contained `.html` file containing:
- A JSON data blob (`<script type="application/json" id="report-data">`) with the full report model serialized
- A JS renderer (vanilla JS or lightweight framework like Alpine.js) that reads the JSON and builds the interactive UI client-side
- Inline CSS for styling
- No external dependencies — works fully offline, shareable as a single file

This separation of data and presentation means:
- The JSON blob is independently useful (can be consumed by other tools)
- The renderer can be iterated on without changing the data model
- Future extensions (e.g. loading a baseline JSON for comparison) are architecturally possible

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
  step_failure_distribution: dict[str, int] # tool_id -> failure count
```

### 3.3 Per-Workflow Report

```
WorkflowReport:
  path: str
  relative_path: str
  category: str                     # directory grouping
  format: str                       # "native" or "format2"
  workflow_name: str

  # Full workflow dicts (embedded)
  original_workflow: dict           # original .ga content
  format2_workflow: dict|null       # converted format2 dict (null if conversion failed entirely)
  roundtripped_workflow: dict|null  # roundtripped native dict (null if reimport failed)

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
  validation_errors: list[str]
  conversion_status: "success"|"failed"|"skipped"
  conversion_error: str|null
  failure_class: str|null           # from FailureClass enum

  # Diffs
  diffs: list[StepDiff]            # from roundtrip comparison
  stale_keys_found: list[str]
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
  active_branch: str|null          # which when branch is active

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
- Step failure distribution: table of tool_ids sorted by failure frequency.
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

**Step list** with status badges per step. Each step is itself collapsible.

**Per-step expanded view** contains:

#### 4.3.1 Three-Column State Comparison
- **Column 1: Original Native** — decoded `tool_state` dict, syntax-highlighted JSON
- **Column 2: Format2** — `state` dict, syntax-highlighted YAML or JSON
- **Column 3: Roundtripped Native** — decoded `tool_state` dict, syntax-highlighted JSON
- Diff highlighting: mismatched values highlighted in columns 1 and 3. Missing keys highlighted. Benign diffs in yellow/amber, errors in red.

#### 4.3.2 Structural Tree View
- Collapsible tree rendering the parameter hierarchy (sections > conditionals > repeats > leaves)
- Each leaf node shows three values: original / format2 / roundtripped
- Color-coded: green = match, red = error mismatch, amber = benign mismatch, gray = missing/skipped
- Conditionals: show active branch only, with indicator of which branch is selected
- Repeats: show each instance as a numbered sub-tree

#### 4.3.3 Connections Comparison
- Three-column view: original `input_connections` | format2 `in`/`connect` | roundtripped `input_connections`
- Diff highlighting on mismatches

#### 4.3.4 Graphical Metadata
- Table showing position, label, annotation for original vs roundtripped
- Diffs highlighted

#### 4.3.5 Diff Summary
- List of all `StepDiff` entries for this step, with severity badges and descriptions
- Benign diffs show the artifact reason and link to proving test

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
- All data can be embedded inline in a single HTML file
- No pagination or lazy loading required
- Acceptable file size: up to ~10-20 MB for the HTML (mostly JSON data)
- All JS rendering happens client-side on page load

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

### 11.1 Report Data Collection (`roundtrip_report.py`)

New module that orchestrates:
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

### 11.2 Parameter Tree Builder

New utility that, given a `ParsedTool` and three state dicts (original, format2, roundtripped):
- Walks the tool's parameter definition tree
- At each node, extracts the corresponding values from all three state dicts
- Builds a `ParameterNode` tree with match status computed at each leaf
- Handles conditionals (active branch only, determined by test param value)
- Handles repeats (instance count from the state dicts)
- Handles sections (nested ParameterNode)

### 11.3 HTML Template / JS Renderer

- HTML shell with embedded CSS
- `<script type="application/json" id="report-data">` block containing the serialized report
- JS renderer that:
  - Parses the JSON blob on page load
  - Builds the dashboard visualizations (heatmap, bar charts — can be CSS-only or use a tiny chart lib)
  - Renders the workflow list with collapsible cards
  - Handles expand/collapse, filtering, search, and navigation
  - Syntax-highlights JSON/YAML in the comparison views
  - Applies diff highlighting based on match status

### 11.4 Syntax Highlighting & Diff

For the three-column comparison:
- JSON syntax highlighting (can be lightweight — just colorize keys, strings, numbers, booleans, null)
- Diff highlighting: line-level or token-level marking of differences between columns
- Consider: a simple recursive diff renderer that walks the JSON tree and marks changed subtrees, rather than text-level diffing

---

## 12. Non-Requirements (Explicitly Out of Scope)

- **Snapshot comparison / regression detection** — each report is a single point-in-time. No baseline diffing.
- **Format2 -> Native -> Format2 roundtrip** — future extension, not v1.
- **Server mode / live dashboard** — static HTML file only.
- **Editing / fixing workflows** — read-only report.
- **Large repo optimization** (pagination, external data files) — not needed at IWC scale.
- **Subworkflow deep recursion in comparison** — subworkflow steps show as "subworkflow" type with basic info; recursive comparison of embedded subworkflow steps is a future enhancement.

---

## 13. Unresolved Questions

1. Should the parameter tree builder be a general-purpose utility (usable by other tools) or scoped to the report?
2. For the heatmap — rows are workflows, what should columns be? (validation, stale keys, conversion, roundtrip) or finer-grained (per-step)?
3. Should the benign artifact "proven_by" test links be clickable (linking to GitHub source)?
4. How should workflow comments (the graphical annotation boxes, not code comments) be represented in the comparison view?
5. Should the report include timing information (how long each phase took per workflow)?
6. For the JS renderer — vanilla JS or Alpine.js? Alpine is ~15KB and would simplify reactivity significantly.
7. Should we consider a "print-friendly" mode or PDF export capability?
