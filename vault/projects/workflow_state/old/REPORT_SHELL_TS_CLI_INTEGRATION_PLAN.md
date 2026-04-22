# gxwf-report-shell × CLI Integration Plan

## Status (as of 2026-04-07)

**Commit `d364ed3`** completed Phases 1 and 2. Phase 4 completed in a subsequent commit (skipped Phase 3A — see note in Phase 3 section).

**Resolved questions:**
- Q1: `buildSingleReportHtml` / `SHELL_CDN_VERSION` live in `report-output.ts` (cli-only) for now. No cli → gxwf-report-shell dep needed.
- `roundtrip` excluded from Phase 2: CLI's `RoundtripResult` doesn't map to schema's `SingleRoundTripReport` (server-centric type). Needs a separate mapper before `--report-html` can be added there.
- Bonus fix: rebuilt `schema/dist/` to clear a pre-existing `buildRoundTripTreeReport` typecheck failure (`dist/` was stale post-rebase).

**Remaining:** Phase 3 (tree HTML styling) and Phase 4 (tree Vue components).

---

## Context

Two independent pieces landed on this branch:

1. **`gxwf-report-shell`** (`62ec18a`) — Vue 3 IIFE bundle for *single*-workflow reports, served
   from CDN. Components accept `Single{Validation,Lint,Clean,RoundTrip}Report` and render them
   using PrimeVue DataTable/Tag/Message. ~~Currently imports its types from
   `@galaxy-tool-util/gxwf-client` (the OpenAPI HTTP-client layer).~~ **Fixed in Phase 1.**

2. **Nunjucks report rendering** (`e54a513`) — Jinja2-synced `.md.j2` templates rendered via
   Nunjucks. Adds `--report-markdown` and `--report-html` to the `*-tree` batch commands
   (`validate-tree`, `lint-tree`, `clean-tree`, `roundtrip-tree`). ~~The *single*-workflow
   commands (`validate`, `lint`, `clean`, `roundtrip`) still have no `--report-html`.~~ **Fixed in Phase 2 (`validate`, `lint`, `clean`).**

These two pieces need to be connected. There are two issues to resolve and two integration
opportunities to exploit.

---

## Issue 1 — Wrong dependency direction in gxwf-report-shell

`gxwf-report-shell` imports `Single*Report` types from `@galaxy-tool-util/gxwf-client`:

```typescript
// current — wrong layer
import type { components } from "@galaxy-tool-util/gxwf-client";
type SingleValidationReport = components["schemas"]["SingleValidationReport"];
```

`gxwf-client` is the OpenAPI-generated HTTP client for `gxwf-web`. It happens to re-export
the report types, but it's the wrong abstraction layer — it pulls in a dep on the web server's
generated types just to get structs that are already hand-authored in `@galaxy-tool-util/schema`:

```typescript
// packages/schema/src/workflow/report-models.ts
export interface SingleValidationReport { ... }   // line 91
export interface SingleLintReport { ... }          // line 101
export interface SingleCleanReport { ... }         // line 117
export interface SingleRoundTripReport { ... }     // line 211
```

`schema` is the bottom of the dependency chain. All other packages already depend on it.
`gxwf-report-shell` should too.

### Fix (Phase 1 — prerequisite for everything else)

In each of the four report components and `ReportShell.vue`, change:

```typescript
// before
import type { components } from "@galaxy-tool-util/gxwf-client";
type SingleValidationReport = components["schemas"]["SingleValidationReport"];

// after
import type { SingleValidationReport } from "@galaxy-tool-util/schema";
```

Update `packages/gxwf-report-shell/package.json`:
- Remove `"@galaxy-tool-util/gxwf-client": "workspace:*"` from `dependencies`
- Add `"@galaxy-tool-util/schema": "workspace:*"`

The OpenAPI types in `gxwf-client` and the hand-authored types in `schema` are structurally
identical (the OpenAPI spec is derived from the Python Pydantic models, which mirror schema).
This is a rename at the TypeScript level; no runtime change.

After this, the clean dependency chain is:

```
schema ← core ← cli
schema ← gxwf-report-shell   (new)
schema ← gxwf-client         (unchanged — gxwf-client still uses it for HTTP response types)
```

---

## Issue 2 — Single-workflow commands lack --report-html

The `validate`, `lint`, `clean`, `roundtrip` commands have `--json` but no `--report-html`.
The tree commands have both. `gxwf-report-shell` exists specifically for single-workflow reports.
This is the most obvious integration gap.

---

## Integration Plan

### Phase 1: Fix gxwf-report-shell types ✅ DONE

Switched 5 Vue files from `gxwf-client` imports to `schema` imports. Also updated
`gxwf-ui/useOperation.ts` to use `schema` types (with `as unknown as X` casts at the API
boundary, since `gxwf-client`'s OpenAPI-generated types have `tool_id?: string | null` vs
schema's `tool_id: string | null`). Added explicit `@galaxy-tool-util/schema` dep to
`gxwf-ui/package.json`.

### Phase 2: Add --report-html to single-workflow commands ✅ DONE (validate, lint, clean)

`report-output.ts` gained `buildSingleReportHtml(type, data)` and `writeSingleReportHtml`.
`validate`, `lint`, `clean` commands have `--report-html [file]`; works with or without `--json`.

`roundtrip` excluded: CLI's `RoundtripResult` (stepResults, success, clean…) doesn't map
to schema's `SingleRoundTripReport` (which wraps the server-centric `RoundTripValidationResult`).
A mapper function would be needed first.

### Phase 3: Style the tree HTML output ✅ SKIPPED → Phase 4 done instead

Phase 3A (Nunjucks CSS wrapper) was not implemented. The Nunjucks body templates emit
Markdown syntax (`# heading`, `| table |`) regardless of format — only the macros switch to
HTML. A CSS wrapper would need a Markdown→HTML conversion step to be useful. Given that, went
straight to Phase 4 (Vue tree components), which gives a much better result.

**Nunjucks HTML environment (`getHtmlEnv`, `_macros.html.j2`) is now dead code** — the tree
commands no longer call `writeReportOutput` with `reportHtml`. Can be cleaned up when convenient.

### Phase 4: Tree components in gxwf-report-shell ✅ DONE

Added `TreeValidationReport.vue`, `TreeLintReport.vue`, `TreeCleanReport.vue`,
`TreeRoundtripReport.vue` to `gxwf-report-shell/src/`. Each shows summary tags + per-category
DataTable. `TreeRoundtripReport.vue` groups by `workflow.category` client-side (no server-side
`categories` field on `RoundTripTreeReport`).

Extended `shell.ts`/`ReportShell.vue` to dispatch on `"validate-tree"`, `"lint-tree"`,
`"clean-tree"`, `"roundtrip-tree"`. `workflowPath` computed now checks `root` field (tree) as
well as `workflow` (single).

Renamed `SingleReportType` → `ReportType`, `buildSingleReportHtml` → `buildReportHtml`,
`writeSingleReportHtml` → `writeReportHtml` in `report-output.ts`. All callers updated.

Tree commands now split: Nunjucks runs only for `--report-markdown`; `--report-html` uses
CDN Vue shell via `writeReportHtml("validate-tree", ...)` etc.

Same gxwf-report-shell IIFE bundle renders both single and tree reports — CDN URL is the same,
page template is the same, only `type` and `data` differ.

---

## Sequencing and unresolved questions

All 4 phases complete. Remaining work: dead-code cleanup and `roundtrip --report-html`.

### Unresolved questions

1. ~~Should `buildSingleReportHtml` / `SHELL_CDN_VERSION` live in `report-output.ts`?~~ **Resolved:** cli-only for now.

2. ~~For Phase 3A, should the Nunjucks HTML remain (styled wrapper) or skip to Phase 4?~~ **Resolved:** Skipped Phase 3A; went straight to Phase 4.

3. Should the dead Nunjucks HTML env (`getHtmlEnv`, `_macros.html.j2`) be cleaned up? Markdown stays; HTML path is now Vue-only.

4. `SHELL_CDN_VERSION` in `report-output.ts` diverges from the published npm version. Should
   bumping it be part of the gxwf-report-shell release checklist (manual) or automated?

5. (New) `roundtrip --report-html`: needs a mapper from `RoundtripResult` →
   `RoundTripValidationResult`, or a new `SingleRoundtripCliReport` type + component that
   matches the CLI's shape. Worth doing, but requires design first.
