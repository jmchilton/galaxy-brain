# UC3 debrief 2 — clean extractable rebuild, live rendering, contributions (2026-06-14)

Second debrief for use case 3 (differential ATAC-seq accessibility, issue #14). The first debrief (`UC3_DEBRIEF.md`) covers the original build, the page-extraction audit (the "worst of three" — notebook referenced re-uploaded PNGs, seeded nothing), and appends the clean rebuild + the renderer-fix recipe. This document is the standalone session-2 writeup focused on **the renderer feature it forced, the new directive, extractability, live rendering, and paper relevance**.

## One-line takeaway

UC3 is the **figure-rendering case**: it exposed the most damaging notebook anti-pattern (a notebook displaying only off-graph re-uploaded screenshots seeds *nothing* on extraction) and **drove two reusable Galaxy contributions** — server-side PDF-as-image rasterization, and a new `history_dataset_as_pdf` notebook directive with page control — so a PDF-emitting tool's real output can be referenced directly and both *display* and *seed extraction*.

## Clean rebuild & extraction (verified)

- History `Differential ATAC-seq accessibility (clean, extractable)` `241d84796a24640a`; notebook page `a7e42332dab8f5db`; extracted workflow `0a248a1f62a0cc04`.
- Clean spine: per-sample counts as **one collection** + donor-aware sample sheet → DESeq2 (`sample_sheet_contrasts`, `~condition`) → `tp_awk` NA-filter → volcanoplot. Science reproduced exactly genome-wide: 590,650 peaks, 45,620 sig = 34,873 B-cell-gained + 10,747 Eryth-gained; master regulators on the right sides (GATA1/HBB Eryth; PAX5/EBF1/MS4A1/CD19 B-cell).
- **The fix that unblocked extraction:** the notebook now references the **real on-graph PDF outputs** (DESeq2 plots PDF, volcanoplot PDF) instead of re-uploaded PNGs. Page-extraction summary: 13 rows, **all seeded, 0 warnings**, 3 exposed (DESeq2 result + plots PDF + volcano PDF). Extracted `.ga` (collection as the single counts input): **5 steps — counts collection + sample-sheet → DESeq2 → NA-filter → volcanoplot — zero dangling, 3 outputs, report clean.** Contrast the original: "2 dead PNG uploads, 0 tools."

## Reusable Galaxy contributions this UC forced

1. **PDF-as-image rendering.** `Pdf.handle_dataset_as_image` rasterizes a PDF's first page to PNG via PyMuPDF (optional import, graceful fallback, size-clamped); the markdown report renderer delegates to the datatype; the extraction collector already records `history_dataset_as_image` references regardless of format. Net: referencing the real PDF output both displays (rasterized in the baked report) and seeds extraction. Fixes the *entire class* of PDF-emitting R/Bioconductor tools, not just UC3. Unit-tested + Selenium E2E test; `pymupdf` declared in `packages/data` + pinned.
2. **New `history_dataset_as_pdf` notebook directive with page control** (`history_dataset_as_pdf(history_dataset_id=ID, page=N)`). Registered across parser, server renderers (report rasterizes page N; collector seeds; live no-op), the `Pdf` datatype (arbitrary 1-based page), and the client (new `HistoryDatasetAsPdf.vue` embedding the page with viewer chrome hidden) + directives/help/toolbox/templates. Lets a multi-page PDF (e.g. the 5-page DESeq2 diagnostics) show a chosen page (PCA = page 1) as a figure. Unit + Selenium tests; review-blocker (`_ReportLabelRewriter` missed-subclass) caught and fixed.

## Live notebook rendering review (Playwright, dev client)

- **Both PDF figures render inline** — DESeq2 PCA (page 1) and the volcano — with zero "does not appear to be an image" warnings. Direct evidence the renderer fix works in the live notebook. The PCA shows PC1 ≈ 98% variance separating Erythroblast vs B-cell; the volcano is the classic Down/Up/Not-Sig plot.
- With the new directive + `#page=1&toolbar=0&navpanes=0`, the **PDF-viewer chrome (toolbar/page-nav) is hidden** and the chosen page is shown.
- **Residual:** for a *multi-page* PDF (DESeq2 5-page diagnostics) the live `<embed>` still peeks the next page below the chosen one (Chrome's continuous-scroll viewer); single-page PDFs (volcano) are fully clean. The baked report rasterizes the exact page (fully clean). Fully isolating one page in the live view would need a rasterize-to-`<img>` server endpoint (would also unify live == report) — documented as the next step.

## Paper relevance

- The sharpest illustration of the cross-cutting lesson **"notebook extraction is only as good as what the notebook displays"**: an analysis can be fully tool-based yet seed nothing if it shows off-graph re-uploaded artifacts. UC3 makes the before/after concrete (0 tools seeded → full 5-step pipeline seeded) once the notebook references on-graph outputs.
- Evidence that the **markdown renderer is an extensible reproducibility surface**: extending it to rasterize PDFs (and adding a PDF directive) removed a whole category of "tool emits PDF → can't display → re-upload screenshot → break provenance." Good support for the implementation/extensibility narrative and the "reference artifacts, not describe them" goal.
- Figure candidates: the rendered notebook with the inline PCA + volcano; the 5-step extracted DESeq2 workflow.

## Open refinements / next

Rasterize-to-`<img>` live path for fully single-page rendering (unify live + report; kill the multi-page peek); inline `${galaxy}` form support for the PDF directive (currently fenced-block only — documented); donor-aware DESeq2 design; nearest-gene annotation.
