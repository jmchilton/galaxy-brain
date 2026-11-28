# tool_security_tooling plan

Admin UI, admin CLI and developer tooling for the tool security work. This is a plan only: nothing is implemented. Drafted by Claude Opus 5.5 on 2026-11-28.

- **Base.** `tool_security_tooling` branches from branch 4, `tool_patches_static_findings` at `152b652559c`. Patches and refusal can then be released without the tooling, and the tooling has both patches and findings in core.
- **Phases.** There are two, done one after the other by different agents:
  1. server and UI;
  2. CLI and developer tooling.

  Phase 2 builds on phase 1's assessment layer. Section 4.0 lists exactly what it reuses.
- **Sources read.** Branch 4's code:
  - `galaxy.tools.static_findings` and `galaxy.tools.security_refusal`;
  - `galaxy.tool_util.security` (`__main__`, `patch_review`, `refusal`, `classify`, `report`, `rules`);
  - `galaxy.tool_util.patches` (`database`, `model`, `keys`, `hg`);
  - `galaxy.tools.patches`, `cached_toolbox`, `source_store/{index,populator,discover}`, and `ToolBox.register_tool`.

  Also read: the records of branches 1, 2 and 4; the admin client (`AdminPanel.vue`, `admin-routes.ts`, `JobLock.vue`, `DataTables.vue`) and `api/admin_extensions.py`; the `packages/{tool_util,app}/pyproject.toml` scripts; planemo's `tool_lint.py` and `shed/`; the patch database (README, `docs/lint.md`, `docs/authoring.md`, `viewer/README.md`, `viewer/fetch.py`, `tools/checker.py`); and prior art under `~/tool_security`: `regress/regress.py`, the sweep Tool Shed scan scripts and their output layout. I read these as data and ran nothing from them.

## 1. Goals and non-goals

| John's ask | Goal here | Phase |
|---|---|---|
| Admins (UI): see the configured tool patches | An admin page that shows the collections, policy and series, the per-process patch state counts, every loaded tool a patch file matched with its per-kind states, and a parsed view of each matched patch file | 1 |
| Admins (UI): see outstanding (unpatched) static findings | An admin page that lists each loaded tool's review status and the findings left after patching, plus a per-tool detail page that runs the review on demand (patched source, and before vs after when patched) | 1 |
| Admins (CLI): a JSON of all active, unpatched findings against the configured toolbox | `galaxy-tool-security-report -c galaxy.yml`, a versioned JSON document built from the same discovery, patching and exclusion that Galaxy uses | 2 |
| Developers: (a) chains of tools in the Tool Shed | `galaxy-tool-security-chain`: for each changeset of a repository, which tool contents it holds, their findings before and after the patches, the patch state, where a finding appears and where an upstream fix landed, and which installable revisions are still exposed | 2 |
| Developers: (b) directories of tools on disk | `galaxy-tool-security-review --summary` (counts by rule, severity and code), `galaxy-tool-security-diff` (two directories, two git revisions or two JSON scans), and the chain engine over git history | 2 |
| planemo reuse | Every command is a thin `main(argv)` over library functions that return pydantic models (section 4.6). planemo calls them the way it calls `lint_tool_source` | 2 |

**Non-goals.**
- No change to how refusal decides. That includes the capability switch that branch 4 is BLOCKED on: this branch displays whatever the refusal rule is.
- No editing of patches or collections from the UI, and no live reload of collections.
- No bulk on-demand review in the web process (Q9).
- No finding dismissals (`plan_finding_dismissals.md`). The data model leaves room for them (section 2.3).
- No user-facing patch badge on the tool form, and no `Job` patch column. Both were already out of scope on branch 2.
- No changes to the patch database repository. Section 4.7 says what moves there later.
- No LLM judge (standing decision).

## 2. Data model

### 2.1 Per loaded tool

A *loaded tool* is a `Tool` or `CachedTool` registered in `ToolBox._tool_versions_by_id`, with every version counted (`_tools_by_id` holds only the default version).

| Field | Meaning | Source today | Cost |
|---|---|---|---|
| identity | `id`, `version`, `name`, `guid`, `tool_type`, `tool_shed_repository` (shed, owner, name, installed changeset), panel section, `config_file` | `Tool` / `CachedTool` (from the index entry) | free |
| `patch` | `ToolPatchInfo {digest, states[]}`, one `PatchState` per matched file and change kind: `applied`, `already_applied`, `mismatch` or `skipped`, with `kind`, `collection`, `path`, `reproducibility(_doc)`, `upstream`, `advisory`, `detail` | `Tool.patch` (eager); `ToolIndexEntry.patch` (cached, not forwarded by `CachedTool` yet) | free |
| `exclusion` | Why reviews leave the tool out: "one of Galaxy's own tools" (unless patched), "an interactive tool", "a CWL tool", or None | `review_exclusion(tool_file(tool), tool.tool_type, patched=...)` | one `realpath` per tool, computed only for tools that have no stored review |
| `static_review` | `StaticReview {severities: rule → worst severity, error, version}` of the patched source | `Tool.static_review`; `ToolIndexEntry.static_review` (cached). Set only when `tool_security_refuse_static_findings` is on | already computed at load (about 4 ms per tool) |
| `codes` (new) | The uncheckable codes of that review (`classify(report).codes`) | not stored today | `classify()` on a report that is already in hand, so it is cheap |
| full findings | `Report` of the patched source: findings with rule, kind, severity, location, line, refs, plus unchecked locations and codes with reasons | not kept anywhere | computed on demand, about 4 ms plus a parse, per tool |
| before / after | `PatchReview`: the review of the unpatched source, plus `cleared`, `introduced` and `notes_added` | not kept anywhere | on demand: re-parse the tool file from disk and review it (about 10 ms) |

### 2.2 Review status (one per loaded tool)

- `excluded`: `exclusion` is set. Findings are still available on demand, labelled "not refused: <reason>".
- `not_reviewed`: reviews at load are off (neither refusal nor report mode, Q1), or a read-only store was built without reviews and the tool has not been materialized yet.
- `review_failed`: `static_review.error` is set. This refuses nothing, and the code is `uncheckable-review-failed`.
- `reviewed`: a current `static_review` is present (`version == REVIEW_VERSION`).

### 2.3 Findings, "outstanding" and "unsure"

- **A finding** is a `Finding` of the review of the patched source. The UI and JSON carry `rule`, `kind` (vulnerability or capability), `severity`, `message`, `location`, `line`, `more_lines`, `expr`, `context`, `checkable` and the param paths from `refs`. The breakout character sets are kept only in the full detail view.
- **Outstanding** means unpatched: a finding still present after every configured patch, on a tool that is not excluded. Each outstanding finding gets one disposition:
  - `refused`: refusal is on and the finding is at or above `tool_security_refuse_static_findings_severity`. This is exactly `StaticReview.refused_rules(threshold)`.
  - `would_refuse`: refusal is off, and the finding is at or above the threshold.
  - `below_threshold`: everything else.

  A lowered finding stays outstanding at its new severity, as refusal already treats it.
- **Unsure.** Uncheckable codes and unchecked locations are shown in their own column and section, with `classify.DESCRIPTIONS`. They never count as outstanding findings and never refuse, which matches branch 4: "Uncheckable codes, unchecked locations and a failed review refuse nothing".
- **Outstanding advisories** (Q3). These are the security patch units of the tool whose state is `mismatch`, or whose `advisory` has `vulnerable: true|unknown`. They are a second category on the same page. A tool with no findings can still have one, because the patch database can describe holes that the analyser cannot see.
- **Dismissals, later.** If they land, a dismissed finding gets the disposition `dismissed` and no other code changes.
- **Capability findings** count like vulnerabilities, as branch 4 refuses today. The UI has a kind filter (Q4).

### 2.4 Where it is computed, and its cost

The rule: **nothing new on the toolbox-load hot path by default.**

| Mode | At load | What the list shows | Detail page |
|---|---|---|---|
| Default (refusal off, report mode off) | nothing new | patch states; review status `not_reviewed` | on demand |
| `tool_security_refuse_static_findings: true` (branch 4) | unchanged: review of the patched source, plus `classify()` for `codes` (a small extra cost on an existing computation) | rules, severities, codes and disposition | on demand |
| `tool_security_review_static_findings: true` (new, Q1) | the same review, stored, with no refusal | the same as above, with disposition `would_refuse` | on demand |

- **Eager toolbox.** The review runs in `get_expanded_tool_source` (as today). That is about 4 ms per reviewed tool on every start, the cost branch 4 already pays when refusal is on. `Tool.static_review` holds only severities and codes, never the `Report`.
- **Cached toolbox.** The review is stored on `ToolIndexEntry.static_review` when the index is populated, and carried forward for unchanged tools, so only changed tools pay. The list endpoint reads entries through `CachedTool` and **never materializes**. The detail endpoint uses `toolbox.materialize_tool(tool, reason="detail")`, which goes through the existing bounded LRU, then reviews `tool.tool_source` (the stored, already patched source).
- **Freshness.**
  - Adding `codes` to `StaticReview` changes the index schema hash, and the index is re-populated once.
  - The report-mode flag joins the freshness token the same way refusal does now (`freshness.py` folds in `REVIEW_VERSION` "when reviewing").
  - `static_review_is_current` / `with_static_review` / `reviews_tool` switch from "refusal on" to "reviews at load" (`refuse or review`). `check_static_findings` still requires refusal.
- **Request cost.**
  - The overview and list endpoints are a linear pass over in-memory attributes: about 1 µs per tool plus pydantic serialization. That is about 10k tools in well under a second.
  - The detail endpoint is one tool: about 10 ms, plus one materialization in cached mode.
  - No endpoint ever runs the analyser over the whole toolbox.

## 3. Phase 1: server and UI

### 3.1 Library and model layer

These are shared with phase 2.

**`lib/galaxy/tool_util/security/assessment.py` (new, galaxy-tool-util, no app imports).** It holds pydantic models:
- `FindingModel`: built from `Finding` with the field mapping of `finding_to_dict`; `params` comes from `refs`; the char sets are optional.
- `UncheckableModel`: `code` and `reason`.
- `ReviewModel`: `tool_id`, `max_severity`, `findings`, `codes` (with reasons), `uncheckable_locations`, `unanalyzed`.
- `PatchReviewModel`: `before`, `cleared`, `introduced`, `notes_added`. It wraps `PatchReview.to_dict()` shapes.
- `ToolAssessment`: identity fields, `status`, `exclusion`, `error`, `patches: list[PatchState]`, `severities`, `refused_rules`, `disposition` per rule, `codes`, `advisories_outstanding`, and an optional `review` / `patch_review` for the full detail.

It also holds the functions:
- `review_model(report)`, which calls `classify(report)` once;
- `outstanding_rules(severities, threshold, refusing) -> dict[rule, disposition]`;
- `outstanding_advisories(patch) -> list[PatchState]`;
- `assess_tool_source(tool_source, *, patch_db=None, guid=None, tool_path=None, changeset=None, threshold="high") -> ToolAssessment`. This one is for offline callers: it patches (if a db is given), reviews before and after, and fills `review` / `patch_review`. It reuses `review_patches`.

Models in tool-util follow the `ToolPanelEntry` precedent (`tool_util/toolbox/entry.py` already embeds `PatchState`).

**`lib/galaxy/tool_util/security/refusal.py`.** Add `StaticReview.codes: list[str] = []`. `StaticReview.of(report, version)` fills it from `classify(report)`. Schema hash re-pinned in `test_index_versions.py`.

**`lib/galaxy/tools/static_findings.py`.** Add `reviews_at_load(config)` (refusal or report mode) and use it in `reviews_tool`, `with_static_review` and `static_review_is_current`. `check_static_findings` is unchanged. Also fix the freshness fold in `lib/galaxy/tools/source_store/freshness.py`.

**`lib/galaxy/tools/security_assessment.py` (new, app).**
- `assess_loaded_tool(toolbox, tool, config, *, detail=False) -> ToolAssessment`.
  - It reads `tool.patch` and `tool.static_review`, and computes the exclusion only when there is no review.
  - `detail=True` materializes (cached), reviews `tool.tool_source`, and re-parses the file on disk for the unpatched review when a patch applied. That uses `review_patches` with `app.tool_patches`, the tool's guid and its `tool_file`.
  - A tool file that is gone gives `patch_review: null`, with a note.
- `iter_loaded_tools(toolbox)` covers all versions. Add a public `ToolBox.all_tool_versions()` in `lib/galaxy/tool_util/toolbox/base.py` that iterates `_tool_versions_by_id`, snapshotted like `tools()`.
- `assess_tool_file(config, db, path, guid, *, detail)` is for the phase 2 CLI. It runs `get_tool_source`, then `apply_tool_patches`, `built_tool_type`, `review_exclusion` and the review.

**`lib/galaxy/tools/cached_toolbox.py`.** Add forwarded `CachedTool.patch` and `CachedTool.static_review` properties from `self._entry`. A test asserts `_cached_materialize_count` is unchanged after a list call.

**Config: `tool_security_review_static_findings`** (Q1), bool, default false. "Review each tool when it loads, after its tool patches, and keep the findings for the admin pages and API, without refusing its jobs. Implied by `tool_security_refuse_static_findings`." Files: `lib/galaxy/config/schemas/config_schema.yml`, regenerated `galaxy.yml.sample` and `doc/source/admin/galaxy_options.rst`, and `_galaxy_config_schema_attributes.py` if needed.

### 3.2 Endpoints

All endpoints are `require_admin=True`. Files: `lib/galaxy/webapps/galaxy/api/tool_security.py` (router, tags `["tool_security"]`), registered the way `admin_extensions` is. Tool ids can be guids with slashes, so tools are named by query parameters, not path segments.

| Method and path | Returns (pydantic, in `lib/galaxy/schema/tool_security.py`) | Notes |
|---|---|---|
| `GET /api/admin/tool_security` | `ToolSecurityOverview` | See below |
| `GET /api/admin/tool_security/tools` | `list[ToolAssessment]`, without detail | Filters below. No analyser runs |
| `GET /api/admin/tool_security/tool?tool_id=&tool_version=` | `ToolAssessment` with `review` and `patch_review` | Runs the review on demand; 404 for an unknown tool |
| `GET /api/admin/tool_patches/file?collection=&path=` | `ToolPatchFileView` | See below |

- **Overview** (`ToolSecurityOverview`):
  - mode: `refusing`, `reporting` or `off`, plus the severity threshold;
  - `review_version`;
  - patch database: `collections_summary()`, policy, series and `state_counts()`;
  - counts by status, by exclusion reason and by disposition, and the number of tools with codes, with outstanding advisories, and with patches by state;
  - the rule catalog (`rules.DESCRIPTIONS` with kind) and `classify.DESCRIPTIONS`, so the client copies no text.
- **List filters** (`ToolSecurityListQuery`): `status`, `disposition`, `kind`, `min_severity`, `patched` (`any`, `applied`, `mismatch`, `none`), `has_codes`, `advisories`, and `q` (substring of id or name).
- **Patch file view** (`ToolPatchFileView`): the parsed `PatchFile` (ops with old and new, upstream, advisory, reproducibility doc) and the raw YAML text of one matched patch file. `path` must be one of `PatchCollection.paths()`; any other value is a 404, so there is no traversal. Only a path that some loaded tool's state names is served (Q10).

**Service.** `lib/galaxy/webapps/galaxy/services/tool_security.py`, a `ToolSecurityService(app)`. It maps toolbox and config into the models, applies the filters, and does the 404 handling. There is no DB access.

**The `patches` field (Q2).** `Tool.to_panel_entry` and `CachedTool.to_panel_entry` return `patches` in `/api/tools` to every user. The recommendation is to return it to admins only. The two `to_dict` caches already split admin and non-admin, so the change is one `if trans.user_is_admin`. `test/integration/test_tool_patches.py::_patch_states` then reads with `admin=True`. The client never reads `patches` today (checked by grep).

### 3.3 Client

**Typed API.** `client/src/api/toolSecurity.ts`, using `GalaxyApi().GET(...)` as `JobLock.vue` / `DataTables.vue` do. Then regenerate `client/packages/api-client/src/schema/schema.ts` (`make update-client-api-schema`).

**Routes** in `client/src/entry/analysis/routes/admin-routes.ts`, under `/admin` (`requiresAdmin`):
- `tool_security` goes to `ToolSecurityList`;
- `tool_security/tool` goes to `ToolSecurityDetail` (with query props `tool_id` and `tool_version`);
- `tool_patches` goes to `ToolPatches`.

**Panel.** In `client/src/components/admin/AdminPanel.vue`, under "Tool Management", add two links: "Tool Security Review" (`admin-link-tool-security`) and "Tool Patches" (`admin-link-tool-patches`).

**Components.** All live in `client/src/components/admin/ToolSecurity/`.
- **`ToolSecurityList.vue`.**
  - A mode banner: refusing at X, reporting, or "reviews are not computed at load: enable `tool_security_review_static_findings` or use `galaxy-tool-security-report`; each tool can still be reviewed below".
  - Count cards.
  - A filter bar.
  - A table with these columns: tool, version, repository, status or exclusion, worst outstanding severity, rules (each with its disposition badge), codes, patch states and advisories. Rows link to the detail page.
- **`ToolSecurityDetail.vue`.**
  - Identity, status and exclusion.
  - Patch states, with the upstream PR links, reproducibility doc and advisory message, and a link to the patch file view.
  - The findings table, sortable by severity, with each rule's description from the overview catalog.
  - "Unsure": codes with their reasons, and unchecked locations.
  - When patched: "before patching", "cleared", "introduced" and "notes added".
  - A "Re-run review" button that re-fetches.
- **`ToolPatches.vue`.**
  - The collections table (name, version, digest prefix, path), the policy and the series.
  - State counts.
  - A table of patched loaded tools by state, filterable, with `mismatch` first.
  - The patch file viewer, a collapsible panel showing the parsed ops and the raw YAML.
- **`ToolSecurityBadges.vue`** (small): severity, disposition and patch-state badges, shared by the three pages.

### 3.4 Tests (phase 1)

Red-first where behaviour changes. Baseline tests come first in their own commit ("Baseline tests ..."): they pin the current `/api/tools` `patches` behaviour and `StaticReview` serialization.

- **Unit, tool-util: `test/unit/tool_util/security/test_assessment.py`.**
  - `review_model` against `report_dict`.
  - Dispositions at every threshold, with refusing on and off.
  - Outstanding advisories (mismatch, `vulnerable` true or unknown, applied).
  - `assess_tool_source` with and without a db, using the `identifier_single_unsanitized` fixtures and `galaxy.tool_util.unittest_utils.tool_patches`.
  - A JSON-schema snapshot of `ToolAssessment`, so an unversioned change fails.
- **Unit, refusal: extend `test/unit/tool_util/security/test_refusal.py`.** `StaticReview.codes`, and old payloads without `codes` still parse.
- **Unit, app: `test/unit/app/tools/test_tool_security_assessment.py`.**
  - Eager and cached tools give the same `ToolAssessment`.
  - Listing doesn't materialize.
  - Exclusions: own tool, own tool patched, interactive, CWL.
  - Report mode stores a review and `check_static_findings` does not refuse.
  - Refusal mode is unchanged.
  - Detail with a missing tool file.
- **Unit, populator: extend `test/unit/scripts/tool_source/test_populate_store.py::TestStaticReview`.** Report mode keeps a review; toggling report mode re-reviews; `codes` are stored. Also `test_freshness.py` and `test_index_versions.py`.
- **Integration: `test/integration/test_tool_security_admin_api.py`.** It runs under eager and cached toolboxes, as `test_tool_static_findings_refusal.py` does. The config has a fixture collection, the unsafe test tool, a tool patched clean, and the lowered awk tool. Assertions:
  - 403 for a regular user and for anonymous on every endpoint.
  - Overview counts.
  - List statuses and dispositions in refusing mode and in report mode (two classes).
  - Detail findings, `cleared` and `introduced`.
  - The patch file view, and 404 on a path that is not in `paths()`.
  - Non-admin `/api/tools/{id}` has no `patches` (if Q2 is yes).
  - Run one at a time under `flock ~/tool_security/.galaxy-tests.lock`.
- **Client vitest.**
  - `ToolSecurityList.test.ts`, `ToolSecurityDetail.test.ts` and `ToolPatches.test.ts`, with `useServerMock`. They cover the mode banner text, filters, badges and empty states.
  - `admin-routes.test.ts`: the new routes require admin and pass the query props.
  - `AdminPanel.test.js`: the links.
  - Run under the node in `client/.node_version`.
- **Selenium/Playwright (Q11).** One smoke test in `lib/galaxy_test/selenium/test_admin_app.py::test_admin_tool_security`, with selectors in `client/src/utils/navigation/navigation.yml`. An admin opens the panel link, the list renders with status `not_reviewed` (the default config), the admin opens the `identifier_single_unsanitized` detail (it is in `sample_tool_conf.xml`), and the on-demand review shows a `shell-injection` row. This is justified because it is the only check that the route, the API and the component wire together, and it needs no special server config.

### 3.5 Docs (phase 1)

- **`doc/source/admin/tool_security_review.md`.** Add a new section, "Reviewing findings and tool patches in the admin pages". It covers what each status and disposition means, report mode against refusal, the fact that the pages are admin-only and why (outstanding findings tell an attacker which tools are open), and what each page costs.
- **Config description** for the new option, and the regenerated files.
- **A short subsection on the tool patches pages.** Branch 2 has no admin doc page for tool patches (only `galaxy_options.rst`), see Q12.

## 4. Phase 2: CLI and developer tooling

### 4.0 What phase 2 reuses from phase 1

- `galaxy.tool_util.security.assessment`: every model, `review_model`, `outstanding_rules`, `outstanding_advisories` and `assess_tool_source`.
- `galaxy.tools.security_assessment.assess_tool_file`, for the toolbox report.
- The `StaticReview.codes` / `reviews_at_load` changes. They are used only to document that the CLI report and the stored review agree; the CLI never reads the store in v1.
- Phase 2 adds no endpoint and no client code.

### 4.1 Toolbox report (admin CLI)

- **Command:** `galaxy-tool-security-report`.
  - Code: `lib/galaxy/tools/security_report.py` with `main(argv=None) -> int`.
  - Entry point in `packages/app/pyproject.toml`.
  - Shim: `scripts/tool_security_report.py`, like `scripts/tool_source/populate_store.py`.
- **Arguments:**
  - `-c/--config galaxy.yml` (required);
  - `-o/--output PATH` (default stdout; the file is created 0600);
  - `--include-clean` (by default only tools with outstanding findings, advisories or codes are listed; the summary counts every tool);
  - `--include-excluded` (list excluded tools with their reason and findings);
  - `--detail` (add `review` and `patch_review` per tool);
  - `--severity` (default: the configured `tool_security_refuse_static_findings_severity`);
  - `--fail-on <severity|uncheckable|advisory>` (exit 1, as the review CLI does);
  - `--tool-id PATTERN`;
  - `--parallel N` (a process pool over discovered tools; the analyser is pure).
- **How it works.**
  1. `load_app_properties` gives a `GalaxyAppConfiguration` (as `populate_store` does).
  2. `discover_tools(config)` (`source_store/discover.py`) gives every configured tool with its path, guid, shed fields and `in_panel`. That includes shed confs, data managers and bundled tools, and converters only when a datatypes registry is wanted (`--converters`, using `_ensure_datatypes_registry`).
  3. `tool_patch_database_from_config(config)` gives the patch database.
  4. Each tool goes through `assess_tool_file`. That patches exactly as the eager toolbox does (the same `apply_tool_patches`, the same checked-out changeset), then the same `review_exclusion(built_tool_type(...))`.
  5. Deduplicate by real path and guid, as the review CLI does.
- **Output (versioned):**

```json
{
  "format": "galaxy-tool-security-toolbox-report",
  "format_version": 1,
  "generated_at": "2026-11-28T12:00:00Z",
  "galaxy_version": "26.1.dev0",
  "review_version": "26.1.dev0",
  "config": {"refusing": false, "reporting": false, "severity": "high",
             "tool_patches": {"collections": [...], "policy": {...}, "galaxy_series": "26.1"}},
  "summary": {"tools": 0, "by_status": {}, "by_disposition": {}, "by_exclusion": {},
              "with_codes": 0, "with_outstanding_advisories": 0, "patch_states": {}},
  "tools": [ToolAssessment, ...],
  "errors": [{"path": "...", "error": "..."}]
}
```

- **The same model as the API.** `ToolAssessment` is the API's model, so `jq` filters work on both. A report of a server's stored state is `GET /api/admin/tool_security/tools`.
- **Store reading (`--from-store`) is deferred.** Patching is deterministic for the same files, policy and checked-out changeset, so re-parsing gives what the eager toolbox gives and what the populator stored. Q6 covers this.

### 4.2 Directory tooling

**`galaxy-tool-security-review --summary`** (`lib/galaxy/tool_util/security/__main__.py`). It prints counts by rule and severity, by code, by patch state and by disposition, plus the 20 worst tools. With `--json`, the summary is added under a new top-level key only when `--summary` is given, so the default JSON stays byte-identical. Library: `galaxy.tool_util.security.directory.summarize(scan)`.

**`galaxy-tool-security-diff BEFORE AFTER`.** Module `lib/galaxy/tool_util/security/diff.py`, with `main`; entry point in `packages/tool_util/pyproject.toml`.
- **Each side** is one of:
  - a directory, scanned now;
  - a review CLI `--json` file, or a `ScanDocument`;
  - `git:<repo path>@<rev>[:<subdir>]`, read through `git archive` into a 0700 temp dir. git runs with `GIT_CONFIG_NOSYSTEM=1 GIT_CONFIG_GLOBAL=/dev/null`, as `viewer/fetch.py` does.
- **Options:** `--tool-patch-path` (repeatable; the patched review on both sides), `--json`, `--fail-on-introduced [severity]`, and `--rule` / `--tool-id` filters.
- **Identity.**
  - A tool is identified by its id and version. When an id and version appear twice, the path relative to the side's root breaks the tie.
  - A finding is identified by `patch_review.finding_match`, so "moved" reads as cleared here and new there, as the review CLI already defines it.
- **Output** (`ScanDiff`, `format: galaxy-tool-security-diff`, `format_version: 1`): per tool, `added`, `removed`, `introduced`, `cleared`, `changed` (same identity, different severity), `codes_added` and `codes_removed`, plus totals.
- **Prior art:** `~/tool_security/regress/regress.py diff`. It shows the need, but its identity (unit, path, rule, location, line, expr, params) is too line-sensitive for PR review.

**Library: `lib/galaxy/tool_util/security/directory.py`.**
- `scan_paths(paths, *, patch_db=None, guid=None) -> ScanDocument`. It reuses `__main__._tool_sources` and `_reviews` (moved here, so `__main__` keeps only argparse and printing). Each tool becomes a `ToolAssessment`.
- `summarize(scan)`.
- `diff_scans(before, after)`.
- `scan_git_revision(repo, rev, subdir)`.

**The git chain.** The chain engine (4.3) also takes a git source, so `galaxy-tool-security-chain --git <repo> --path tools/foo --revs A..B` answers "when did this directory's tool gain or lose a finding" without the Tool Shed.

### 4.3 Tool Shed chain tooling

**Command:** `galaxy-tool-security-chain`. Module `lib/galaxy/tool_util/security/chain/__main__.py`; entry point in `packages/tool_util/pyproject.toml`.

**Arguments.**
- The source, one of:
  - `OWNER/NAME` (a Tool Shed repository, `--tool-shed URL`, default main);
  - `--hg PATH` (a local hg clone);
  - `--git PATH --path SUBDIR [--revs A..B]`;
  - `--trees DIR` (pre-archived `<changeset>/` trees, such as the sweeps' `ts/trees/<owner>/<name>/`).
- `--tool-id ID` (repeatable).
- `--tool-patch-path P` (repeatable; by default every op is applied, as in the review CLI).
- `--installed FILE`: an ephemeris-style tool list (`tools: [{name, owner, tool_shed_url, revisions: [...]}]`) or a plain changeset list. It marks the installed revisions and limits the "exposed" report to them.
- `--installable-only`.
- `--cache DIR` (default `$XDG_CACHE_HOME/galaxy-tool-security`).
- `--offline` (cache only; errors name what is missing).
- `--min-interval S` (default 1).
- `--hg-cmd CMD`.
- `--json`.
- `--since CHANGESET`.

**Data sources and offline behaviour.** `lib/galaxy/tool_util/security/chain/sources.py` holds the sources. Each yields `Revision(node, short, rev, time, installable: bool | None, tree: path)`, oldest first.
- **`ToolShedSource`.**
  - Clones with `hg clone -U <shed>/repos/<owner>/<name>` into `<cache>/toolshed/<host>/hg/<owner>/<name>`, and pulls only when a wanted node is missing.
  - Calls `get_ordered_installable_revisions?owner=&name=` once per run and caches the JSON. Offline, it uses the cached JSON, or else `installable: null`.
  - Runs `hg archive` per node, without test-data, into `<cache>/toolshed/<host>/trees/<owner>/<name>/<node>/`. Those trees are immutable and never expire.
  - Ported from the patch database's `viewer/fetch.py`: no user hg config (`HGRCPATH="" HGPLAIN=1`), a minimum interval between network operations, one lock per repository, `.tmp` and rename, and symlinks that resolve outside the tree removed, with 0700/0600 modes.
  - The Tool Shed's HTTP file and archive endpoints answer 403 to automated clients, so the hg wire protocol is the read path (`viewer/README.md`, and the planemo 1752 notes).
  - `hg` is a subprocess (`hg` on PATH, `--hg-cmd`, or `.venv/bin/hg` in a Galaxy venv, since galaxy-app depends on mercurial). mercurial is **not** added as a galaxy-tool-util dependency, and a missing hg is a clear error.
- **`HgSource`:** a local clone, with the same archive step and no network.
- **`GitSource`:** `git archive` per commit of `--path`, with no network.
- **`TreeSource`:** reads existing directories and does no fetching, for offline use with sweep outputs.

**Engine.** `lib/galaxy/tool_util/security/chain/engine.py`, `build_chain(revisions, *, patch_db=None, tool_ids=None, installed=None, cache=None) -> ToolChain`.
1. For each revision, find tool files (`find_possible_tools_from_path`, XML only), parse them, and expand macros (`get_tool_source`). Compute `expanded_sha256` as the c14n sha256 of the expanded root, the same digest the patch database's coverage records, so the two can be joined.
2. Group by `(tool_id, version, expanded_sha256)`. Contents repeat across changesets, so each unique content is reviewed and patched once.
3. For each unique content and each changeset, call `assess_tool_source` with `guid=<host>/repos/<owner>/<name>/<id>/<version>` and `changeset=<node>`. This needs one engine change: `ToolPatchDatabase.apply_patches(..., changeset=None)`, an explicit changeset for per-changeset overrides, used instead of `changeset_for()`'s dirstate lookup. Archived trees have no dirstate.
4. Results are cached in `<cache>/reviews/<expanded_sha256>-<REVIEW_VERSION>-<patch digest or none>.json` (0600).
5. Events are derived per tool id and finding identity (`finding_match`), in changeset order:
   - `finding_introduced`;
   - `fixed_upstream` (a finding present in the unpatched content of revision N-1 is absent at N and later);
   - `patch_applies` (range);
   - `patch_already_applied` (the upstream fix is in the content);
   - `patch_mismatch`;
   - `exposed` (an installable or `--installed` revision whose patched content keeps outstanding findings, or has an outstanding advisory);
   - `same_version_drift` (one `(id, version)` with several contents, the case per-changeset overrides exist for).

   The advisory `fixed_in` from the patch file is shown next to the derived fix point.

**Output** (`ToolChain`, `format: galaxy-tool-security-chain`, `format_version: 1`):
- `repository` (`tool_shed`, `owner`, `name`, or the git or tree source);
- `revisions[]` (`node`, `rev`, `time`, `installable`, `installed`);
- `contents[]` (`tool_id`, `version`, `expanded_sha256`, `revisions[]`, and an `assessment` that is a `ToolAssessment`, with per-revision patch states when overrides differ);
- `events[]`;
- `summary` (per tool: revisions with outstanding findings, covered by a patch, exposed, and the derived fix points).

**Text output.** One timeline per tool id. Each row shows the rev, the short node with `*` when installable and `I` when installed, the version, the content hash prefix, the unpatched H/M/L counts, the patch state, the patched H/M/L counts and the events.

### 4.4 Tests (phase 2)

All of these are unit tests, with no network and no Galaxy server.

- **`test/unit/app/tools/test_tool_security_report.py`.**
  - A temporary `galaxy.yml`, `tool_conf.xml` with the unsafe test tool, a clean tool and a tool patched clean, plus a fixture collection.
  - `main([...])` JSON: format and version, summary, statuses, exclusions (own tool, interactive), `--include-clean`, `--fail-on`, and the output file mode 0600.
  - Parity with `assess_loaded_tool` for the same tools on an eager toolbox (`galaxy_mock`).
- **`test/unit/tool_util/security/test_directory.py`.** `summarize`; `diff_scans` identity (moved, lowered, introduced, removed tool, id and version collisions); the git side, against a temporary git repo made in the test.
- **`test/unit/tool_util/security/test_chain.py`.**
  - `TreeSource` over temporary directories: rev0 is the unsafe tool 1.0, rev1 is the same version with drifted content, rev2 is fixed content, and rev3 is a new version.
  - A fixture collection with a version file and one `@<changeset>` override.
  - Asserts states (applied, already_applied, mismatch), override selection by explicit changeset, every event kind, `installed` handling, cache reuse (the review runs once per content, counted by a spy), and offline errors.
- **`test_chain_sources.py`.**
  - `HgSource` and `ToolShedSource`, against a local `hg init` repository (skipped when `hg` is absent).
  - The installable API is mocked by monkeypatching the fetch function. Clone URLs point at the local path, so no network is used.
  - Symlink escape removal; `HGRCPATH` / `HGPLAIN` in the environment.
- **CLI tests:** `main(argv)` for chain and diff (JSON schema snapshots for `ScanDocument`, `ScanDiff` and `ToolChain`), and `--summary` with the default JSON unchanged (a baseline test first).
- **`test/unit/tool_util/test_tool_patches.py`:** `apply_patches(changeset=...)`, both red and green.

### 4.5 Docs (phase 2)

- **`doc/source/admin/tool_security_review.md`:** a section for "The toolbox report (`galaxy-tool-security-report`)", covering what "active" and "outstanding" mean, the JSON reference, and the 0600 output with the reason for it.
- **A new `doc/source/dev/tool_security_tooling.md`** (linked from the dev index):
  - the chain, diff and `--summary` commands;
  - data sources and the cache layout;
  - offline use;
  - the JSON formats with their `format_version`;
  - the library API for planemo;
  - the safety rules: content is parsed and never run, there is no user hg or git config, and there is a minimum interval between requests.

### 4.6 Library API for planemo

| Call | Returns |
|---|---|
| `galaxy.tool_util.security.assessment.assess_tool_source(tool_source, *, patch_db, guid, tool_path, changeset, threshold)` | `ToolAssessment` |
| `galaxy.tool_util.security.directory.scan_paths(paths, *, patch_db)` / `summarize(scan)` / `diff_scans(a, b)` | `ScanDocument` / `ScanSummary` / `ScanDiff` |
| `galaxy.tool_util.security.chain.sources.{ToolShedSource, HgSource, GitSource, TreeSource}` | iterables of `Revision` |
| `galaxy.tool_util.security.chain.engine.build_chain(revisions, *, patch_db, tool_ids, installed, cache)` | `ToolChain` |
| `galaxy.tool_util.security.render.{print_scan, print_summary, print_diff, print_chain}` | text, so planemo can reuse the output or render its own |

- **planemo's shape.** planemo has its own tool iteration (`yield_tool_sources_on_paths`). The per-tool entry point therefore takes a `ToolSource`, as `lint_tool_source` does, and the path-walking helpers are optional conveniences.
- **The pin.** planemo pins `galaxy-tool-util>=25.1,<26.2`, so `planemo tool_security` / `planemo shed_security_chain` can only follow a galaxy-tool-util release that has this. That work is out of scope here.

### 4.7 Galaxy vs the patch database repository

- **Galaxy.** Everything that must match the running analyser and engine:
  - fetching and caching Tool Shed and git revisions;
  - macro expansion;
  - applying patches with the real engine (`galaxy.tool_util.patches`, not the database's `tools/engine.py` copy);
  - the reviews before and after;
  - the chain, diff and toolbox-report models.
- **The database.** Format lint (`checker.py`), `coverage/` provenance (Galaxy does not read it, a standing decision), the generator from upstream PRs, deep lint over git content, the viewer, and its reports.
- **Follow-up in the database (Q8).** Its main Tool Shed changeset scan is still ad hoc scratch scripts that write `changesets` / `changesets_scan` into coverage. It could be a small script that turns `galaxy-tool-security-chain --json` into coverage records, because `expanded_sha256` is the same digest on both sides.

## 5. Open questions for John (each with a recommended answer)

1. **Report mode.** Should a new opt-in `tool_security_review_static_findings` review tools at load and keep their findings without refusing, so the list page can show outstanding findings while refusal is off? **Recommend yes, default off.** Without it, the list shows only patch states and per-tool on-demand reviews unless refusal is on. It reuses branch 4's machinery, with no new cost unless it is enabled.
2. **Who sees `patches` in `/api/tools` and the tool panel?** Branch 2 (unreleased) returns it to every user, advisories and `mismatch` states included. Should it be admin-only? **Recommend yes, decided on `tool_patches` (branch 2), where the field is introduced, then re-picked into branch 4.** Details are in the private report the summary names. Phase 1 assumes the admin-only field. If you prefer, phase 1 can make the change on this branch instead.
3. **Do outstanding patch advisories (security `mismatch`, or `vulnerable: true|unknown`) count as "outstanding" alongside findings?** **Recommend yes, as a separate category and column.** The database covers holes the analyser can't see.
4. **Capability findings in "outstanding".** **Recommend showing both kinds**, with dispositions following branch 4's refusal rule as it stands, and a kind filter. When the capability-switch decision lands, the dispositions follow it with no UI change.
5. **CLI shape.** **Recommend separate argparse console scripts** (`galaxy-tool-security-diff`, `galaxy-tool-security-chain` in galaxy-tool-util; `galaxy-tool-security-report` in galaxy-app), matching `galaxy-tool-test` / `galaxy-tool-format`, plus `--summary` on the existing review CLI. The alternative is one `galaxy-tool-security` script with subcommands.
6. **Source of the toolbox report.** **Recommend re-parsing the configured tool files** with Galaxy's own discovery and patching in v1. That is deterministic and works with no store. `--from-store` (the stored, already patched sources and stored reviews) can come later if admins want the exact bytes Galaxy runs.
7. **Tool Shed fetching in galaxy-tool-util.** **Recommend yes:** an `hg` subprocess with an immutable cache, ported from the patch database viewer's fetcher. There is no new Python dependency, offline mode is first-class, and `--trees` / `--hg` cover pre-fetched data. The alternative is local sources only, with fetching left to planemo and the database.
8. **Should the database's changeset scan move onto `galaxy-tool-security-chain --json`?** **Recommend yes, as a follow-up in the database repository** once this branch is usable, not in this branch.
9. **Bulk on-demand review in the web UI** (a Celery task that reviews every tool when reviews are off at load). **Recommend no for v1.** Report mode and the CLI cover it, and a 10k-tool review is about 40 s or more of CPU per run.
10. **Patch file view scope.** Serve only files that a loaded tool matched, or any file in a configured collection? **Recommend only matched files in v1.** Unmatched keys appear as a count on the patches page.
11. **Selenium/Playwright smoke test.** **Recommend one** (`test_admin_tool_security`, default config, on-demand detail of `identifier_single_unsanitized`), because it is the only end-to-end check of route, API and component. Vitest and the integration API tests carry the rest.
12. **Tool patches admin documentation.** Branch 2 documents its feature only through the config options. **Recommend a short tool patches admin page on `tool_patches` (branch 2)**, with this branch adding only the UI section to `tool_security_review.md`.

## 6. Risks

**Security.**
- **Admin only.**
  - Every new route uses `require_admin=True`.
  - Integration tests assert 403 for a regular user and for anonymous on each one.
  - The client `requiresAdmin` route meta is only for the user experience.
  - No new field goes into `/api/tools`, the tool panel or any user-visible payload.
  - Outstanding findings and advisories tell an attacker which tools on a public server are open, so they are as sensitive as the security reports.
- **The `patches` field (Q2).** Until Q2 is decided, branch 2's `patches` field is a second place patch states appear, so the docs must not call the admin pages the only one.
- **CLI output.** The toolbox report and chain caches hold sensitive data, so files are created 0600 and cache directories 0700. The docs say not to publish them. The chain's text output names findings, so the developer docs warn against pasting it into public issues for unfixed tools.
- **Untrusted content.**
  - Chain and diff parse Tool Shed and git content as data: macro expansion only, never Cheetah rendering, never scripts.
  - Archived trees have their escaping symlinks removed.
  - hg and git run with no user or system config, so no hooks, extensions or credential helpers.
  - Network calls carry a generic User-Agent and are rate-limited.
  - A hostile repository can still exhaust disk through history size. The cache documents `du`, and `--offline` / `--trees` avoid fetching.
- **Logs.** Branch 4 already logs refused rules at INFO, and this branch adds nothing to user-facing messages.

**Performance.**
- The list endpoints must never run the analyser. A test pins "no materialization", and a second test spies on `review_tool_source` and counts zero calls on list.
- Report mode costs about 4 ms per tool per start on the eager toolbox (about 40 s at 10k tools), which is branch 4's refusal cost. The docs must say this and recommend the cached toolbox for large servers.

**Index churn.** Adding `codes` (and the report-mode token) bumps `INDEX_SCHEMA_HASH` again and discards deployed indexes. This is acceptable while branch 4 is unreleased: fold it into branch 4's own bump if branch 4 is re-cut.

**Staleness.** `REVIEW_VERSION` is Galaxy's `VERSION`, so dev deploys keep stored reviews across analyser fixes. That is a known branch 4 trade-off, and the overview shows `review_version` so admins can see it.

**Branch coupling.**
- Phase 1 edits branch 4 code (`static_findings.py`, `refusal.py`, `freshness.py`). A re-cut of branch 4 means rebasing this branch `--onto`. Keep those edits in one early commit, so they can be moved down into branch 4 if John wants report mode there instead.
- If branch 3 is chosen over branch 4, the assessment and chain layers survive: they depend on `review_tool_source` and the patch engine, not on refusal. The stored-review parts don't.

**Digest mismatch.** Galaxy's patch digests hash `to_string()`, while coverage stores a c14n hash (the reason `verified` was dropped). The chain computes c14n `expanded_sha256` explicitly for the join. A test pins it against `checker.expanded_sha256`'s definition (c14n of the expanded root), without importing the database's code.

**Tool ids with slashes.** Tool guids contain `/`, so the API takes them as query parameters. The client builds URLs with `URLSearchParams`.

**Scope size.** Phase 1 is the larger phase (library, four endpoints, three pages, tests). If it grows, the split point is the patches page (3.3 `ToolPatches.vue` and the patch file endpoint), which can follow as its own commit series.
