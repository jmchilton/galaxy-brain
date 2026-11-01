# receipts-trad-columns-galaxyplus

## Round 6

- Dropped the header QR placeholder tile, its caption and its layout variable (FEEDBACK_ROUND6).
- Thesis widened 17.6 → 21.3 in into the freed space. Body words 925 → 923. Nothing else changed.
- Header kicker: single white Galaxy logo + gold mono WORKFLOW FOUNDRY row above title (title 1.45 → 1.6 in, guard vs title); top-right logo removed, thesis widened 21.3 → 22.3 in.

Round 5 **Galaxy+** restyle of `../receipts-trad-columns/` (left untouched for side-by-side comparison), per `../FEEDBACK_ROUND5.md` and `../STYLE_GALAXYPLUS.md` (on top of `../STYLE_GALAXY.md`). Same text, facts, receipts, QR codes, layout and density; only styling changed. Everything below "Round 5 styling" describes the source design and still holds unless that section says otherwise.

## Round 5 styling (Galaxy+)

**What changed**
- **Palette:** Claude-style tokens replaced by the guide's Galaxy+ token block (`gx-page` ground with the 0.25 in grid in `gx-grid`/`gx-grid-major`, white slips and cards, `gx-dark` ink, `gx-primary` pen, gold, nova). All fills opaque except the masthead stars and orbit rings.
- **Masthead:** the taped title slip became a full-bleed nebula band (`gx-space`, opaque radial `gx-glow` from the top right, faint nova glow bottom left, star-dot tiling, 2 white orbit rings at 15%), closed by a 0.25 in gold→nova bar. Mono kicker "GALAXY WORKFLOW FOUNDRY" in gold, title white Atkinson 800 at −0.03em, "receipts" in the gold→nova `hero-mark()` (no highlight), pen thesis Kalam in `gx-tape`, authors white 700 and affiliations `gx-tape` inside the band, white Galaxy logo (from `galaxy-hub/content/images/galaxy_logo_white.svg`) once, top right.
- **The one swoosh:** a 6 pt nova stretch of the inner orbit ring, sweeping under the thesis.
- **Cards:** white, 0.25 in radius, `gx-shadow` offset 0.08 in, no outline; heads Atkinson 700 in `gx-dark`; badges are filled `gx-primary` discs with white numerals. Featured: only ⑤ *Rails, not reminders.*, with a nova badge and a 0.12 in gold→nova left bar.
- **Receipts:** white, square, torn foot, 0.08 in gold→nova thermal strip on top, Atkinson Mono heads and rows, leaders in `gx-grid-major`, `gx-shadow` 0.08 in. SIGNED highlight is `gx-hl`.
- **Tape:** `gx-tape` with 1.2 pt `gx-grid-major` edge; one nova strip (`gx-nova-dark` edge) on Fig. 4 TESTED, the hero receipt.
- **Stamp:** PASS in `gx-ok`, double border, rotated, no fill.
- **Route diagram:** spine `gx-primary` 4 pt; open stations white with primary ring; gates `gx-dark` discs ringed in gold; lanes and the output box `gx-tint` with 0.08 in radius; Workflow brief box gold with `gx-dark` text; loop station gets a 2.5 pt nova orbit ellipse; the loop-to-row-B return line has rounded orbit-style corners instead of elbows; "Fig. n" marks moved from red to pen (red reads as FAIL in Galaxy).
- **Machine diagram:** `gx-tint` boxes, 2.5 pt primary edges, primary mono tags.
- **QR:** black modules on white tiles with a 0.25 in radius and 2 pt `gx-rule` edge, 4-module quiet zone kept (both decode with OpenCV from a 60 ppi render).
- **Small layout moves:** ⑥ Get started card side inset 0.5 → 0.3 in and `cmd` tracking −0.012em, because Atkinson Mono is 5% wider than Plex Mono (`foundry-skills@galaxy-workflow-foundry` tripped the one-line guard by 31.65 pt); 0.15 in more space above Fig. 4 so the nova tape clears the quote; "Fig. 1, 2" mark moved 0.34 in down to clear the loop ring; references switched from mono to Atkinson (still 24 pt `gx-grey`).

**Fonts** (all SIL OFL 1.1, embeddable, `fsType` 0, vendored in `fonts/` and embedded as subsets; Typst runs with `ignore_system_fonts=True`)
- Atkinson Hyperlegible Next (Regular, Italic, SemiBold, Bold, ExtraBold): title, heads, prose. Static TTFs from `googlefonts/atkinson-hyperlegible-next` @ `7925f50f`; licence `fonts/OFL-AtkinsonHyperlegibleNext.txt`.
- Atkinson Hyperlegible Mono (Regular, SemiBold, Bold): receipts, commands, kicker, box tags. From `googlefonts/atkinson-hyperlegible-next-mono` @ `154d5036`; licence `fonts/OFL-AtkinsonHyperlegibleMono.txt`.
- Kalam (Regular, Bold): pen notes, unchanged.
- IBM Plex Sans Regular and IBM Plex Mono Regular: **glyph fallback only**, last in each stack, for `→` (lane text) and `№` (receipt heads), which Atkinson lacks. Licence `fonts/OFL-IBMPlexSans.txt` (Plex is one OFL family).
- Removed: Archivo Black and the unused Plex weights. `audit.py`'s allowlist updated to the 12 faces above.

**Departures from the guide**
- **No footer band.** The references stay at the foot of column 1 in `gx-grey`; a full-width `gx-deep` footer would be a layout change.
- **Masthead tapes dropped.** The title is no longer a slip, so the two corner tapes had nothing to hold. Every card and receipt keeps its tape.
- **Nebula opaque.** The guide's snippet uses `transparentize`, but its print rule wants opaque fills, so the glows are opaque radial gradients whose outer stop is `gx-space`.
- **Nova budget:** hero end, thermal strips, one tape, the ⑤ badge + bar, the loop ring, and the swoosh. The cast arrow stays `gx-primary` (guide offers "loop ring *or* cast arrow").
- **No section kickers on cards** (spaced mono `gx-nova-dark`): they would add words and fragment nova. The one kicker is in the masthead and is word-count exempt like the title.
- **Leaders** use `gx-grid-major`, not `gx-rule`; `#dee2e6` dots vanish on white.
- **Affiliations** stay at 28 pt (guide: 24 pt), since there is room.
- **Badge orbit rings** behind section heads were tried and dropped: at badge size they read as a smudge beside the numeral.
- **Bleed:** below the masthead, the bleed PDF cropped by 0.125 in still differs from `poster.pdf` by 0 px at 40 ppi. Inside the masthead the gradients and star tiling scale with the bled band, so pixels differ by up to 26/255 (no edge or element moves).

**Checks:** build guards all pass (no overflow; column slack 1.75 / 1.57 / 0.37 / 1.37 in; col. 1 gains from the sans references, col. 4 from the unwrapped command); `audit.py`: no text < 24 pt, no body < 28 pt, 12 vendored faces, all embedded; `pdfimages`: no rasters (the logo is vector); greyscale: gates and badges stay dark, the ⑤ nova badge and nova tape go mid-grey, highlights pale, the PASS stamp keeps its double border, "receipts" goes mid-grey but keeps its 800 weight; QR contrast unchanged (near-black on white).

**Word count:** 925 body words, the same as the source (0%). The source's open question 1 (Plex Sans for prose) is superseded: prose is now Atkinson.

**Open questions**
1. Galaxy logo in the masthead: keep, or drop (the Hub's "white" SVG has grey "PROJECT" text that is low-contrast on the glow)?
2. Hero receipt for the nova tape: Fig. 4 TESTED, or Fig. 3 VALIDATED?
3. In greyscale "receipts" is dimmer than the rest of the title. Acceptable, or lighten the gradient's nova end?
4. Footer band with the references, as the guide suggests, at the cost of some column-1 space?

## Source design

The traditional-poster variant of `receipts-spike`, built under `../FEEDBACK_ROUND4.md` and `../FEEDBACK_ROUND3.md` (round 4 lifts the 400-word cap). It keeps the visual language: graph paper, thermal slips with torn feet, tape, Kalam pen notes, the highlighter and the red stamp. The header is `receipts-side-by-side`'s, unchanged: the title slip, the pen thesis, and the author block.

## The idea

A classic academic grid of **4 columns**, read top to bottom and left to right. Taped cards carry the story in conventional boxes. The four receipts from spike are taped figures inside that flow, numbered and captioned ("Figure 2 · PINNED. …"). The route diagram names each figure at the station that printed it, so the receipts read as evidence for the boxes.

| Column | Boxes (top to bottom) | Figures |
| - | - | - |
| 1 | **① What it does**: lead sentence, the knowledge-problem paragraph, "native" defined, then the machine (knowledge base ⊃ Mold → cast → skill + provenance → Galaxy workflow, checked by gxwf, run by Planemo) under the pen head *Skills are binaries.*; **What's inside**: corpus tally; references | Fig. 1 CAST |
| 2–4, top | **② How it works**: the route diagram (spans 3 columns). Paper and Nextflow planning lanes → a person-reviewed workflow brief → the shared 11-phase spine, with gates filled: 5 draft loop (`gxwf draft-validate`), 9 validate (`gxwf validate`), 10 run the test (`planemo test`) | marks Fig. 1–4 at stations 5, 9, 10 |
| 2 | **③ Inside the loop** (*Pinned, not named.*); *Why pin?* (Tool Shed drift); *Gaps are written down.* (the run's ledger) | Fig. 2 PINNED |
| 3 | **④ Checked, then run** (*Typed, not guessed.*); *Not run, not known.* (QA quote) | Fig. 3 VALIDATED, Fig. 4 TESTED (PASS stamp) |
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

Caches and temp files go to `/private/tmp/claude-503/receipts-trad-columns-galaxyplus-deps/` (`POSTER_DEPS`, `POSTER_TMP`, and `UV_CACHE_DIR` defaults). `POSTER_DEBUG=1 uvx --from typst==0.15.0 python render.py` writes a debug PNG there, showing each column's slack and any guard as red text instead of failing.

**To edit copy:** the header strings are at the top of `poster.typ`. Each box is a `card-*` definition, each figure a `fig-*`, and the column lists are at the bottom (`#column(...)`).

### Build guards (all fail the build)

| Guard | Where |
| - | - |
| A column runs past the 1 in safe zone; the route card exceeds its 9.95 in slot | `poster.typ` (`column`, route card) |
| A receipt row's label + value + minimum dot leader exceeds the slip's inner width | `poster.typ` (`row`, `jobs`) |
| A line that must not wrap does: receipt sub-heads, pin rows, the gxwf command, lane text, every Get-started command | `poster.typ` (`one-line`) |
| A station label is wider than its station pitch; the spine isn't 11 phases; the loop phase differs from the run | `poster.typ` (route diagram) |
| The drift aside is no longer true (same version, different changeset) | `poster.typ` |
| QR code (quiet zone excluded) < 2.5 in | `poster.typ` (`qr-tile`) |
| Text < 24 pt; non-vendored or unembedded font | `audit.py`, poster and bleed PDFs |
| Body text < 28 pt; body > 1000 words (warns < 700) | `audit.py --count` |
| Spike's data asserts (pins agree with workflow, pin files, tool-revisions output and install log, etc.); route/run phase mismatch; ledger example changed | `extract.py`, `extract_route.py` |

**Seen to fire during development:** "column 1 overflows by 37.22pt" and "by 5.96pt", "column 3 overflows by 7.2pt" (real builds); "gxwf command too wide by 31.2pt" and "receipt sub-head too wide by 14.4pt" (debug); "receipt sub-head too wide by 55.2pt" (a throwaway copy with a 1.6 in slip inset); the word gate (a throwaway `audit.py` with the limit at 100).

**Also checked:** `pdffonts`: 9 faces, all embedded and subset. `pdfimages`: no raster images. Bleed: `poster-bleed.pdf` cropped by 0.125 in differs from `poster.pdf` by 0 px at 40 ppi. Every colour is opaque. Greyscale (`checks/preview-gray.png`): highlights go pale grey, gates stay dark, the stamp still reads. 30-second read at 25% (`checks/preview-25.png`): the title, ①'s lead sentence, the route diagram and ⑥'s commands all read. Receipts as evidence: Fig. 1–4 are marked on the route at stations 5, 9 and 10, and each box's text cites its figure. Offline rebuild: `RUN_DIR=/nonexistent ./build.sh` uses the committed JSON and passes every gate.

## Fonts

All SIL OFL and embedded; Typst runs with `ignore_system_fonts=True`.
- Archivo Black: title, box heads, lane heads, stamp.
- IBM Plex Mono (Regular, SemiBold, Bold): receipts, commands, authors, references.
- IBM Plex Sans (Regular, Bold, Italic): **new here**, box prose, captions, diagram labels. A proportional face fits about 40% more words per line than mono at the same 30 pt, which is what makes a traditional poster's density possible at the size floors. Same superfamily as the receipts' mono. From `github.com/IBM/plex` (static TTFs); licence in `fonts/OFL-IBMPlexSans.txt`.
- Kalam (Regular, Bold): pen notes, section badges, figure marks, tally.

## Body word count

**925 body words** (target 700–1000), counted the keeper way: every alphanumeric token in the count render, including every receipt line, hash and command, and the thesis. Exempt and hidden in the count render: the title, the authors and affiliations, the references block and the QR captions.

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
| Why pin: `ivar_trim 1.4.4+galaxy1` answers `8b20bc80ebf4` on 10-30, not the `6606a8c97889` installed | `data/tool-revisions/iuc~ivar_trim~ivar_trim.json` (replayed 2026-10-30, spike `replay.sh`); pin from `receipts.json`; guarded in `poster.typ` |
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

1. IBM Plex Sans for box prose is a new face in the family. OK, or keep everything mono/Kalam?
2. Orbit 0/15 is left out entirely. Want it back as a small attributed clause in ⑤?
3. Corpus tally is dated 2026-10-24 (dossier). Re-count at `eb2de3f1` before print?
4. The ledger box prints "5 open". Honest-output framing, or does it read as failure?
5. Get started shows Claude Code lines only; Codex and Antigravity point to the site. Enough?
6. Print shop: trim edge-to-edge, or `poster-bleed.pdf`?

## Round 8

- Copy now matches receipts-trad-columns-galaxy-r7: "Why pin?" drift note, its ivar_trim Tool Shed data file and guard removed; TESTED reworded so the Planemo run is the validation; Get started is a wide card under columns 3-4 with 24 pt one-line commands, Claude Code and Codex commands, QR tiles beside them; columns spread to a shared bottom line.
- No tape: dropped `tape()`, the `tapes:` / `hot:` parameters, the nova "hot" strip on TESTED and the extra pad that cleared it. The one nova feature mark stays on card 5 (nova badge and gold-to-nova bar). `tape-col` stays as masthead text colour.
