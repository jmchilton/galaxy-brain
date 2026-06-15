# PDF export / extraction — polish + test plan

**What this is:** research into the "PDF extraction"/export feature of Galaxy Markdown (Notebooks, Pages, workflow reports), prioritized improvement ideas, and a detailed plan to programmatically test it. Produced by a research subagent reading the `history_pages` worktree. File:line refs are to that branch.

---

## (A) Current PDF/export pipeline map (end to end)

**Three entry points**, all converging on `markdown_util.py`.

1. **Page → synchronous PDF** — `GET /api/pages/{id}.pdf` (`api/pages.py:196-217`) → `PagesService.show_pdf` (`services/pages.py:156-169`) → `internal_galaxy_markdown_to_pdf(..., PdfDocumentType.page)`, streams `application/pdf` (blocks the web thread).
2. **Page → async PDF** — `services/pages.py:171-187` `prepare_pdf` → allocates `short_term_storage` target, runs `to_basic_markdown` **in the web process**, ships `GeneratePdfDownload(...)` to Celery `prepare_pdf_download` (`celery/tasks.py:568-576`) → `generate_branded_pdf` (`markdown_util.py:1208`). Asymmetry: directive walk runs sync in the web worker; only weasyprint render is offloaded.
3. **Workflow invocation report → PDF** — `GET /api/invocations/{id}/report.pdf` (+2 aliases) `api/workflows.py:1610-1647` → `show_invocation_report(format=pdf)` → `get_invocation_report` → `WorkflowMarkdownGeneratorPlugin.generate_report_pdf` (`workflow/reports/generators/__init__.py:63-67`) → `internal_galaxy_markdown_to_pdf(..., invocation_report)`. **Fully synchronous.**

**Core conversion (`markdown_util.py`):**
```
internal_galaxy_markdown_to_pdf(trans, md, document_type)        # :1201
  ├─ _check_can_convert_to_pdf_or_raise()                        # :1195 raises ServerNotConfiguredForRequest if no weasyprint
  ├─ basic_markdown = to_basic_markdown(trans, md)               # :1155
  │    ├─ resolve_invocation_markdown(...)                       # :1311  output=/input=/step= → real ids
  │    └─ ToBasicMarkdownDirectiveHandler.walk(...)              # :876   directive → inline markdown/base64 images
  └─ to_branded_pdf(basic_markdown, document_type, config)       # :1221  prologue/epilogue + per-doc-type CSS
       └─ to_pdf_raw(branded_markdown, css_paths)                # :1169
            ├─ to_html(basic_markdown)                           # :1163  markdown(... ["tables"]) + sanitize_html(allow_data_urls=True)
            └─ weasyprint.HTML(...).write_pdf(stylesheets=[markdown_export_base.css, *css_paths])  # :1179
```
- **PDF engine = WeasyPrint** (guarded import `markdown_util.py:34-37`; `weasyprint_available()` :1191). Renders in a temp dir, `shutil.rmtree` in `finally`.
- **Branding** (`to_branded_pdf` :1221): `config.markdown_export_prologue[_pages|_invocation_reports]`, `..._epilogue`, `..._css`. Base stylesheet packaged `lib/galaxy/managers/markdown_export_base.css` (`resource_string`).
- **Async contract:** `GeneratePdfDownload` (`schema/tasks.py:37-41`); `PdfDocumentType` = `{invocation_report, page}` (`schema/__init__.py:104`).
- **Client capability flag:** `markdown_to_pdf_available` = `weasyprint_available()` (`managers/configuration.py:168`).

**Rasterization (the "extraction") — `ToBasicMarkdownDirectiveHandler` (`markdown_util.py:876-1152`):**
- `handle_dataset_as_image` (:911-932): `path=` → embed raw bytes as PNG; else delegate to `datatype.handle_dataset_as_image(hda)`, `try/except` falling back to embedding raw file bytes as `png`.
- `handle_dataset_as_pdf` (:934-949): parse optional `page=N`, call `getattr(datatype,"render_pdf_page_as_image_markdown",None)(hda,page)`; on missing/exception → `*cannot display PDF page N for {name}*`.
- `_embed_image` (:951-953): `![name](data:image/{type};base64,...)`.
- `handle_workflow_image` (:1004-1009): workflow SVG via `_embed_image(...,"svg+xml",...)`.

**Datatype rasterizer (`lib/galaxy/datatypes/images.py`):**
- `Pdf(Image)` :536; `handle_dataset_as_image` (:546) → `render_pdf_page_as_image_markdown(hda, page=1)` (:552); `_page_as_png(file_name, page_number=1, dpi=150)` (:569, `@staticmethod`): pymupdf optional (:31-34), returns None if absent/exception, clamps page to `[0, page_count-1]`, clamps DPI so longest side ≤ `MAX_RENDER_PX=2000`, `get_pixmap(dpi).tobytes("png")`.

**Directive registration:** `markdown_parse.py:30` VALID_ARGUMENTS (`history_dataset_as_pdf`: hid, history_dataset_id, input, invocation_id, output, page); dispatch `markdown_util.py:290-293`; abstract :439; implemented in all 3 handlers (`ReadyForExport` no-op :609, collector :753, ToBasic :934).

**Dependency status:**
- **WeasyPrint NOT installed by default** — conditional (`dependencies/conditional-requirements.txt:65-73`, `weasyprint>=61.2`), gated on `GALAXY_DEPENDENCIES_INSTALL_WEASYPRINT=1` (`dependencies/__init__.py:324`). Needs system cairo/Pango.
- **PyMuPDF now a hard dep** — `packages/data/pyproject.toml:44` + `pinned-requirements.txt:224` (`pymupdf==1.27.2.3`). The optional-import guard in `images.py` is now mostly defensive.

## (B) Rough edges / gaps

1. **Inconsistent "cannot display" fallbacks.** `markdown_util.handle_dataset_as_pdf` returns the string *with* `\n\n`; `images.render_pdf_page_as_image_markdown` returns it *without*. Two layers of fallback, divergent formatting, duplicate page-clamp/format logic.
2. **`history_dataset_as_pdf` silent in live client / not embed-capable.** Not in `EMBED_CAPABLE_DIRECTIVES` (`markdown_parse.py:71-87`); pure no-op in `ReadyForExportMarkdownDirectiveHandler` (:609). Live-view vs baked-report discrepancy — confirm whether the Vue client renders it live; if not, it's export-only.
3. **Multi-page PDFs:** only one page ever rendered (default 1). No page-range / all-pages. A multi-page scientific PDF silently shows only page 1 via `history_dataset_as_image`.
4. **`handle_dataset_as_image` raw-bytes fallback is wrong for PDFs** (`markdown_util.py:927-931`): on exception it embeds the file as `data:image/png` — for a PDF that's raw `%PDF` bytes mislabeled PNG → broken `<img>`.
5. **No whole-document size/time guard.** `MAX_RENDER_PX` caps one page bitmap, but a report base64-inlines every referenced dataset into one in-memory HTML string then hands it to WeasyPrint. No cap on image count, total HTML size, or per-dataset file size before `read()`. Memory blow-up risk in the web worker (esp. `prepare_pdf`).
6. **Synchronous render paths block workers:** page `show_pdf` and the entire invocation-report path render WeasyPrint inline in the request; only `prepare_pdf` offloads (and even it walks directives in-process).
7. **DPI/sizing hardcoded & not directive-driven:** `dpi=150`, `MAX_RENDER_PX=2000` hardcoded; no `width`/`size` arg on `history_dataset_as_pdf` (unlike `workflow_image`'s `size`). `handle_dataset_as_table` ignores compact/title/footer/headers (explicit TODO :956).
8. **Security / SSRF (most important).** `to_html` uses `sanitize_html(..., allow_data_urls=True)` (`markdown_util.py:1163`; whitelist `sanitize_html.py:255`). WeasyPrint's default `url_fetcher` will fetch any `file://`/`http(s)://` resource left in the HTML → SSRF / local-file disclosure during server-side render of user-authored markdown. No custom restrictive `url_fetcher`.
9. **Secret-leak footgun.** `to_branded_pdf` uses a `getattr(config, f"markdown_export_..._{document_type}s")` pattern (:1222-1231) — safe today (enum-driven), but any future directive interpolating `config.<attr>` by a user-controlled name could echo secrets (e.g. the OpenAI key in `galaxy.yml`). Worth a guard/test.
10. **Optional-dep UX:** missing pymupdf only `log.warning`s → report shows "cannot display" with no admin signal. Missing weasyprint → 501 only at PDF step.
11. **Weak test assertions:** the one integration PDF test asserts only headers, never that a figure rendered. No test for `history_dataset_as_pdf`, page clamping, DPI clamp, missing-pymupdf handler fallback, or SSRF.
12. **`handle_invocation_inputs/outputs/visualization` are stubs** in ToBasic (:1128-1135) → `*... not implemented*` (normally pre-expanded by `resolve_invocation_markdown`; a bare directive degrades to a stub).

## (C) Prioritized improvement ideas (with files)

**P1 — Harden WeasyPrint against SSRF / local-file reads.** In `to_pdf_raw` (`markdown_util.py:1169`) pass a restrictive `url_fetcher` that resolves only `data:` URIs and rejects `file:`/`http(s):`. Keep it a module-level (importable/testable) function. Highest value, small. (Test: feed `<img src="file:///etc/passwd">` / external URL, assert refusal.)

**P2 — Unify PDF-page rasterization + fallback.** Collapse the duplicated "cannot display" logic: have `ToBasic.handle_dataset_as_pdf` delegate page-parse + render entirely to the datatype; datatype owns the single fallback string (consistent newlines). Also fix `handle_dataset_as_image`'s raw-bytes fallback (:927) to emit a `*cannot display*` note for non-raster bytes instead of a mislabeled PNG.

**P3 — Centralize image-embed + one size/clamp policy.** Three base64-embed sites (`_embed_image` :951, `Image.handle_dataset_as_image` :156, `Pdf.render_pdf_page_as_image_markdown` :562). Consolidate data-URI construction into one helper (extend `galaxy.util.image_util` or a small `images.py` helper). Make `MAX_RENDER_PX`/`dpi` config-overridable via the existing `config.<...>` pattern.

**P4 — Page-range / `size` arg + multi-page.** `history_dataset_as_pdf` already takes `page`; consider `pages="1-3"` / `size=` (mirror `workflow_image`'s `size`, VALID_ARGUMENTS :70), wired via the existing `PAGE_PATTERN` (:81). Lower priority; product-driven.

**P5 — Move sync render paths to short-term-storage/async.** Reuse the existing `GeneratePdfDownload` + `prepare_pdf_download` Celery infra for the invocation report too (`api/workflows.py:1610`) instead of inline render. Reuses an existing abstraction.

**P6 — Make `history_dataset_as_pdf` consistent live vs baked.** If the Vue client doesn't render it live, add it to the client renderer or document export-only; at minimum consider `EMBED_CAPABLE_DIRECTIVES` if inline `${galaxy history_dataset_as_pdf(...)}` is intended. (Confirm client first.)

**P7 — Admin visibility for missing optional deps.** Add a `pdf_rasterization_available` capability flag alongside `markdown_to_pdf_available` (`managers/configuration.py:168`), backed by a new `images.pymupdf_available()` helper mirroring `weasyprint_available()`. Reuses the capability-flag mechanism.

**P8 — Finish `handle_dataset_as_table` advanced options** (`markdown_util.py:955`, standing TODO) so PDF and web converge — only if in scope.

(All new helpers reuse existing modules — `markdown_util`, `images`, `image_util`, `short_term_storage`, capability flags; imports at top of file.)

## (D) Detailed test plan

### D.1 Unit — rasterization (`test/unit/data/datatypes/test_images.py`)
Extend existing file (has the `Pdf`/pymupdf skipif pattern). All `@pytest.mark.skipif(images_module.pymupdf is None)`, reuse `get_dataset("454Score.pdf")` + `MockDatasetDataset`.
- `test_render_pdf_page_as_image_markdown_page_clamped_high` — `page=9999` → still valid PNG data URI (clamped); decode base64, assert PNG magic.
- `..._page_clamped_low` — `page=0`/negative → page 1.
- `test_page_as_png_dpi_clamp` — open produced PNG, assert longest side ≤ `MAX_RENDER_PX`.
- `test_page_as_png_missing_pymupdf` — `monkeypatch.setattr(images_module,"pymupdf",None)`; assert `_page_as_png` None and `render_pdf_page_as_image_markdown` returns the unified `*cannot display*` (red-to-green for P2).
- `test_page_as_png_corrupt_pdf` — non-PDF temp file → None.

### D.2 Unit — directive parsing & to-basic handlers (`test/unit/app/managers/test_markdown_export.py`)
Reuse `BaseExportTestCase`/`TestToBasicMarkdown` (mocked managers, `_new_hda`, `_expect_get_hda`). `hda.datatype` derives from `extension` — set `hda.extension="pdf"`, point `hda.dataset.get_file_name` at `get_test_fname("454Score.pdf")`.
- `test_history_dataset_as_pdf_default_page` — assert result contains `data:image/png;base64,` (skipif no pymupdf).
- `test_history_dataset_as_pdf_explicit_page` — `page=2`; assert PNG embed or `*cannot display*` (pick existing page / assert non-empty no crash).
- `test_history_dataset_as_pdf_no_pymupdf_fallback` — monkeypatch pymupdf None; assert unified `*cannot display PDF page` (red-to-green P2).
- `test_history_dataset_as_image_pdf_uses_rasterizer` — `extension="pdf"`; assert PNG data URI (covers delegation :921).
- Parse-level: extend `test/unit/app/test_markdown_validate.py` — `history_dataset_as_pdf(page=2)` validates; bogus `foo=1` raises.

### D.3 Unit — to_html / to_pdf_raw + SSRF
- `test_to_html_allows_data_urls` — `data:image/png` `<img>` survives sanitization.
- `test_to_pdf_raw_url_fetcher_blocks_file_and_http` — **red-to-green P1**: markdown referencing `file:///etc/passwd` + `http://169.254.169.254/...`; call the custom `url_fetcher` directly, assert refusal (no live render needed).
- `test_to_pdf_raw_smoke` — `skipif not weasyprint_available()`; render `# Hi`, assert `bytes[:4]==b"%PDF"`.

### D.4 Integration / API — assert on produced PDFs
Reuse existing fixtures/helpers (don't invent):
- `lib/galaxy_test/api/test_pages.py` (extend `test_pdf_when_service_available`), gated on `configuration["markdown_to_pdf_available"]` (pattern at :507-534).
- `test/integration/test_workflow_tasks.py::test_workflow_invocation_pdf_report` + `WorkflowPopulator.workflow_report_pdf` (`populators.py:2872`).
- `DatasetPopulator` to upload `454Score.pdf` → HDA, build a page referencing it via `history_dataset_as_pdf(history_dataset_id=<id>)`.

New/strengthened:
- `test_pdf_export_embeds_referenced_pdf_figure` (api/test_pages.py): page with `history_dataset_as_pdf` → `GET pages/{id}.pdf` → **assert on content** (D.5). Gate on `markdown_to_pdf_available` + new `pdf_rasterization_available` (P7).
- Strengthen `test_workflow_invocation_pdf_report` to assert the PDF parses, ≥1 page, expected text present (currently headers-only).

### D.5 How to assert on a generated PDF (no pixel diffs)
Use **PyMuPDF** (now hard dep) on returned bytes:
```python
import pymupdf
doc = pymupdf.open(stream=pdf_bytes, filetype="pdf")
assert doc.page_count >= 1
text = "\n".join(p.get_text() for p in doc)
assert "Expected Heading" in text                 # text made it in
images = [img for p in range(doc.page_count) for img in doc.load_page(p).get_images()]
assert len(images) >= 1                            # a figure was embedded
```
Assert on page count, expected **text** (headings, dataset name, prologue), and **image count > 0**. Robust, not brittle. No pixel comparison.

### D.6 Optional-dependency handling
- Unit rasterization → `skipif pymupdf is None` (now effectively always runs in CI, safe in minimal envs).
- WeasyPrint render → `skipif not weasyprint_available()` (skips locally unless the env flag is set).
- API/integration PDF → keep the capability-flag gate (`configuration["markdown_to_pdf_available"]`) → no-ops where weasyprint absent.
- **CI:** add a dedicated PDF integration target/marker (reuse Galaxy's test-selection markers) on a runner that installs weasyprint (`GALAXY_DEPENDENCIES_INSTALL_WEASYPRINT=1` + system cairo/Pango). PyMuPDF-only unit tests run everywhere.

### D.7 Fixtures to reuse (present — don't create new)
`test-data/454Score.pdf` + `lib/galaxy/datatypes/test/454Score.pdf` (`get_test_fname`); `MockDatasetDataset`, `get_dataset` (`test/unit/data/datatypes/util.py`); `BaseExportTestCase`, `MockTrans` (`galaxy_mock`, version_major 19.09), `_new_hda`, `_expect_get_hda`; `DatasetPopulator`, `WorkflowPopulator.workflow_report_pdf`, `run_workflow`; capability-flag pattern in `api/test_pages.py` + `managers/configuration.py`.

## (E) Open questions
1. Does the Vue client render `history_dataset_as_pdf` (and `as_image` for PDFs) **live**, or is rasterization export-only? Drives P2/P6 severity. (Needs client check.)
2. Move page `show_pdf` + invocation report PDF to async short-term-storage (P5), or keep sync? Async changes the `/report.pdf` contract.
3. Is WeasyPrint outbound fetching an accepted risk or in scope to lock down now (P1)? Are pages/reports ever rendered server-side for *other users'* content (sharing) — raises SSRF severity.
4. Multi-page / page-range for `history_dataset_as_pdf` — in scope or defer (P4)?
5. Should `MAX_RENDER_PX`/`dpi` become admin config + a hard per-document image-byte cap (P3/P5)?
6. Public **HTML** export endpoint for pages, or PDF-only? (`to_html`/`to_basic_markdown` exist independently of weasyprint — ties into the embedding plan's Option 2.)
7. **Naming/overlap:** `history_dataset_as_pdf` overlaps semantically with `history_dataset_as_image` (which also rasterizes PDF page 1). Two directives doing nearly the same thing — confirm both are wanted, or fold one into the other.
