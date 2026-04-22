# TypeScript Reports: Jinja Template Sync + Nunjucks Rendering Plan

**Goal:** Sync the 8 Jinja2 `.md.j2` templates from the Python Galaxy branch into the
TypeScript repo, then wire up a Nunjucks renderer so all tree-level Markdown reports
are produced from these shared templates rather than hand-written formatters.

---

## Context

The Python side (`lib/galaxy/tool_util/workflow_state/templates/reports/`) completed its
Jinja port (all 6 CLIs). The TS side has `report-models.ts` with full tree report types
and builder helpers — but no Markdown rendering yet. The CLI `render-results.ts` is
currently text-only console output; the `gxwf-web` server and any downstream consumer
would benefit from Markdown reports identical to what the Python CLI produces.

The 8 Python templates to sync:

```
_macros.md.j2
connection_section.md.j2
validate_tree.md.j2
clean_tree.md.j2
roundtrip_tree.md.j2
export_tree.md.j2
to_native_tree.md.j2
lint_tree.md.j2
```

---

## Step 1 — Add Makefile sync target for templates

Add `sync-wfstate-templates` target (GALAXY_ROOT-gated, like other sync targets):

```makefile
WFSTATE_TEMPLATES_SRC = $(GALAXY_ROOT)/lib/galaxy/tool_util/workflow_state/templates/reports
WFSTATE_TEMPLATES_DST = packages/cli/src/workflow/templates/reports

sync-wfstate-templates:
ifndef GALAXY_ROOT
	$(error GALAXY_ROOT is not set.)
endif
	@test -d "$(WFSTATE_TEMPLATES_SRC)" || (echo "ERROR: $(WFSTATE_TEMPLATES_SRC) not found" && exit 1)
	@echo "Syncing Jinja report templates from $(WFSTATE_TEMPLATES_SRC)..."
	mkdir -p $(WFSTATE_TEMPLATES_DST)
	cp $(WFSTATE_TEMPLATES_SRC)/*.md.j2 $(WFSTATE_TEMPLATES_DST)/
	@echo "Synced $$(ls $(WFSTATE_TEMPLATES_DST)/*.md.j2 | wc -l | tr -d ' ') templates."
```

Add `check-sync-wfstate-templates` (same diff-loop pattern as the other check-sync
targets): check for DIVERGED, MISSING, EXTRA files. Add both to `check-sync` (GALAXY_ROOT
branch) and to the full `sync` target.

**Note on file extension:** Keep `.md.j2` as the extension in the TS repo — it matches the
Python source exactly, makes cross-reference obvious, and Nunjucks is extension-agnostic.

---

## Step 2 — Add Nunjucks dependency

Add `nunjucks` and `@types/nunjucks` to `packages/cli` (runtime `dependencies`, not
`devDependencies`) — `packages/cli` owns the renderer since it is the only current consumer
and this keeps `packages/schema` free of runtime template deps. If `gxwf-web` or other
consumers need rendering later, the renderer module can be extracted to `packages/core`
at that point.

---

## Step 3 — Add `report-templates.ts` rendering module

New file: `packages/cli/src/workflow/report-templates.ts`

Responsibilities mirror `_report_templates.py`:

1. Build a single Nunjucks `Environment` (lazy singleton). Template loading uses the
   bundled module at runtime (see Step 5); falls back to file-system load via
   `import.meta.url` + `fileURLToPath` during dev/test before a build has run.
   Configure with `{ autoescape: false, trimBlocks: true, lstripBlocks: true }`.
2. Export `renderReport(templateName: string, report: unknown, meta?: ReportMeta, format?: "markdown" | "html"): string`
   — passes `{ report, meta }` as context. When `format` is `"html"`, substitutes
   `_macros.html.j2` for `_macros.md.j2` (see Step 3a below). `meta` carries
   `generated_at` (ISO timestamp) and optional `tool_util_version`.
3. Export `makeRenderer<T>(templateName: string, format?: "markdown" | "html"): (report: T) => string`
   — returns a thunk suitable for plugging into CLI output pipelines.

### Step 3a — HTML macro override design

To support `--report-html`, the renderer resolves macros based on `format`:

- `"markdown"` (default): loads `_macros.md.j2` (the synced Python macros file).
- `"html"`: loads `_macros.html.j2` — a parallel macro file that redefines the same
  macro signatures from `_macros.md.j2` but emits HTML fragments instead of Markdown.
  The body templates (`validate_tree.md.j2`, etc.) remain unchanged; only the macros
  swap out.

Implementation: maintain two `Environment` instances (one per format) each configured
with a different loader that aliases `_macros.md.j2` to the format-specific file. This
is simplest because body templates already `import "_macros.md.j2"` by name; the
environment's loader intercepts that name and serves the correct file.

`_macros.html.j2` is authored alongside the synced `.md.j2` files in
`packages/cli/src/workflow/templates/reports/` and is not synced from Python (it is
TS-side only). Add it to the `check-sync-wfstate-templates` EXTRA-files allowlist.

**Nunjucks + Jinja2 subset constraint:** The templates are already written to the
`_macros.md.j2`-documented shared subset. No custom filters or globals needed. The only
Nunjucks-vs-Jinja2 diff that matters here: Nunjucks uses `items()` for dict iteration too
(as of v3.2); `selectattr` with a single arg (truthy check) works in both. Verify this
during initial wiring against each template.

---

## Step 4 — Address template gaps for TS-only report types

The Python templates cover the 6 tree CLIs. The TS type model has the same 6 (validate,
clean, lint, roundtrip, export, to-native). However, some TS tree report types that are
**not yet in Python** need templates eventually:

- `RoundTripTreeReport` — TS `report-models.ts` has `RoundTripValidationResult` but no
  tree wrapper. The `roundtrip_tree.md.j2` template has been audited (see below); add
  the missing tree type to `report-models.ts` before wiring the template.

Audit each Python template's `report.*` field accesses against the TS interface in
`report-models.ts`. Field-by-field diff is the deliverable of this step. Any missing
field on the TS side must be added (additive-only — no renaming existing fields).

**Confirmed field audit for `roundtrip_tree.md.j2`** (Python source reviewed):

`RoundTripTreeReport` top-level fields the template uses:

| Field | TS type | Python source | Notes |
|---|---|---|---|
| `root` | `string` | regular field (inherited `TreeReportBase`) | |
| `total` | `number` | `@computed_field` → `len(results)` | in JSON output |
| `summary` | `{clean, benign_only, fail, error, skipped: number}` | `@computed_field` | in JSON output |
| `workflows` | `RoundTripValidationResult[]` | `results` field with `serialization_alias="workflows"` | |
| `tool_failure_modes` | `{tool_id: string, failure_class: string, count: number}[]` | `@computed_field` | in JSON output; **not referenced by current template** — include for forward compat |

`RoundTripValidationResult` fields the template accesses:

| Field | TS type | Python source |
|---|---|---|
| `workflow_path` | `string` | regular field |
| `status` | `string` | `@computed_field` → `"ok"│"skipped"│"error"│"conversion_fail"│"roundtrip_mismatch"` |
| `error_diffs` | `StepDiff[]` | `@computed_field` (already `readonly` on TS type) |
| `benign_diffs` | `StepDiff[]` | `@computed_field` (already `readonly` on TS type) |
| `conversion_failure_lines` | `string[]` | `@computed_field` (already `readonly` on TS type) |

`StepDiff` fields the template accesses: `step_path`, `description` — both already on the TS type.

**No gaps** found between the template and the Python model. All computed fields are
serialized by Pydantic (`@computed_field` appears in `model_dump(by_alias=True, mode="json")`).

Expected gaps for remaining templates (unexplored, assumed from current `report-models.ts`):

| Template | TS type | Missing |
|---|---|---|
| `validate_tree.md.j2` | `TreeValidationReport` | none visible |
| `clean_tree.md.j2` | `TreeCleanReport` | none visible |
| `lint_tree.md.j2` | `LintTreeReport` | none visible |
| `roundtrip_tree.md.j2` | (no tree wrapper yet) | `RoundTripTreeReport` type + builder |
| `export_tree.md.j2` | (no tree type yet) | `ExportTreeReport` type + builder |
| `to_native_tree.md.j2` | (no tree type yet) | `ToNativeTreeReport` type + builder |

Add missing types and builders to `report-models.ts` following the existing `buildTree*`
pattern. The `RoundTripValidationResult` computed fields (`.status`, `.ok`, `.error_diffs`,
etc.) are already `readonly` fields on the TS type — no changes needed there.

---

## Step 5 — Template build step (bundling for dist)

Add `scripts/bundle-templates.mjs` in `packages/cli/` — reads all `*.md.j2` and
`*.html.j2` files from `packages/cli/src/workflow/templates/reports/`, emits
`packages/cli/src/workflow/_templates-bundled.ts` (a `Record<string, string>` const).

Wire into the `build` script for `packages/cli`:
`"build": "node scripts/bundle-templates.mjs && tsc"`.

Add `_templates-bundled.ts` to `.gitignore` (generated file). The renderer imports it
with a dynamic `import()` at startup; if the module doesn't exist (dev/test without a
prior build) it falls back to file-system Nunjucks via `import.meta.url` + `fileURLToPath`.

This keeps the published `dist/` self-contained: consumers don't need to ship `.j2` files.

---

## Step 6 — Wire into CLI commands

For each tree-mode CLI command (`validate-tree`, `clean-tree`, `roundtrip-tree`,
`export-tree`, `to-native-tree`, `lint-tree`):

1. Import `makeRenderer` from `report-templates.ts`.
2. When `--report-markdown [FILE]` is passed, call
   `makeRenderer("validate_tree.md.j2", "markdown")(report)` and write the result
   (stdout or file).
3. When `--report-html [FILE]` is passed, call
   `makeRenderer("validate_tree.md.j2", "html")(report)` and write the result
   (stdout or file).

Both flags can be passed simultaneously (write both formats in one invocation). Replace
the current `render-results.ts` console output for tree commands with the Nunjucks
renderer. Keep `render-results.ts` for single-file (non-tree) commands.

---

## Step 7 — Tests (red → green)

### 7a. Snapshot tests (`test/report-templates.test.ts` in `packages/cli/test/`)

For each of the 6 templates:
- Build a minimal but realistic fixture using the `build*` helpers in `report-models.ts`.
- Call `renderReport("validate_tree.md.j2", fixture, undefined, "markdown")` and
  `renderReport("validate_tree.md.j2", fixture, undefined, "html")`.
- Assert the markdown output contains key structural markers (H1 heading, table headers,
  summary line). Assert the HTML output contains expected HTML tags (e.g. `<h1>`, `<table>`).
- **Red first:** write the test before the renderer exists. It will throw "template not
  found". Then make it green by landing Step 3.

### 7b. Golden file tests

After each template is confirmed to render correctly, capture the output against the same
fixture and write it to `packages/cli/test/fixtures/report-goldens/<name>.md.golden` and
`<name>.html.golden`. Golden update is intentional (`UPDATE_GOLDENS=1 pnpm test`).
Future test runs assert exact match.

The `.md.golden` / `.html.golden` extensions (not `.md` / `.html`) keep Prettier from
formatting the files. Mirrors the Python convention established in `JINJA_REPORTS_PLAN.md`.

### 7c. Nunjucks parity smoke test

For `_macros.md.j2` + `validate_tree.md.j2`: run the same fixture through the Python
`_report_templates.py` `render_report()` (as a subprocess or via a small pytest fixture
invoked from a Makefile target) and diff against the Nunjucks markdown output. Add as a
`check-nunjucks-parity` Makefile target (gated on `GALAXY_ROOT`, **not** wired into
`check-sync` — run as a separate opt-in target).

---

## Step 8 — `check-sync` integration

Add `check-sync-wfstate-templates` to the `check-sync` GALAXY_ROOT branch so CI fails
if templates drift from the Python source without a deliberate sync. The EXTRA-files
check must allowlist `_macros.html.j2` and `_templates-bundled.ts` as TS-side-only
additions.

---

## Deliverables

1. `Makefile`: `sync-wfstate-templates` + `check-sync-wfstate-templates`, wired into
   `sync` and `check-sync`. `check-nunjucks-parity` as a separate opt-in target.
2. `packages/cli/src/workflow/templates/reports/*.md.j2` (8 files synced from Python) +
   `_macros.html.j2` (authored TS-side).
3. `packages/cli` deps: `nunjucks` + `@types/nunjucks`.
4. `packages/cli/src/workflow/report-templates.ts` — Nunjucks renderer module supporting
   `"markdown"` and `"html"` format modes via swappable macro environments.
5. `packages/cli/scripts/bundle-templates.mjs` — codegen script; `_templates-bundled.ts`
   in `.gitignore`.
6. `report-models.ts` additions: `RoundTripTreeReport`, `ExportTreeReport`,
   `ToNativeTreeReport` types + builders; any other missing fields from Step 4 audit.
7. CLI commands wired to Nunjucks renderer for `--report-markdown` and `--report-html`.
8. Tests: snapshot tests + golden files (markdown + HTML) + `check-nunjucks-parity`
   Makefile target.

---

## Unresolved questions

- Do we want a future `--report-html` mode that uses a *fully separate* template set
  (not just macro override) for richer HTML structure? If yes, the current macro-swap
  design may be too limiting — factor the renderer more aggressively now or accept a
  future refactor.
