---
type: research
subtype: component
tags:
  - research/component
  - galaxy/client
  - galaxy/datasets
  - galaxy/api
  - galaxy/security
component: Dataset Display
galaxy_areas: [client, datasets, api, security]
status: draft
created: 2026-10-14
revised: 2026-10-14
revision: 1
ai_generated: true
summary: "Catalog of the eight ways the UI renders dataset contents, from datatype display_data and viz plugins to display apps, peek and Markdown embeds"
sources: ["/Users/jxc755/projects/repositories/galaxy-brain/.ingest-dossiers/Component-Dataset-Display.md"]
related_notes:
  - "[[Component - Markdown Visualizations]]"
  - "[[Component - Window Manager]]"
  - "[[Component - CORS Handling]]"
  - "[[Component - Implicit Dataset Conversion]]"
  - "[[PR 21463 - Jupyternaut Adapter for JupyterLite]]"
  - "[[Component - Invocation Report to Pages]]"
related_prs: [20190, 19563, 20342, 21106, 21133, 20974, 15076, 21809, 22065, 23126, 23662, 22895, 21612]
---

# Dataset Display

Every `file:line` in this note was read at Galaxy `origin/dev` `b62d06dcdceba6faa088960eb5456087351fad17`. Client paths are relative to `client/src/` unless they start with `client/`.

## Contents

1. [Overview](#overview)
2. [Catalog at a glance](#catalog-at-a-glance)
3. [The eye-icon dispatch tree](#the-eye-icon-dispatch-tree)
4. [F1 — Datatype display protocol](#f1--datatype-display-protocol)
5. [F3 — Visualization plugins](#f3--visualization-plugins)
6. [F4 — Display applications](#f4--display-applications)
7. [F5 — Peek](#f5--peek)
8. [F6 — Markdown and Pages embeds](#f6--markdown-and-pages-embeds)
9. [F7 — Tool Markdown report](#f7--tool-markdown-report)
10. [Comparison table](#comparison-table)
11. [Decision guide](#decision-guide)
12. [Compare and contrast](#compare-and-contrast)
13. [Recent activity](#recent-activity)
14. [Known issues and surprises](#known-issues-and-surprises)

## Overview

**Scope.** This note covers every mechanism the Galaxy web UI uses to show the *contents* of a single dataset:
- the eye icon and center panel;
- visualization plugins;
- display applications, both new-style and old-style;
- the peek in the history item;
- Markdown and Pages embeds, both live and exported;
- tool Markdown reports;
- the surfaces that reuse these: collection elements, invocation and job outputs, library datasets, and the Window Manager.

**Out of scope.** Editing attributes, changing datatypes, upload, history-list mechanics, and download mechanics, except where download *is* the display decision (`display_behavior`).

**Organizing axis: who renders the bytes.** There are four tiers:
- **(a) Server.** A datatype method on a `Data` subclass.
- **(b) Generic client.** Galaxy components driven by headers that the server chooses.
- **(c) Third-party plugin.** An npm package running in an iframe.
- **(d) External site.** UCSC, IGV, and similar sites, which fetch the data back from Galaxy.

A simple "server vs client" split is too coarse. Tier (b) is client code whose behaviour is set by the server. Tier (c) is client code that Galaxy core does not own.

The eye icon is not a framework itself. It is a dispatch tree that picks one tier for each dataset. Directive syntax for Markdown is covered in [[Component - Markdown Visualizations]]. This note covers only how Markdown re-dispatches on datatype.

**Names that might be expected but don't match the code at this SHA:**
- `get_display_text` does not exist. The nearest equivalents are `Data.display_name` and `display_info` (`lib/galaxy/datatypes/data.py:734,741`), `display_peek`, and `GET /api/datasets/{id}/get_content_as_text`.
- There is no `galaxy-charts` package in the repo. Plugins are `@galaxyproject/<id>` packages listed in `client/visualizations.yml`.
- `display_in_upload` controls only the upload datatype list. It has nothing to do with display.
- There is no top-level `display_applications/` directory. The configs live in `lib/galaxy/datatypes/display_applications/configs/`.
- `VisualizationsList` is an import alias for `components/Visualizations/Index.vue` (`entry/analysis/router.js:95`), not a separate component.
- Only the `script` entry point remains for plugins. The Mako and html entry points were removed in #21133.

## Catalog at a glance

| # | Framework | Tier | Rendering owner | Selected by | Main code |
|---|---|---|---|---|---|
| F1 | **Datatype display protocol** (`display_data` + `x-*` headers) | server → generic client | `Data` subclass; `DatasetDisplay.vue` / `TabularChunkedView.vue` / `CenterFrame.vue` | datatype MRO | `lib/galaxy/datatypes/data.py:567-652`, `components/Dataset/DatasetDisplay.vue` |
| F2 | **Client type-sniff renderers** (image/svg, auto-download, pdf) | generic client | `DatasetView.vue` + `DatasetAsImage.vue` | client datatypes mapper (`isSubTypeOfAny`) + `display_behavior` | `components/Dataset/DatasetView.vue:57-82,210-234` |
| F3 | **Visualization plugins** | third-party | `@galaxyproject/*` npm package in a same-origin iframe | plugin XML `<data_sources><test test_attr="ext">` | `lib/galaxy/visualization/plugins/`, `components/Visualizations/VisualizationFrame.vue` |
| F3a | **Preferred visualization** (eye icon → plugin) | glue between F3 and datatype config | same as F3 | `<visualization plugin=…/>` in `datatypes_conf.xml` + inheritance | `lib/galaxy/managers/datatypes.py:159-206`, `lib/galaxy/datatypes/registry.py:334-350` |
| F4 | **Display applications, new-style** (GEDA XML) | external site | UCSC/IGV/IGB/Ensembl/… fetching back from Galaxy | `<display file=…/>` under `<datatype>` + `<filter>` | `lib/galaxy/datatypes/display_applications/`, `lib/galaxy/managers/display_applications.py` |
| F4b | **Display applications, old-style** (`add_display_app`) | external site | hardcoded in the datatype class | Python `__init__` of Interval/Gff/Wiggle/CustomTrack/GenomeGraphs | `lib/galaxy/datatypes/interval.py:121,813-814,1285-1286,1462` |
| F5 | **Peek** | server HTML → client sanitizes | `set_peek` (when metadata is set) + `display_peek` (when serialized) | datatype MRO | `data.py:358-385`, `tabular.py:329-331` |
| F6 | **Markdown dataset directives**, live | generic client, with its own dispatcher | `components/Markdown/Sections/Elements/*` | its own `isSubTypeOfAny` lists; **ignores F3a** | `HistoryDatasetDisplay.vue:58-91` |
| F6b | **Markdown → basic/PDF export** | server | `Data.display_as_markdown` | datatype MRO | `data.py:654-680`, `lib/galaxy/managers/markdown_util.py:860-920` |
| F7 | **Tool Markdown report** (`tool_markdown` extension) | Markdown renderer | `components/Tool/ToolReport.vue` | extension string hardcoded in `ContentItem` | `ContentItem.vue:178-179`, `services/datasets.py:546-556` |
| F8 | **Interactive tool entry point** | external live container | a running GxIT | an `entryPointStore` hit for the dataset | `ContentItem.vue:222-229` |
| — | Structured/provider data APIs (`/content/{type}`, `?data_type=raw_data`) | server data for plugins | datatype | called by plugins | `lib/galaxy/webapps/galaxy/api/datasets.py:575-592` |

## The eye-icon dispatch tree

### History item → URL (`components/History/Content/ContentItem.vue`)

`itemUrls` (`:166-191`) builds the URLs. The display URL is `/datasets/${id}` by default (`:177`), with two exceptions:
- `tool_markdown` datasets go to `/datasets/${id}/report` (**F7**).
- Datasets that are not OK go to `/details`.

`onDisplay()` (`:222`) then does one of two things:
1. If `entryPointStore.entryPointsForHda(id)` returns anything, it opens `window.open(entryPoints[0].target)`. This is **F8**.
2. Otherwise it calls `pushToFrameOrPage({framedUrl: display + "?displayOnly=true", inlineUrl: display})` (`composables/windowAwareNavigation.ts:57-60`). When the frame is active this opens a WinBox window, as described in [[Component - Window Manager]].

`ContentItem` is reused through `GenericItem.vue` in several places: invocation step and IO tabs, `JobInformation/JobOutputs.vue`, the collection creator, workflow extraction cards, and `CollectionPanel`. All of these surfaces therefore share this same tree.

### Route → `DatasetView` (`entry/analysis/router.js:276-286`)

The route `datasets/:datasetId/:tab?` is named `"DatasetDetails"` but renders `components/Dataset/DatasetView.vue`. The `tab` value is one of {details, edit, error, preview, raw, visualize}, with `preview` as the default. `displayOnly` hides the header and the tabs.

Two routes sit alongside it:
- `datasets/:datasetId/report` → `ToolReport` (`:264-268`)
- `display_applications/:datasetId/:appName/:linkName` → `DisplayApplication.vue` (`:291-296`)

### `DatasetView` preview branch (`DatasetView.vue:210-234`)

First, `watch(dataset.file_ext)` fetches `GET /api/datatypes/{ext}` through `datatypeStore.fetchDatatypeDetails` (`stores/datatypeStore.js:32-46`). The preview branch then takes the first match from this list:

1. **`preferredVisualization`** (`:85-87`) → `<VisualizationDisplay>`. This is **F3a → F3**.
2. **`isAutoDownloadType && !isPdf`** (`display_behavior === "download"`) → a "Download Required" card that links to `/api/datasets/{id}/download`.
3. **`isImageDataset && !isPdf`** (a subclass of `galaxy.datatypes.images.Image`, *or* `file_ext === "svg"` at `:73`) → `<DatasetAsImage>`. This is **F2**.
4. Anything else → `<DatasetDisplay :is-binary>`. This is **F1**.

Other tabs and special cases:
- The `raw` tab exists **only when a preferred visualization exists** (`:176-182`). It skips steps 1 and 3, which is how a user sees a BAM as SAM text instead of in IGV.
- The `visualize` tab shows `Visualizations/Index.vue`, which lists display apps (F4) above plugins (F3).
- PDF is exempted from steps 2 and 3. It falls through to `DatasetDisplay` and renders in the browser's PDF viewer, even though its `display_behavior` is `"download"` (`lib/galaxy/datatypes/images.py:531`).

### `DatasetDisplay` endings (`components/Dataset/DatasetDisplay.vue`)

`DatasetDisplay` uses the **legacy WSGI** URL `/datasets/{id}/display/?preview=True` (`:44,49`), not FastAPI.

How it decides (`:88-98`):
- `useDirectPreview` is true when the extension ends in `html` or the datatype has `composite_files`. These need a real `/display/` URL so relative asset links resolve.
- It sends `HEAD` when direct preview is on and `GET` otherwise.
- It reads four headers: `x-content-chunked`, `x-content-truncated`, `x-sanitized-job-imported` and `x-sanitized-tool-id`.

There are three endings:
- **Chunked** → `<TabularChunkedView>`.
- **Direct** → `CenterFrame src=/datasets/{id}/display/?preview=True`.
- **Otherwise** → `URL.createObjectURL(blob)` → `CenterFrame src=blob:…`.

It can also show three banners: sanitization (with an `/admin/sanitize_allow` link for admins), binary-shown-as-ASCII, and truncation (with a download link). `CenterFrame` (`entry/analysis/modules/CenterFrame.vue:39-48`) is a bare `<iframe>` **with no `sandbox` attribute**.

## F1 — Datatype display protocol

### Routes that reach `display_data`

| Route | Kind | Handler | Used by |
|---|---|---|---|
| `/datasets/{id}/display/{filename}`, `/datasets/{id}/{action}/{filename}` | legacy WSGI (`buildapp.py:118-131`) | `controllers/dataset.py:115-149` | `DatasetDisplay.vue`, Markdown `HistoryDatasetDisplay.vue:176` |
| `/dataset/display?dataset_id=` | legacy WSGI `/{controller}/{action}` | same | `TabularChunkedView.vue:96-98`, `DatasetAsImage.vue:27-32`, `components/Markdown/gxuris.ts:31` |
| `GET/HEAD /api/datasets/{id}/display` | FastAPI (`api/datasets.py:315-366` → `services/datasets.py:752-817`) | — | `getCompositeDatasetLink`, `MarkdownVitessce.vue:44,55` |
| `GET /api/datasets/{id}/download` | FastAPI (`api/datasets.py:413-433`) | 302 to an object-store direct URL, or to `display?to_ext=data` | download buttons |

The eye icon and Markdown use the legacy controller, so they never reach the object-store `allow_stream` path that #22895 added (`services/datasets.py:788-790`, reachable only through FastAPI `_display`). The legacy `_check_dataset` also still accepts unencoded integer ids (`controllers/dataset.py:97-113`).

### The `Data.display_data` contract (`data.py:567-652`)

The signature is `display_data(self, trans, dataset, preview=False, filename=None, to_ext=None, **kwd)`. It returns a `(body, headers)` tuple. The docstring warns that overriders should "be very careful… this interface… will likely change" and carries the note "TODO: Document alternatives to overriding this method (data providers?)".

Steps:
- `X-Content-Type-Options: nosniff` is always set.
- When `filename` names an extra file, a directory gets a temporary HTML listing and a file gets a guessed mimetype.
- When `to_ext` is set, the call goes to `_serve_file_download`. Composite datasets are zipped.
- Otherwise the content is served `inline`, with a `max_peek_size` that depends on the datatype (`:171-182`):
  - 1 MB by default;
  - **50 MB** for `Html`;
  - 100 KB for `Binary`.

  Binary previews become `text/plain` with `x-content-truncated`. Large text is truncated the same way. Images and small files are served whole through `_yield_user_file_content`.

### Header protocol (server → `DatasetDisplay.vue`)

| Header | Set by | Client reaction |
|---|---|---|
| `x-content-chunked: true` | `TabularData.display_data` (`tabular.py:213-215`), `BamNative` (`binary.py:887-889`) | `TabularChunkedView` |
| `x-content-truncated: <n>` | `data.py:544,564`, `tabular.py:210`, `sequence.py:343` | truncation banner |
| `x-sanitized-job-imported` / `x-sanitized-tool-id` | `data.py:692,695` | sanitization banner |
| `content-type` | `_clean_and_set_mime_type` (`data.py:1066-1070`) | the browser's iframe behaviour |

Nothing types this protocol. It is a string contract between `data.py`, `tabular.py` and `binary.py` on one side and `DatasetDisplay.vue:93-98` on the other.

### HTML "sanitization" is a content-type downgrade

`_yield_user_file_content` (`data.py:682-698`) applies when `sanitize_all_html` is on (the default) and the content is `text/html`. It serves `text/plain` instead in two cases:
- the creating job was imported;
- the creating `tool_id` is not covered by a `sanitize_allowlist` prefix.

The HTML itself never goes through `galaxy.util.sanitize_html`. This behaviour came from #19563 (2025-02). The wording at `lib/galaxy/config/sample/galaxy.yml.sample:1934-1938` ("will be sanitized thoroughly") is out of date. On the datatype path, `sanitize_html` is still used only by the ISA preview (`isa.py:270`) and the Markdown basic export (`markdown_util.py:1121`).

`XSS_VULNERABLE_MIME_TYPES` (`image/svg+xml`, `application/xml`; `data.py:79-82`) are also downgraded to `text/plain` unless `serve_xss_vulnerable_mimetypes` is set. Its schema default is `false`, but the code falls back with `getattr(…, True)` at `data.py:1068`.

**Trust model.** No iframe in this area is sandboxed, so allowlisted HTML runs **same-origin** with full session access. The allowlist grants trust; it does not filter anything. This is tested by `test/integration_selenium/test_allowlist_sanitization.py`.

### Datatype overrides of `display_data`

| Class | Location | Preview behaviour |
|---|---|---|
| `TabularData` | `tabular.py:181-215` | `offset` → `get_chunk` JSON. More than 100 columns → raw if under 1 MB, otherwise **`content-type: text/html`** truncated (`:200-210`). Otherwise `x-content-chunked` plus the first chunk |
| `BamNative` | `binary.py:870-889` | chunked SAM text via pysam |
| `H5MLM` | `binary.py:2630-` | JSON summary of attrs and config |
| `Sequence` | `sequence.py:321-` | `text/plain` 100 KB peek |
| `_Isa` | `isa.py:202-270` | HTML summary → `sanitize_html` → `text/html` |
| `Ipynb` | `text.py:248-262` | `nbconvert --to html` when `trust_jupyter_notebook_conversion` is set |
| `ZarrDirectory` | `data.py:1350-1367` | store metadata as `application/json` |
| `_BlastDb`, `_SpalnDb` | `blast.py:207-`, `spaln.py:112-` | composite DB summary |

The chunk reader is `TabularData.get_chunk` / `_read_chunk` (`tabular.py:150-179`). It seeks to a byte `offset` and reads `display_chunk_size` bytes (65536 by default), extended to the next newline.

### `display_behavior` (the client auto-download hint)

`Data.display_behavior: Literal["inline","download"] | None` is declared at `data.py:249`. `get_display_behavior()` (`:280-293`) uses `download` when `is_binary` is set, and `inline` otherwise.

Datatypes that set it explicitly:
- archives (`binary.py:432,461`);
- office documents (`binary.py:3640-3736`);
- `Image`, inline (`images.py:67`);
- `Tiff`, download (`:232`);
- proprietary microscopy formats (`:440-455`);
- PDF (`:531`).

It is exposed only through `GET /api/datatypes/{datatype}` (`api/datatypes.py:233-235`) and was added in #20342.

### Client tabular renderer (`components/Dataset/Tabular/TabularChunkedView.vue`)

- **Scrolling:** infinite scroll through `useInfiniteScroll` (#23662, with a scroll fix in #23657).
- **Columns:** headers from `metadata_column_names`, alignment from `metadata_column_types`.
- **Parsing:** delimiter `,` only when `file_ext === "csv"`. Parsing uses `csv-parse/sync` and falls back to splitting lines. `processRow` pads or merges overflow columns for SAM-like data.
- **Origin:** it replaced the Mako tabular_chunked view in #21106.

## F3 — Visualization plugins

### Packaging and discovery

**Install list.** `client/visualizations.yml` maps about 50 ids to `@galaxyproject/<pkg>` versions. They include aceeditor, alignmentviewer, cytoscape, h5web, heatmap, igv, jupyterlite, molstar, niivue, openlayers, plotly_*, rmsxflipbook, tabulator, tiffviewer, varri, vitessce, vizarr and vtk.

**Build.** `client/scripts/build.mjs` does the work:
- `installVisualizations` (`:114-178`) runs `npm install` for each package and copies it to `config/plugins/visualizations/<ID>/`. It asserts that `static/<ID>.xml` exists.
- `stagePlugins` (`:69-111`) copies each plugin's `static/` to `static/plugins/visualizations/`.
- Setting `SKIP_VIZ` skips both steps.

**In-repo plugins.** The only one is `config/plugins/visualizations/example/` (hidden). Its `<!DOCTYPE … visualization.dtd>` points at a DTD that does not exist.

**Registry.** `VisualizationsRegistry` (`lib/galaxy/visualization/plugins/registry.py:29`) is built in `lib/galaxy/app/__init__.py:1045-1051`.
- A plugin is detected when `<dir>/static/<dir>.xml` exists. **The plugin's name is the directory name** (`:137`).
- Duplicate names are skipped.
- `VisualizationPlugin.to_dict` (`plugin.py:26-44`) sets `href = url_prefix + /static/plugins/visualizations/<name>/static`. The URL-prefix fix is #23357.

### XML config (`config_parser.py`, `PluginConfigParser` since #21612)

`parse_plugin` (`:49-127`) reads:
- `name` (required);
- `disabled`, `embeddable` and `hidden`;
- at least one `data_source`;
- optionally `params`, `specs`, `tags`, `tracks`, `settings` and `tests`.

`parse_entry_point` (`:129-140`) now just returns `{"attr": dict(attrib)}`. The client reads `src`, `css` and `type` from it. **`entry_point_type` is dead**: the Mako and html entry types were removed in #21133.

`DataSourceParser.ALLOWED_MODEL_CLASSES` is `Visualization`, `HistoryDatasetAssociation` and `LibraryDatasetDatasetAssociation` (`:155-156`).

### Datatype matching

`registry.get_visualization` (`:172-187`) checks each `data_source`. If the target is an `isinstance` of its `model_class`, and its tests are `None` or `is_object_applicable(...)` passes, the plugin applies.

`is_object_applicable` (`datasource_testing.py:34-51`):
- **Only** evaluates `attr == "ext"` with `type == "eq"`.
- Checks `isinstance(target.datatype, type(registry[result]))`, so **subclasses match**.
- Requires the state to be `ok` or `deferred`. Deferred datasets also need a matching `allow_uri_if_protocol`.
- Fails silently for any other kind of test.

**Bug: a `data_source` with no `<test>` never matches a dataset.**
- `parse_tests` returns `[]`, not `None` (`config_parser.py:202-203`).
- `registry.py:185` only short-circuits on `None`, and `is_object_applicable([])` returns `False`.
- This contradicts the comment at `config_parser.py:170-171` ("when no tests are given, default to isinstance( object, model_class )").
- The integration fixture `test/integration/test_visualization_plugins/jupyterlite/static/jupyterlite.xml` has exactly this kind of test-less source.
- `test/integration/test_plugins.py` never passes `?dataset_id=`, so the case is untested.

### API (`lib/galaxy/webapps/galaxy/api/plugins.py`)

- `GET /api/plugins?dataset_id=&embeddable=` (`:335-355`) lists applicable plugins and **skips hidden ones**.
- `GET /api/plugins/{id}?history_id=` (`:357-390`) returns the plugin plus the matching datasets in that history.
- `POST /api/plugins/{name}/chat/completions` (`:140-`, unstable) is an OpenAI-compatible LLM proxy driven by `specs.ai_prompt`. See [[PR 21463 - Jupyternaut Adapter for JupyterLite]].

### Client

**Picker.** `Visualizations/Index.vue` shows `DisplayApplications` (F4) above `VisualizationPanel`. `VisualizationPanel` calls `fetchPlugins(datasetId)` and sorts embeddable plugins first. Choosing one pushes `/visualizations/display?visualization=&dataset_id=`.

**Route.** `visualizations/display` renders `VisualizationDisplay.vue` (`router.js:734-743`). It loads a saved `/api/visualizations/{id}` config when given `visualization_id`; otherwise it uses `{dataset_id}`.

**Frame.** `VisualizationFrame.vue` works like this:
1. Fetches `GET /api/plugins/{name}`.
2. Writes `<div id="app" data-incoming='{root, visualization_config, visualization_id, visualization_plugin, visualization_title}'>` into the iframe's own `about:blank` document (`:60-75`).
3. Injects `<script type=module src=href/entry_point.src>` and the CSS (`:77-93`).
4. Listens for `postMessage {from:"galaxy-visualization", …}` from `iframe.contentWindow`, debounced to 300 ms.

The iframe has **no `src` and no `sandbox`** (`:129-134`), so the plugin runs same-origin with Galaxy. The trust boundary is that an admin installed this npm package.

`VisualizationFrame` is reused by `VisualizationPublished.vue` and the Markdown `VisualizationWrapper.vue`.

### F3a — Preferred visualization (eye icon → plugin)

**Config.** A `<visualization plugin="igv"/>` child of `<datatype>` is parsed at `registry.py:334-350` into `visualization_mappings[ext]`. Mappings shipped in the sample config:

| Datatype | Plugin |
|---|---|
| `bam` | igv |
| `parquet` | atlas |
| `rmsx.json` | rmsxflipbook |
| `geojson` | openlayers |
| `varri.json` | varri |
| `vitessce.json` | vitessce |
| `h5` | h5web |
| `hyphy_results.json` | hyphyvision |
| `tiff` | tiffviewer |
| `ipynb` | jupyterlite |
| `sdf`, `mol`, `mol2`, `cml`, `pdb`, `gro` | molstar |
| `fits` | aladin |

**Resolution.** `get_preferred_visualization` (`managers/datatypes.py:159-206`):
- A direct hit on the extension wins.
- Otherwise it walks `class_to_classes` (the datatype class plus all its `Data` ancestors) and returns the **first mapping in config order** whose extension class is an ancestor. This is not necessarily the nearest ancestor.

`GET /api/datatypes/{datatype}` includes `preferred_visualization` only when the plugin is actually installed (`api/datatypes.py:257-275`).

**Consequences of inheritance:**
- Every H5 subclass (Anndata, Loom, Cool, MCool, Biom2, NetCDF4, H5MLM, …) and every H5 extension declared `subclass="true"` (`scool`, `h5mu`, `mz5`, …) **opens h5web from the eye icon**.
- `ProBam` opens igv.
- `OMETiff` opens tiffviewer.

**Likely bug (inferred from the code, not run): Json dynamic-subclass collision.**
1. `subclass="true"` builds the class with `type(name, (cls,), {})` (`registry.py:270-271`), so every such class gets `__module__ == "galaxy.datatypes.registry"`.
2. Every Json-based subclass extension therefore shares the class name `galaxy.datatypes.registry.Json`.
3. As a result, `freq.json`, `anvio_state`, `d3_hierarchy`, `hivtrace` and `mzqc` would resolve to **rmsxflipbook**, the first such mapping in config order.

**Dead parallel client path.**
- `stores/datatypeVisualizationsStore.ts` and `api/datatypeVisualizations.ts` call `GET /api/datatypes/visualizations`. That route does not exist and is not in the OpenAPI schema.
- The real route, `/api/datatypes/{datatype}/visualizations` (`api/datatypes.py:176-196`), only does direct extension lookup. It has no inheritance and no check that the plugin is installed, which is different from the `preferred_visualization` field.
- The store is imported only by a `vi.mock` in `DatasetView.test.js`. It is leftover sketch code from #20190, the PR that introduced preferred visualizations.

## F4 — Display applications

### New-style (GEDA XML)

**Registration.**
- `<registration display_path="display_applications">` declares the path. Each datatype adds `<display file="igv/bam.xml" [inherit="true"]/>`; there are 40 active entries.
- If `./display_applications` is missing, `registry.py:181-190` falls back to `lib/galaxy/datatypes/display_applications/configs`.
- Shipped configs: biom, ensembl, gbrowse, icn3d, igb, igv, image (avivator), intermine, iobio, minerva, qiime, rviewer and ucsc.
- The loader is `registry.load_display_applications` (`:752-792`). `inherit` works by class.

**Model.**
- `DisplayApplication`, `DisplayApplicationLink` and `PopulatedDisplayApplicationLink` are in `display_applications/application.py`.
- `<url>` is a Cheetah template, `<filter>` restricts links per dataset, and `<dynamic_links>` builds links from site tables.
- Parameters (`parameters.py`) come in two kinds:
  - **`data`** parameters accept `format=`, which triggers **implicit conversion** via `convert_dataset(..., visible=False)` (`:164-187`; see [[Component - Implicit Dataset Conversion]]). They also take `metadata=`, `viewable` and `allow_extra_files_access`.
  - **`template`** parameters are Cheetah text.
- A per-parameter `allow_cors` is honoured at `controllers/dataset.py:591-593` (see [[Component - CORS Handling]], mechanism 5).

**Serialization.** The HDA serializer adds `display_apps` (`managers/hdas.py:625,667-689`) and, when `enable_old_display_applications` is set, `display_types` for old-style links.

**Client flow.**
1. The Visualize tab's `DisplayApplications.vue` lists both kinds of link. They are **not** in the expanded history item; `DatasetActions.vue` only has a Visualize button that leads to that tab.
2. A new-style link routes to `DisplayApplication.vue`, which calls `POST /api/display_applications/create_link` (`api/display_applications.py:46-63`).
3. `DisplayApplicationsManager.create_link` (`managers/display_applications.py:114-205`) returns one of two things:
   - `{resource: url}`, which the client opens with `window.open`;
   - `{refresh, preparable_steps}` while conversion jobs run, in which case the client polls every 2 seconds.

**External callback.** `/display_application/{dataset_id}/{app_name}/{link_name}/{user_id}/{app_action}/{action_param}/{action_param_extra}` (`buildapp.py:132-143`) is handled by `controllers/dataset.py:480-617`. It uses hashed dataset and user ids. It serves bytes for `viewable` parameters and redirects to `display_url()` when there is no action.

**History.** The Vue rewrite was #15076 (2025-11), followed by #21809 and #22383.

### Old-style (hardcoded in datatypes)

- `Data.add_display_app(...)` (`data.py:763-`) is called from `Interval` (`interval.py:121`, UCSC), `Gff` (`:813-814`), `Wiggle` (`:1285-1286`), `CustomTrack` (`:1462`) and `GenomeGraphs` (`genetics.py:74`).
- `ucsc_links` (`interval.py:313-342`) builds `display_at` links that contain the **raw integer `dataset.id`**.
- `controllers/dataset.py:449-478` `display_at` grants a `host_security_agent` permission and then redirects.
- These links are gated by `enable_old_display_applications`, which defaults to true. The sample config itself warns about open-redirect risk.
- New datatypes should use new-style display applications instead.

## F5 — Peek

**Computing.**
- `set_peek` runs when metadata is set and stores `peek` and `blurb`. Implementations: base `data.py:358-367`, `Text` at `:1145`, `TabularData` at `tabular.py:130`.
- `Html` peek is just the literal `"HTML file"`.
- Parquet got a real peek in #24085.

**Rendering.** `display_peek` has 84 definitions under `lib/galaxy/datatypes`.
- The base version builds an HTML table of escaped lines.
- `TabularData.display_peek` → `make_html_table` adds **column headers from metadata** (`tabular.py:329-331`).

**Serializing.** `managers/datasets.py:683` includes `display_peek()` unless the peek is `"no peek"`.

**Client.** Every consumer goes through DOMPurify `v-sanitize-html` (`directives/sanitizeHtml.ts`):
- the expanded history item, `components/History/Content/Dataset/DatasetDetails.vue:73`;
- the Details tab, `components/DatasetInformation/DatasetDetails.vue:144-147`;
- `LibraryDataset.vue:139`;
- Markdown `HistoryDatasetDetails.vue` (`history_dataset_peek`);
- `CollectionTree.vue`.

Peek is the only framework whose server-generated HTML is injected into Galaxy's main document, which is why it is sanitized in the client.

## F6 — Markdown and Pages embeds

Directive syntax is covered in [[Component - Markdown Visualizations]]. The dispatch relevant to display happens in `MarkdownGalaxy.vue`:

| Directive | Component | Framework it reuses |
|---|---|---|
| `history_dataset_display` | `HistoryDatasetDisplay.vue` | **Its own dispatcher** (`:58-91`). pdf/html → `BEmbed` iframe on the legacy `/display/?preview=True` route (unsandboxed). Image → `HistoryDatasetAsImage`. Tabular → `GTable` over `get_content_as_text`. Anything else → `<pre>`. **Never consults F3a**: a BAM shows as text in a Page but opens IGV from the eye icon |
| `history_dataset_as_image` | `HistoryDatasetAsImage.vue` | `DatasetAsImage.vue` (F2), shared with the eye icon |
| `history_dataset_as_table` | `HistoryDatasetAsTable.vue` | `get_content_as_text` → `GTable` |
| `history_dataset_peek` | `HistoryDatasetDetails.vue` | F5 |
| `history_dataset_index` | `components/Dataset/DatasetIndex/` | composite listing |
| ```` ```visualization ```` block | `VisualizationWrapper` → `VisualizationFrame` | F3 |

`get_content_as_text` (`services/datasets.py:819-843`) calls `hda_manager.text_data(preview=True)` and returns `{item_data, truncated, item_url}`.

**F6b — basic/PDF export** (`ToBasicMarkdownDirectiveHandler`, `markdown_util.py:860-`):
- `handle_dataset_display` → `datatype.display_as_markdown(hda)`.
  - The base implementation (`data.py:654-680`) inlines png/jpg images, prints "*cannot display binary content*" for binary data, and fences text up to 1 MB.
  - `Tabular` overrides it to use `make_html_table`.
- `handle_dataset_as_image` always embeds the image as `data:image/png`, whatever the real format (`:907`).
- `handle_dataset_as_table` ignores its options (TODO at `:915-918`).
- `handle_visualization` → "*Visualization inputs not implemented*".
- The final HTML goes through `sanitize_html(..., allow_data_urls=True)`.

## F7 — Tool Markdown report

- **Datatype:** `tool_markdown` is plain `galaxy.datatypes.text:Text`. The `/report` redirect is hardcoded on the extension string in `ContentItem.vue:178-179`.
- **Client:** `ToolReport.vue` fetches `/api/datasets/{id}/report` and renders read-only `<Markdown>`. It passes the literal `download-endpoint="TODO"` (`:34`).
- **Server:** `services/datasets.py:546-556` reads **only the first 10 KB**, runs `resolve_job_markdown` against the job that created the dataset, and then `ready_galaxy_markdown_for_export`. Directives in a tool output therefore resolve against that job's inputs and outputs.

## Comparison table

| | F1 datatype protocol | F2 client sniff | F3 viz plugins | F3a preferred viz | F4 display apps | F5 peek | F6 Markdown live | F6b Markdown export |
|---|---|---|---|---|---|---|---|---|
| **Who renders** | server bytes + headers; generic Vue shell | `<img>` / download card | third-party JS in iframe | (selector only) | external website | server HTML, client sanitizes | its own Vue dispatcher | server Markdown → HTML/PDF |
| **Config surface** | `display_data` override; `display_behavior`; `display_chunk_size` | hardcoded in `DatasetView.vue:57-82` | `client/visualizations.yml` + plugin XML | `<visualization plugin>` in `datatypes_conf.xml` | GEDA XML + `<display file>`; `enable_old_display_applications` | `set_peek` / `display_peek` | hardcoded `isSubTypeOfAny` lists | `display_as_markdown` |
| **Datatype matching** | Python MRO | client mapper + `svg`/`pdf` literals | `isinstance` on `ext`/`eq` tests only | direct ext, else first ancestor in config order | per-ext `<display>` + `inherit` + `<filter>` | MRO | client mapper | MRO |
| **Security** | content-type downgrade (allowlist, XSS-prone mimetypes); unsandboxed same-origin iframe | `<img>` (SVG scripts inert) | none: same-origin, unsandboxed | n/a | hashed ids; `viewable`; per-param `allow_cors` | DOMPurify | DOMPurify for text; unsandboxed `BEmbed` for html/pdf | `sanitize_html` (bleach) |
| **Embeddable in Pages** | indirectly (`history_dataset_display`) | yes (shared component) | yes if `embeddable="true"` | **no** | no | yes | — | — |
| **Tests** | API `test_datasets.py:344-680`; selenium `test_dataset.py`, `test_dataset_display_extra_files.py`; allowlist integration-selenium | `DatasetView.test.js` | unit `test/unit/app/visualizations/plugins/`; `test/integration/test_plugins.py`; selenium `test_visualizations.py`; client `VisualizationFrame*.test.js` | **`it.skip`** at `DatasetView.test.js:361`; no API or inheritance test | API `test_display_applications.py`; client `DisplayApplication(s).test.js` | `test_tool_form.py:33`; `DatasetDetails.test.ts` | `HistoryDatasetDisplay.test.js`, `MarkdownGalaxy.test.js` | Markdown export API tests |

**Gaps in test coverage:**
- No unit test for `DatasetDisplay.vue`.
- `display_behavior` is covered only by `test/unit/data/datatypes/test_warc.py:31`.
- `GET /api/datatypes/{datatype}` is not exercised in `lib/galaxy_test/api/test_datatypes.py`.

## Decision guide

| You want… | Extend |
|---|---|
| Better raw text or HTML from the eye icon (a server-computed summary, decompression, custom chunking) | **F1**: override `display_data` and keep the `(body, headers)` contract and the `preview`/`to_ext`/`offset` semantics. Emit `x-content-chunked` plus `{ck_data, offset}` JSON to get the infinite-scroll table for free |
| An interactive JS viewer, selectable from the Visualize tab | **F3**: publish `@galaxyproject/<id>`, add it to `client/visualizations.yml`, and write `<id>.xml` with `<data_source><model_class>HistoryDatasetAssociation</model_class><test test_attr="ext">Y</test>`. **The test is mandatory** (see the bug above) |
| That viewer to *be* the eye icon | **F3a**: add `<visualization plugin="<id>"/>` inside the `<datatype>`. It propagates to every subclass and, today, to colliding `subclass="true"` siblings. Users keep a "Raw" tab |
| The viewer in Pages too | Set `embeddable="true"`. F3a does **not** apply to `history_dataset_display` |
| The browser to download instead of previewing | Set `display_behavior = "download"` on the class |
| An external site (UCSC/IGV) with a callback | **F4**: add a GEDA XML in `display_applications/configs/` plus `<display file=…/>`. Use `format=` for automatic conversion, and `allow_cors` only if the site fetches cross-origin. Don't use `add_display_app` |
| A snippet in the history panel | **F5**: `set_peek` / `display_peek` (sanitized; no scripts) |
| Good PDF or Page export | **F6b**: override `display_as_markdown` |
| A tool's HTML output rendered as HTML | Add the tool to the admin allowlist (`/admin/sanitize_allow`). This is same-origin script execution |

## Compare and contrast

1. **Datatype-owned vs plugin-owned.**
   - F1, F5, F6b and F4b are methods on `Data` subclasses, and the class hierarchy is the only selector.
   - F3 inverts ownership: the plugin declares which datatypes it accepts.
   - F3a is the bridge: a declaration on the datatype side that names a plugin.
2. **Two independent client dispatchers.**
   - `DatasetView.vue:57-82` handles svg, pdf, auto-download and preferred visualization.
   - `HistoryDatasetDisplay.vue:58-91` handles pdf/html → iframe and tabular → GTable.
   - Each hand-rolls its own `isSubTypeOfAny` lists, and neither consults the other.

   **The main missing abstraction is a shared resolver for "render this dataset on surface S".**
3. **Four tabular renderers with no shared parser.**
   - `TabularChunkedView` (csv-parse over the chunk endpoint).
   - Markdown `HistoryDatasetDisplay` and `HistoryDatasetAsTable`, both `GTable` via `Markdown/Utilities/tabularData`.
   - Server-side `make_html_table` (peek and PDF).

   By contrast, `DatasetAsImage` is reused by the eye icon and Markdown, and `VisualizationFrame` is reused by the eye icon, Pages and published visualizations.
4. **The header protocol is an implicit contract.** Four `x-*` headers change client behaviour, and nothing types them.
5. **Legacy routes vs FastAPI.** The eye icon and Markdown use the legacy WSGI display routes. Only composite links and Vitessce use FastAPI `/api/datasets/{id}/display`, which is the route with object-store streaming and typed parameters.
6. **Security differs per framework.**
   - Content-type downgrade (F1).
   - DOMPurify (F5, F6 text).
   - `sanitize_html` (ISA, F6b).
   - No isolation at all for plugins (F3) or allowlisted HTML.

   No iframe in this area sets `sandbox`.

## Recent activity

| PR | Merged | What |
|---|---|---|
| #20974 | 2025-10-13 | Remove Trackster |
| #21106 | 2025-10-29 | Mako tabular_chunked → `TabularChunkedView` |
| #21133 | 2025-11-03 | Remove visualization Mako; drop mako/html entry types |
| #15076 | 2025-11-11 | Display applications → Vue + `create_link` API |
| #21231 | 2025-11-21 | State header in `DatasetView` |
| #21463 | 2026-01-06 | JupyterLite AI adapter (`/api/plugins/{name}/chat/completions`) |
| #21612 | 2026-01-27 | Parser cleanup, rename to `PluginConfigParser`, remove legacy params |
| #21809 | 2026-02-11 | Display application follow-up |
| #22065 | 2026-03-12 | SVG treated as image in preview |
| #22383 | 2026-04-07 | Display application ready-error message |
| #23007 | 2026-06-30 | atlas plugin (parquet preferred viz) |
| #22895 | 2026-07-08 | Object-store direct download / `allow_stream` |
| #23126 | 2026-07-17 | HEAD + direct URL for html/composite, blob iframe otherwise |
| #23357 | 2026-08-25 | Plugin static URLs under URL prefix |
| #23531 | 2026-09-13 | RMSX datatype + viewer backport (duplicate `rmsx.json`) |
| #23657, #23662 | 2026-09-23/24 | Chunked tabular scroll fix; infinite-scroll rewrite |
| #24085 | 2026-10-14 | Parquet↔tabular converters, fixed Parquet peek |

Older PRs where these features originated: #19563 (sanitize → text/plain, 2025-02), #20190 (preferred viz, 2025-05), #20342 (`display_behavior`, 2025-06) and #15394 (HDF5 structured content API, 2023-05).

## Known issues and surprises

Everything below was confirmed by reading the code at this SHA, except the items marked *inferred*.

**Bugs and broken or skipped tests**

1. **A test-less `data_source` never matches a dataset.** `registry.py:185` and `config_parser.py:202-203` disagree with the comment at `:170-171`.
2. ***Inferred:* Json `subclass="true"` siblings resolve their preferred viz to rmsxflipbook.** Separately, preferred-viz resolution picks the first ancestor in config order, not the nearest one.
3. **A dead parallel store calls a missing route.** `datatypeVisualizationsStore.ts` requests `GET /api/datatypes/visualizations`, which does not exist.
4. **A selenium test always skips because of a name mismatch.** `lib/galaxy_test/selenium/test_visualizations.py:19,27` asks for `"annotate_image"`, but the plugin installs as `annotateimage`, so `skip_without_visualization_plugin` always skips.
5. **The preferred-viz unit test is `it.skip`** (`DatasetView.test.js:361`).
6. ***Inferred:* SVG fails under the default config.** The server serves it as `text/plain`, so `DatasetAsImage` likely shows "does not appear to be an image".
7. **Wide tabular data gets the wrong content type.** `TabularData` with more than 100 columns and over 1 MB is served as `content-type: text/html` (`tabular.py:200-210`).

**Security posture**

8. **HTML is not sanitized, only downgraded to `text/plain`.** The `galaxy.yml.sample:1933-1938` wording is stale.
9. **No `sandbox` on any display iframe** (`CenterFrame.vue:39`, `VisualizationFrame.vue:129`, Markdown `BEmbed`).
10. **The legacy controller still accepts unencoded integer ids** (`_check_dataset`), and old-style display apps put raw `dataset.id` values in URLs.

**Config and naming cruft**

11. **Duplicate `rmsx.json` datatype** at `datatypes_conf.xml.sample:166` and `:1266`.
12. **`resource_parser.py` is orphaned.** Commit `2d1a0458212` ("Remove unused resource parser and utilities") deleted only `utils.py`.
13. **Missing DTD** referenced by `example.xml`.
14. **Ambiguous names.** There are two `DatasetDetails.vue` files, and the route named `DatasetDetails` renders `DatasetView`.

**Gaps and TODOs**

15. **Markdown basic export** hardcodes png, and `handle_dataset_as_table` ignores its options.
16. **`ToolReport.vue:34`** has `download-endpoint="TODO"`, and the report reads only the first 10 KB.
17. **Plugin data APIs can't be verified in-repo.** `?data_type=raw_data&provider=` and `/api/datasets/{id}/content/{type}` serve external plugins only; no core client code calls the provider path.

## Related

- [[Component - Markdown Visualizations]] — directive syntax and the `visualization` block. F3 is shared with it, and its plugin list is now stale (Trackster was removed in #20974 and Mako in #21133).
- [[Component - Window Manager]] — the eye icon pushes `?displayOnly=true` into WinBox frames.
- [[Component - CORS Handling]] — GEDA `allow_cors` on the display-app callback route.
- [[Component - Implicit Dataset Conversion]] — `format=` on display-app data parameters triggers hidden conversions.
- [[PR 21463 - Jupyternaut Adapter for JupyterLite]] — the plugin chat-completions proxy.
- [[Component - Invocation Report to Pages]] — Pages whose dataset directives use F6.
- [[history_markdown]] — history-attached Markdown consumes the same directives.
- [[Component - E2E Tests - Writing]] — `dataset_display` / `visualization` navigation components used by display selenium tests.
- [[Component - UI Error Handling]] — `DatasetDisplay` and `DisplayApplication` surface `MessageException`s.
- [[Component - Agents UX]] — the Jupyternaut proxy is a visualization plugin.
