# Displaying PDF figures in notebooks / reports

**Status:** design open — two prototypes landed on the `history_pages` branch; neither is the answer we want to ship.
**Context:** notebook/report pages reference on-graph outputs via `galaxy` directives. Many real figures are **PDF**, not raster, so they could not be displayed inline.

---

## Problem

A large fraction of Galaxy's plotting tools emit **PDF**, often **multi-page** (R-based tools especially):

- DESeq2 → 5-page diagnostics PDF (page 1 = PCA, then dispersion, MA, etc.).
- Volcano Plot → single-page PDF.

A notebook/report directive (`history_dataset_as_image`) only knew how to embed rasters. So PDF figures forced a **re-upload-PNG workaround**: screenshot/convert the figure outside Galaxy, upload it as a new dataset, reference that. This breaks provenance (the PNG is not the tool's real output) and breaks **workflow extraction** (the uploaded PNG is an orphan input, not a graph output).

We want: reference the real PDF output of a real tool step, show a chosen page as a flush figure, and have that reference survive extraction into a workflow.

---

## What a good solution needs (from the use cases)

1. **Page selection.** Multi-page PDFs are the common case; must show a specific 1-based page (DESeq2 page 1).
2. **Figure framing.** A single page should read as a flush figure — no PDF-viewer chrome (toolbar, page nav, scrollbars).
3. **Live == baked.** The live editor preview and the server-baked/exported report must render the *same* pixels. Divergence here is the main thing that made the prototypes feel wrong.
4. **Seeds extraction.** Referencing a PDF output must record the HDA so page→workflow extraction still seeds the producing step and exposes the output.
5. **Graceful absence.** If the renderer/dependency is missing, degrade to a clear message, not a crash.

---

## What we prototyped (two approaches, both on `history_pages`)

### APPROACH_A — overload `history_dataset_as_image` for PDFs
Commit `58a7351` "Render PDF datasets as images (rasterize first page)".

- `Pdf.handle_dataset_as_image` (`lib/galaxy/datatypes/images.py`) rasterizes **page 1** → PNG via **PyMuPDF**, embedded as `data:image/png`.
- `ToBasicMarkdownDirectiveHandler` delegates to the datatype, so baked report/HTML/PDF export get the page-1 raster.
- Client `Dataset/DatasetAsImage/DatasetAsImage.vue`: content-type sniff; if `application/pdf`, render with a browser `<embed>` (full viewer — toolbar + every page).

**Why unsatisfying:** no page control (always page 1). **Live ≠ baked**: live shows the whole PDF in the browser's PDF viewer with chrome; baked shows only page 1 as a PNG. Conflates "this image is a PDF" with "show one page as a figure."

### APPROACH_B — dedicated `history_dataset_as_pdf` directive with `page`
Commit `b982369` "Add history_dataset_as_pdf notebook directive with page control".

- `markdown_parse.py`: registers `history_dataset_as_pdf` with args `hid|history_dataset_id|input|invocation_id|output|page`.
- `markdown_util.py`: ToBasic (baked) rasterizes **page N** → PNG (`Pdf.render_pdf_page_as_image_markdown` / `_page_as_png`, PyMuPDF, dpi clamped so longest side ≤ 2000px); the extraction collector records the HDA; ReadyForExport is a no-op (client renders live).
- Client `HistoryDatasetAsPdf.vue`: `<embed>` the **live** PDF at `dataset/display?...#page=N&toolbar=0&navpanes=0&view=FitH`.

**Why unsatisfying:**
- **Live ≠ baked, again.** Live path is a browser `<embed>` whose page/chrome fragment params (`#page=N`, `toolbar=0`, `navpanes=0`, `view=FitH`) are **non-standard and viewer-dependent** — Chromium's PDFium honors some, Firefox's pdf.js differs, others ignore them entirely. Baked path is a server-side PyMuPDF raster. So the two views render with different engines and don't reliably match.
- **Two parallel mechanisms.** We now have both the `as_image` PDF overload *and* `as_pdf`. Redundant; unclear which a user reaches for.
- **New native server dep on the render path.** `pymupdf` (PyMuPDF) is now imported during report rendering; rasterization happens in core, in-process. Optional import + graceful fallback, but still core surface + a build dep (`packages/data/pyproject.toml`).

---

## Cross-cutting tension

Is a PDF output a **document** (browse all pages) or a **figure** (show one page)? The prototypes try to be both and end up with two code paths whose only hard requirement — *live preview matches the exported artifact* — is the one they don't satisfy, because one path is a browser embed and the other is a server raster.

Two ways to collapse that:

- **Single render path.** Pick one rasterizer and use it for both live and baked — e.g. a server endpoint `…/dataset/{id}/pdf_page/{n}.png` that the live `<img>` and the baked report both consume. One engine, guaranteed match, page control, no fragile `<embed>` fragments. Still keeps `pymupdf` (or equivalent) in core.
- **No render path in core at all** — make the image a real dataset via a tool (next section).

---

## Alternative: tool-based PDF→image extraction (no core renderer)

Instead of rasterizing at render time, convert the PDF to an image **as a workflow step**. The figure becomes a real on-graph dataset, referenced with the existing `history_dataset_as_image` — no new directive, no `pymupdf` in core, live==baked trivially (it's just a PNG), and extraction is automatic because it's a real step.

**Existing tool — yes, one fits directly:**

**`graphicsmagick_image_convert`** — bgruening, main ToolShed (`toolshed.g2.bx.psu.edu/repos/bgruening/graphicsmagick_image_convert`), id `graphicsmagick_image_convert`, GraphicsMagick **1.3.46**. (Source: `bgruening/galaxytools` → `tools/image_processing/graphicsmagick/convert.xml`.)

- Input `format` list already includes **`pdf`** (alongside jpg/png/bmp/gif/svg/eps/tiff).
- On PDF input it runs `gm convert … +adjoin temp_%03d.<fmt>` → **one image per page**, emitted as a **`list` collection** (`splitted_pdf`), elements `temp_000`, `temp_001`, …
- Output format selectable (png/jpg/…); has `resize`, palette, flip/rotate.
- Single requirement: the `graphicsmagick` conda package (uses a Ghostscript delegate for PDF) — **no Galaxy-core dependency**.
- Has a PDF test (`test.pdf` → 12-element collection), so the PDF path is covered upstream.

**Other tools seen, not a fit:** `graphicsmagick_image_montage` (combines images), `xy_plot_multiformat` (generates plots, doesn't convert), bio-image `imgteam` tools (Bio-Formats — microscopy, not PDF). No standalone ImageMagick `convert` on the ToolShed; GraphicsMagick is the maintained equivalent.

**Trade-offs of the tool approach:**

- (+) Provenance-clean: figure is a real tool output on the graph; extraction seeds it for free.
- (+) Removes the core `pymupdf` dependency and the render-time rasterization path; live==baked because there's nothing to diverge.
- (−) Adds a workflow step per PDF figure (heavier — Ghostscript), and the notebook graph carries it.
- (−) Page selection = pick collection element index N-1 (`temp_00{N-1}`), or a follow-on "extract element" — clunkier than `page=N` on a directive.
- (−) The collection is *all* pages even when you want one; for a 1-page volcano that's fine, for a 5-page diagnostics PDF it materializes 5 PNGs.

---

## Open questions

- Figure or document? Commit to one model before adding more surface.
- Single render path (server endpoint feeding both live + baked) vs. tool-based (real dataset, no core renderer) — which?
- If we keep a core renderer: PyMuPDF (AGPL — license check) vs. Ghostscript/poppler subprocess?
- If tool-based: is per-figure conversion acceptable in the notebook graph, and how do we express "page N" ergonomically (element index vs. a thin extract step)?
- Either way, retire one of APPROACH_A / APPROACH_B — don't ship both `as_image`-PDF and `as_pdf`.
