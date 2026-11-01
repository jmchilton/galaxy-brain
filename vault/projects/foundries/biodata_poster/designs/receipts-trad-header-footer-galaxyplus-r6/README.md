# receipts-trad-header-footer-galaxyplus

Round-5 **Galaxy+** restyle of `../receipts-trad-header-footer/` (`../STYLE_GALAXYPLUS.md` on top of `../STYLE_GALAXY.md`). Text, facts, receipts, QR codes and layout concept are unchanged; what changed is in [Round 5 styling (Galaxy+)](#round-5-styling-galaxy) at the end. The sections in between are inherited from the source poster and still describe this one, except where that section says otherwise.

This is a traditional-poster variant of `receipts-spike`, built under `../FEEDBACK_ROUND4.md` and `../FEEDBACK_ROUND3.md` (round 4 lifts the 400-word cap). The source kept the round-4 visual language (graph paper, thermal slips with torn feet, tape, Kalam pen notes, a red stamp, the highlighter, and `receipts-side-by-side`'s title slip). This version keeps the graph paper, slips, tape, pen notes and highlighter in Galaxy+ colours; the stamp is now `gx-ok` and the title slip is now a nebula masthead with the same copy.

## The idea

A header band and a footer band of taped info cards, with one Foundry run drawn between them as a connected chain.

- **Title slip (as-is from side-by-side).** *Build better skills. Build better workflows. Keep the receipts.* It keeps the pen thesis and the author block.
- **Header band: three cards.**
  1. **What it does.** Knowledge problem, not a syntax problem; wiki → skills → programs decide. Then In / Out, and the run's ledger.
  2. **How it works: "Compile, then check".** A vector machine diagram (KNOWLEDGE BASE → MOLD → CAST ① → SKILL), then three rails: ② `gxwf tool-revisions`, ③ `gxwf validate`, ④ `planemo test`.
  3. **The wiki.** A pen tally of the corpus (2026-10-24), the Karpathy lineage, and "Wrong? Fix the note, recast" with two real recasts.
- **Middle band: "One run, four receipts."**
  - **Pipeline.** On the left are two source lanes:
    - PAPER (solid; this run): summarize → write the brief;
    - NEXTFLOW (dashed, grey-blue; no run or result shown): summarize → write the brief.
  - Both lanes feed a **WORKFLOW BRIEF** box ("a person reviews and edits it"). From it runs the `workflow-brief-to-galaxy` spine with its 11 real phases. Phase 5 is a ring marked ×7.
  - **Receipts.** Each receipt hangs by a dashed leader and tape from the station that printed it, alternating above and below the spine:
    - CAST above station 5 (the skill the loop used);
    - PINNED below station 5;
    - VALIDATED above station 9;
    - TESTED below station 10.
  - Each receipt carries the badge ①–④ of the rail in card 2 that it proves. The box explains; the receipt proves.
  - **Pen notes.** Notes 1–4 point at one receipt line each. A drift aside points at PINNED's `ivar_trim` row, and an "other routes" note explains the rest of the route set without numbers.
- **Footer band: three cards.**
  1. **Rails, not reminders.** The Orbit preprint story, positive framing; 0/15 appears only as small, attributed context.
  2. **Get started.** Install the skills (Claude Code, Codex, Antigravity), install gxwf, run the two routes, check any workflow.
  3. **QR codes and references.** Foundry, preprint and install codes, plus the references and the run footnote.

Removed from spike:
- the spike metaphor;
- the "jobs needed" column;
- the three `JOBS RUN … 0 none needed` rows.

`JOBS RUN 7` stays on TESTED only, below its wall time.

## Rebuild

```sh
./build.sh            # extract -> QR -> PDFs/previews -> audits -> checks/
REPLAY=1 ./build.sh   # also re-run gxwf over the run first (replay.sh; network on a cold cache)
```

**Steps:**
- `extract.py` (PyYAML) writes `receipts.json`. It is spike's extractor, extended. Read-only, it reads:
  - the run `~/projects/foundry-runs/dengueseq-denv3/dengueseq-denv3-galaxy` @ `6737777`, via `git show`;
  - the brief run `dengueseq-denv3-brief` @ `6b8b630`;
  - the foundry clone @ `eb2de3f1`;
  - `data/` (copied from spike: the gxwf 1.15.0 replay, timing, pin files and today's tool-revisions).
- New keys:
  - `spine` (the 11 phases, with `iterations: 7` on phase 5);
  - `ledger` (19 entries: 14 resolved, 5 open, 2 dropped);
  - `brief` (pipeline, phases, review commit);
  - `drift` (pins that `gxwf tool-revisions` now answers differently).
- The four spike receipt blocks re-extract identically to spike's committed `receipts.json` (diffed).
- If any run dir or the foundry clone is missing, the committed `receipts.json` is used.
- `make_qr.py` (segno) writes vector QR SVGs.
- `render.py` runs Typst 0.15.0 via `uvx --from typst==0.15.0 python` with vendored fonts only. It writes `poster.pdf` (44 in), `poster-bleed.pdf` (44.25 in) and `preview.png` (1496 px). It also writes the count render and the SHOW_ASK=1 renders into `/private/tmp/claude-503/receipts-trad-header-footer-galaxyplus-deps/`.
- `audit.py` runs on the poster, bleed and ASK PDFs. With `--count` it runs on both count renders.
- `pdftoppm` writes `checks/`:
  - `preview-25.png` (1056 px);
  - `preview-gray.png`;
  - `thumb-200.png`;
  - `show-ask-1.png`.
- The build fails if the directory holds a symlink or `node_modules`. It holds neither.

**Flags (`sys_inputs`):** `bleed=1`; `count=1` (hides exempt text); `SHOW_ASK=1`; `noguard=1` (debug only).

**To edit copy:**
- The title, thesis and authors are at the top of `poster.typ`.
- The cards are the `card(...)` calls.
- The receipts are `r-cast`, `r-pinned`, `r-validated` and `r-tested`.
- The notes are the `note(...)` calls.
- The spine labels are the `lab(...)` calls.

### Build guards (all fail the build)

| Guard | Where |
| - | - |
| A card's body exceeds its fixed height; a card collides with anything placed or leaves the 1 in safe zone | `poster.typ` `card()` |
| A receipt, note, band title, drift aside, routes note, badge, lane, brief box or the spine band collides with anything already placed or leaves the safe zone | `poster.typ` `checked()` / `hang()` (rects passed explicitly) |
| Station 5 not over PINNED; spine stations crowd | `poster.typ` |
| QR code (quiet zone excluded) < 2.5 in | `poster.typ` `qr-tile` |
| Text < 24 pt; a non-vendored or unembedded font | `audit.py` |
| Body text < 28 pt; body > 1000 words (warns < 700) | `audit.py --count` |
| Runs disagree (pins vs pin files vs tool-revisions output vs install log; replay vs the run's validation result; different cast; ledger counts; brief pipeline and review commit) | `extract.py` asserts |

**Guards that fired during development:**
- card overflows: "how it works" by 15.7 pt, "inside" by 0.5 pt, "codes" by 10.8 pt, "what it does" by 2.2 pt;
- "cast receipt collides with spine band";
- "inside card leaves the safe zone";
- the font audit, on `LibertinusSerif-Bold` / `NewCMMath-Bold` fallbacks for `→` and `↺` in Kalam (fixed by setting `→` in Plex Mono and dropping `↺`).

**Also checked:**
- `pdffonts`: 9 faces, all embedded and subset.
- `pdfimages`: no raster images.
- `poster-bleed.pdf` cropped by 0.125 in differs from `poster.pdf` in 0.07% of pixels at 40 ppi, by at most 25/255: the nebula gradients are sized to the bleed box.
- Greyscale: the highlights go pale grey but the text holds. The Nextflow lane stays distinct by its dashes.

## Fonts

See [Fonts and licenses](#fonts-and-licenses) in the round-5 section.

## Body word count

**847 body words with SHOW_ASK=0, and 853 with SHOW_ASK=1** (target 700–1000). It is counted the keeper way: every alphanumeric token in the count render.

The title, authors, references, footnotes and QR captions are exempt and hidden. The thesis is counted.

| Region | Words |
| - | - |
| Title slip (thesis + placeholder) | 27 |
| What it does / How it works / The wiki | 126 / 88 / 77 |
| Middle band (receipts, spine, lanes, notes) | 351 |
| Rails / Get started | 110 / 68 |

## Sources for every fact

**Abbreviations:**
- **RUN** = `~/projects/foundry-runs/dengueseq-denv3/dengueseq-denv3-galaxy` @ `6737777`.
- **BRIEF** = `…/dengueseq-denv3-brief` @ `6b8b630`.
- **r1** = `../../research/r1-foundry-system.md`; **r7** = `../../research/r7-biorxiv-preprint.md`.
- **Dossier** = `../../DESIGN_DOSSIER.md`.
- **Spike** = `../receipts-spike/README.md`, whose source table covers every receipt line and is inherited unchanged.

| On the poster | Source |
| - | - |
| Every line on CAST, PINNED, VALIDATED, TESTED; notes 1–3; "Planemo installed exactly these"; "under a second" | Spike README source table (same `extract.py` asserts, same `data/`) |
| Spine: 11 phases, phase 5 `advance-galaxy-draft-step` ×7, 9 validate, 10 run test, 11 debug; pipeline `workflow-brief-to-galaxy` | RUN `foundry-run.yml` (`phases`, `iterations: 7`) |
| Paper lane: summarize the paper → write the brief | BRIEF `foundry-run.yml` (`paper-to-workflow-brief`: `summarize-paper`, `freeform-summary-to-workflow-brief`) |
| "a person reviews and edits it" | BRIEF commit `6b8b630` "review: expert edits", John Chilton; Dossier §4 |
| Nextflow lane: summarize the pipeline → write the brief | r1 §2.2 (`nextflow-to-workflow-brief`); `bacass-sr-assembly-brief` ran it, but no bacass result is shown (its test failed) |
| "Other routes share these stations… Direct routes skip the brief." | r1 §2.1 (`cwl-to-galaxy`, `interview-to-galaxy`, `update-interview-to-galaxy`, `paper-to-galaxy`, `nextflow-to-galaxy`); Dossier §3.4. No route count printed. |
| Receipt placement: CAST and PINNED at phase 5 | r1 §2.1 "leaf Molds hidden inside the loop": `discover-shed-tool` runs inside `advance-galaxy-draft-step`; RUN phase 5 `galaxy-tool-pin` artifacts |
| "DengueSeq [2], from the paper… picked after the skills were built" | Dossier §4 (DengueSeq, PUBLIC; "from the paper", not "methods text"); `dengueseq-denv3/source-selection.md` |
| Ledger: 14 resolved, 5 open, 2 dropped on purpose | RUN `open-requirements.ledger.yml` (19 entries; asserted in `extract.py`) |
| Drift: on 10-30 `ivar_trim 1.4.4+galaxy1` → `8b20bc80ebf4`, pinned `6606a8c97889`; "Planemo installed the pinned one" | `data/tool-revisions/iuc~ivar_trim~ivar_trim.json` (replay 2026-10-30); spike Open Q2; install line in `_scratch/planemo/planemo.log` (asserted in `extract.py`). Says "new changeset", not "new code", and makes no reproducibility claim. |
| Note 4 | Paraphrase of QA:466 (`foundry-qa.mdx`), no longer in quotation marks |
| "Knowledge problem, not a syntax problem"; wiki → skills → programs decide; In/Out | Dossier §2, §3.1, §3.4–3.6 |
| Machine: KB (notes, schemas, patterns, CLI contracts) → Mold (one action: typed refs + procedure) → cast (no model in the build) → frozen skill + provenance | `foundry-machine.svg`, FP slides 6–10; `cast-mold.ts` "there is no LLM phase" (asserted in `extract.py`) |
| Rails ②–④ | Spike signatures; Dossier §3.5. "installs the pins": `planemo.log` install lines (spike) |
| Agent writes Format 2 | RUN `galaxy-workflow.gxwf.yml`; side-by-side sources (`GCC:602-619`) |
| Wiki tally 420 notes · 56 Molds · 54 patterns · 51 oracles · 69 compiled skills (2026-10-24) | Dossier §4 corpus table = r1 §1.1 (raw-file definitions @ `bc79096`). The pipeline count is deliberately omitted. |
| Karpathy's LLM wiki, extended | Dossier §3.2 |
| `integron_finder` false miss, fixed in its Mold, recast in `73af1f62` | r1 executive summary; Dossier §4 (PUBLIC) |
| PR #701 fixed one testing note, recast 8 skills | Dossier §4 "Second recompile instance" (PUBLIC) |
| "guidance, not enforcement" | Preprint p.16 (r7 §2 F5, §6.1) |
| A prompt-only rule held in 0 of 15 graded runs | Preprint p.18 (r7 §5.3; notebook-approval rule, open-weight models); small and attributed |
| Connection validator caught the `tximport` wiring before it ran | Preprint p.4, pp.15–16, Fig S3A (r7 §6.2) |
| Orbit's evidence gate refuses by default | Preprint pp.17–18 (r7 §2, "post-v0.8.0 refusal default") |
| Hokken: 60-step workflow from published methods; DEG counts within 0.3–1.3%, after the authors' data exposed an unstated pooled model | Preprint pp.8, 19–20 (r7 §3.1, §5.3). Framed as prior work, not as a first-pass success. |
| "The model translates and repairs; the tools validate." | FP:1092; side-by-side note 3 |
| Install: `/plugin marketplace add galaxyproject/foundry`, `/plugin install foundry-skills@galaxy-workflow-foundry`; Codex `codex plugin marketplace add` / `codex plugin add`; `agy plugin install foundry/casts/claude` | foundry `README.md` @ origin/main lines 43–61; r1 §8 |
| `/foundry-skills:pipeline-paper-to-workflow-brief`, `…:pipeline-workflow-brief-to-galaxy` | foundry origin/main `casts/claude/skills/pipeline-{paper-to-workflow-brief,workflow-brief-to-galaxy}/SKILL.md` (`name:` frontmatter); plugin name `foundry-skills` (`casts/claude/.claude-plugin/plugin.json`); the `/foundry-skills:<skill>` form is the README's |
| `npm install -g @galaxy-tool-util/cli` | GCC "Published CLI + docs" (`gcc2026.mdx:450-459`) |
| `gxwf validate … --connections` | The command on VALIDATED |

**QR codes:** vector, from segno.
- Foundry: `galaxyproject.github.io/foundry/`.
- Preprint: `doi.org/10.64898/2026.10.26.761864`.
- Install: `galaxyproject.github.io/foundry/usage/`.

All three URLs come from spike, which checked each for HTTP 200 on 2026-10-30. Printed tiles are 3.2 in, and the guard passes at ≥ 2.5 in of code. There is no lightning-talk QR.

## `[[ASK]]` slots

- **SHOW_ASK (default 0).** It adds one `gx-nova-dark` line under the "other routes" note: `[[ASK]] nf-core routes: Foundry-validated, Planemo-green`. There are no numbers. Render: `checks/show-ask-1.png`; it passes every gate.

## Open questions

1. Get started points people at the two-step brief route (`pipeline-paper-to-workflow-brief`, then `pipeline-workflow-brief-to-galaxy`). Should it point at the direct routes instead?
2. "Same name, new changeset": is the `ivar_trim` drift worth a spot, or does it read as Tool Shed criticism?
3. 0/15 is kept as a parenthetical in Rails. Keep it or drop it?
4. The wiki tally (2026-10-24) needs a re-check at print. "51 oracles" counts Mold and Pipeline `eval.md` together.
5. The PAPER lane leads, as the dossier's chosen lead. Does the Nextflow lane need its own example, now only `[[ASK]]`?
6. Shop: trim edge-to-edge, or `poster-bleed.pdf`?

## Round 5 styling (Galaxy+)

A styling pass under `../FEEDBACK_ROUND5.md`. `receipts.json` re-extracts byte-identical to the source poster's, and every content rule from rounds 3–4 still holds: Scott Cain¹ in the authors, Foundry + preprint QR codes (no lightning-talk QR), 0/15 only as small attributed context, wall time above JOBS RUN, `hl()` from `top-edge: "x-height"`, PASS only on TESTED (no ticks or colour on the 7 PINNED rows), and `[[ASK]]` as it was.

### What changed

- **Masthead.** The title slip is now a full-bleed nebula band (`gx-space`, radial `gx-glow`/`gx-info` glow from the top right, faint nova glow from the bottom left) with the star-dot tiling, two white orbit rings at 15%, and the poster's **one nova swoosh** riding the outer ring above the title. It closes on a 0.25 in gold bar that fades to nova over its last third.
  - Kicker: the white Galaxy wordmark (`assets/galaxy_logo_white.svg`, from `galaxy-hub` @ `e80ba8d78`, vector) + `WORKFLOW FOUNDRY` in spaced gold mono.
  - Title: white Atkinson Next 800 at 120 pt, −0.03 em; **receipts** in `hero-mark()` (gold→nova, boxed so the gradient spans the word).
  - Thesis: Kalam bold 48 pt in `gx-tape`, beside line 2.
  - Authors (white 700, 40 pt) and affiliations (`gx-tape`, 28 pt) sit inside the band.
- **Page.** `gx-page` with the 0.25 in grid in `gx-grid` / `gx-grid-major`. No vignette (the grid is texture enough).
- **Cards.** White, 0.25 in radius, 0.08 in `gx-shadow`, tape kept. Kickers spaced mono in `gx-nova-dark`; heads Atkinson Next 800, 76 pt. Body is Atkinson Next 31 pt (Rails 33 pt) instead of Plex Mono 28–29 pt; commands, tool names and hashes stay mono. **Rails, not reminders.** is the one featured card (gold→nova left bar).
- **Receipts.** White, square, torn zig-zag foot, 0.08 in gold→nova thermal strip, `gx-shadow` at 0.08 in, Atkinson Mono throughout, header words Mono 700. SIGNED highlight is `gx-hl`.
- **Tape.** `gx-tape` with a 1.2 pt `gx-grid-major` edge. The one hot tape (nova, `gx-nova-dark` edge) is on TESTED, the receipt with jobs on it.
- **Badges.** Filled `gx-primary` discs with white Atkinson 700 numerals (rails ②–④, CAST ①, notes, receipts).
- **Route band.** Spine `gx-primary`; open stations white with a primary ring; the gates 9 *validate* and 10 *run test* are `gx-dark` discs ringed in gold; the ×7 loop station gets a nova orbit ellipse. WORKFLOW BRIEF is a gold box with `gx-dark` text. Machine boxes are `gx-tint`, 0.08 in radius.
- **Stamp.** PASS in `gx-ok`, double border, rotated.
- **Footer.** A full-bleed `gx-deep` band behind the three footer cards (card shadows in `gx-space` there).

**Nova budget** (guide: about 5): hero gradient end; thermal strips (once); TESTED tape; Rails featured bar; loop orbit ring. In the masthead also: the swoosh, the bottom-left glow, and the bar fade. `gx-nova-dark` is used only as text/lines under 40 pt (kickers, `[[ASK]]`).

**Small layout moves** forced by the type swap (Atkinson Mono sets 5% wider than Plex Mono; receipt text can't go below 28 pt):
- PINNED 14.95 → 15.6 in wide, starting at 9.65 in (was 10.3) so notes 2/4 keep their width; CAST 8.7 → 8.95 in at 16.7 in (was 16.9).
- Masthead ends at 7.3 in; header band at 8.3 in (was 8.85), 8.35 in tall (was 8.55).
- Footer cards: Rails 14.6 → 14.2 in, codes 11.5 → 11.3 in, so the long `/plugin install …` line fits on one line in Get started. QR tiles 3.2 in, code 2.51 in (guard ≥ 2.5 in).
- The CAST/VALIDATED foot tapes sit 0.13 in lower, clear of the SIGNED line; the station-5 label sits 0.12 in lower, clear of the orbit ring; the Nextflow lane is 0.3 in shorter so its arrow clears PINNED's badge.

### Fonts and licenses

All are in `fonts/`, embedded and subset (`pdffonts`: 9 faces); Typst runs with `ignore_system_fonts=True`, and `audit.py` fails on any other face.

| Face | Use | License | Source |
| - | - | - | - |
| Atkinson Hyperlegible Next Regular / Bold / ExtraBold | title (800), card heads, chips, stamp, body, authors | SIL OFL 1.1, no Reserved Font Name (`fonts/OFL-AtkinsonHyperlegibleNext.txt`) | static TTFs from `googlefonts/atkinson-hyperlegible-next` @ `7925f50` (`fonts/ttf/`), the commit Google Fonts ships |
| Atkinson Hyperlegible Mono Regular / SemiBold / Bold | receipts, kickers, commands, spine labels, placeholder | SIL OFL 1.1 (`fonts/OFL-AtkinsonHyperlegibleMono.txt`) | static TTFs from `googlefonts/atkinson-hyperlegible-next-mono` @ `154d503` |
| IBM Plex Mono Regular | the `№` glyph only (no Atkinson face has it), as the guide's mono fallback | SIL OFL 1.1 | carried over from the source poster |
| Kalam Regular / Bold | pen notes, thesis, tally, spine labels | SIL OFL 1.1 | carried over from the source poster |

Dropped: Archivo Black and the unused Plex Mono faces. No Atkinson face has `→`, so the machine-diagram arrows are now vector.

### Departures from the guide

1. **Spine stays straight and 0.15 in thick**, not a 4 pt orbit arc: the receipts hang from stations by vertical leaders, so arcs would change the layout concept, and 4 pt reads as a hairline at 6 ft. The lanes already join the brief as curves.
2. **No separate `gx-orbit` ring on light ground.** The nova loop orbit is the body's one orbit shape. A ring in `#aecce7` would be the same colour as the grid's major lines, and the middle band is already the busiest region.
3. **Cards lost their torn feet** (rounded per the guide); torn feet and thermal strips are now receipt-only, which keeps "the box explains, the receipt proves".
4. **Footer references stay in the codes card**, in `gx-grey` on white, not white on the band: there is no room below the cards inside the 1 in safe zone.
5. **Title-slip tapes dropped**: the masthead is a band, not a slip.
6. **Added masthead kicker** (`WORKFLOW FOUNDRY` after the Galaxy wordmark) is word-count-exempt like the title. Card 1 keeps its own `GALAXY WORKFLOW FOUNDRY` kicker.
7. **Affiliations at 28 pt**, not 24 pt, as in the source.
8. **Nextflow lane and "other routes" note in `gx-grey`** (the source's `pen-soft` isn't a Galaxy token); the lane stays dashed for greyscale.
9. **Receipt dot leaders in `gx-grid-major`**, not `gx-rule`: `#dee2e6` dots were near-invisible on white.
10. **Note leader arrows stay 5.5 pt**, not the base guide's 2.5 pt, for 6 ft reading.
11. **PASS at 54 pt** (was 58) to fit the double border inside its row.

### Word count

**849 body words with SHOW_ASK=0 and 855 with SHOW_ASK=1**, against the source's 847 / 853 (+0.2%). The +2 is tokenisation, checked by diffing the two count renders: "type-checked" now breaks across a line twice (thesis and card 1), so it counts as "type-" + "checked". No copy changed.

### Checks

- Build guards all pass (card overflow, collisions, safe zone, QR ≥ 2.5 in, fonts, sizes ≥ 24 / ≥ 28 pt). New guards: the masthead kicker stays ≥ 1 in from the trim; title line 1 stays in the safe zone; authors clear the gold bar; header-card tapes clear the masthead.
- `pdfimages`: no raster images. The logo, the QR codes, the gradients and the star tiling are vector.
- Greyscale (`checks/preview-gray.png`): the masthead and footer bands frame the page; "receipts" goes light grey against the white title but keeps its size and weight; receipts separate from cards by the torn foot and the strip; PASS keeps its word and double border; the highlights fade to pale grey, as in the source.
- QR codes: `#1d1d1b` on white, with the 4-module quiet zone on the white card.
- Same text: a token diff of the full `poster.pdf` against the source's shows only the added `WORKFLOW FOUNDRY` kicker and line-break splits ("type-|checked", "dengueseq-|denv3-galaxy", "…|05c99cba").
- 6 ft: read off `checks/thumb-200.png` and `preview.png` (masthead, card heads, receipt headers and the spine read; below the masthead the only warm accents are the kickers, thermal strips, hot tape, Rails bar and loop ring). 3 ft: 80–90 ppi crops of the masthead, spine and footer (receipt rows, pen notes and commands legible; nothing clipped).
- The original `../receipts-trad-header-footer/` is untouched.

### Rebuild

```sh
./build.sh   # caches and temp renders in /private/tmp/claude-503/receipts-trad-header-footer-galaxyplus-deps/
```

### Open questions (round 5)

1. Dark `gx-deep` footer band behind the footer cards: does it frame the page well, or is it too heavy against "calm below the masthead"?
2. Is the hot nova tape on TESTED the right receipt, or should VALIDATED carry it?
3. Card 1's `GALAXY WORKFLOW FOUNDRY` kicker now echoes the masthead kicker. Rename it or keep it?
4. Atkinson's slashed zero shows in body figures ("0 of 15", "0.3–1.3%"). Fine, or switch to a plain-zero face?
5. Gold `#ffd700` and the nebula gradients need a printer proof.

## Round 6

- Dropped the results-QR placeholder tile, its caption, its layout variables and guards, and the `placeholder()` helper (FEEDBACK_ROUND6).
- Pen thesis widened into the freed top-right space; title guard now checks the safe zone.
