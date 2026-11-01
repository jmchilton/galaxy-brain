# receipts-trad-three-col-oldschool

The round-5 **Old-school** restyle of `../receipts-trad-three-col/`, built under `../FEEDBACK_ROUND5.md` and `../STYLE_OLDSCHOOL.md`. It is a styling pass only. The text, facts, receipts, QR targets, layout concept and density are the source's. The source directory is untouched, so the two can be compared side by side.

Everything below the "Round 5 styling" section is the source README, carried over. Paths and fonts have been updated where the restyle changed them.

## Round 5 styling (Old-school)

### What changed

- **Ground.**
  - Graph paper is replaced by manila (`os-page`) under an opaque radial vignette to `os-page-edge`. The cyan cross-process tint is folded into the vignette's outer stop.
  - The ruling is horizontal ledger lines only, at 0.5 in, with a major line every 2 in.
- **Slips (receipts and the title slip).**
  - The fill is the `os-slip` → `os-slip-burn` thermal fade at the foot.
  - Each slip carries about 600 seeded, opaque grain specks per 120 sq in.
  - The torn foot is irregular: tooth steps vary from 0.18 to 0.24 in and depths from 0.18 to 0.26 in. It is filled `os-slip-burn` with a 1 pt `os-shadow` hairline.
  - The offset shadow is a solid `os-shadow` at 0.12 in.
  - The title slip is now the largest receipt: it has a torn foot and a dotted till rule beneath the title.
- **Cards.**
  - Each card has an `os-slip` fill with a radial edge burn ("where hands held them"), grain, a 1.5 pt `os-ink-soft` stroke, square corners and a 0.12 in offset shadow.
  - The source's red bar is now a thin faded index-card rule (`os-stamp` mixed 70% with slip).
  - Kickers are Special Elite in `os-ink-soft`, not red.
- **Receipts.**
  - Header words (CAST, PINNED, ASKED AGAIN, VALIDATED, TESTED) are VT323 at 1.25× for a thermal-printer look.
  - Lines stay IBM Plex Mono in `os-ink`.
  - Timestamps and `SIGNED` are bold `os-ink-fade`.
  - The **PASS** stamp is Oswald 600 with a 3 pt double border 4 pt apart. Slip-coloured specks are knocked out of it for worn ink.
- **Tape.** Masking tape: an `os-tape` body with a gradient to `os-tape-edge` at both ends, a 0.5 pt outline and a faint crepe halftone. The rotations are unchanged.
- **Pen.**
  - Ink is `os-pen`, graphite with a cold cast.
  - The thesis and the note heads are Homemade Apple. Note bodies and diagram annotations stay Kalam.
  - Arrows are 4.5 pt with round caps, and numbered circles are drawn as outlines only.
- **Highlighter.**
  - `hl()` uses `os-hl` and still starts at `top-edge: "x-height"`.
  - The hero mark "receipts" sits over an offset halftone backing of `os-stamp` lightened 60%.
- **Diagrams.**
  - Boxes have square corners, an `os-page` fill and a 3 pt `os-ink` stroke.
  - The KNOWLEDGE BASE box has a halftone fill.
  - gxwf and Planemo get a stamp-style double border instead of a red one.
  - Lane chips are `os-ink` fills with Oswald text.
  - The metro line is `os-ink` mixed with 20% `os-cyan`. Open stations have an `os-slip` fill with an `os-ink` stroke.
  - The fan dots are ink.
- **Type.**
  - Title: Courier Prime Bold at 106 pt.
  - Card heads and diagram labels: Oswald 600.
  - Card prose, station labels and authors: IBM Plex Serif, replacing Plex Sans.
  - Authors are set straight on the page under a thin `os-rule`.
- **QR codes.**
  - Modules are `os-ink` on an opaque `os-qr-ground`, with the 4-module quiet zone kept and a 1 pt `os-rule` frame.
  - No grain or vignette sits over them.
  - All three decode in OpenCV from a 150 ppi render of `poster.pdf`.
- **Small layout adjustments.**
  - Card side inset: 0.6 → 0.55 in. Bottom inset: 0.48 → 0.46 in.
  - Card heads and notes have tighter spacing.
  - The thesis box is 19.9 in wide, starting 0.4 in higher.
  - The authors moved down 0.17 in to clear the title slip's torn foot.
  - The forced break in "Pinned, not / named." matches the source's two-line head.
  - Shadow allowance: 0.16 → 0.12 in. It is now `sh-off`.

### Fonts and licences

All are vendored in `fonts/` with their licence files. All are embedded and subset (`pdffonts`: 13 faces, every one `emb yes`), with fsType 0 (installable).

| Face | Use | Source | Licence |
| - | - | - | - |
| Courier Prime Bold | title | google/fonts `ofl/courierprime` | OFL 1.1 |
| Special Elite | card kickers | google/fonts `apache/specialelite` | Apache 2.0 |
| Oswald SemiBold | card heads, diagram labels, stamp, QR captions | fontsource static `oswald@latest/latin-600` (google/fonts ships only the variable font) | OFL 1.1 |
| IBM Plex Serif Regular, SemiBold, Bold | prose, station labels, authors | google/fonts `ofl/ibmplexserif` | OFL 1.1 |
| IBM Plex Mono Regular, SemiBold, Bold | receipt lines, commands, refs | carried over from source | OFL 1.1 |
| VT323 | receipt header words | google/fonts `ofl/vt323` | OFL 1.1 |
| Homemade Apple | thesis, pen-note heads | google/fonts `apache/homemadeapple` | Apache 2.0 |
| Kalam Regular, Bold | pen-note bodies, diagram annotations, badges | carried over from source | OFL 1.1 |

The source's Archivo Black, IBM Plex Sans and Plex Mono Italic are no longer used and were removed from `fonts/`. `audit.py`'s allow-list was updated to match.

### Departures from the guide

1. **Receipt stations stay stamp-red.** The guide fills gate stations with ink, but the route card's text says "(red stops)", and the text can't change.
2. **VT323 is used only for receipt header words.** The receipt lines stay Plex Mono, which is the guide's own "safest" option. VT323 at 1.25× would not fit the dense PINNED rows.
3. **Homemade Apple is used only for the thesis and note heads.**
   - Note bodies stay Kalam. At the 28 to 38 pt body floor, Homemade Apple's tiny x-height and loops lose legibility at 3 ft, and its width overflowed the columns.
   - Script heads are measured from ascender to descender, so their long descenders sit inside the guarded height.
4. **All effects are opaque.** The cyan ring and grain use `color.mix`, not `transparentize`. This matches the source's zero-`/SMask` rule, and the PDF has 0 SMask objects.
5. **Oswald heads are tracked 0.03em, not 0.06em.** Mixed-case 62 pt heads looked gappy at 0.06em. Labels, chips and brackets use 0.08 to 0.14em.
6. **The title slip has no Special Elite kicker.** The source title slip has none, and adding one would add copy. Special Elite went to the card kickers instead.
7. **The title is 106 pt, not 120 pt.** At 120 pt, Courier Prime's monospaced width (0.6 em) exceeds the 42 in slip. 106 pt is still above the 100 pt hero floor.
8. **Line weights are heavier than the guide's.** Arrows are 4.5 pt (guide: 3 pt) and the metro line is 9 pt (guide: 4 pt), to hold up at 44 in and 6 ft.
9. **The index-card rule uses faded stamp red.** The guide reserves red for stamps. Here it is one thin line per card, mixed 30% toward slip.

### Word count

- `audit.py --count` reports **856** words with SHOW_ASK=0 and **854** with SHOW_ASK=1. The source reported 932 and 930.
- **The copy is unchanged; the gap is an extraction artifact.**
  - The source set its kickers in mono at 0.16em tracking, which pymupdf extracts letter by letter as 99 single-character tokens.
  - The same kickers in Special Elite extract as 24 whole words.
  - 931 − 99 + 24 = 856.
- A token diff of the source and restyle count PDFs shows no other difference (`wdiff.py` in the deps scratch).
- On the same tokenization, the change is 0%.

### Checks run

- Guards: all overflow, safe-zone, fit, band, QR-size, font and size guards pass on poster, bleed, ASK and count renders.
- `pdfimages`: no raster images. SMask objects: 0.
- Bleed: `poster-bleed.pdf` (44.25 in) cropped by 0.125 in differs from `poster.pdf` by 0 px at 40 ppi.
- QR: all three URLs decode from a 150 ppi render.
- Greyscale (`checks/preview-gray.png`): the highlighter, red stops, stamp and ink chips each separate from the slip.
- `receipts.json` is byte-identical to the source's.
- No `node_modules` and no symlinks.

### Open questions

1. Is Homemade Apple OK for the thesis at 44 pt, or should it go back to Kalam Bold? It reads at 3 ft but is thinner at 6 ft.
2. Keep the faded-red index-card rule, or make the cards pure ink?
3. Is VT323 on the receipt header words a keeper, or should everything return to Plex Mono?
4. The vignette is subtle at the guide's stops. Push `os-page-edge` darker for more "2011 filter"?
5. Print proof: the yellows may go mustard on inkjet (guide). Proof a swatch strip first.
6. The source's open questions below still stand.

---

## The idea

**Header (as-is from side-by-side):**
- the title slip, *Build better skills. Build better workflows. / Keep the **receipts**.* (120 pt);
- the pen thesis;
- the `[[QR: live results]]` tile;
- the author block, with affiliations written out in full.

**Body: three columns of unequal width (13 in, 15.95 in, 11.45 in).** Each column interleaves taped index cards (conventional poster boxes) with taped receipts. Every receipt sits directly under the card it proves, and a numbered pen note points at the line that proves it. The columns read top to bottom, and the receipts are numbered №1–№4 in run order.

| Column | Card | Then, as evidence |
| - | - | - |
| Left | **What it does**: "A knowledge problem, not a syntax problem." What goes in, what comes out, and why programs decide. | — |
| | **How it works**: "Compile the knowledge. Let programs judge." The machine (knowledge base ⊃ Mold → cast, no model → skill + provenance → the agent writes Format 2 → gxwf and Planemo), redrawn as vector boxes after `foundry-machine.svg`. The corpus counts sit inside the boxes. | ① *Skills are binaries.* → **№1 CAST** |
| | **When a run goes wrong**: "Fix the note, not the skill." One note card fans out to the 8 skills that PR #701 re-cast ("one note, many skills", drawn). | — |
| Centre | **From a paper or a Nextflow pipeline to Galaxy**: "Many sources, one Galaxy spine." A metro diagram built from the run records. Paper and Nextflow lanes each summarize the source and draft a brief. Both feed into the *workflow brief, reviewed by a person*. One 11-stop Galaxy spine follows, grouped DESIGN / BUILD / TEST / CHECK, with step 5's per-tool loop expanded. The stops that printed a receipt are red and labelled №2, №3 and №4. | **№2 PINNED**; ② *Pinned, not named.* beside **№2b ASKED AGAIN** (the Tool Shed drift); **№4 TESTED** beside ④ *Not run, not known.* |
| Right | **From the Orbit paper [1]**: "Rails, not reminders." The `tximport` catch, "guidance, not enforcement", the evidence-gate refusal default, the Hokken prior work and the preprint QR. | ③ *Typed, not guessed.* → **№3 VALIDATED** |
| | **Get started**: "Run it yourself." Four numbered steps (install the skills, install gxwf, run the two pipeline skills, check any workflow yourself), the Foundry and install-page QR codes, and the references. | — |

**Dropped from the spike:** the spike, the punched holes, the "jobs needed" column, and the `JOBS RUN … 0 none needed` rows on CAST and PINNED. VALIDATED keeps a regular-weight `jobs run … 0` *after* `wall time`. TESTED keeps the bold `JOBS RUN … 7`, also after its wall time.

**Orbit 0/15** appears once, inside a body sentence of the Orbit card, at body size and attributed to [1]. It is never a hero. The card's head is "Rails, not reminders.", and its lead is the `tximport` catch.

**The 30-second read:** title → *What it does* (top left) → the route diagram (top centre) → *Run it yourself* (bottom right, with commands and QR codes).

## Rebuild

```sh
./build.sh            # extract -> QR -> PDFs/previews -> audits -> checks/
REPLAY=1 ./build.sh   # also re-run gxwf over the run first (replay.sh; network on a cold cache)
```

What the build runs:
- **`extract.py`** (from receipts-spike, extended) writes `receipts.json`. It reads:
  - the DengueSeq Galaxy run (`git show HEAD:`), with its planemo log and session log;
  - the two brief runs' `foundry-run.yml`;
  - the foundry clone at `eb2de3f1` (receipts) and `bc79096` (corpus counts), plus the PR #701 merge `9adc20b7` and commit `73af1f62`;
  - `data/`.

  If any run directory or the clone is missing, the build uses the committed `receipts.json`.
- **`replay.sh`** (unchanged from receipts-spike, optional) refreshes `data/` with `@galaxy-tool-util/cli@1.15.0`. It writes npm and its caches to `/private/tmp/claude-503/receipts-trad-three-col-oldschool-deps`.
- **`make_qr.py`** writes three vector QR codes with segno.
- **`render.py`** runs Typst 0.15.0 via `uvx --from typst==0.15.0 python`, with vendored fonts only. It writes:
  - `poster.pdf` (44 in);
  - `poster-bleed.pdf` (44.25 in);
  - `preview.png` (1496 px);
  - count and SHOW_ASK=1 renders, under the deps directory.
- **`audit.py`** and **`pdftoppm`** write `checks/`:
  - `preview-25.png` (1056 px);
  - `preview-gray.png`;
  - `thumb-200.png`;
  - `show-ask-0.png`;
  - `show-ask-1.png`.

**Flags (`sys_inputs`):**
- `bleed=1`;
- `count=1`, which hides the exempt text;
- `SHOW_ASK=1`;
- `noguard=1`, which prints guard failures in red at the top of the page instead of failing (debug only).

**To edit the copy:**
- **Cards:** the `card-*` functions in `poster.typ`.
- **Receipts:** the `r-*` arrays.
- **Pen notes:** the `n-*` lines.
- **Column contents:** the `cols` list in the layout block. Each column is a measured flow, and its spare height is shared equally between the gaps.

### Build guards (all fail the build)

| Guard | Where |
| - | - |
| A column's items don't fit between the header and the 1 in safe zone | `poster.typ` (column flow) |
| A card or receipt runs past the safe zone; an item is wider than its column; side-by-side pairs overlap; the gutters are < 0.75 in | `poster.typ` |
| An unbreakable line (each command, skill name, lane caption or loop line) is wider than its space | `poster.typ` (`fit`) |
| A metro station label is taller than its band | `poster.typ` |
| A QR code (quiet zone excluded) < 2.5 in | `poster.typ` |
| Text < 24 pt; a font that isn't vendored or isn't embedded | `audit.py`, on poster, bleed and ASK PDFs |
| Body text < 28 pt; body > 1000 words | `audit.py --count`, on both SHOW_ASK renders |
| Pins, validation and test results disagree with the run, the pin files, the tool-revisions output or Galaxy's install log | `extract.py` asserts (from receipts-spike) |
| The route lanes or spine differ from the run records (2 + 2 brief Molds, 11 phases, 7 step-5 iterations); PR #701 isn't 1 note → 8 skills; the corpus counts differ from 420 / 56 / 54 / 69 at `bc79096`; the drift answer equals the pin | `extract.py` asserts (new) |

Guards that fired during development, showing they work:
- "column 1/2/3 overflows by …";
- "skill name freeform-summary-to-galaxy-test-plan is 604.8pt wide, room 547.2pt";
- "fix / start / tested runs past the safe zone";
- `audit.py`: "1 spans under 24 pt" (a nested `raw` at 23.6 pt);
- `audit.py`: "non-vendored fonts: LibertinusSerif", caused by a Kalam `→` falling back to Typst's built-in font. It is now set in Plex Mono.

**Also checked:**
- `pdffonts`: 13 faces, all embedded and subset.
- `pdfimages`: no raster images.
- Transparency: no `/SMask` objects.
- Bleed: `poster-bleed.pdf` cropped by 0.125 in differs from `poster.pdf` by 0 px at 40 ppi.
- The directory has no `node_modules` and no symlinks (`build.sh` checks this).

## Fonts

See "Fonts and licences" in the Round 5 section. Typst runs with `ignore_system_fonts=True`. Arrows (`→`) are set in Plex Mono or drawn, because the display, script and head faces lack the glyph, and the audit catches any fallback.

## Body word count (source)

**932 body words with SHOW_ASK=0, and 930 with SHOW_ASK=1** (target 700–1000; gate 1000). It is counted the keeper way: every alphanumeric token in `poster-count.pdf`. That includes:
- every receipt line, hash and stamp;
- diagram labels and lane captions;
- the station numbers;
- the `[[QR: live results]]` text.

The count render hides these exempt items:
- the title;
- the authors and affiliations;
- the references;
- the QR captions;
- the counts footnote in *How it works*.

The thesis is counted, as in side-by-side.

## Sources for every fact

**Abbreviations:**
- **RUN**: `~/projects/foundry-runs/dengueseq-denv3/dengueseq-denv3-galaxy` @ `6737777`.
- **FOUNDRY**: `~/projects/repositories/foundry`, `origin/main` = `eb2de3f1` (2026-10-30).
- **R1**: `../../research/r1-foundry-system.md`.
- **R7**: `../../research/r7-biorxiv-preprint.md`.
- **DOSSIER**: `../../DESIGN_DOSSIER.md`.
- **SPIKE**: `../receipts-spike/README.md`.
- **SBS**: `../receipts-side-by-side/README.md`.

| On the poster | Source |
| - | - |
| Header: title, thesis, authors, affiliations, live placeholder | SBS / `../receipts-side-by-side/poster.typ`, copied verbatim |
| "A knowledge problem, not a syntax problem"; Galaxy changes faster than training data; knowledge in a wiki, compiled into skills; programs decide; gaps go in a ledger | DOSSIER §2 (the one-breath argument), §3.6; R1 §6 (open-requirements ledger) |
| Inputs: paper, Nextflow pipeline, expert's written plan. Outputs: pinned Tool Shed tools, Galaxy collections, a test | DOSSIER §3.4, §3.9, §4 ("expert specification", not "interview"); the spine's test phases (RUN `foundry-run.yml` phases 6–10) |
| 420 notes · 56 Molds · 54 patterns · 69 skills (one plugin) | `git ls-tree` at FOUNDRY `bc79096` (2026-10-24), using R1 §1.1's raw-file definitions; asserted in `extract.py`; matches DOSSIER §4. The plugin is `foundry-skills` (R1 §8). Footnoted on the poster. |
| Cast: no model, same bytes every time | `packages/build-cli/src/commands/cast-mold.ts`: "there is no LLM phase" (asserted in `extract.py`); `foundry-machine.svg` ("same bytes, every time") |
| Mold = one action + the notes it needs; provenance = a hash per source note | R1 §3.1–3.2 (`_provenance.json` `refs[].src_hash`); `foundry-machine.svg` |
| The agent writes Format 2; gxwf types every step and connection; Planemo installs the pins and runs the test | R1 §4.1; RUN emits `galaxy-workflow.gxwf.yml`; SPIKE (Planemo install log) |
| "Fix the note, not the skill"; a failure is traced to a note or a Mold, then re-cast with a new hash | DOSSIER §3.7; R1 §5 |
| PR #701: 1 note (`planemo-asserts-idioms`), 8 skills re-cast (all 8 names) | FOUNDRY `git show -m --first-parent --name-only 9adc20b7`: one `content/research/…/index.md` and 8 `casts/claude/skills/*/_provenance.json`; asserted in `extract.py`; DOSSIER §4 |
| Commit `73af1f62` fixed a Mold and re-cast `discover-shed-tool` | FOUNDRY `73af1f62` (Mold `index.md`, `eval.md`, cast `SKILL.md` and `_provenance.json`; content hash `256e3861` → `2e5fa1f8`); R1 §5.1 |
| "A pipeline is not a giant prompt …"; typed handoffs | `gcc2026.mdx` ("Pipelines are journeys"); R1 §4.1 (schema'd artifacts) |
| Paper lane: summarize → draft a brief (`paper-to-workflow-brief`) | `dengueseq-denv3-brief/foundry-run.yml`: `summarize-paper`, `freeform-summary-to-workflow-brief`; asserted |
| Nextflow lane: summarize → draft a brief (`nextflow-to-workflow-brief`) | `~/projects/foundry-runs/bacass-sr-assembly/bacass-sr-assembly-brief/foundry-run.yml`: `summarize-nextflow`, `nextflow-summary-to-workflow-brief`; asserted. bacass isn't named on the poster and no outcome is shown. |
| "a person reviews it" | `dengueseq-denv3/review.md`; DOSSIER §4 (the brief was reviewed by John Chilton) |
| Spine `workflow-brief-to-galaxy`, 11 stops in order; plain-word labels | RUN `foundry-run.yml` `phases[]`, asserted (11 phases); the label mapping is `st-label` in `poster.typ` |
| Step 5 loops once per tool, 7 rounds here | RUN `foundry-run.yml` phase 5 `iterations: 7`, with one `galaxy-tool-pin` per iteration |
| `draft-next-step → discover-shed-tool → implement-galaxy-tool-step → draft-validate` | R1 §2.1 (leaf Molds of `advance-galaxy-draft-step`) and §4.1; `gcc2026.mdx` "Draft tooling" |
| Stop 9 = `gxwf validate`, stop 10 = `planemo test`; red stops 5, 9 and 10 printed №2, №3 and №4 | RUN phases 5, 9 and 10 artifact ids; SPIKE (receipt times) |
| Direct routes `paper-to-galaxy`, `nextflow-to-galaxy` skip the brief | R1 §2.1 |
| DengueSeq run on 2026-10-20; the paper was picked after the skills were built | RUN `foundry-run.yml` `started_at`; DOSSIER §4 |
| CAST, PINNED, VALIDATED, TESTED (every line) | SPIKE "Sources for every fact", unchanged; `receipts.json` from the same `extract.py` assertions |
| PINNED "step 5" | RUN phase 5 `galaxy-tool-pin` artifacts (22:51–23:39 UTC) |
| VALIDATED `jobs run 0` | `gxwf validate` is static and runs no jobs (SBS sources) |
| №2b ASKED AGAIN: `ivar_trim 1.4.4+galaxy1` pinned `@6606a8c97889` on 10-20; asked on 10-30 → `@8b20bc80ebf4` | `receipts.json` `drift`, from `data/tool-revisions/iuc~ivar_trim~ivar_trim.json` (the replay, `data/run-meta.txt` date) vs. the RUN pin; SPIKE open question 2. Worded as "a different changeset", not "different code". |
| Note ① "no model in the build"; "the skill step 5 used" | `cast-mold.ts`; RUN `foundry-feedback.ledger.yml` `observed_in` (asserted, from SPIKE); R1 §4.1 (`discover-shed-tool` runs inside step 5) |
| Note ③ "checked against the tool's real schema before anything runs" | SPIKE note 3 |
| Note ④ quote | `QA:466` (`foundry-qa.mdx`), via SPIKE |
| "Skills are guidance, not enforcement." | Preprint p.16 (R7 §2.3, §6.1) |
| A connection check caught an agent's bad `tximport` wiring before anything ran | Preprint p.4, pp.15–16, Fig S3A (R7 §5.2, §6.2). Credited to "a connection check", not to gxwf. |
| A prompt-only rule was followed in 0 of 15 graded runs on open-weight models; Orbit's evidence gate now refuses by default | Preprint pp.17–18 (R7 §2.4, §5.3). Joined with "and", not "so". |
| Prior work: a 60-step Galaxy workflow the Foundry compiled from published methods text (Hokken et al.); comparison with the authors' data surfaced a pooled model the methods never stated | Preprint p.8, p.19, Fig S4A (R7 §3.1, §5.3). Worded so it doesn't imply the pooled model was right on the first pass. |
| `/plugin marketplace add galaxyproject/foundry`, `/plugin install foundry-skills@galaxy-workflow-foundry`; Codex and Antigravity on the install page | FOUNDRY `README.md` "Install generated skills" |
| `npm install -g @galaxy-tool-util/cli` | `gcc2026.mdx` ("Published CLI + docs" caption) |
| `pipeline-paper-to-workflow-brief`, `pipeline-workflow-brief-to-galaxy` | FOUNDRY `casts/claude/skills/pipeline-*` (directory names and `SKILL.md`) |
| `gxwf validate --connections wf.gxwf.yml` | SPIKE / `replay.sh` (the same flags on the run's workflow) |
| [1] Baker et al.; [2] Vogels et al. | DOSSIER §5; SPIKE |

**QR codes:** vector, from segno. Each URL returned HTTP 200 on 2026-10-30.

| Code | Target | Tile |
| - | - | - |
| The Foundry | `galaxyproject.github.io/foundry/` | 3.3 in |
| Install the skills | `galaxyproject.github.io/foundry/usage/` | 3.3 in |
| Preprint [1] | `doi.org/10.64898/2026.10.26.761864` | 3.2 in; code 2.51 in, gate 2.5 in |
| `[[QR: live results]]` | 3.3 in placeholder in the header | — |

There is no lightning-talk QR.

## `[[ASK]]` slots

- **`SHOW_ASK` (default 0).** It replaces the *Direct routes* line under the metro with `[[ASK]] nf-core pipelines · Foundry-validated · Planemo-green`, which has no numbers. The layout is unchanged, and both renders pass every gate (`checks/show-ask-0.png`, `checks/show-ask-1.png`).
- **`[[QR: live results]]`.** Once the URL exists:
  1. add it to `LINKS` in `make_qr.py`;
  2. swap the `placeholder(...)` in the header for `image("assets/qr-live.svg", width: live-w)`.

## Departures and judgment calls

1. **CAST is not on the metro.** CAST was printed by `foundry-build cast` on 09-13, not during the run. Stop 5 is labelled №2 only. Note ① says "the skill step 5 used", which ties CAST to stop 5 in words.
2. **Card prose is set in a proportional face** (source: IBM Plex Sans; Old-school: IBM Plex Serif), not mono. Mono at the 28 pt floor fits fewer words per line, and a separate face lets the eye separate *explanation* (cards) from *evidence* (receipts) and *commentary* (pen).
3. **The VALIDATED `map-over` row was dropped** for height. It is still in `receipts.json`.
4. **The cards are unnumbered** (kicker labels only). Numbers are reserved for the receipts and their pen notes, so "№3" and ③ mean one thing.
5. **The knowledge-base counts sit inside the machine's boxes,** not in a separate stats row. There is one dated set (`bc79096`, 2026-10-24), as the advice suggests.
6. **No pipeline count is printed** (7 at abstract time vs. 13 on `main`; R1 question 1).

## Open questions

1. Keep Orbit's 0/15 as an in-sentence aside, or drop it?
2. The header is as-is, so "Galaxy Workflow Foundry" first appears in the *What it does* body. Add a small kicker to the title slip?
3. (Source question, superseded by the Old-school font set.) Is Plex Sans for card prose OK, or keep strictly to the three keeper faces?
4. Step 3 uses bare skill names. The Claude Code form, `/foundry-skills:pipeline-…`, is inferred from the README's `/foundry-skills:discover-shed-tool`. Print it in full?
5. Drift: `ivar_variants` also drifted (`5e5dfc9e71e2` → `924aef5ed7ae`). Is one example enough?
6. The prior-work line cites Hokken from the same group's preprint. Is that OK under CSHL's "new and unpublished" rule?
7. Shop: edge-to-edge on the trim, or `poster-bleed.pdf`?
8. The centre column is the route card followed by three receipts (PINNED, ASKED AGAIN, TESTED). Each is keyed by № to a red stop on the card, but the lower half reads close to an evidence column. Insert a card between them?
9. Re-check the corpus counts and `discover-shed-tool` rev 5 at print (`./build.sh` after a `git fetch`).
