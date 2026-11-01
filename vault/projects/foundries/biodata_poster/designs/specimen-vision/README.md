# specimen-vision: Field guide / specimen plate (Visionary)

The poster is a natural-history plate, *Plate I: A field guide to the Galaxy Workflow Foundry*.

- **Hero thesis:** a correct workflow is a knowledge problem, not a syntax problem.
- **Key to the plate:** the system legend, routes → wiki → Molds → skills → tools decide → gaps / recompile.
- **Fig. 1, Anatomy of a skill:** the `discover-shed-tool` Mold dissected into its 5 typed references, the hash of each one at cast time, and its provenance and verify files. Five numbered notes carry the theory (dossier §3).
- **Fig. 3, Molting:** the same Mold's recompile (`73af1f62`), plus foundry#701 fanning one note out to 8 skills.
- **Fig. 2, Specimen I (holotype):** DengueSeq, with its graph, pins, tool verdicts and gap ledger.
- **Fig. 4:** a drawer of the 30 CI-verified pattern workflows.
- **Specimen II:** Hokken, described elsewhere and cited only.
- **Specimen III:** an `[[ASK]]` slot.

## Rebuild

```sh
npm install          # local only: playwright-core 1.64.0 (uses cached chromium-1248), js-yaml, dagre, elkjs, qrcode, @fontsource/*
npx playwright-core install chromium   # only on a machine without a cached chromium-1248
npm run build        # data/ + poster.html + poster.css -> build/poster.html -> poster.pdf (44in) -> preview.png (~1500px)
npm run snapshot     # optional: re-copy data/ from ~/projects/repositories/foundry and ~/projects/foundry-runs
```

To edit text, change `poster.html` and run `npm run build`. Slots written as `<!--@NAME-->` are filled by
`scripts/build.mjs`, so edit the copy around a slot, not the slot itself. Styling and sizes are in
`poster.css`, set in pt and in. `pdftoppm` (poppler) must be installed to make the preview.

Checks after a build: `pdffonts poster.pdf` (only the 4 families below), `pdfimages -list poster.pdf` (no raster images), `pdftoppm -r 24 [-gray]` for 25% and greyscale views. QR codes are vector with a 4-module quiet zone.

The build warns when:
- a box overflows;
- any HTML text renders below 28 pt;
- the DengueSeq graph is scaled below 1:1, which would push its 28 pt labels below the minimum.

## Fonts (Google Fonts, vendored through @fontsource, all embedded)

| Font | Used for |
| - | - |
| EB Garamond | Title, hero, figure titles, notes |
| IBM Plex Sans | Body text |
| IBM Plex Sans Condensed | Paths and file names |
| IBM Plex Mono | Hashes, commands, IDs |

`pdffonts poster.pdf` lists only these families. Arrows, ≠ and ↺ are drawn as inline SVG so that no system font gets embedded.

## Colour

The palette is a cream "paper" (#f4efe4) with ink (#221e19), plus three accents: oxblood (#8a2e1c), herbarium green (#3d5c36) and ochre (#8f6214).

- No large saturated areas.
- In greyscale every status also has a glyph: a check for pass, ≠ or = for hashes, an open ring for open gaps and a struck ring for dropped ones. Collection operations carry a bar.
- Check `build/quarter-gray.png` with `pdftoppm -r 24 -gray`.

## Data sources (all rendered from files, none drawn by hand)

| Panel | Source |
| - | - |
| Fig. 2 graph, pins, verdicts, ledger | `~/projects/foundry-runs/dengueseq-denv3/dengueseq-denv3-galaxy/`, run repo `6737777` (2026-10-20): `galaxy-workflow.gxwf.yml`, `open-requirements.ledger.yml`, `galaxy-workflow-validation-result.json`, `workflow-test-result.json`, and job states reduced from `tool_test_output.json` |
| Fig. 1 | `galaxyproject/foundry` `bc79096`: `content/molds/discover-shed-tool/index.md`, `casts/claude/skills/discover-shed-tool/{_provenance,_verify}.json` |
| Fig. 3 | provenance before and after `73af1f62`; skill list from the diff of merge `9adc20b7` (foundry#701) |
| Fig. 4 | all 30 `verification/workflows/**/*.gxwf.yml` at `bc79096`; CI "Verification workflows" green on `main` |
| Key counts | dossier §4 corpus table (`bc79096`, 2026-10-24). Footnoted on the poster |
| 0 of 15, "guidance, not enforcement", Fig. S4A | Baker et al. 2026, preprint pp. 16–18 and p. 36. Checked against the PDF |

The graph layout is computed (ELK layered for Fig. 2, dagre for the thumbnails) from the format2 files by `scripts/gxgraph.mjs`.

## What it leaves out (Visionary stance)

- **Left out:** sarek, EGAPx, CWL results, the validator blind spot, the bacass and demo runs, the DengueSeq direct arm, the June interview `.ga` files, cost and time, the byte-identical consensus, and the upstream PR list.
- **CWL appears only as a route** in the key, as a pipeline that exists. No result is claimed for it.

## `[[ASK]]` slots

1. **Specimen III, from Nextflow (nf-core/rnaseq, nf-core/atacseq).** This is Anton's foundry-paper work. It is worded "Foundry-validated, each with a paper replication", with no numbers. Drop it or fill it after sign-off.
2. **`[[QR: live results]]`** is a placeholder box in the footer. The other three QR codes are real vector QR codes: repo, `/usage/` install page and preprint DOI. The placeholder's text is 22 pt because it is a stand-in, not copy.

## Open questions

1. **Title.** I proposed *From Papers to Runnable Galaxy Workflows*. The poster shows no expert-specification specimen, so "Conversations" would have no evidence on the plate. It is easy to swap back in `poster.html`.
2. **Specimen I's origin line** says "with its linked DENV_pipeline v1.0", because the run's sources included the paper's linked code. OK to keep it, or should it say methods text only?
3. **Specimen II (Hokken)** is a text card with no graph. No workflow file was reachable, and `scottcain/hokken_afumigatus_rnaseq` did not resolve. Should it get a graph if the file can be obtained?
4. **Counts are as of `bc79096`.** Main has since gained a 31st verification workflow (#711). Re-snapshot at print?
5. **The DengueSeq run is local and unpublished.** Publish or archive it before the QR goes live?
