# Jinja Templated Reports Plan

**Goal:** Replace hand-written Python `format_*_markdown()` functions with Jinja2
templates driven by the CLI `--report-json` output so the same templates can be
reused by the TypeScript mirror via Nunjucks.

## Does the idea make sense?

Yes. The current state makes the transition low-risk:

- Every CLI already produces structured JSON via Pydantic `model_dump(by_alias=True)`
  and its shape is identical to what the markdown formatter consumes (both operate
  on the same `Tree*Report` model).
- `jinja2` is already a declared dependency of both `galaxy-tool-util`
  (`packages/tool_util/setup.cfg`) and the Galaxy monorepo (`pyproject.toml`), so
  no new runtime deps.
- Nunjucks is a near-drop-in port of Jinja2. If we stay within a small, well-known
  subset (`for`, `if`, `set`, `macro`, `include`, and a handful of filters:
  `length`, `default`, `upper`, `lower`, `replace`, `join`, `sort`, `selectattr`),
  templates render identically in both engines.
- The one structural risk: a couple of Python-side formatters call model **methods**
  (e.g. `TreeReportBase.by_category()`) that do not appear in JSON. We address this
  by promoting those to `@computed_field`s (see below) — a small, localized change
  that also makes the JSON richer for downstream consumers.

## Current inventory

Six markdown formatters and their tree-level Pydantic inputs
(`lib/galaxy/tool_util/workflow_state/`):

| CLI | Formatter | Tree report model |
|---|---|---|
| `gxwf-state-validate` | `validate.py:format_tree_markdown` | `TreeValidationReport` |
| `gxwf-state-clean`    | `clean.py:format_tree_clean_markdown` | `TreeCleanReport` |
| `gxwf-roundtrip-validate` | `roundtrip.py:format_roundtrip_markdown` | `RoundTripTreeReport` |
| `gxwf-to-format2-stateful` | `export_format2.py:_format_tree_markdown` | `ExportTreeReport` |
| `gxwf-to-native-stateful`  | `to_native_stateful.py:_format_tree_markdown` | `ToNativeTreeReport` |
| `gxwf-lint-stateful`  | `lint_stateful.py:_format_lint_tree_markdown` | `LintTreeReport` |

Plus the embedded `format_connection_markdown` that `validate.py` splices in.

All six are wired through `_report_output.emit_reports(... markdown_formatter=...)`
and `_tree_orchestrator.run_tree(... format_markdown=...)`, so there is a single
injection point per CLI.

## Implementation plan

### Step 1 — Make every report model fully serializable

Anything the markdown rendering needs must be in JSON. Audit each formatter and
promote derived values to `@computed_field`s (not `@property`, which Pydantic
does **not** emit in `model_dump`) on the report models so no template depends
on a Python method or attribute that vanishes on serialization.

**Before making any model change**, land a JSON-contract-freeze snapshot test
(see Step 5) over representative fixtures so the computed_field additions can
be verified as additive-only. This protects any downstream consumer that pins
the `--report-json` shape (notably the incoming TS mirror).

Concretely, add the following:

**`_report_models.py`**

- `WorkflowResultBase` → `name` (basename of `relative_path`). Used in 3
  formatters via `os.path.basename`. No `basename` filter exists in the
  Jinja2/Nunjucks shared subset.
- `TreeReportBase` → `categories: list[{name, results}]` computed field.
  Replaces the `by_category()` method. Sorted by name. All tree reports
  inherit it.
- `WorkflowValidationResult` — **reuse the existing `summary` computed field**
  (`_report_models.py:68`) in templates rather than adding parallel
  `n_ok/n_fail/n_skip`. Add a `failures: [{step, tool_id, message}]` list so
  the template doesn't have to do the two-pass accumulation that
  `validate.py:format_tree_markdown` does today (build table rows and a
  failure appendix in the same loop).
- `TreeValidationReport` → `all_failures: [{workflow, step, tool_id, message}]`
  so the per-workflow failures can be rendered as a grouped appendix without
  a second template loop.
- `CleanStepResult` → `display_label` (the `tool_id or "unknown"` + optional
  version suffix currently built at `clean.py:619-621`).
- `WorkflowCleanResult` → `steps_affected` count + keep `total_removed`.
- `LintWorkflowResult` → `step_counts` computed field mirroring
  `WorkflowValidationResult.summary` (`n_ok`/`n_fail`/`n_skip`).

**`roundtrip.py`** — biggest block of work, because the current formatter
relies entirely on plain `@property` that don't serialize:

- Promote `RoundTripValidationResult.status`, `.ok`, `.error_diffs`,
  `.benign_diffs`, `.summary_line` from `@property` to `@computed_field`.
  Without this promotion, the Jinja roundtrip template has nothing to branch
  on — **this is the single biggest correctness risk in the port and must
  land before the roundtrip template is written.**
- Add `RoundTripValidationResult.conversion_failure_lines` — the exact strings
  `_format_conversion_failures()` emits, precomputed Python-side so the
  template stays Nunjucks-safe.
- Add `RoundTripTreeReport.total` for template convenience.
- Add `RoundTripTreeReport.tool_failure_modes: list[{tool_id, count, failure_class}]`
  aggregated across all results. This is the "top-N offending tools" table
  called out in the report-utility review and is the single most actionable
  artifact for the roundtrip report. Aggregating in Python keeps templates
  inside the Jinja2/Nunjucks shared subset.
- Note: `StepDiff.format_line()` is a method used only by the text formatter,
  not the markdown formatter. Leave it alone.

**`export_format2.py` / `to_native_stateful.py`**

- `WorkflowExportResult` / `WorkflowToNativeResult` → derived
  `status: "ok"|"partial"|"error"|"skipped"` computed field. Today the
  formatters reconstruct this from a 4-branch (`error`/`skipped_reason`/
  `ok`/else-partial) negative-definition chain — promoting to an explicit
  field tightens correctness.

**Out of scope for Step 1 (deferred to dedicated commits):**

- `lint_messages: list[str]` on `LintWorkflowResult` — requires plumbing
  `LintContext` messages through `run_lint_stateful_tree`'s `process_one`,
  not just a model field. Treat as its own reviewable change alongside the
  lint template port.
- Stale-keys classification histogram on `CleanStepResult` — requires
  plumbing `stale_keys.py` classification into the `removed_keys` data,
  which currently ships only as a `list[str]`. Own reviewable change.
- Per-tool fallback aggregation on `ExportTreeReport` / `ToNativeTreeReport`
  — requires capturing per-step `tool_id` on step results (currently only
  counts survive). Own reviewable change.
- Lint exit-code documentation footer — requires exposing the exit code
  semantics on the report model; a new `exit_code_meaning` field, not just
  a template change.

These improvements are still in scope for the overall effort but land as
separate commits from the template port itself. This is the "separate model
changes from template changes" discipline the review called out.

**Red→green:** add a unit test per model that freezes a fixture dict and
asserts on the new computed fields. Then fill them in.

### Step 2 — Land a template rendering module ✅ done

New file: `lib/galaxy/tool_util/workflow_state/_report_templates.py`

Responsibilities:
1. Build a single `jinja2.Environment` (lazy singleton via `_get_env()`) with:
   - `PackageLoader("galaxy.tool_util.workflow_state", "templates/reports")`
   - `trim_blocks=True`, `lstrip_blocks=True`, `keep_trailing_newline=False`
   - Autoescape disabled (markdown, not HTML)
   - **No custom filters or globals** — Nunjucks parity is the constraint.
2. Provide `render_report(template_name: str, report: BaseModel, meta=None) -> str`
   that takes the report, `model_dump(by_alias=True, mode="json")`s it, passes
   the result under a single top-level var (`report`) plus a `meta` var for
   `generated_at`, `tool_util_version` (optional `meta` override for tests).
3. Provide a `make_markdown_renderer(template_name)` helper returning a
   `Callable[[BaseModel], str]` — the exact signature `emit_reports`/`run_tree`
   already expect, so the swap at each CLI is one line.

### Step 3 — Template scaffolding ✅ done

Scope of Step 3 is the shared scaffolding only — the six tree-level templates
are created inside Step 4 alongside the per-CLI port so each diff stays
reviewable. Delivered in this step:

```
lib/galaxy/tool_util/workflow_state/templates/reports/
  _macros.md.j2            # status_badge, kv_summary, workflow_state_cells, failure_bullet
  connection_section.md.j2 # ported from validate.format_connection_markdown; also include target for validate_tree
```

Added in Step 4 (one per CLI port):

```
  validate_tree.md.j2
  clean_tree.md.j2
  roundtrip_tree.md.j2
  export_tree.md.j2
  to_native_tree.md.j2
  lint_tree.md.j2
```

One macro file avoids cross-template duplication while staying inside the
Jinja2/Nunjucks shared subset (`{% import "_macros.md.j2" as m %}` works in both).

Templates are packaged as data files. `packages/tool_util/setup.cfg` has
`include_package_data = True`, but sdists built from `packages/tool_util/`
still need an explicit `MANIFEST.in` include for the new `.j2` files —
added as `include galaxy/tool_util/workflow_state/templates/reports/*.j2`.

### Step 4 — Port formatters one at a time ✅ done

For each CLI, in this order (smallest → largest), to keep diffs reviewable:

1. **`export_format2`** — simplest (bullet list). Lowest risk smoke test. ✅
2. **`to_native_stateful`** — near-identical to #1. ✅
3. **`lint_stateful`** — single table. ✅
4. **`clean`** — affected table + per-workflow details. ✅
5. **`validate`** — categories + failure details + spliced connection section. ✅
6. **`roundtrip`** — most structure (diff classification, conversion failures). ✅

Per CLI, the change is:
- Write the `.md.j2` file.
- Replace the `format_*_markdown` import at the `emit_reports` call site with
  `make_markdown_renderer("validate_tree.md.j2")`.
- Delete the old `format_*_markdown` function in the same commit. **Hard cut,
  no shims.** Parity is enforced by the Step 5 snapshot tests (old-formatter
  goldens are checked in first, then the template is required to match them
  — or to match a new golden when we intentionally improve the output).

Conventions established while porting CLIs #1–#4:
- **Golden file suffix is `.md.golden`, not `.md`**, to keep prettier's
  table-column-aligner off them. Templates emit unaligned tables because
  Jinja2/Nunjucks have no shared column-pad filter. Goldens live under
  `test/unit/tool_util/workflow_state/report_markdown_goldens/`.
- **Templates emit a blank line after the H1** (prettier enforces this on
  markdown and we want the rendered output to be prettier-compliant anyway).
- Templates reach for `selectattr(attr)` (single-arg, truthy-check) plus
  `loop.first` when a filtered section header needs gating — avoids mutable
  `namespace`, which isn't in the Jinja2/Nunjucks shared subset.
- Content improvements from the review (category grouping on `export_tree`
  and `to_native_tree`, lint_messages surfacing, etc.) have been **deferred
  from the per-CLI port commits** to keep diffs tight. They'll land as
  follow-ups once the six pure ports are in.
- **Caveat:** CLIs #1–#4 were committed without running the full pytest
  (no .venv in the worktree). Each template was verified against real
  `model_dump` output via a standalone `jinja2.Environment` dry-run and,
  for clean, via `exec`-ing `_report_models.py` with a stubbed `gxformat2`.
  Run `test_report_templates.py` under a bootstrapped venv before merging.

### Step 5 — Testing strategy (red→green)

Three layers:

0. **JSON contract freeze** (lands first, before any Step 1 model changes):
   `test/unit/tool_util/workflow_state/test_report_json_contract.py`. For each
   of the six tree reports, build a representative fixture and snapshot
   `model_dump(by_alias=True, mode="json")`. After Step 1 lands, update the
   goldens and review the diff — it must be additive-only. Catches any
   accidental breakage of the TS mirror's or IWC CI's JSON expectations.
1. **Snapshot tests** (new, per CLI): `test/unit/tool_util/workflow_state/test_report_templates.py`.
   Feed a hand-built fixture `TreeValidationReport` (etc.) into the renderer,
   compare output to a checked-in `.md` golden. Run `pytest --snapshot-update`
   only intentionally. This gives us the red-before-green for Step 4.
2. **Regression parity** (one-shot): before deleting each `format_*_markdown`,
   capture its output against the shared fixtures as a checked-in golden.
   The Jinja template must match the golden exactly (pure port) or the
   golden must be updated deliberately in the same commit (intentional
   improvement). No dual-rendering shim phase — goldens are the bridge.

Also: extend `test_iwc_sweep.py` (gated on `GALAXY_TEST_IWC_DIRECTORY`) with one
run per CLI that writes `--report-markdown` to a tempfile and asserts non-empty
+ parseable structure (section count, table headers present).

### ~~Step 6 — Nunjucks compatibility gate~~ (removed)

Decided against a dedicated CI gate. The templates stay within the
	Jinja2/Nunjucks shared subset by convention (documented in `_macros.md.j2`
header); the npm package itself will validate compatibility when consumed.

### ~~Step 7 — TypeScript consumer wiring~~ (removed)

Out of scope for this effort. TS consumption will be handled separately
when the TS mirror project is ready.

## Markdown report utility review + improvement suggestions

Reviewing each current formatter against its JSON counterpart:

### `validate_tree` (strong baseline)
- **Works well:** per-category tables, failure details appendix, connection
  validation section spliced in.
- **Gaps:**
  - No overall status banner (PASS/FAIL) at the top — a human scanning a CI
    artifact has to read the counts line. Add an explicit badge-style line.
  - Failure details are flat bullets with the full relative path every time;
    grouping by workflow (`### workflow` → bullet list) is easier to read for
    IWC-scale output (120 workflows).
  - No link anchors from the category table rows to the failure details, so
    clicking through a GH preview is manual scrolling.
  - Connection section emits a `## Connections: <path>` block for every
    workflow that has a `connection_report`, including fully-valid ones with
    zero invalid connections. Should be suppressed when the connection
    report is fully green.

### `clean_tree` (good)
- **Works well:** affected table + per-workflow details section.
- **Gaps:**
  - "Clean workflows" section currently says only "All other workflows have
    no stale keys." Useful to list them (optionally, collapsed under a
    `<details>` tag, which GH-flavored markdown supports) so reviewers can
    confirm coverage.
  - No aggregate "stale keys by classification" — we already have the category
    info in `stale_keys.py`. A summary histogram (e.g. `bookkeeping: 45,
    removed_param: 12, case_index: 8`) would tell the reader *why* things are
    being cleaned at a glance.

### `roundtrip_tree` (this one most needs improvement)
- **Works well:** status per workflow, benign/error diff counts.
- **Gaps:**
  - Currently just a flat bullet list — 120 IWC workflows produces a wall of
    text. Needs per-category tables like `validate_tree`.
  - No "tool failure modes" aggregation. When a roundtrip fails across multiple
    workflows it is almost always the same tool(s) — a top-N table of offending
    `tool_id` → failure count is the single most actionable artifact for this
    report.
  - Benign-diff workflows are reported identically to clean ones aside from a
    parenthetical count; a separate collapsed section listing the benign
    patterns observed ("empty-repeat normalization", "multi-select scalar→list")
    would make the benign classification system visible.
  - `conversion_failure_lines` are currently sub-bullets; a small dedicated
    table with columns (workflow, step, tool, failure_class) is easier to scan.

### `export_tree` / `to_native_tree` (sparse)
- Identical structure: `# Title` + bullet list + summary line. Feels like a
  stub.
- **Gaps:**
  - No category grouping even though the tree walker has category info.
  - No per-tool fallback aggregation — for export/to-native, the thing you
    actually want to know is "which tools keep hitting the fallback path", same
    argument as roundtrip.
  - No section listing skipped workflows with skip reasons distinct from errors.
  - Suggest standardizing on the same structure as `validate_tree` (header +
    category tables + failure appendix) via shared macros.

### `lint_tree` (adequate)
- **Works well:** single wide table is easy to scan.
- **Gaps (model changes deferred — see Step 1 "out of scope"):**
  - Lint errors/warnings are shown as counts only; the actual lint messages
    (which `LintContext` has) are dropped from the markdown. Fixing this
    needs `LintWorkflowResult.lint_messages` **plus** plumbing through
    `run_lint_stateful_tree`'s `process_one` — model *and* pipeline change,
    not just a template edit.
  - Exit code semantics aren't documented in the report itself (0 vs 1 vs
    `EXIT_CODE_LINT_FAILED`). Needs a new `exit_code_meaning` field on
    `LintTreeReport`.

### Cross-cutting improvements to bake into the shared macros

- Consistent H1: `# <Operation>: <root>`, consistent summary badge line
  (`**Status:** PASS | **Workflows:** N | ...`), consistent "Summary" section.
- A single macro `workflow_row(r)` that handles the error/skipped/ok cases —
  currently every formatter reimplements the same three-branch logic.
- Emit `generated_at` and the galaxy-tool-util version in a footer (from the
  `meta` dict passed to `render_report`). Useful for diffing reports over time.
- GitHub-flavored `<details>` collapsibles for long lists (clean workflows,
  benign-diff details) so the rendered output is scannable but complete.
- Anchor links from summary tables to detail sections.

None of the above require template features outside the Jinja2/Nunjucks shared
subset.

## Deliverable summary

1. Computed-field additions on report models (Step 1). ✅
2. `_report_templates.py` rendering module (Step 2). ✅
3. `templates/reports/` scaffolding — `_macros.md.j2` + `connection_section.md.j2` (Step 3). ✅
4. Per-CLI `*_tree.md.j2` templates + swap of `format_*_markdown` → Jinja renderer (Step 4).
   - export_format2 ✅ · to_native_stateful ✅ · lint_stateful ✅ · clean ✅ · validate ✅ · roundtrip ✅
5. Snapshot + parity tests (Step 5) — JSON contract freeze ✅, per-CLI goldens
   landing alongside each Step 4 commit (6 of 6 done).
6. ~~Nunjucks compat CI gate~~ (removed — convention-enforced, not CI-gated).
7. ~~TypeScript consumer wiring~~ (removed — out of scope).
8. Updated report content per review above — **un-bundled** from Step 4 in
   practice: pure ports first, content improvements as follow-up commits
   after all six ports land.

## Unresolved questions

- Meta footer: include galaxy-tool-util version? Git SHA? Opt-in?
- Collapse `<details>` blocks — acceptable in all consumer surfaces, or do
  some render raw markdown where `<details>` won't work?
- Do we want a `--report-html` mode later that reuses the same templates with
  a different macro set? If yes, factor macros to minimize rework now.
- Do the Step 1 computed_field additions warrant a JSON schema version bump
  for downstream consumers, or is additive-only (enforced by the Step 5
  contract freeze) sufficient?

Resolved (no longer unresolved):
- **Snapshot lib**: plain golden files. `syrupy` is not currently a dep.
- **Shim vs hard cut**: hard cut. Goldens are the bridge.
- **`connection_section.md.j2`**: both — `format_connection_markdown` is
  already standalone and spliced into `validate_tree` today; the template
  port mirrors that.
- **Roundtrip "tool failure modes" aggregation**: compute in Python as a
  computed_field on `RoundTripTreeReport` to keep templates inside the
  Jinja2/Nunjucks shared subset.
- **Nunjucks CI gate**: removed — convention-enforced via `_macros.md.j2`
  header, not a separate CI step.
- **TS consumer wiring**: out of scope for this effort.
