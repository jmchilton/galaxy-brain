---
type: research
subtype: component
component: "markdown/visualizations"
tags:
  - research/component
  - galaxy/client
status: draft
created: 2026-02-25
revised: 2026-02-25
revision: 1
ai_generated: true
github_repo: galaxyproject/galaxy
---

# Galaxy Markdown Visualizations: Complete Reference

> How visualizations are embedded, rendered, and extended in Galaxy's markdown system.

---

## 1. Overview

Galaxy Markdown supports **five fenced block types**, dispatched by the `SectionWrapper.vue` router:

| Block Tag | Handler Component | Purpose |
|-----------|-------------------|---------|
| ` ```galaxy ` | `MarkdownGalaxy.vue` | Dataset, job, workflow directives with function-call syntax |
| ` ```vega ` | `MarkdownVega.vue` | Inline Vega/Vega-Lite chart specs (JSON) |
| ` ```visualization ` | `MarkdownVisualization.vue` | Galaxy visualization plugin embeds (JSON config) |
| ` ```vitessce ` | `MarkdownVitessce.vue` | Spatial/single-cell data dashboards (JSON config) |
| (default) | `MarkdownDefault.vue` | Standard markdown via markdown-it + KaTeX math |

The first (`galaxy`) uses directive function-call syntax. The other three use JSON payloads parsed client-side. All visualization types support an expand/maximize button for fullscreen viewing.

---

## 2. Galaxy Directives (` ```galaxy ` blocks)

These are the structured directives — parsed by both backend (`markdown_parse.py`) and frontend (`parse.ts`). They use function-call syntax with named arguments.

### Dataset Visualization Directives

| Directive | Purpose | Key Arguments |
|-----------|---------|---------------|
| `history_dataset_display` | Full dataset content | `history_dataset_id`, `hid`, `input`, `output`, `invocation_id` |
| `history_dataset_as_image` | Render as image (PNG/SVG) | Same + `path` |
| `history_dataset_as_table` | Render as HTML table | Same + `path`, `title`, `compact`, `footer`, `show_column_headers` |
| `history_dataset_peek` | Pre-computed content preview | Same core args |
| `history_dataset_info` | Dataset metadata | Same core args |
| `history_dataset_name` | Just the dataset name | Same core args |
| `history_dataset_type` | Just the file format | Same core args |
| `history_dataset_link` | Clickable download link | Same + `path`, `label` |
| `history_dataset_index` | File listing (composite) | Same + `path` |
| `history_dataset_embedded` | Inline embed | Same core args |
| `history_dataset_collection_display` | Collection contents | `history_dataset_collection_id`, `hid`, `input`, `output`, `invocation_id` |

### Syntax Examples

**Block directive** (inside ` ```galaxy ` fence):
```
history_dataset_as_table(history_dataset_id=12345, title="Mapping Stats", compact=true)
```

**Inline directive** (in regular markdown text):
```
The alignment produced ${galaxy history_dataset_name(output="results")} with format ${galaxy history_dataset_type(output="results")}.
```

**Workflow-relative references** (resolved at render time via invocation context):
```
history_dataset_display(output="alignment_results", invocation_id=98765)
```

### ID Formats

| Format | Example | Context |
|--------|---------|---------|
| Internal (storage) | `history_dataset_id=12345` | Raw DB IDs, stored in page revisions |
| Encoded (API/export) | `history_dataset_id=a1b2c3d4e5f6` | Base36-encoded for API responses |
| HID (notebook-relative) | `hid=3` | Accepted in validation, resolved by agent tools |
| Workflow-relative | `output="bam_output"` | Resolved via invocation store |

### Backend Processing Pipeline

```
                    ready_galaxy_markdown_for_import()
Encoded IDs ──────────────────────────────────────────→ Internal IDs (storage)

                    validate_galaxy_markdown()
Markdown text ────────────────────────────────────────→ Syntax errors (line numbers)

                    resolve_invocation_markdown()
Workflow-relative ────────────────────────────────────→ Absolute dataset IDs

                    ready_galaxy_markdown_for_export()
Internal IDs ─────────────────────────────────────────→ Encoded IDs + expanded embeds
```

Two export handlers:
- **Lazy** (`ReadyForExportMarkdownDirectiveHandler`): Preserves directives, collects metadata for frontend rendering. Used for interactive display.
- **Eager** (`ToBasicMarkdownDirectiveHandler`): Expands directives to standard markdown/HTML. Used for PDF export via WeasyPrint.

### Frontend Rendering

`MarkdownGalaxy.vue` dispatches to 22 specialized element components in `Markdown/Sections/Elements/`:

| Component | Directive |
|-----------|-----------|
| `HistoryDatasetDisplay.vue` | `history_dataset_display` |
| `HistoryDatasetAsImage.vue` | `history_dataset_as_image` |
| `HistoryDatasetAsTable.vue` | `history_dataset_as_table` |
| `HistoryDatasetDetails.vue` | `history_dataset_peek`, `history_dataset_info` |
| `HistoryDatasetLink.vue` | `history_dataset_link` |
| `HistoryDatasetIndex.vue` | `history_dataset_index` |
| `HistoryDatasetCollection.vue` | `history_dataset_collection_display` |
| `WorkflowDisplay.vue` | `workflow_display` |
| `WorkflowImage.vue` | `workflow_image` |
| `JobMetrics.vue` | `job_metrics` |
| `JobParameters.vue` | `job_parameters` |
| `ToolStd.vue` | `tool_stdout`, `tool_stderr` |
| `InvocationTime.vue` | `invocation_time`, `generate_time` |

---

## 3. Vega-Lite Visualizations (` ```vega ` blocks)

Self-contained chart specifications using the [Vega-Lite](https://vega.github.io/vega-lite/) grammar. No plugin system needed — the spec IS the chart.

### Syntax

````markdown
```vega
{
    "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
    "description": "Gene expression bar chart",
    "data": {
        "values": [
            {"gene": "TP53", "expression": 42.5},
            {"gene": "BRCA1", "expression": 38.2},
            {"gene": "EGFR", "expression": 55.1}
        ]
    },
    "mark": "bar",
    "encoding": {
        "x": {"field": "gene", "type": "nominal"},
        "y": {"field": "expression", "type": "quantitative"}
    }
}
```
````

### Rendering Pipeline

```
MarkdownVega.vue
  │  JSON.parse(content)
  │  Inject width: "container" for responsive sizing
  ▼
VegaWrapper.vue (client/src/components/Common/VegaWrapper.vue)
  │  vega-embed library with SVG renderer
  │  ResizeObserver for responsive width
  │  Cleanup via vegaView.finalize() on unmount
  ▼
Rendered SVG chart
```

### Supported Chart Types (via Vega-Lite)

Vega-Lite's `mark` property supports all standard chart types:

| Mark Type | Description |
|-----------|-------------|
| `bar` | Bar charts (vertical/horizontal) |
| `line` | Line charts, time series |
| `point` | Scatter plots |
| `area` | Area charts, stacked areas |
| `circle` | Circle plots |
| `square` | Square plots |
| `rect` | Heatmaps, 2D histograms |
| `tick` | Strip plots |
| `boxplot` | Box-and-whisker plots |
| `rule` | Reference lines, error bars |
| `text` | Text labels |
| `arc` | Pie/donut charts |
| `geoshape` | Geographic maps |
| `trail` | Variable-width lines |
| `image` | Image marks |

Vega-Lite also supports **layered**, **faceted**, **concatenated**, and **repeated** views for complex dashboards.

### Key Properties

```typescript
// VegaWrapper.vue props
interface VisSpec {
    spec: VisualizationSpec;  // Full Vega or Vega-Lite spec
    fillWidth?: boolean;       // Auto-resize to container (default: true)
}
```

- **Renderer:** SVG (not Canvas) for crisp rendering in markdown
- **Responsive:** `useResizeObserver` on container updates `vegaView.width()`
- **Lifecycle:** Chart finalized on component unmount (no memory leaks)

### Example: Scatter Plot with Color Encoding

````markdown
```vega
{
    "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
    "data": {"url": "https://vega.github.io/vega-datasets/data/cars.json"},
    "mark": "point",
    "encoding": {
        "x": {"field": "Horsepower", "type": "quantitative"},
        "y": {"field": "Miles_per_Gallon", "type": "quantitative"},
        "color": {"field": "Origin", "type": "nominal"},
        "tooltip": [
            {"field": "Name", "type": "nominal"},
            {"field": "Horsepower", "type": "quantitative"},
            {"field": "Miles_per_Gallon", "type": "quantitative"}
        ]
    }
}
```
````

### Example: Time Series

````markdown
```vega
{
    "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
    "data": {"url": "https://vega.github.io/vega-datasets/data/stocks.csv"},
    "mark": "line",
    "encoding": {
        "x": {"field": "date", "type": "temporal"},
        "y": {"field": "price", "type": "quantitative"},
        "color": {"field": "symbol", "type": "nominal"}
    }
}
```
````

---

## 4. Galaxy Plugin Visualizations (` ```visualization ` blocks)

The full plugin-based visualization framework. Plugins are external packages that run in sandboxed iframes with their own JS/CSS.

### Syntax

````markdown
```visualization
{
    "visualization_name": "charts",
    "visualization_title": "Quality Score Distribution",
    "dataset_id": "a1b2c3d4e5f6",
    "height": 400,
    "settings": {
        "chart_type": "bar",
        "x_axis_label": "Quality Score",
        "y_axis_label": "Count"
    },
    "tracks": [...]
}
```
````

### Configuration Schema

```typescript
// Parsed from JSON content by MarkdownVisualization.vue
interface VisualizationConfig {
    visualization_name: string;        // Plugin identifier (required)
    visualization_title?: string;      // Display title
    dataset_id?: string;               // Direct dataset reference
    dataset_url?: string;              // Alternative: URL to data
    dataset_label?: {                  // Workflow-relative reference
        invocation_id?: string;
        input?: string;                // Workflow input label
        output?: string;               // Workflow output label
    };
    dataset_name?: string;             // Human-readable dataset name
    height?: number;                   // Pixel height (default: 400)
    settings?: object;                 // Plugin-specific settings
    tracks?: object[];                 // Plugin-specific data tracks
}
```

### Rendering Pipeline

```
MarkdownVisualization.vue
  │  JSON.parse(content)
  │  Resolve dataset_label via invocationStore (if workflow context)
  ▼
VisualizationWrapper.vue
  │  Expand/collapse UI (fixed height ↔ fullscreen)
  │  Default height: 400px
  ▼
VisualizationFrame.vue
  │  GET /api/plugins/{name} → plugin metadata
  │  Create <iframe>
  │  Inject <div id="app" data-incoming="{...}">
  │  Load plugin script (entry_point.attr.src)
  │  Load plugin CSS (entry_point.attr.css)
  │  Listen for postMessage from iframe
  ▼
Plugin renders inside iframe
```

### iframe Communication Protocol

The plugin receives data via `data-incoming` attribute on `div#app`:

```json
{
    "root": "https://galaxy.example.org/",
    "visualization_config": {
        "dataset_id": "...",
        "settings": {...},
        "tracks": [...]
    },
    "visualization_plugin": { /* full plugin metadata */ },
    "visualization_title": "My Chart"
}
```

The plugin sends changes back via `window.postMessage`:
```javascript
window.parent.postMessage({
    from: "galaxy-visualization",
    visualization_config: { /* updated config */ },
    visualization_title: "Updated Title"
}, "*");
```

Changes are debounced (300ms) and emitted as `change` events up the component tree.

### Backend: Markdown Processing of Visualization Blocks

Visualization blocks are handled differently from `galaxy` blocks:

1. **Parsing:** `visualization` is registered in `VALID_ARGUMENTS` with `DYNAMIC_ARGUMENTS` — validation is **completely bypassed**. Any JSON content is accepted.

2. **Export:** `handle_visualization()` is a **no-op** in the lazy export handler — the block passes through unchanged for frontend rendering.

3. **PDF Export:** Returns placeholder text `"*Visualization inputs not implemented*"` — interactive visualizations cannot be rendered to static PDF.

4. **Invocation IDs:** A dedicated regex (`VISUALIZATION_FENCED_BLOCK` + `INVOCATION_ID_JSON_PATTERN`) finds and transforms `"invocation_id": "..."` values inside visualization JSON blocks during import/export. This is separate from the standard `_remap_galaxy_markdown_calls` system.

```python
# markdown_util.py
VISUALIZATION_FENCED_BLOCK = re.compile(
    r"^```\s*visualization+\n\s*(.*?)^```", re.MULTILINE | re.DOTALL
)
INVOCATION_ID_JSON_PATTERN = re.compile(r'("invocation_id"\s*:\s*)"([^"]*)"')

def process_invocation_ids(f, workflow_markdown: str) -> str:
    """Find invocation_id values in visualization JSON blocks and apply f() to them."""
```

Used during:
- `ready_galaxy_markdown_for_import()` — decode encoded IDs
- `ready_galaxy_markdown_for_export()` — encode internal IDs
- `populate_invocation_markdown()` — inject invocation.id

---

## 5. Plugin System Architecture

### Plugin Discovery

Plugins are loaded from `config/plugins/visualizations/` (and custom directories). The `VisualizationsRegistry` class discovers plugins via filesystem walk:

```
config/plugins/visualizations/
  └── example/
       └── static/
            ├── example.xml     ← Config (name must match directory)
            ├── script.js       ← Entry point
            └── logo.svg        ← Optional logo
```

A directory is a valid plugin if it contains `static/{directory_name}.xml`. Two-level nesting is supported.

### Plugin XML Configuration

```xml
<?xml version="1.0" encoding="UTF-8"?>
<visualization name="Minimal Example" embeddable="true" hidden="false">
    <description>A visualization plugin description</description>

    <data_sources>
        <data_source>
            <model_class>HistoryDatasetAssociation</model_class>
            <test test_attr="ext">tabular</test>
        </data_source>
    </data_sources>

    <params>
        <param required="true">dataset_id</param>
    </params>

    <entry_point entry_point_type="script" src="script.js" css="styles.css" />

    <settings>
        <input>
            <name>chart_type</name>
            <help>Select chart type</help>
            <type>select</type>
        </input>
    </settings>

    <tracks>
        <input>
            <name>data_column</name>
            <help>Column to plot</help>
            <type>data_column</type>
        </input>
    </tracks>

    <specs>
        <ai_prompt>You are a charting assistant...</ai_prompt>
    </specs>

    <help format="markdown"><![CDATA[
    Plugin documentation in markdown format.
    ]]></help>
</visualization>
```

### Key XML Attributes

| Element | Required | Purpose |
|---------|----------|---------|
| `name` (attr) | Yes | Display name |
| `embeddable` (attr) | No | If `true`, appears in markdown editor toolbar |
| `hidden` (attr) | No | If `true`, hidden from all UIs |
| `disabled` (attr) | No | If present, plugin is skipped entirely |
| `data_sources` | Yes | Which Galaxy object types are compatible |
| `model_class` | Yes | `HistoryDatasetAssociation`, `LibraryDatasetDatasetAssociation`, or `Visualization` |
| `test` | No | Filter by file attributes (e.g., `ext=tabular`) |
| `params` | No | Required/optional parameters |
| `entry_point` | Yes | JavaScript module or Mako template |
| `settings` | No | Configuration inputs (axes, colors, etc.) |
| `tracks` | No | Data series/track definitions |
| `specs` | No | Custom config (e.g., `ai_prompt` for LLM-assisted charting) |

### Plugins API

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/plugins?embeddable=True` | List embeddable plugins for editor toolbar |
| `GET` | `/api/plugins?dataset_id=X` | List plugins compatible with a dataset |
| `GET` | `/api/plugins/{name}` | Get plugin metadata + entry point |
| `GET` | `/api/plugins/{name}?history_id=X` | List compatible datasets in a history |
| `POST` | `/api/plugins/{name}/chat/completions` | LLM adapter using plugin's `ai_prompt` spec |

### Editor Integration

The markdown editor queries `GET /api/plugins?embeddable=True` and generates toolbar entries:

```typescript
// services.ts
export async function getVisualizations(): Promise<Array<TemplateEntry>> {
    const { data } = await axios.get(`${getAppRoot()}api/plugins?embeddable=True`);
    return data.map((v: VisualizationType) => ({
        title: v.html,
        description: v.description || "",
        logo: v.logo ? `${getAppRoot()}${v.logo}` : undefined,
        cell: {
            name: "visualization",
            configure: true,
            content: `{ "visualization_name": "${v.name}", "visualization_title": "${v.html}" }`,
        },
    }));
}
```

Clicking a toolbar entry inserts a ` ```visualization ` block with initial JSON config. The `configure: true` flag opens a configuration dialog.

### Shipped Plugins

The Galaxy core repository ships only the `example` plugin (hidden by default). Real visualization plugins are distributed separately and installed into `config/plugins/visualizations/`. Known plugins from the Galaxy ecosystem include:

| Plugin | Description | Data Types |
|--------|-------------|------------|
| **charts** | Bar, line, scatter, pie charts | tabular, csv |
| **trackster** | Genome browser | BAM, BED, BigWig, VCF |
| **graphviz** | Network graphs (cytoscape.js) | graphml, json |
| **chiraviz** | Chimeric RNA visualization | tabular |
| **csg** | Chemical structure viewer | SDF, MOL2, PDB |
| **jupyterlite** | JupyterLite notebooks | various |

The Charts plugin (at [charts.galaxyproject.org](https://charts.galaxyproject.org)) provides the primary charting capability and is the most widely used visualization plugin.

---

## 6. Vitessce Visualizations (` ```vitessce ` blocks)

Spatial and single-cell data dashboards using the [Vitessce](https://vitessce.io/) framework.

### Syntax

````markdown
```vitessce
{
    "version": "1.0.16",
    "name": "Single-Cell Dashboard",
    "datasets": [
        {
            "uid": "A",
            "name": "My scRNA-seq",
            "files": [
                {
                    "__gx_dataset_id": "a1b2c3d4",
                    "fileType": "anndata.zarr"
                }
            ]
        }
    ],
    "coordinationSpace": {...},
    "layout": [...],
    "__gx_height": 600
}
```
````

### Special Galaxy Properties

Vitessce configs use `__gx_` prefixed properties that are resolved before rendering:

| Property | Purpose |
|----------|---------|
| `__gx_dataset_id` | Resolved to `/api/datasets/{id}/display` URL |
| `__gx_dataset_label` | Resolved via invocation store (workflow context) |
| `__gx_dataset_name` | Stripped (informational only) |
| `__gx_height` | Extracted as visualization height, removed from config |

After resolution, the cleaned config is passed to the `vitessce` visualization plugin via `VisualizationWrapper` → `VisualizationFrame`.

---

## 7. Saved Visualization Model

Galaxy also has a **Saved Visualization** model (`Visualization` + `VisualizationRevision`) for persisting visualization configurations outside of markdown:

```python
class Visualization(Base):
    __tablename__ = "visualization"
    id, user_id, title, type, dbkey, slug
    deleted, importable, published
    latest_revision_id → VisualizationRevision
    revisions, tags, annotations, ratings, users_shared_with

class VisualizationRevision(Base):
    __tablename__ = "visualization_revision"
    id, visualization_id, title, dbkey
    config  # JSON blob with full visualization state
```

Saved visualizations can be shared, published, and annotated. They're distinct from the inline markdown visualization blocks but use the same plugin infrastructure. A saved visualization's `type` field corresponds to a plugin name.

---

## 8. Summary: When to Use What

| Need | Approach | Syntax |
|------|----------|--------|
| Quick inline chart with literal data | Vega-Lite | ` ```vega ` + JSON spec |
| Chart from a Galaxy dataset | Plugin visualization | ` ```visualization ` + JSON config |
| Dataset table/preview | Galaxy directive | ` ```galaxy ` + `history_dataset_as_table(...)` |
| Dataset as rendered image | Galaxy directive | ` ```galaxy ` + `history_dataset_as_image(...)` |
| Genome browser view | Plugin (trackster) | ` ```visualization ` + `"visualization_name": "trackster"` |
| Single-cell spatial dashboard | Vitessce | ` ```vitessce ` + JSON config |
| Inline dataset name/type in prose | Inline directive | `${galaxy history_dataset_name(...)}` |

### Key Design Principles

1. **Vega-Lite is self-contained** — the JSON spec includes everything needed to render. No Galaxy objects required. Best for ad-hoc charts with embedded or external data.

2. **Plugin visualizations are data-bound** — they reference Galaxy datasets by ID and render interactively in iframes. The plugin handles all rendering; Galaxy just provides the sandbox and data access.

3. **Galaxy directives are server-resolved** — the backend fetches actual dataset content, job metadata, etc. and either preserves the directive for frontend rendering (lazy) or expands to static HTML/markdown (eager/PDF).

4. **Visualization blocks are frontend-only** — the backend passes them through unchanged (except for invocation ID encoding). All resolution and rendering happens in Vue components.

5. **Plugins are external** — chart types, genome browsers, etc. are installable packages, not hardcoded. The `embeddable` flag controls which ones appear in the markdown editor toolbar.
