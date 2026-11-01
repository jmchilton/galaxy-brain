# ten-questions: the reader's side of one run

This is concept 3 of `../NEW_CONCEPTS.md` (the different angle). It's a 44″ × 44″ vector PDF with a 1″ safe margin.

The poster takes the reader's point of view. Before it built anything, the Galaxy Workflow Foundry asked the reader
ten questions about their paper. These are the real ten open questions from the DengueSeq DENV3 workflow brief. You
accepted nine proposals and corrected one. Then the tools decided, and five things stayed open, in writing.

The dominant visual is the form: ten 124 pt numerals, each with its question, its proposal, a LOW tag where the
evidence was thin, and the reviewer's mark in the "You" column (a tick, or a pen for the one correction). The
headings carry the story down the page:

1. "Before it built anything, it asked you ten questions."
2. The form.
3. "Then the tools decided."
4. "Five things stayed open."

**Colour language** (status is also encoded by shape, so it survives greyscale):

| Element | Colour | Shape |
| - | - | - |
| What the reader (the reviewer) did | pen blue `#18428C` | ticks, pen mark, correction, "yours" |
| What the Foundry proposed | ink | — |
| What a tool decided | black stamps | PASS, 7/7 FOUND |
| Open requirements | — | ring |
| Cut requirements | — | slashed ring |
| Placeholders | ochre, dashed | — |

## Rebuild (one command)

```sh
cd vault/projects/foundries/biodata_poster/designs/ten-questions
uv run build.py              # snapshot run data, QR codes, both PDFs, previews, checks, guards
uv run build.py --no-extract # use the checked-in data/*.json (no ~/projects/foundry-runs needed)
uv run build.py --hide-ask   # hide the [[ASK]] slot; the right column reflows, no hole
```

- **Typst** comes from the `typst` PyPI package, pinned to 0.15.0. Other dependencies are PyYAML, segno (QR codes),
  PyMuPDF and zxing-cpp + Pillow (guards). All are declared inline (PEP 723); nothing is installed globally.
- **Poppler** (`pdfinfo`, `pdffonts`, `pdfimages`, `pdftoppm`) must be on `PATH`.
- **Font cache:** `/private/tmp/claude-503/ten-questions-deps/fonts`, outside the vault. Override it with
  `POSTER_DEPS=/dir`. Fonts are fetched on the first run.
- **To edit text:** all prose is in `content.yml` (Typst markup, helpers listed at its top). Layout is in `poster.typ`.
  Run facts are in `data/run.json`, written by `extract.py`.
- `--keep-hidden` also writes the hide-ask variant and its 25% render to the deps directory for inspection.

### Build guards (the build exits non-zero)

- **Overflow.** Each region (title band, hero band, form, right column, bottom strip) is measured against its fixed
  height and panics with the overflow in inches. A second page also fails.
- **Question wrap.** Any question that wraps to a second line fails, as does any question over 70 characters.
- **Text size.** Any text run under 24 pt fails. It is measured with PyMuPDF on the PDF itself, for the default, bleed
  and hide-ask builds.
- **Safe area.** Any text outside the 1 in safe area fails.
- **Rules and frames.** Any drawn shape with an edge 0.25–0.9 in from the trim fails (PyMuPDF `get_drawings()`; the
  full-page paper fill is excepted).
- **QR codes.** The page is rendered at 100 dpi and decoded with zxing-cpp. Exactly the three `QR_LINKS` URLs must
  come back.
- **Fonts.** `pdffonts` must show only Public Sans, Atkinson Hyperlegible and IBM Plex Mono, all embedded. Text uses
  `fallback: false`. Arrows, ×, ticks, the pen and rings are drawn shapes.
- **Images.** `pdfimages -list` must show no raster images.
- **Word budget.** More than 550 words fails. The count covers every `content.yml` string plus the quoted wiki rule
  from `run.json`, and excludes `meta` (title, authors, references, conference line) and `board` (QR captions,
  install commands). The current count is 549.
- **Hide-ask variant.** It must not contain `[[ASK]]`, `nf-core` or `Nekrutenko lab`, and it must pass every check
  above. The live-results slot must always render.
- **Data drift.** `extract.py` fails unless all of these still hold:
  - 10 open questions, with exactly Q2 `expert-edited` in the ledger's `decisions[].review`;
  - LOW on Q1–Q5 as proposed and Q1, Q3–Q5 as reviewed;
  - the ledger has 19 entries: 5 open, 2 dropped, 14 resolved;
  - 11 phases and 7 iterations;
  - gxwf PASS with tool state 7/7 and valid connections;
  - Planemo PASS with 7/7 jobs `ok`;
  - all 7 pins `hit` and matching the workflow changesets;
  - the verbatim note hash equals the sha256 of the note at `f275059e`, and the quoted rule is still in the note;
  - both recompile hash pairs.
- **Copy drift.** `build.py` cross-checks `content.yml` against `data/run.json`:
  - ledger tallies;
  - the corrected question;
  - the open, cut and NEW items, against the ledger and its `brief_change_recommendations`;
  - the brief, note and recompile hashes;
  - the Galaxy head.

| Output | Description |
| - | - |
| `poster.pdf` | 3168 × 3168 pt, 1 page, vector, 0 images, 3 OFL families embedded |
| `poster-bleed.pdf` | 3186 pt (44.25 in), paper tint carried into 0.125 in bleed |
| `preview.png` | 1500 px |
| `checks/preview-25.png` | 1056 px (25% of 44 in at 96 dpi), the common distance check |
| `checks/preview-gray.png` | greyscale, 1056 px |
| `checks/preview-200.png` | 200 px thumbnail |

## Fonts (all OFL)

| Font | Use | Source |
| - | - | - |
| Public Sans 2.001 (Bold, SemiBold, Black) | title, hero, headings, numerals, stamps | github.com/uswds/public-sans release zip (static TTFs) |
| Atkinson Hyperlegible (Regular, Bold, Italic) | questions and body | google/fonts `ofl/atkinsonhyperlegible` |
| IBM Plex Mono (Regular, Medium, SemiBold, Bold) | hashes, commands, placeholders | google/fonts `ofl/ibmplexmono` |

Atkinson Hyperlegible's distinguishable zero (`0` with a slash or dot) is intentional.

## Data sources (read-only; snapshot in `data/run.json`, paths and SHAs in `data/manifest.json`)

All run paths are relative to `~/projects/foundry-runs/dengueseq-denv3/`.

| What | From |
| - | - |
| The ten questions, as proposed | `dengueseq-denv3-brief/workflow-brief.md` at run-repo commit `c7172f2` (sha256 `560f0bfa`) |
| The ten questions, as reviewed | the same file at `6b8b630` "review: expert edits", 2026-10-20 22:08:57 UTC (sha256 `e52aca4e`, matches `review.md`) |
| Accepted vs corrected | `dengueseq-denv3-galaxy/open-requirements.ledger.yml` `decisions[].review` (9 `accepted-proposal`, 1 `expert-edited`) |
| Open 5 of 19, cuts tied to Q5 and Q7, open tied to Q8, the 2 BAQ items as `brief_change_recommendations` (status `proposed`) | ledger `entries`, `because`/`unmet` fields, `brief_change_recommendations` |
| gxwf PASS, tool state 7/7, connections valid | `galaxy-workflow-validation-result.json` (gxwf 1.14.0) |
| Planemo PASS, 7/7 jobs ok, Galaxy `b18269a1` not pinned, `denv3_test` not run | `workflow-test-result.json` (planemo 0.75.47) |
| 7 of 7 Tool Shed hits | `galaxy-tool-pin.json` at each of the 7 phase-5 commits (`80de2f3` … `b82fa5e`) in the run repo. The bwa_mem pin exists only in history (`80de2f3`); there is no `.pin.json` for it in `galaxy-tool-summaries/`. Changesets are from `galaxy-workflow.gxwf.yml` |
| The quoted rule; `88237d66` = `88237d66` | `content/research/workflow-brief-design/index.md` at foundry `f275059e`. Its sha256 equals both `src_hash` and `dst_hash` (`mode: verbatim`) in `~/projects/foundry-runs/_plugin/f275059e/casts/claude/skills/freeform-summary-to-workflow-brief/_provenance.json` |
| Cast before the paper was chosen | `f275059e` committed 2026-10-19 (PR #688, "Propose answers to Workflow Brief open questions"); paper chosen 2026-10-20 (dossier) |
| Recompile 1 | foundry `73af1f62`, authored 2026-06-17: `discover-shed-tool` `content_hash` `256e3861 → 2e5fa1f8` |
| Recompile 2 | foundry `9adc20b7` (PR #701 merge, 2026-10-22): `planemo-asserts-idioms` `src_hash` `64c477c4 → 9a636385` across 8 `_provenance.json` files |
| 0 of 15, Orbit, open-weight models | Baker et al. 2026, p. 18 (dossier §3.5; `research/r7`) |
| Corpus counts | dossier §4, galaxyproject/foundry `main` 2026-10-24. Re-count at print |
| Install commands | foundry `README.md` on `origin/main` (l.43, l.51) |
| QR codes | segno, vector SVG, error level M, 4-module quiet zone, 3.25 in box (symbol 2.55–2.63 in): repo, `/usage/`, preprint DOI |

The BAQ probe numbers from `workflow-debug-report.md` are deliberately not on the poster (sign-off #12).

### Shortened questions (each ≤ 70 characters, one line at 50 pt)

| # | Original (brief) | On the poster | LOW as proposed | Review |
| - | - | - | - | - |
| 1 | Which primer scheme amplified the test sample SRR25366733: DENV3-only or pan-serotype? | Which primer scheme amplified the test sample? | LOW | accepted |
| 2 | Is the test sample's metadata correct (DENV-3/USA/FL-BPHL-0001/2023, MiSeq 2×251, PRJNA973096)? | Is the test sample's metadata correct? | LOW | **corrected** |
| 3 | Should the produced consensus be compared against a published consensus genome for the test sample? | Compare the consensus with a published genome? | LOW | accepted |
| 4 | Which primer BED and reference copy are authoritative: the pinned repository files or the protocols.io release? | Which primer BED and reference are authoritative? | LOW | accepted |
| 5 | Should a genome completeness/coverage metric be produced? | Produce a genome-completeness metric? | LOW | accepted |
| 6 | What consensus minimum depth should be used: 10 or 20? | Consensus minimum depth: 10 or 20? | | accepted |
| 7 | Which variant output should be produced: iVar's full variant table, or the pipeline's filtered and renamed table? | Full iVar variant table, or the pipeline's filtered one? | | accepted |
| 8 | Should outputs be produced regardless of how much of the genome is covered? | Emit outputs however little of the genome is covered? | | accepted |
| 9 | Should the primer-trimmed, sorted alignment be a workflow output? | Keep the primer-trimmed alignment (BAM) as an output? | | accepted |
| 10 | Is the repository's DENV3 test fixture useful as an additional or smaller test? | Use the repository's DENV3 fixture as a second test? | | accepted |

The proposals and evidence lines are shortened in the same way. Q1's quotation is the expert's exact wording from
`source-selection.md` ("DENV3 DengueSeq primer scheme"). To hold the word budget, only Q1 and Q6 carry an evidence
line; the concept also suggested Q3, Q7 and Q8. Q2's struck line paraphrases the as-proposed text
("accept the expert's statement and verify it against SRA when test data are fetched").

## Where this departs from the concept brief

- **5 LOW tags, not 4.** The brief as proposed (`c7172f2`) marked Q1–Q5 low confidence. Q2 was the one the reviewer
  corrected, which removed its low tag. The form shows the brief as proposed, the footer says "brief as proposed
  `560f0bfa` → as reviewed `e52aca4e`", and the tally reads "9 accepted as proposed · 1 corrected · 5 LOW". This matches
  `review.md` ("the other nine proposals, including these four marked low confidence").
- **The thesis moved up into the hero band** (72 pt, two lines), directly under the hero. The second line, "Some of
  that knowledge is yours. The rest lives in a wiki.", is the concept's right-column thesis.
- **The concept's 72 pt sub-line became the section headings.** "Then the tools decided." and "Five things stayed
  open." continue the hero sentence down the page.
- **New: the two BAQ open items are tagged NEW.** They are the ledger's two `brief_change_recommendations` (status
  `proposed`), so the build sent two new questions back to the reviewer. No probe numbers are shown.
- **New: block 1 quotes the real wiki rule** that produced the questions' shape: propose anyway, mark low confidence,
  say what's missing. Its verbatim hash pair (`88237d66 = 88237d66`) stands in for the Mold hash `c4ed7645`.
- **Cross-references.** Q5 and Q7 carry slashed rings and Q8 an open ring in the "You" column. The same Q-pills
  appear in "Five things stayed open", because those ledger entries cite those accepted answers.
- **The product name sits directly above the hero** at 44 pt, so the hero's "it" has a visible referent.
- **The form fills about 33% of the page,** below the 40–55% target, because the title, hero and thesis need about
  10 in. The short title (sign-off #4) would give the form about 1.5 in back.

## `[[ASK]]` slots

- **Anton's nf-core rebuilds:** a single dashed-ochre line under "Then the tools decided": "Also being checked:
  nf-core/rnaseq and nf-core/atacseq rebuilds (Nekrutenko lab), Foundry-validated; atacseq partial." It has no
  numbers, no paper names and no "translations". `--hide-ask` removes it and the column reflows (checked by the build).
- **`[[QR: live results]]`:** a dashed-ochre slot (3.5 in) beside the hero. It always renders. When the URL exists, add
  it to `QR_LINKS` in `build.py` and swap `live-slot()` in `poster.typ` for `qr("live", …, size: 252pt)`.

## Open questions for John

1. **Q1:** print the ten brief questions and the correction, naming J.C. as reviewer? They come from unpublished run
   dirs (#5).
2. **Q2:** Q6's tag now reads "Which applies is your call, not a model's." (softened in the content pass). Keep, or drop?
3. **Q3:** second-person "you" on a CSHL poster? The legend says "“You” was one of us, on one paper."
4. **T2:** print "Galaxy `b18269a1` (not pinned)"?
5. **#4 title:** the layout holds option 1, but the short title would give the form more room.
6. **#13:** keep or drop the Anton `[[ASK]]` line.
7. **#17:** the live-results URL.
8. **Re-count at print:** the corpus counts are dated 2026-10-24.
9. Is "Nekrutenko lab" the right label for the `[[ASK]]` line?

## Content pass (2026-10-29)

Content and clarity editor. Before state: `checks/preview-draft1.png`. Only `content.yml` changed (plus this README;
`extract.py` re-wrote `data/run.json` from the same sources). All guards pass. The word count is **549 / 550**, so every
gloss below was paid for by a cut.

**Verified, no change needed:**

- the ten questions, proposals and evidence lines against `workflow-brief.md` and the ledger `decisions[]`:
  - Q1: the Florida pan-serotype line is in the brief's evidence;
  - Q2: ENA, MiSeq, paired, 183,398 pairs;
  - Q6: 10 in Methods, code and Fig. S1, and 20× in Results;
- 5 open of 19;
- the BAQ items as `brief_change_recommendations` with status `proposed`;
- `73af1f62` and #701 hash pairs;
- the 0/15 cite p. 18;
- reviewer John Chilton.

**Accuracy fixes**

- **Q6 tag.** It read "The paper says both. A model can't settle that; you can." It now reads "Which applies is your
  call, not a model's." The evidence line is "Methods, code and Fig. S1: 10. Results report coverage at 20×."
  10 is the consensus masking depth and 20× is a coverage-reporting threshold, so "says both" overstated a
  contradiction, and Q6 was not a LOW proposal (sign-off Q2).
- **"cast" / "recast" → "built" / "compiling" / "recompiled"** (form source, hash line, both recompile rows).

**Clarity fixes**

- **Tool rows glossed:**
  - Tool Shed: "Galaxy's tool registry".
  - gxwf: "workflow validator".
  - Planemo: "test runner".
- **Molds glossed:** "a wiki [3] of Molds (one per action), compiled into skills".
- **BAQ glossed** at first use: "BAQ (base alignment quality)". The two NEW lines are now "Consensus: …" / "Variants: …".
- **Form source** says what the paper is: "DengueSeq DENV3 (dengue virus)".
- **Legend:** "“You” was one of us, an author (J.C.), on one paper."

**Cuts to hold the word budget**

- The tally is now "19 raised; 14 resolved, 5 written down."
- `--strict` was dropped from the gxwf row.
- "installable" was dropped from the Tool Shed row.
- SRR25366733 was dropped from the Planemo row; it is still on Q2 and Q10.

**Sign-off still open:** Q1 printing the questions and naming J.C., Q2 the Q6 tag (softened), Q3 second person, T2
`b18269a1` "not pinned", #4 title, #5 unpublished run dirs, #13 the `[[ASK]]` line and "Nekrutenko lab", #17 the live
URL, #18 re-count at print, #19 Karpathy.

## Design pass (2026-10-29)

Design editor. Before state: `checks/preview-draft2.png` (after the content pass; `preview-draft1.png` is the first
draft). Layout only: `poster.typ`, plus one markup change in `content.yml` (the "ten" underline, 9 → 12 pt). **No words
changed;** the count stays **549 / 550**. All guards pass on `--hide-ask`, `--no-extract` and the default build (run
last).

**Vertical budget.** Natural heights were measured per region (a scratch compile that reports `measure()` against each
`fixed()` height, deleted after). The title band had 61 pt of slack and the form 220 pt. The right column is the binding
region. New budget: title 268 → 222 pt, hero 452 → 508 pt, main 1650 → 1640 pt, bottom 318 pt.

**Hierarchy**

- **Hero 146 → 170 pt** Public Sans Black. It is now clearly the strongest thing on the page at 1056 px. The "ten"
  underline is thicker to match.
- **Hero → thesis gap 22 → 52 pt**, so "A correct workflow is…" no longer touches the hero's descenders. The thesis keeps
  72 pt, with 12 pt more clear room above the rule.
- **Form type up:**
  - numerals 112 → 124 pt;
  - questions 42 → 50 pt (the widest is about 1290 of 1420 pt, still one line, guard on);
  - proposals 31 → 34 pt;
  - evidence lines 28 → 30 pt;
  - Q6 tag 38 → 42 pt.

**Form marks**

- **Outcome rings** (⊘ on Q5 and Q7, ○ on Q8) used to sit under the tick, where they drifted into the next row and
  made those three rows taller. They now sit just left of the tick, on its foot.
- The verdict gutter grew 120 → 160 pt. Ticks keep one vertical line, in a 100 pt cell that "You" is centred over.
- **Rows are now even.** The form's slack, about 300 pt, spreads as equal air between rows.

**Right column**

- **Tool glosses:**
  - the gloss ("Galaxy's tool registry", "workflow validator", "test runner") is bold ink, and the rest of each line is
    soft grey, at 30 pt (was 28 pt, all grey);
  - the split is at the first colon of `tools.rows[].detail`, so the copy stays in `content.yml`;
  - the rows have 20 pt between them (was 10 pt).
- **0/15** stays directly under the three verdicts.
- **"Five things stayed open" rings** are 32 pt and centred on the first text line, so they are top-aligned on the
  wrapped Consensus/BAQ line. Before, they hung below the baseline.

**Print**

- **QR codes:** the box is 216 → 234 pt (3.25 in). The decoded symbols are now 2.55 in (repo, preprint) and 2.63 in
  (`/usage/`), with a 4-module quiet zone, measured with zxing on the PDF. Before, they were 2.36–2.42 in.
- The live slot stays the largest, at 3.5 in.
- `pdffonts` lists only Public Sans, Atkinson Hyperlegible and IBM Plex Mono, all embedded. `pdfimages` lists none.
- The pages are 3168 pt (trim) and 3186 pt (bleed).
- No `node_modules`, symlinks or `__pycache__` were left behind.

**Still weak / open**

- **The form is about the same share of the page as before (≈ 33%).** Its contents are bigger, but it is still under
  the 40–55% target. The short title (sign-off #4) is the remaining lever.
- **The right column is now the binding region** (≈ 80 pt slack). Any copy added there costs form height.
- **The "Where the proposals came from" block** is the quietest at distance: a 60 pt chain over 30 pt body.
- **The bottom references** run at the 24 pt floor.
- **In greyscale,** the pen-blue emphasis ("ten", "Some of that knowledge is yours.") turns dark grey, a little lighter
  than the black. The underline still carries it.
