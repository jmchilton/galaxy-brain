# receipts-trad-columns-galaxy

`receipts-trad-columns` restyled in the round-5 **Galaxy style** (`../STYLE_GALAXY.md`, `../FEEDBACK_ROUND5.md`). Content, layout concept, receipts and tape are the original's; only tokens, fonts and surface treatments change. See **Round 5 styling (Galaxy)** at the end. The rest of this README is the original's, with paths, fonts and checks updated.

The traditional-poster variant of `receipts-spike`, built under `../FEEDBACK_ROUND4.md` and `../FEEDBACK_ROUND3.md` (round 4 lifts the 400-word cap). It keeps the visual language: graph paper, thermal slips with torn feet, tape, Kalam pen notes, the highlighter and the stamp. The header is now a Hub masthead band carrying the logo kicker, the title and the pen thesis, with the author block under its gold bar.

## The idea

A classic academic grid of **4 columns**, read top to bottom and left to right. Taped cards carry the story in conventional boxes. The four receipts from spike are taped figures inside that flow, numbered and captioned ("Figure 2 · PINNED. …"). The route diagram names each figure at the station that printed it, so the receipts read as evidence for the boxes.

| Column | Boxes (top to bottom) | Figures |
| - | - | - |
| 1 | **① What it does**: lead sentence, the knowledge-problem paragraph, "native" defined, then the machine (knowledge base ⊃ Mold → cast → skill + provenance → Galaxy workflow, checked by gxwf, run by Planemo) under the pen head *Skills are binaries.*; **What's inside**: corpus tally; references | Fig. 1 CAST |
| 2–4, top | **② How it works**: the route diagram (spans 3 columns). Paper and Nextflow planning lanes → a person-reviewed workflow brief → the shared 11-phase spine, with gates filled: 5 draft loop (`gxwf draft-validate`), 9 validate (`gxwf validate`), 10 run the test (`planemo test`) | marks Fig. 1–4 at stations 5, 9, 10 |
| 2 | **③ Inside the loop** (*Pinned, not named.*); *Gaps are written down.* (the run's ledger) | Fig. 2 PINNED |
| 3 | **④ Checked, then run** (*Typed, not guessed.*); *The last check is a real run.* | Fig. 3 VALIDATED, Fig. 4 TESTED (PASS stamp) |
| 4 | **⑤ Rails, not reminders.** (Orbit); **⑥ Get started** (install lines, gxwf, which skills to run; Foundry and preprint QR) | — |

Why it reads differently from a three-column receipts-and-boxes mix: every column opens with a text box, the only full-width-ish object is a diagram, and the receipts are column-width figures with captions, not the layout's main objects.

**Why 4 columns, not 3.** Four 9.9 in columns fit the 38-character receipt lines at 28 pt without wrapping (guarded), give the route diagram a 3-column span wide enough for one straight 11-station spine in two rows, and keep the "what → how → evidence → use" order one column per step.

**Dropped from spike, per round 4:** the spike, the punched holes, the "jobs needed" column and the three `JOBS RUN … 0 none needed` rows. JOBS RUN stays only on TESTED, after wall time.

## Rebuild

```sh
./build.sh
```

1. `extract.py` (from spike, pinned to foundry `eb2de3f1`) writes `receipts.json` from the run directory, the foundry clone and `data/`.
2. `extract_route.py` writes `route.json`: the lanes and spine from the foundry pipeline notes at `eb2de3f1`, plus the run's phase numbers, loop iterations and ledger counts. It asserts the run's 11 phases match the pipeline note one by one, and that the ledger example is still open and `kind: dropped`.
   - With no run dir or foundry clone, the committed JSON files are used.
3. `make_qr.py` (segno) writes vector QR SVGs and `assets/qr.json`.
4. `render.py` runs Typst 0.15.0 via `uvx --from typst==0.15.0 python`, vendored fonts only. It writes `poster.pdf` (44 in), `poster-bleed.pdf` (44.25 in), `preview.png` (1496 px) and the word-count PDF.
5. `audit.py` runs the font, size and word gates.
6. `pdftoppm` writes `checks/preview-25.png` (1056 px), `checks/preview-gray.png` and `checks/thumb-200.png`.
7. The build fails on any symlink or `node_modules` in this directory. There are none.

Caches and temp files go to `/private/tmp/claude-503/receipts-trad-columns-galaxy-deps/` (`POSTER_DEPS`, `POSTER_TMP`, and `UV_CACHE_DIR` defaults). `POSTER_DEBUG=1 uvx --from typst==0.15.0 python render.py` writes a debug PNG there, showing each column's slack and any guard as red text instead of failing.

**To edit copy:** the header strings are at the top of `poster.typ`. Each box is a `card-*` definition, each figure a `fig-*`, and the column lists are at the bottom (`#column(...)`).

### Build guards (all fail the build)

| Guard | Where |
| - | - |
| A column runs past the 1 in safe zone; the route card exceeds its 9.95 in slot | `poster.typ` (`column`, route card) |
| A receipt row's label + value + minimum dot leader exceeds the slip's inner width | `poster.typ` (`row`, `jobs`) |
| A line that must not wrap does: receipt sub-heads, pin rows, the gxwf command, lane text, every Get-started command | `poster.typ` (`one-line`) |
| A station label is wider than its station pitch; the spine isn't 11 phases; the loop phase differs from the run | `poster.typ` (route diagram) |
| QR code (quiet zone excluded) < 2.5 in; the tile's corner radius would cut into the quiet zone | `poster.typ` (`qr-tile`) |
| Text < 24 pt; non-vendored or unembedded font | `audit.py`, poster and bleed PDFs |
| Body text < 28 pt; body > 1000 words (warns < 700) | `audit.py --count` |
| Spike's data asserts (pins agree with workflow, pin files, tool-revisions output and install log, etc.); route/run phase mismatch; ledger example changed | `extract.py`, `extract_route.py` |

**Seen to fire during development:** "column 1 overflows by 37.22pt" and "by 5.96pt", "column 3 overflows by 7.2pt" (real builds); "gxwf command too wide by 31.2pt" and "receipt sub-head too wide by 14.4pt" (debug); "receipt sub-head too wide by 55.2pt" (a throwaway copy with a 1.6 in slip inset); the word gate (a throwaway `audit.py` with the limit at 100).

**Also checked (Galaxy build):** `pdffonts`: 10 faces, all embedded and subset. `pdfimages`: no raster images. Bleed: `poster-bleed.pdf` cropped by 0.125 in differs from `poster.pdf` by 0 px (difference > 24 levels) at 40 ppi, masthead gradient included. Every colour is opaque except the masthead's 3% white grid (as the guide asks) and the Galaxy logo's own fading gold swoosh. Greyscale (`checks/preview-gray.png`): highlights go very pale, gates stay dark with a light ring, the gold brief box goes mid-grey against near-white lanes, the green PASS stamp reads as a double-bordered word. QR: both codes decode with OpenCV from a 60 ppi render, in colour and greyscale (`galaxyproject.github.io/foundry/`, `doi.org/10.64898/2026.10.26.761864`). 30-second read at 25% (`checks/preview-25.png`): the title, ①'s lead sentence, the route diagram and ⑥'s commands all read. Receipts as evidence: Fig. 1–4 are marked on the route at stations 5, 9 and 10, and each box's text cites its figure. Offline rebuild: `RUN_DIR=/nonexistent ./build.sh` uses the committed JSON and passes every gate.

## Fonts

All SIL OFL 1.1 and embedded; Typst runs with `ignore_system_fonts=True`. Licence texts are in `fonts/OFL-*.txt`.
- **Atkinson Hyperlegible** (Regular, Bold, Italic, BoldItalic; Braille Institute): title, box heads, lane heads, stamp (Bold, tracking −0.02em), box prose, captions, diagram labels, badges, authors, references. Galaxy's UI font and the Hub's only font. From `google/fonts` `ofl/atkinsonhyperlegible/`.
- **Atkinson Hyperlegible Mono** (Regular, SemiBold, Bold): receipts, commands, mbox tags. Static TTFs from `googlefonts/atkinson-hyperlegible-next-mono` @ `154d503` `fonts/ttf/` (Google Fonts ships only the variable font).
- **Kalam** (Regular, Bold): pen notes, figure marks, tally, the thesis.
- **IBM Plex Mono Regular, IBM Plex Sans Regular**: fallback only, for `№` (receipt heads) and `→` (lane text), which Atkinson and Kalam lack.
- Archivo Black and the other Plex weights are removed.

## Body word count

**925 body words** (target 700–1000), counted the keeper way: every alphanumeric token in the count render, including every receipt line, hash and command and the thesis. Exempt and hidden in the count render: the title, the authors and affiliations, the references block and the QR captions.

## Sources for every fact

Run: `~/projects/foundry-runs/dengueseq-denv3/dengueseq-denv3-galaxy` at HEAD `6737777` (**RUN**). Foundry: `~/projects/repositories/foundry` @ `eb2de3f1` (origin/main, 2026-10-30). Receipt facts are spike's and keep spike's sources (`../receipts-spike/README.md`, "Sources for every fact"); they are summarised in the first rows.

| On the poster | Source |
| - | - |
| Fig. 1 CAST: `discover-shed-tool`, MOLD rev 5 · `05c99cba`, cast 09-13, 5 refs · 1 upfront · 4 on demand, SIGNED `foundry-build cast`, no model in the build | spike README rows 1–3 (`_provenance.json`, `foundry-feedback.ledger.yml`, `cast-mold.ts`) |
| Fig. 2 PINNED: 7 owner/tool, version, changeset; 22:51–23:39; SIGNED `gxwf tool-revisions`; "Planemo later installed exactly these" | spike README (workflow, pin files, `_logs/galaxy.jsonl`, `planemo.log`), asserted in `extract.py` |
| Fig. 3 VALIDATED: command; 7 ok · 0 fail · 0 skip; 12 ok · 0 invalid; all 7 steps over list; wall time < 1 s; 10-21 00:00; replayed gxwf 1.15.0 2026-10-30 | `data/validate.json`, `data/timing.txt`, RUN `foundry-run.yml` phase 9 (spike README) |
| Fig. 4 TESTED: success; tests 1 · failures 0 · errors 0; 7 repos; 6 containers; 11 min; JOBS RUN 7 ok · 0 failed; planemo 0.75.47; 10-21 00:33 | RUN `tool_test_output.json`, `planemo.log`, `_logs/galaxy.jsonl` (spike README) |
| Fig. 4 caption: one larger test case (about 178 MB of reads) not run | RUN `workflow-test-result.json` `tests_not_run` ("optional secondary (~178 MB reads)") |
| "disposable Galaxy" | RUN `workflow-test-result.json` `galaxy.mode` ("planemo-managed … disposable instance") |
| Route lanes: paper and Nextflow, each "summarize → write a brief" | foundry `content/pipelines/{paper,nextflow}-to-workflow-brief/index.md` `phases` (`summarize-paper`/`summarize-nextflow` → `*-to-workflow-brief`), via `extract_route.py` |
| "a person reviews it before any build" | `content/pipelines/workflow-brief-to-galaxy/index.md` `harness_notes` ("record expert review of the supplied brief … Missing review … stops the run") |
| Spine: 11 phases; short labels | same note's `phases`; RUN `foundry-run.yml` (asserted equal). Labels: interface, data flow, compare to IWC, template, draft loop (`advance-galaxy-draft-step`, `loop: true`), find test data (branch `test-data-resolution`), test plan, write the test (`implement-galaxy-workflow-test`), validate, run the test, debug |
| Gates: draft loop → `gxwf draft-validate`; 9 → `gxwf validate`; 10 → `planemo test`; Fig. 1/2 at 5, Fig. 3 at 9, Fig. 4 at 10 | `content/molds/advance-galaxy-draft-step/index.md` (draft-validate); RUN `foundry-run.yml` (phase of each artifact; pins are phase-5 artifacts) |
| "A route is a chain of Molds, each cast into a skill" | `../../research/r1-foundry-system.md` §2 (phases are Molds; every Mold has a cast) |
| Inside the loop: `gxwf draft-next-step` picks the next step; discover-shed-tool pins to a changeset; the agent fills the step; `gxwf draft-validate` checks it | `advance-galaxy-draft-step/index.md` @ `eb2de3f1` (`loop_endstate`, refs to `draft-next-step`, `discover-shed-tool`, `implement-galaxy-tool-step`, `draft-validate`); r1 line 100 and §4.1 |
| "The DengueSeq run took 7 passes" | RUN `foundry-run.yml` phase 5 `iterations: 7` |
| Ledger: 14 of 19 resolved, 5 open; the filtered variant table "not reproduced", a cut the reviewed brief chose | RUN `open-requirements.ledger.yml` (`entries[].status`); entry `filtered-variant-frequency-table-not-carried`: `kind: dropped`, `unmet: "…not reproduced…"`, `note: "Deliberate cut per reviewed brief."` |
| Typed, not guessed: every parameter and connection, collection map-over, against real schemas; no job queued; tight repair loop | `data/validate.json` (tool state + connection report); `gcc2026.mdx` "Tool state, validated", "Connections, validated" |
| What it does: knowledge problem, changes faster than training data, wiki people read, compiles into skills, programs decide, "what it can't resolve, it writes down" | `../../DESIGN_DOSSIER.md` §2 one-breath; [3] for the wiki |
| "Native": Galaxy's own Tool Shed tools, pinned, Galaxy collections | dossier §3.9 |
| Machine boxes; "cast: no model, same bytes"; "a hash for every source used"; "Wrong skill? Fix the note, cast again." | `foundry-pattern.mdx` slides 6–11 and `public/slides/foundry-pattern/foundry-machine.svg` ("deterministic · same bytes, every time"); `cast-mold.ts` ("no LLM phase … byte-stable"); `_provenance.json` `refs[].src_hash/dst_hash`; slide 9 ("Fix the Mold and/or its references and cast again") |
| KB contents "notes, schemas, command manuals and patterns" | `gcc2026.mdx` "Make the knowledge base executable" |
| What's inside: 420 notes · 56 Molds · 54 patterns · 69 skills (main, 2026-10-24) | dossier §4 "Corpus figures" (= r1 §1.1 @ `bc79096`). No pipeline count printed |
| "One note can feed many skills: fix it once, recast, and they all get the fix" | dossier §4 (PR #701: one knowledge note fixed, 8 skills regenerated); r1 §5.3 (`0457a1ba`) |
| Rails: "skills are guidance, not enforcement"; connection check caught bad `tximport` wiring before it ran; Orbit's evidence gate refuses by default | Baker et al. 2026 p.16; p.4, pp.15–16, Fig S3A; pp.17–18 (post-v0.8.0), via `../../research/r7-biorxiv-preprint.md` |
| "Its compilation pipeline is described in [1]; here we show its knowledge base, provenance and checks" | r7 §4 recommended line |
| 60-step workflow compiled from an RNA-seq paper's methods text; comparison with the authors' data found an omitted model choice | preprint p.8, p.19, Fig S4A (Hokken); r7 §3.1, §6.4. Worded so it doesn't imply the pooled model was right first pass |
| Install lines (Claude Code), "Codex and Antigravity: same skills" | foundry `README.md` @ `eb2de3f1` lines 43–61; r1 lines 333–335 |
| `npm install -g @galaxy-tool-util/cli` | `gcc2026.mdx` "Published CLI + docs" |
| `/foundry-skills:` + `pipeline-paper-to-workflow-brief`, `pipeline-workflow-brief-to-galaxy` | `git ls-tree eb2de3f1 casts/claude/skills/` ; invocation form `/foundry-skills:<skill>` from the README |
| Quote "A validated workflow that nobody has run …" | `QA:466` (`foundry-qa.mdx`), as in spike |
| Thesis | `receipts-side-by-side` (verbatim) |

**QR codes:** vector (segno), 4.4 in tiles (3.45 in of code), both HTTP 200 on 2026-10-30 per spike: the Foundry `galaxyproject.github.io/foundry/` and the preprint `doi.org/10.64898/2026.10.26.761864`. No lightning-talk QR. The optional `/usage/` QR is dropped: only two tiles fit a 9.9 in column above the 2.5 in gate.

**Not on the poster:** any VERIFY line or claim that the pins pass `discover-shed-tool`'s schema gate (5 of 7 do; spike `data/verify-pins.txt`); Orbit 0/15; any pipeline count; any results on the Nextflow lane (bacass is not named); Anton's nf-core work.

## `[[ASK]]` slots

- **None for nf-core.** The brief allows omitting it, and there is no free column space that wouldn't crowd a box, so there is no `SHOW_ASK` flag.

## Open questions

1. ~~IBM Plex Sans for box prose~~: superseded in the Galaxy build by Atkinson Hyperlegible.
2. Orbit 0/15 is left out entirely. Want it back as a small attributed clause in ⑤?
3. Corpus tally is dated 2026-10-24 (dossier). Re-count at `eb2de3f1` before print?
4. The ledger box prints "5 open". Honest-output framing, or does it read as failure?
5. Get started shows Claude Code lines only; Codex and Antigravity point to the site. Enough?
6. Print shop: trim edge-to-edge, or `poster-bleed.pdf`?

## Round 5 styling (Galaxy)

A styling pass on `../receipts-trad-columns/` (left untouched for side-by-side comparison) under `../STYLE_GALAXY.md`. Same text, facts, receipts, QR codes, four-column layout and density.

### What changed

- **Tokens:** the guide's Typst token block, verbatim: `gx-page` background with the 0.25 in `gx-grid`/`gx-grid-major` grid, white slips and cards, `gx-dark` ink, `gx-primary` pen, `gx-hl` highlighter (`hl()` still starts at `top-edge: "x-height"`), `gx-tape` tape.
- **Masthead:** the title slip became a full-bleed band, `gx-dark` → `gx-primary` gradient (Typst `angle: 45deg`; sampled TL `#2c3144`, BR `#25537a`, darkest top-left and bluest bottom-right as CSS 135° should be; on a 44 × 6 in box it reads mostly left-to-right), a 0.5 in grid of 1 pt 3% white lines, a 0.25 in gold bar at its foot. White title in Atkinson Bold 120 pt (tracking −0.02em), "receipts" in gold, no highlight, a 0.2 in gold accent bar before it. The white Galaxy wordmark (`assets/galaxy_logo_white.svg`, copied from `galaxy-hub/content/images/`, vector, not recoloured) appears once, in the kicker row above the title (round 6).
- **Authors:** `gx-dark` Atkinson Bold 40 pt, affiliations `gx-grey` 28 pt, on the page directly under the gold bar (the single author line doesn't fit beside the title).
- **Cards:** white, 0.25 in radius, 1 pt `gx-rule` outline, 0.08 in `gx-shadow` offset. ①, ② and ⑥ are featured with a 0.12 in gold left bar. Titles `gx-dark` Atkinson Bold. Section badges are `gx-primary` discs with white Atkinson Bold numerals (they were Kalam rings).
- **Receipts:** square and torn as before. White fill, `gx-dark` ink, header word in Atkinson Mono Bold, a 0.06 in `gx-primary` printer strip along the top edge, `gx-shadow` shadow.
- **Tape:** same strips, angles and placement, now `gx-tape` with a 1.2 pt `gx-grid-major` edge and saw-tooth ends.
- **Stamp:** PASS is `gx-ok` green with a double border (outer 5 pt, inner 2.5 pt), same rotation and size.
- **Route diagram:** spine and arrows `gx-primary` 4 pt. Open stations white with a `gx-primary` ring. Gates (5, 9, 10) `gx-dark` with a gold ring. Lanes, machine boxes and the output box are `gx-tint` with 0.08 in radius and a 2.5 pt `gx-primary` edge. The workflow brief is `gx-gold` with `gx-dark` text. The loop station has a 0.25 in radius.
- **QR codes:** black modules (`make_qr.py` now writes `#000000`), on a white tile with a 0.25 in radius and a 1.5 pt `gx-grid-major` edge. The 4-module quiet zone is untouched (guarded: the radius trims only the corners of the 0.48 in quiet zone).
- **References:** set in white Atkinson 24 pt on a `gx-deep` rounded panel at the foot of column 1. A text-free `gx-deep` footer strip (0.5 in plus bleed, with a 0.1 in `gx-primary` line) bookends the masthead.
- **Build:** `audit.py`'s font allow-list is now the Atkinson and Kalam faces plus the two Plex fallbacks. Caches are in `/private/tmp/claude-503/receipts-trad-columns-galaxy-deps/`. All guards pass. Column slack: 0.81 / 1.63 / 0.59 / 1.46 in.

### Fonts and licences

Atkinson Hyperlegible (OFL 1.1, Braille Institute), Atkinson Hyperlegible Mono (OFL 1.1, the Atkinson Hyperlegible Mono Project Authors), Kalam (OFL 1.1, Indian Type Foundry), plus IBM Plex Mono Regular and IBM Plex Sans Regular (OFL 1.1, IBM) as glyph fallback. All are embedded and subset. Licence texts are in `fonts/OFL-AtkinsonHyperlegible.txt`, `OFL-AtkinsonHyperlegibleMono.txt`, `OFL-Kalam.txt` and `OFL-IBMPlexSans.txt` (which covers the Plex family).

### Departures from the guide

1. **Footer band → references panel.** The guide puts the references in white on a full-bleed `gx-deep` footer band. There is no room: columns 3 and 4 had only about 0.6 in of slack, and lifting the references out of column 1 would leave a hole of about 4 in there. So the references stay in column 1 on a `gx-deep` rounded panel, white 24 pt, and the full-bleed footer strip carries no text.
2. **Atkinson Mono tracked −0.025em** in receipts, commands and gate labels. It is about 5% wider than Plex Mono, and without the tracking the 38-character receipt lines and `foundry-skills@galaxy-workflow-foundry` break the no-wrap guards. Get started's card inset also went from 0.5 to 0.42 in for that command.
3. **Dot leaders and receipt dividers in `gx-grid-major`, not `gx-rule`.** `#dee2e6` on white is about 1.3:1 and the leaders vanish at reading distance.
4. **Figure marks ("Fig. 3", "Fig. 4") in `gx-info` Kalam.** They were stamp red, and red is now reserved for FAIL/REFUSED.
5. **Masthead gold count is four** (accent bar, "receipts", thesis, bottom bar), against the guide's "about 3 per region". The thesis uses the guide's sanctioned Kalam-gold option to keep the pen voice; white Atkinson 40 pt is a one-line swap.
6. **No tape on the masthead.** The title slip's two corner tapes went with the slip, because a full-bleed band can't be taped. Every card and receipt keeps its tape.
7. **Plex fallback faces** for `№` and `→` (see Fonts).
8. **No icons**, because the source has none. Title weight is Bold (Atkinson has no Black).

### Word count

**925 body words**, the same as the source (0% change), counted by `audit.py --count` the same way.

### Open questions

1. Thesis: Kalam gold (now) or white Atkinson 40 pt, to keep the masthead at 3 gold elements?
2. Is the references panel plus text-free footer strip OK, or is a true references footer band worth a reflow?
3. `#ffd700` sits at the CMYK gamut edge. Ask the printer for a proof of the gold bar, the hero word and the brief box?
4. `№` is drawn from Plex Mono inside Atkinson Mono receipt heads. Keep it, or write "No."? That would be a text change.
5. Is the masthead's 3% grid worth keeping? It is nearly invisible in print.

## Round 6

- Dropped the results-QR placeholder tile, its caption, layout variable and `put` guard; the pen thesis widens from 19 in to 23.5 in into the freed space.
- Added the header kicker above the title: white Galaxy logo (0.62 in) + gold, tracked, mono **WORKFLOW FOUNDRY** at 36 pt. The top-right wordmark is gone, so the logo appears once.
- Title moved from 1.05 in to 1.95 in (thesis follows); new guards: kicker in safe zone, kicker vs title. Band height unchanged.
- Build temp/cache now under `/private/tmp/claude-503/r6-deps/`.

## Round 7

- Dropped the "Why pin?" Tool Shed drift aside, its guard and `data/tool-revisions/iuc~ivar_trim~ivar_trim.json`; column 2 now spreads its three items to the shared bottom line.
- TESTED pen note retitled "The last check is a real run.": gxwf checks structure, Planemo runs the test in a real Galaxy, and that run is the validation. Fig. 4 caption: "Planemo's report of that run."
- Get started is now a wide card spanning columns 3–4 at the bottom: head + Foundry/Preprint QRs (3.3 in) left; bold Claude Code / Codex / gxwf / From a paper labels with every command on one line (24 pt mono, exempt from the 28 pt body count) right, including the explicit Codex commands.
- Fig. 4 TESTED moved to the top of column 4 (above Rails); column 3 ends with "The last check is a real run." Columns 1–4 spread to one shared bottom line (`bot`); columns 3–4 stop 2×gapv above the Get started card (tape clearance). New guards: per-column bottom, and item gap ≥ gapv.
- Build temp/cache now under `/private/tmp/claude-503/r7-deps/`.
