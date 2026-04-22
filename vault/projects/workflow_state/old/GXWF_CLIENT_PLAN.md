# gxwf-client: Shared Frontend Plan

**Packages:**
- `@galaxy-tool-util/gxwf-client` — Generated typed API client (from Python's OpenAPI spec)
- `@galaxy-tool-util/gxwf-ui` — Vue 3 + PrimeVue frontend application

Both live in the galaxy-tool-util pnpm monorepo.

---

## Status Summary (as of 2026-04-07)

**Commit 03d2f5d** completed all server-side groundwork:
- OpenAPI 3.1 spec (`gxwf-web/openapi.json`) — fully typed, all 8 workflow ops + full Contents API
- Generated `api-types.ts` via `openapi-typescript` — zero `unknown` responses, all 34 component schemas
- All 6 workflow operations implemented in `workflows.ts` (validate/lint/clean/to-format2/to-native/roundtrip)
- Auto-refresh workflow index on file mutations
- Schema package unified with Python API response shapes

**What remains:** Vue frontend (`gxwf-ui`) and optionally a standalone `gxwf-client` package.

---

## Architecture

```
packages/gxwf-client/           — ✅ DONE — typed openapi-fetch wrapper
├── src/
│   ├── index.ts                — createGxwfClient(baseUrl), re-exports paths/components/operations from gxwf-web
│   └── (no codegen here — types come from @galaxy-tool-util/gxwf-web)
├── test/
│   └── client.test.ts          — 8 integration tests against a real server

packages/gxwf-ui/               — Vue 3 + Vite + PrimeVue frontend
├── src/
│   ├── main.ts
│   ├── App.vue
│   ├── router/index.ts         — Vue Router
│   ├── composables/
│   │   ├── useApi.ts           — openapi-fetch client, base URL config; imports paths from gxwf-web
│   │   ├── useWorkflows.ts     — Workflow list, refresh, selection
│   │   ├── useContents.ts      — File browser state (Contents API)
│   │   └── useOperation.ts     — Generic run-operation-and-show-report composable
│   ├── components/
│   │   ├── FileBrowser.vue     — Tree/list view of Contents API
│   │   ├── WorkflowList.vue    — Discovered workflows with status badges
│   │   ├── ValidationReport.vue
│   │   ├── LintReport.vue
│   │   ├── CleanReport.vue
│   │   ├── RoundtripReport.vue
│   │   ├── OperationPanel.vue  — Tabbed panel: validate/lint/clean/convert/roundtrip
│   │   └── EditorShell.vue     — Placeholder for future Monaco/CodeMirror integration
│   ├── views/
│   │   ├── DashboardView.vue   — Workflow list + summary stats
│   │   ├── WorkflowView.vue    — Single workflow: operations panel + reports
│   │   └── FileView.vue        — Contents API file browser
│   └── types/                  — Shared UI types
├── vite.config.ts
├── index.html
└── test/
```

**Long-term goal:** Full editor with embedded Monaco/CodeMirror providing inline diagnostics from validation. Architecture should support this from the start (EditorShell placeholder, operation results as diagnostic arrays).

---

## Phase 1: Typed Client ✅ DONE

**Server-side types (commit 03d2f5d):**
- `openapi-typescript` runs via `pnpm codegen` in gxwf-web package
- `packages/gxwf-web/openapi.json` — committed copy of the spec (sync via `make sync-openapi`)
- `packages/gxwf-web/src/generated/api-types.ts` — generated types (1,462 lines, 34 schemas, zero gaps)
- Types publicly re-exported from `@galaxy-tool-util/gxwf-web` index

**gxwf-client package (commit 2244b2c):**
- `packages/gxwf-client/src/index.ts` — exports `createGxwfClient(baseUrl, options?)`, `GxwfClient` type, re-exports `paths`/`components`/`operations` from gxwf-web
- `openapi-fetch` runtime dep; `@galaxy-tool-util/gxwf-web` workspace dep (types only)
- 8 integration tests: workflow list, refresh, validate, lint, clean, roundtrip, 404

**Usage in gxwf-ui:**
```typescript
import { createGxwfClient } from "@galaxy-tool-util/gxwf-client";
const client = createGxwfClient("http://localhost:8000");
const { data } = await client.GET("/workflows", {});
```

**Sync workflow:**
- Python side: `make docs-openapi` regenerates `openapi.json` in gxwf-py
- TS side: `make sync-openapi` copies spec, `pnpm codegen` regenerates types

---

## Phase 2: Vue 3 + PrimeVue Scaffold ✅ DONE

**Goal:** Minimal running app with workflow list and file browser.

1. Create `packages/gxwf-ui` with Vite + Vue 3 + TypeScript + PrimeVue + `openapi-fetch`
2. Configure Vite to proxy API requests to backend (`/workflows/*`, `/api/contents/*`)
3. `useApi` composable: configurable base URL, creates openapi-fetch client typed with `paths` from gxwf-web
4. `useWorkflows` composable: fetch workflow list, refresh, track selection
5. `useContents` composable: read/navigate directory tree, CRUD operations
6. `WorkflowList.vue`: table with columns (path, format, category, last-run badge), click to select
7. `FileBrowser.vue`: PrimeVue Tree component driven by Contents API
8. `DashboardView.vue`: workflow list + basic stats
9. Vue Router: `/` → Dashboard, `/workflow/:path` → WorkflowView, `/files` → FileView

---

## Phase 3: Operation Reports ✅ DONE

**Goal:** Run validate/lint/clean/roundtrip and display structured results.

All server-side operations are implemented. Frontend work:

1. `useOperation` composable: module-level reactive cache keyed by workflow path; per-op run functions + `getLastRunStatus()` exported for badges
2. `OperationPanel.vue`: PrimeVue Tabs (Validate/Lint/Clean/Roundtrip), each tab has Run button + report component
3. Report components (response types from `components["schemas"]` in gxwf-web):
   - `ValidationReport.vue`: per-step results table (ok/fail/skip badges), structure/encoding errors
   - `LintReport.vue`: error/warning count summary + per-step results table
   - `CleanReport.vue`: total removed keys summary + per-step removed key lists
   - `RoundtripReport.vue`: pass/fail badge, summary line, error/benign diff tables, conversion failure lines
4. `WorkflowView.vue`: workflow path header + format/category tags + OperationPanel
5. Status badges on WorkflowList via reactive `statusMap` computed (worst status across all cached ops)

**Note:** `allow`/`deny` (lint/validate), `preserve`/`strip` (clean), and `connections` (validate) params are accepted by the server but no-op. UI can expose them but should indicate "not yet implemented" or omit until StaleKeyPolicy lands.

---

## Phase 4: File Editing Foundation ✅ DONE

**Goal:** Prepare architecture for inline editing (Monaco integration in future).

1. `EditorShell.vue` — `<textarea>` placeholder; props: `content`, `language`, `diagnostics?` (Monaco-compatible `Diagnostic` interface with line/column/endLine/endColumn), `readonly?`; emits `update:content`. Monaco drop-in path documented in component comment.
2. `useContents.ts` — added `writeFile` (PUT + `If-Unmodified-Since` conflict detection), `createCheckpoint`, `restoreCheckpoint`; exports `ContentsModel` and `CheckpointModel` types.
3. `useOperation.ts` — exported `clearOpCache(path)`.
4. `FileBrowser.vue` — emits `select` with file path on leaf node click.
5. `FileView.vue` — split layout (browser left, editor right); save flow: checkpoint → write → `clearOpCache` → `fetchWorkflows`; single-level undo via checkpoint restore. `saveSuccess` clears when user edits.

---

## Key Decisions

- **Client generation:** `openapi-typescript` (in gxwf-web) + `openapi-fetch` (in gxwf-ui) — type-safe, spec-driven, minimal runtime
- **UI framework:** Vue 3 Composition API + PrimeVue (matches user request)
- **Build:** Vite (standard for Vue 3)
- **State management:** Composables with `ref`/`reactive` — no Pinia needed at this scale initially
- **API proxy:** Vite dev server proxy in development; production builds expect same-origin or configurable base URL
- **Report rendering:** Dedicated component per operation type (not a generic JSON renderer)
- **Type source:** gxwf-ui imports `createGxwfClient` from `@galaxy-tool-util/gxwf-client`; types flow through from gxwf-web

---

## Resolved Questions

1. ~~The Python OpenAPI spec has untyped responses~~ — **RESOLVED.** All 8 workflow op responses and all Contents API responses are fully typed with named component schemas. Zero `unknown` in generated types.

---

## Unresolved Questions

1. Should the UI support connecting to multiple backends simultaneously, or one at a time with a config switch?
3. For the file browser: show all files or only workflow-related files?
4. Should report components be extracted as `@galaxy-tool-util/gxwf-report-components` for reuse in a VSCode webview?
5. When should `connections` validation and `allow`/`deny`/`preserve`/`strip` (StaleKeyPolicy) be implemented server-side? Should the UI surface these params before they're wired?
