# gxwf-report-shell: CDN-deliverable Report Rendering

## Executive Summary

Create `@galaxy-tool-util/gxwf-report-shell` — a new package in the existing pnpm monorepo
that publishes the four Vue 3 workflow report components as a pre-built, fully self-contained
IIFE bundle. Once published to npm, CDN services (jsdelivr, unpkg) serve the bundle at a
stable versioned URL. Python code — in `gxwf-web`, `planemo`, or any tool that produces
`Single{Validation,Lint,Clean,RoundTrip}Report` objects — can then generate standalone HTML
reports in ~10 lines: serialize the Pydantic model to JSON, inject it into a one-page HTML
template that loads the bundle from CDN, done.

---

## Background

### What exists today

The TypeScript monorepo at `jmchilton/galaxy-tool-util-ts` (pnpm workspace, 7 published
packages) already contains:

**Report data shapes** — `@galaxy-tool-util/schema` defines the TypeScript types and build
functions (`buildSingleValidationReport`, `buildSingleLintReport`, `buildSingleCleanReport`)
that produce structured result objects. These mirror the Python Pydantic models in
`galaxy.tool_util.workflow_state._report_models` exactly — the OpenAPI spec is the contract
between the two.

**Report components** — `@galaxy-tool-util/gxwf-ui` (not yet published; dev tool only)
contains four focused Vue 3 SFCs:

| Component | Props | PrimeVue widgets used |
|---|---|---|
| `ValidationReport.vue` | `SingleValidationReport` | DataTable, Tag, Message |
| `LintReport.vue` | `SingleLintReport` | DataTable, Tag, Message |
| `CleanReport.vue` | `SingleCleanReport` | DataTable, Tag |
| `RoundtripReport.vue` | `SingleRoundTripReport` | DataTable, Tag, Message |

All four import their type definitions from `@galaxy-tool-util/gxwf-client` (the OpenAPI-typed
HTTP client package), which re-exports the component schemas from `@galaxy-tool-util/gxwf-web`.

**CLI with `--json` flag** — `@galaxy-tool-util/cli` already emits the same report shapes
from `gxwf validate`, `gxwf lint`, `gxwf clean`, `gxwf roundtrip` when `--json` is passed.
The TypeScript and Python paths produce identical JSON.

**Python server** — `gxwf-web` (Python, separate repo `gxwf-web`) is a FastAPI app that
delegates to `galaxy.tool_util.workflow_state.*_single()` functions and returns the Pydantic
report models directly. FastAPI serializes them via `.model_dump(mode='json')`.

### The gap

Every consumer that wants to show a workflow report visually — Python scripts, CI pipeline
artifacts, the future VSCode extension, command-line `--html` output — must either:

1. Re-implement the rendering (bad; duplicates logic, looks different everywhere), or
2. Spin up a full web server and open a browser pointing at it (bad; heavyweight), or
3. Load a pre-built rendering bundle from somewhere.

Option 3 is the right answer. Publishing to npm gives us CDN delivery for free.

### Why CDN from npm is sufficient

Both `cdn.jsdelivr.net` and `unpkg.com` serve any file from any published npm package at a
stable, version-pinned URL:

```
https://cdn.jsdelivr.net/npm/@galaxy-tool-util/gxwf-report-shell@0.1.0/dist/shell.iife.js
https://cdn.jsdelivr.net/npm/@galaxy-tool-util/gxwf-report-shell@0.1.0/dist/shell.css
```

These URLs are permanent and content-addressed. A report generated in 2025 referencing
`@0.1.0` will render identically in 2030. This is the same guarantee PyPI wheels give to
pinned Python deps.

The one trade-off is network access at report *viewing* time (not generation time). For CI
artifact viewing, sharing reports with colleagues, and developer tooling this is universally
acceptable. An offline/vendor mode is addressed in the Python integration section.

---

## Ecosystem Map

```
                    ┌─────────────────────────────────────────────┐
                    │  galaxy.tool_util.workflow_state (Python)    │
                    │  validate_single / lint_single / etc.        │
                    │  → SingleValidationReport (Pydantic)         │
                    └──────────────┬──────────────────────────────┘
                                   │ .model_dump(mode='json')
                    ┌──────────────▼──────────────────────────────┐
                    │  Python HTML generation (gxwf-web, planemo,  │
                    │  galaxy, or standalone scripts)               │
                    │  report_to_html("validate", data, version)   │
                    │  → self-contained .html file                 │
                    └──────────────┬──────────────────────────────┘
                                   │ CDN <script> tag
                    ┌──────────────▼──────────────────────────────┐
                    │  cdn.jsdelivr.net / unpkg.com                │
                    │  @galaxy-tool-util/gxwf-report-shell         │
                    │  dist/shell.iife.js  dist/shell.css          │
                    └──────────────┬──────────────────────────────┘
                                   │ npm publish (changesets)
          ┌────────────────────────▼────────────────────────────────────┐
          │  packages/gxwf-report-shell/  (new, this plan)              │
          │                                                              │
          │  src/ReportShell.vue       ← type dispatcher                │
          │  src/ValidationReport.vue  ┐                                 │
          │  src/LintReport.vue        │ moved from gxwf-ui             │
          │  src/CleanReport.vue       │                                 │
          │  src/RoundtripReport.vue   ┘                                 │
          │  src/index.ts              ← ESM exports (for gxwf-ui)      │
          │  src/shell.ts              ← IIFE entry point               │
          │                                                              │
          │  vite.config.shell.ts      ← IIFE-only build               │
          │  dist/shell.iife.js        ← bundled: Vue+PrimeVue+comps   │
          │  dist/shell.css            ← component scoped styles        │
          └──────────────────────────────────┬──────────────────────────┘
                                             │ workspace:*
          ┌──────────────────────────────────▼──────────────────────────┐
          │  packages/gxwf-ui/                                           │
          │  imports ValidationReport etc. from gxwf-report-shell src   │
          │  (Vite compiles .vue source files on the fly)               │
          └─────────────────────────────────────────────────────────────┘

  Future:
          ┌──────────────────────────────────────────────────────────────┐
          │  VSCode extension webview                                     │
          │  loads shell.iife.js from extension's bundled assets          │
          │  sends reports via postMessage instead of window.__GXWF_REPORT__ │
          └──────────────────────────────────────────────────────────────┘
```

---

## Key Design Decisions

### 1. IIFE bundle, not ESM module, for CDN delivery

CDN delivery via `<script src>` tags requires an IIFE (Immediately Invoked Function
Expression) or UMD bundle. ESM (`import`/`export`) requires either a `<script type="module">`
tag and proper CORS headers (workable but adds friction), or an import map (not universally
supported). IIFE is the simplest, most widely supported format for "drop a script tag and it
works."

Vite's lib mode with `format: 'iife'` produces exactly this. The IIFE sets a global
`window.GxwfReportShell` (unused externally — the bundle self-executes on load and mounts
immediately to `#gxwf-report`).

### 2. Bundle everything — no external CDN dependencies

The IIFE bundles Vue 3, PrimeVue v4 (core + DataTable + Column + Tag + Message), the Aura
design token preset, and the five Vue components into a single file. Consumers include one
`<script>` tag and optionally one `<link>` for CSS. No import maps, no ordering constraints,
no secondary CDN dependencies.

**Estimated bundle size:** Vue 3 (~50KB gz) + PrimeVue selected components (~80KB gz) + Aura
preset (~20KB gz) + our components (~5KB gz) ≈ **~155KB gzipped**. For a dev tool report
opened in a browser, this is inconsequential.

Note: PrimeVue v4 uses CSS-in-JS design tokens — it injects `<style>` tags into `<head>` at
runtime when the plugin initializes. The `dist/shell.css` file therefore only contains scoped
component styles (minimal). The heavy lifting is in the JS bundle. Python generates HTML with
both the CSS link and JS script tags, but the CSS file is small.

### 3. Components move from gxwf-ui to gxwf-report-shell

Currently the four report components live in `packages/gxwf-ui/src/components/`. Since
`gxwf-report-shell` is the published package that needs to be the authoritative source, the
components move there. `gxwf-ui` then imports them as a workspace dependency.

This is a small refactor (update ~3 import paths in `OperationPanel.vue` and the 4 removed
local files). The alternative — duplicating the components — creates a maintenance hazard. The
alternative of making `gxwf-ui` the source and having `gxwf-report-shell` import from it
inverts the dependency direction (an unpublished app package becoming a dep of a library
package), which is wrong.

**gxwf-ui consumption pattern:** Vite resolves `.vue` files from workspace packages at dev/build
time via `@vitejs/plugin-vue`. No pre-compilation of `gxwf-report-shell` needed for internal
use. The package's `exports` field points to `./src/index.ts` (source) rather than a compiled
`dist/`. This is idiomatic for monorepo workspace Vue packages.

### 4. Single Vite config for the IIFE build only

Since the ESM "build" for internal workspace use is just Vite resolving source files directly
(no separate compilation step), only one actual build script is needed: the IIFE bundle. This
simplifies CI — the shell build runs once and produces CDN artifacts; `gxwf-ui` uses source
files at dev time and runs its own `vite build` for its own SPA artifacts.

### 5. gxwf-report-shell versions independently of the core linked group

The current changesets `linked` config ties `schema`, `core`, `cli`, `tool-cache-proxy`
together. `gxwf-client` and `gxwf-web` are separate (they contain generated/OpenAPI code).
`gxwf-report-shell` should also be separate — its version is what Python pins in CDN URLs,
and its changes (visual tweaks, new report types) don't necessarily coincide with schema or
CLI releases.

---

## Package Architecture

### Directory structure

```
packages/gxwf-report-shell/
├── package.json
├── tsconfig.json
├── vite.config.shell.ts         — IIFE build only
├── src/
│   ├── index.ts                 — ESM re-exports for workspace consumers
│   ├── shell.ts                 — IIFE entry: reads window.__GXWF_REPORT__, mounts
│   ├── ReportShell.vue          — dispatcher: routes to correct report component by type
│   ├── ValidationReport.vue     — moved from gxwf-ui
│   ├── LintReport.vue           — moved from gxwf-ui
│   ├── CleanReport.vue          — moved from gxwf-ui
│   └── RoundtripReport.vue      — moved from gxwf-ui
├── dist/                        — generated by vite build --config vite.config.shell.ts
│   ├── shell.iife.js            — fully self-contained IIFE bundle
│   └── shell.css                — scoped component styles
└── README.md
```

### package.json

```json
{
  "name": "@galaxy-tool-util/gxwf-report-shell",
  "version": "0.1.0",
  "description": "Pre-built Vue 3 Galaxy workflow report components for CDN delivery",
  "type": "module",
  "exports": {
    ".": {
      "types": "./src/index.ts",
      "import": "./src/index.ts"
    },
    "./*.vue": "./src/*.vue"
  },
  "files": ["src", "dist", "README.md", "LICENSE"],
  "scripts": {
    "build": "vite build --config vite.config.shell.ts",
    "typecheck": "vue-tsc --noEmit",
    "lint": "eslint src/",
    "format": "prettier --check 'src/**/*.{ts,vue}'",
    "format-fix": "prettier --write 'src/**/*.{ts,vue}'"
  },
  "dependencies": {
    "@galaxy-tool-util/gxwf-client": "workspace:*",
    "@primevue/themes": "^4.3.0",
    "primevue": "^4.3.0",
    "vue": "^3.5.0"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.2.0",
    "vite": "^6.2.0",
    "vue-tsc": "^2.2.0"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/jmchilton/galaxy-tool-util-ts",
    "directory": "packages/gxwf-report-shell"
  },
  "publishConfig": {
    "access": "public",
    "provenance": true
  },
  "license": "MIT"
}
```

Note: `primeicons` is intentionally excluded. The four report components don't use icon
classes (`pi pi-*`). This saves ~50KB from the bundle.

### vite.config.shell.ts

```typescript
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  build: {
    outDir: "dist",
    lib: {
      entry: "src/shell.ts",
      name: "GxwfReportShell",
      formats: ["iife"],
      fileName: () => "shell.iife.js",
    },
    rollupOptions: {
      // Bundle everything — no externals. Self-contained for CDN delivery.
      external: [],
      output: {
        // Single CSS file alongside the JS
        assetFileNames: "shell.[ext]",
      },
    },
  },
});
```

### src/shell.ts — IIFE entry point

```typescript
import { createApp } from "vue";
import PrimeVue from "primevue/config";
import Aura from "@primevue/themes/aura";
import ReportShell from "./ReportShell.vue";

interface ReportPayload {
  type: "validate" | "lint" | "clean" | "roundtrip";
  data: unknown;
}

function mount(payload: ReportPayload) {
  const app = createApp(ReportShell, { report: payload });
  app.use(PrimeVue, { theme: { preset: Aura } });
  app.mount("#gxwf-report");
}

// Support two data injection patterns:
// 1. Static HTML: window.__GXWF_REPORT__ set before this script tag
// 2. VSCode webview / dynamic: postMessage after load
const initial = (window as Record<string, unknown>).__GXWF_REPORT__ as ReportPayload | undefined;
if (initial) {
  mount(initial);
} else {
  // postMessage-based injection for VSCode webview or other dynamic hosts.
  // Host sends: { command: "render", type: "validate", data: {...} }
  window.addEventListener("message", (event: MessageEvent) => {
    const msg = event.data as { command?: string; type?: string; data?: unknown };
    if (msg.command === "render" && msg.type && msg.data) {
      mount({ type: msg.type as ReportPayload["type"], data: msg.data });
    }
  });
}
```

This dual-mode support means the *same bundle* serves both the Python-generated static HTML
case and the future VSCode webview case. No separate build needed for VSCode.

### src/ReportShell.vue — dispatcher

```vue
<template>
  <div class="gxwf-report-shell">
    <header class="report-header">
      <span class="report-type">{{ typeLabel }}</span>
      <span class="report-path">{{ report.data.workflow }}</span>
    </header>
    <ValidationReport v-if="report.type === 'validate'" :report="report.data" />
    <LintReport      v-else-if="report.type === 'lint'"      :report="report.data" />
    <CleanReport     v-else-if="report.type === 'clean'"     :report="report.data" />
    <RoundtripReport v-else-if="report.type === 'roundtrip'" :report="report.data" />
    <p v-else class="unknown-type">Unknown report type: {{ report.type }}</p>
  </div>
</template>
```

The header shows the workflow path and operation type — context that gxwf-ui gets from
WorkflowView.vue but the standalone HTML needs to surface itself.

### src/index.ts — ESM exports for gxwf-ui

```typescript
export { default as ValidationReport } from "./ValidationReport.vue";
export { default as LintReport }       from "./LintReport.vue";
export { default as CleanReport }      from "./CleanReport.vue";
export { default as RoundtripReport }  from "./RoundtripReport.vue";
export { default as ReportShell }      from "./ReportShell.vue";
```

gxwf-ui `OperationPanel.vue` then imports:
```typescript
import ValidationReport from "@galaxy-tool-util/gxwf-report-shell/ValidationReport.vue";
// or via named import:
import { ValidationReport } from "@galaxy-tool-util/gxwf-report-shell";
```

---

## Python Integration

### How Python produces report JSON

Python's Pydantic models already serialize cleanly:

```python
from galaxy.tool_util.workflow_state import validate_single, lint_single
from galaxy.tool_util.workflow_state.cache import build_tool_info

tool_info = build_tool_info()
report = validate_single("my_workflow.ga", tool_info)

# SingleValidationReport is a Pydantic model:
report_dict = report.model_dump(mode="json")
# → {"workflow": "my_workflow.ga", "results": [...], "structure_errors": [], ...}
```

The `gxwf-web` FastAPI server does this automatically when returning report objects. For
scripts outside the server, `model_dump(mode="json")` gives the CDN-renderable payload
directly.

### generate_report_html — the Python utility

This function should live in `gxwf-web` (Python) as a utility, and can be vendored into
`planemo` or `galaxy` when those tools want `--html` report output.

```python
import json

# Pin to a specific published version. Update when a new gxwf-report-shell
# is released with visual or structural changes worth surfacing.
_CDN_VERSION = "0.1.0"
_CDN_BASE = "https://cdn.jsdelivr.net/npm/@galaxy-tool-util/gxwf-report-shell@{version}/dist"

def report_to_html(
    report_type: str,
    report_data: dict,
    *,
    title: str = "gxwf Report",
    version: str = _CDN_VERSION,
    inline: bool = False,
) -> str:
    """Generate a standalone HTML report from a serialized report dict.

    Args:
        report_type: "validate", "lint", "clean", or "roundtrip"
        report_data: report.model_dump(mode="json") output
        title: browser tab title
        version: npm package version to load from CDN
        inline: if True, download and inline the JS/CSS (offline-capable)
    """
    payload = json.dumps({"type": report_type, "data": report_data})
    base = _CDN_BASE.format(version=version)

    if inline:
        js, css = _fetch_assets(base)
        js_tag = f"<script>{js}</script>"
        css_tag = f"<style>{css}</style>"
    else:
        js_tag = f'<script src="{base}/shell.iife.js"></script>'
        css_tag = f'<link rel="stylesheet" href="{base}/shell.css">'

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title}</title>
  {css_tag}
</head>
<body>
  <div id="gxwf-report"></div>
  <script>window.__GXWF_REPORT__ = {payload};</script>
  {js_tag}
</body>
</html>"""

def _fetch_assets(cdn_base: str) -> tuple[str, str]:
    """Download JS and CSS from CDN for inline embedding."""
    import urllib.request
    def fetch(url: str) -> str:
        with urllib.request.urlopen(url) as r:
            return r.read().decode("utf-8")
    js  = fetch(f"{cdn_base}/shell.iife.js")
    css = fetch(f"{cdn_base}/shell.css")
    return js, css
```

Usage in CLI tool or script:
```python
html = report_to_html("validate", report.model_dump(mode="json"), title="Workflow Validation")
Path("report.html").write_text(html)
```

### Offline / vendor mode

The `inline=True` path downloads assets at report generation time and embeds them verbatim.
The resulting HTML is fully self-contained — no network needed to view it. Assets are not
cached by this utility (callers can cache if generation is frequent).

A more robust offline approach is to vendor the bundle into the Python package at Python
release time: download `shell.iife.js` and `shell.css` matching the pinned version, commit
them as package data, and reference them via `importlib.resources`. This guarantees offline
capability without a download step but requires a build-time npm artifact download in the
Python package's release CI. That complexity is not worth it until there is a concrete need
for offline reports (e.g., running in an air-gapped HPC cluster).

---

## Migration plan for gxwf-ui

The four report components move out of `gxwf-ui` into `gxwf-report-shell`. The changes to
`gxwf-ui` are mechanical:

1. Add `"@galaxy-tool-util/gxwf-report-shell": "workspace:*"` to `gxwf-ui/package.json`
   dependencies.
2. Delete `packages/gxwf-ui/src/components/ValidationReport.vue` (and the other three).
3. In `OperationPanel.vue`, change the four local imports to workspace imports:
   ```typescript
   // Before:
   import ValidationReport from "./ValidationReport.vue";
   // After:
   import { ValidationReport } from "@galaxy-tool-util/gxwf-report-shell";
   ```
4. Run `pnpm install` to wire the workspace link.
5. `make check` — should be green since the components are identical, just at a new path.

`ReportShell.vue` (the dispatcher) and `shell.ts` (the IIFE entry) are new files with no
migration needed.

---

## Changesets and Publishing

### Add gxwf-report-shell to the linked group?

No. The linked group (`schema`, `core`, `cli`, `tool-cache-proxy`) versions together because
they share internal type dependencies that must be consistent at runtime. `gxwf-report-shell`
is a rendering artifact — its version is what external consumers (Python) pin, and it can
release independently. It should version like `gxwf-client` and `gxwf-web`: independently,
not linked.

### Build step in release CI

The monorepo's `pnpm release` script runs `pnpm build` (all packages) before
`changeset publish`. `gxwf-report-shell`'s `build` script runs the IIFE Vite build, producing
`dist/shell.iife.js` and `dist/shell.css`. These land in `files` and are published to npm
alongside `src/`. CDN services then serve them immediately after publish.

### .changeset/config.json change

No change needed to the linked groups. Simply add a changeset entry for `gxwf-report-shell`
whenever making changes, like any other independent package.

---

## VSCode Extension Future Path

The dual-mode `shell.ts` entry (static `window.__GXWF_REPORT__` + `postMessage` listener)
means the same published bundle serves the VSCode webview scenario without modification.

The extension would:
1. Copy (or reference) `shell.iife.js` and `shell.css` from the npm package into the
   extension's bundled assets (via a postinstall script or by vendoring the built dist).
2. Create a webview panel, set its HTML to a template with the CSS and JS.
3. Send `{ command: "render", type: "validate", data: {...} }` via
   `panel.webview.postMessage(...)` as operations complete.
4. The webview's existing `postMessage` listener in `shell.ts` receives and renders.

No changes to `gxwf-report-shell` are needed for this to work. The extension scaffold
(webview panel, language server integration, activation events) is entirely separate work.

---

## Status Summary (as of 2026-04-07)

**Commits `25b1860` + `9bac557`** completed all TypeScript monorepo work (Steps 1–5, 7):

- `packages/gxwf-report-shell/` created with full scaffold
- 4 report components moved from `gxwf-ui` (git rename, history preserved)
- `src/shell.ts` — dual-mode IIFE entry (static HTML + postMessage)
- `src/ReportShell.vue` — dispatcher with workflow path + op type header
- `src/index.ts` — ESM re-exports for workspace consumers
- `vite.config.shell.ts` — IIFE build, no externals
- `smoke-test.html` — local smoke test against `dist/`
- IIFE build: `dist/shell.iife.js` (767KB / 174KB gz), `dist/shell.css` (2KB / 0.6KB gz)
- `make check` clean; changeset added
- `gxwf-ui` migrated: workspace dep added, `OperationPanel.vue` imports updated

**Resolved questions from original plan:**
- Q1 (header): `ReportShell.vue` includes a header (workflow path + op type label). Raw components remain borderless.
- Q2 (`make check` build): IIFE build is NOT in `make check` — too slow. Run manually.

**Remaining work (Python `gxwf-web` repo):**
- Step 6: `generate_report_html()` utility + `--html` CLI flag
- Step 8: `_CDN_VERSION` pinning once first npm publish lands

---

## Implementation Steps

### Step 1: Create gxwf-report-shell package scaffold ✅ DONE

- `packages/gxwf-report-shell/package.json` (as specified above)
- `packages/gxwf-report-shell/tsconfig.json` (extends root, includes `src/**/*.ts`, `src/**/*.vue`)
- `packages/gxwf-report-shell/vite.config.shell.ts` (IIFE build config)
- `packages/gxwf-report-shell/src/index.ts` (empty re-exports for now)

Run `pnpm install` to register the new workspace package.

### Step 2: Move report components from gxwf-ui ✅ DONE

Move the four `.vue` files (do not copy — move, to keep git history). Add the `workflow` path
header display to `ValidationReport.vue` et al. if desired, or leave that to `ReportShell.vue`.

Update `gxwf-ui/package.json` to add the workspace dep, update imports in `OperationPanel.vue`.
Run `make check` to verify nothing broke.

### Step 3: Write shell.ts and ReportShell.vue ✅ DONE

Implement the IIFE entry point and dispatcher as described. Add a minimal page-level stylesheet
in `shell.ts` or via a global CSS import for body margin, font, background color (the
PrimeVue design token CSS injected at runtime doesn't set these page-level defaults).

### Step 4: Wire the IIFE build ✅ DONE

Add `"build": "vite build --config vite.config.shell.ts"` to the package scripts.
Run `pnpm --filter @galaxy-tool-util/gxwf-report-shell build` and inspect `dist/`.
Verify: `dist/shell.iife.js` exists and is a single IIFE file. `dist/shell.css` exists.

### Step 5: Smoke test with a local HTML file ✅ DONE

`smoke-test.html` committed alongside the package. Open in browser after `pnpm build` to
verify all four report types render correctly.

### Step 6: Write `generate_report_html` in Python

Add the utility to `gxwf-web` (Python). Wire it to a `--html` output flag in the existing
FastAPI `app.py` or as a standalone CLI helper. Verify end-to-end: Python runs validate,
calls `report_to_html`, writes `report.html`, opens in browser — renders correctly.

The Python snippet is documented in `packages/gxwf-report-shell/README.md` for reference.

### Step 7: Add to CI, add changeset, publish ✅ DONE (changeset added; publish pending merge)

`packages/gxwf-report-shell` is covered by `make check` (typecheck + lint + format). Changeset
`.changeset/gxwf-report-shell-init.md` added. CDN URLs go live automatically after npm publish.

### Step 8: Update Python to pin the published version

Update `_CDN_VERSION` in `gxwf-web` to the first published version. Add a note in the
contributing guide explaining that this constant needs a manual bump when a new
`gxwf-report-shell` is published with user-visible changes.

---

## Unresolved Questions

1. Where exactly does `generate_report_html` live in the Python world — `gxwf-web` only,
   or should it eventually land in `galaxy-tool-util` (upstream Galaxy) so planemo and
   Galaxy itself can generate reports without depending on gxwf-web?

2. Should the Python version pin (`_CDN_VERSION`) be automated — e.g., a bot that opens a
   PR bumping the constant when a new `gxwf-report-shell` is published to npm?

3. When the VSCode extension ships, should it vendor `shell.iife.js` locally (no CDN
   dependency at webview load time) or reference the CDN URL? Extension guidelines generally
   prefer local bundling for reliability.

4. `gxwf-report-shell` currently has no tests. Should a future step add Playwright or
   Vitest browser-mode tests that verify each of the four report types renders without
   error when given sample JSON?
