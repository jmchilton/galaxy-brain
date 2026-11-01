# receipt-grounded: run receipts, grounded stance

Concept B (run receipt / lab ledger), Grounded stance. 44″ × 44″, 1″ safe margin.

The poster is laid out as two real run receipts on a counter:

- **Hero receipt (centre): DengueSeq DENV3, from a paper.** Build provenance (13 compiled skills with
  their Mold revision and content-hash prefix), the expert-review line, 7 Tool Shed pins, the gxwf and
  Planemo checks with a PASS stamp, time and cost totals, and a tear-off open-requirements ledger
  (5 of 19 open, 2 deliberate drops), plus a NOTE line with the run's caveats.
- **Narrow receipt (right): nf-core/bacass, from Nextflow.** gxwf passes, 9/9 jobs ok, and Planemo
  FAILs on a whole-line `has_line_matching` assertion. The ledger shows 3 of 13 open. It ends with
  the PR #701 knowledge fix and a "re-run pending" line.
- **Left column:** the hero line ("The model drafts. The tools decide. The gaps are written down."),
  the thesis, "How a receipt gets printed" (wiki → Molds → skills → routes → judges → ledger, with
  dossier corpus counts), the 0/15 preprint result, and "Fix the knowledge, recompile"
  (73af1f62, #701, upstream PRs, CI).
- **Right, below the receipt:** "Other routes, as of today", with a status tag on each: Hokken
  (published), expert specification (partial), sarek (in progress), EGAPx (partial, with the
  validator blind spot), Anton's rnaseq/atacseq (`[[ASK]]`), CWL (none yet).
- **Header:** title (the four-source variant), authors, and 3 real vector QR codes plus the
  `[[QR: live results]]` placeholder box.

## Rebuild (one command)

```sh
cd vault/projects/foundries/biodata_poster/designs/receipt-grounded
uv run build.py              # refresh data from run dirs if present, QR codes, poster.pdf, preview.png
uv run build.py --no-extract # keep the checked-in data/*.json (use this without ~/projects/foundry-runs)
```

- `build.py` uses the `typst` PyPI package, pinned to 0.15.0. Nothing is installed globally.
- On first run it downloads the fonts into `.tools/fonts/`, which is gitignored.
- To get a greyscale check image, add `--gray /path/stem` (needs `pdftoppm`).

To edit the text, change `poster.typ`; all hand-written copy is there. Receipt rows come from
`data/dengueseq.json` and `data/bacass.json`. Ledger glosses are in the `gloss` dictionary in
`poster.typ`, keyed by the real ledger ids.

## Files

| File | Role |
| - | - |
| `poster.typ` | Layout and all hand-written copy |
| `extract.py` | Reads the run dirs and writes the `data/*.json` snapshot |
| `make_qr.py` | Writes `qr/*.svg` (segno, vector) |
| `build.py` | Fonts, then extract, then QR, then PDF and PNG |
| `poster.pdf`, `preview.png` | Outputs (the PNG is 1500 px) |

## Fonts

All fonts are OFL, from google/fonts, and embedded in the PDF (checked with `pdffonts`).

- **IBM Plex Mono** (Regular, SemiBold, Bold): the receipts.
- **IBM Plex Sans Condensed** (Regular, SemiBold, Bold, Italic): headings and prose. Typst files
  it under the family name "IBM Plex Sans".
- **DejaVu Sans Mono** (Typst's bundled font): fallback for the glyphs ✗ and ✂.

## Data sources

Every receipt number comes from these files. Paths are under `~/projects/foundry-runs/`.

| Poster item | Source |
| - | - |
| Stages, iteration counts, start and finish times | `dengueseq-denv3/dengueseq-denv3-{brief,galaxy}/foundry-run.yml`; same for bacass |
| Mold revision and hash per stage | `_plugin/f275059e/casts/claude/skills/*/_provenance.json` (`mold.revision`, `mold.content_hash`). bacass uses `_plugin/b9c16bad`. The plugin used by each run was confirmed from `_logs/galaxy.jsonl` |
| Tool pins | `galaxy-workflow.gxwf.yml` `steps[*].tool_shed_repository` |
| gxwf result | `galaxy-workflow-validation-result.json` |
| Planemo result and jobs | `workflow-test-result.json` |
| Ledger counts and open entries | `open-requirements.ledger.yml` |
| Expert review: 10 questions, 1 edited, 9 accepted | `dengueseq-denv3/review.md` |
| Source pins (DENV_pipeline 8214cfbb, bacass 2.5.0 @ 76e4b12c), test sample | `*/source-selection.md` |
| bacass failed assertion, `workflow_defect: false` | `bacass-sr-assembly-galaxy/workflow-test-result.json`, `workflow-debug-report.md` |

### Numbers not in the dossier (checked, with source)

| Number | Source | Note |
| - | - | - |
| AGENT TIME "6 + 144 min" | Computed from `foundry-run.yml` `started_at`/`finished_at` | The internal scorecard (`vault/repositories/foundry/issues/closed/563/runs/dengueseq-denv3.md`) says 7 + 147 min, counting a different span |
| MODEL COST $37.26 | Same scorecard, row 6 ($3.21 + $34.05) | **Needs John's OK** |
| "parity vs paper's code: identical" (byte-identical consensus) | `dengueseq-denv3-galaxy/workflow-debug-report.md`; `galaxy-test-plan.yml` ll. 428–433 | Measured by a probe outside Galaxy. The Galaxy run matched its assertions; bytes weren't retained |
| BAQ glosses: 0 positions; 484 vs 476 rows; 472 vs 467 PASS | `workflow-debug-report.md`, "Open-requirements bearing" | The ledger itself still says open |
| "10,707 Ns" (zero-read sample) | Ledger entry `low-coverage-and-empty-bam-behavior` | |
| OR150748.1 on a different BioSample | `galaxy-test-plan.yml` l. 428 | |
| 73af1f62 hash `256e3861` → `2e5fa1f8` | `git show 73af1f62` in foundry | |
| PR #701 regenerated 8 skills | `gh pr view 701 --json files`: 8 `_provenance.json` files | Matches the dossier |
| Bacass jobs 9/9, outputs 4/5 | `workflow-test-result.json` (`invocation.jobs`, `output_results`) | |
| Second case `denv3_test` 178 MB not run | `workflow-test-result.json` `tests_not_run` | |

Corpus counts (420 notes and so on) are the dossier's set, dated 2026-10-24. They weren't recounted,
so the set stays consistent.

## `[[ASK]]` slots and items needing John's OK

1. **`[[ASK]]` nf-core/rnaseq, atacseq (Nekrutenko lab)** in "Other routes". It has no numbers and
   says "Foundry-validated", not "generated". Fill it in or drop it.
2. **`[[QR: live results]]`** box in the header. The URL is TBD.
3. **bacass receipt (unpublished local run).** The whole right-hand receipt is
   `~/projects/foundry-runs/bacass-sr-assembly`, which isn't published anywhere. **Needs John's OK.**
   - It is printed as "Not held out".
   - It does not claim that bacass triggered #701 (#657 did).
   - The re-run is shown as pending.
4. **DengueSeq run dirs** are local too. The dossier marks DengueSeq PUBLIC, but the run repos aren't
   pushed anywhere citable yet.
5. **Model cost $37.26** (see above).
6. **NOTE line:** "the expert was an author (J.C.)" and the BioSample doubt. This is grounded-stance
   candour; confirm John is comfortable with it.

demo-qc-trim is **not** used.

## Type-size exceptions (below the 28 pt body minimum)

- Status tags and ledger tags (24 pt bold caps): labels.
- The receipt column-header row (`# STAGE … MOLD HASH`, 24 pt).
- References and the data footnote (24 pt).
- QR captions (24 pt).

Everything else is 28 pt or larger. Section headings are 72 pt, the receipt headlines 92 pt and
72 pt, the hero line 104 pt and the title 128 pt. The small mono section labels inside the receipts
(30 pt, e.g. "BUILD PROVENANCE") are receipt line items, not poster headings.

## Checks done

- **25% scale** (375 px downscale): readable are the title, the hero line, both receipt headlines,
  the PASS and FAIL stamps, the FAIL bar and "0/15".
- **Greyscale** (`pdftoppm -gray`): PASS and FAIL are carried by words and stamp shapes, not colour.
  The FAIL bar inverts to white on dark grey. The red line of the hero line turns mid-grey and is
  still legible.
- **PDF:** 1 page, 3168 × 3168 pt, all fonts embedded.

## Open questions

1. Is the cost line OK on a public poster, or should it be dropped?
2. Is the bacass receipt OK to show, given it's unpublished? demo-qc-trim is the alternative, but it
   has no red Planemo item.
3. The title uses "Conversations", but the poster says "expert specification" everywhere else, per
   the dossier. Keep the four-source title, or switch?
4. Should the DengueSeq direct arm (red, same defect) get a mention on the hero receipt? It's
   currently mentioned only in the #701 line.
