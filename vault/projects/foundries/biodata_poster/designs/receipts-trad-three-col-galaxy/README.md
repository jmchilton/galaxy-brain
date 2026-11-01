# receipts-trad-three-col-galaxy

`receipts-trad-three-col` restyled in the **Galaxy** style (`../STYLE_GALAXY.md`) for round 5 (`../FEEDBACK_ROUND5.md`). Same text, facts, receipts, QR codes, layout and density as the source; only tokens, fonts and surfaces change. Everything below "Round 5 styling" is the source README, kept for its sources and guards. Where it names Archivo Black, IBM Plex Sans, red stops or the cream palette, this section supersedes it.

## Round 5 styling (Galaxy)

**What changed**
- **Palette:** the guide's token block verbatim (`gx-page` ground with `gx-grid`/`gx-grid-major` graph paper, white slips and cards, `gx-dark` ink, `gx-primary` pen, one gold accent). All opaque.
- **Header → Hub masthead band:** full-bleed 135° `gx-dark → gx-primary` gradient with a 0.5 in grid, 0.25 in gold bar at its foot, a gold accent bar before the title. Title white Atkinson 700 at 120 pt, tracking -0.02em; "receipts" in gold, no highlight. Thesis in Kalam bold `gx-gold`. White Galaxy wordmark (vector, `assets/galaxy_logo_white.svg` from `galaxy-hub/content/images/`) once, top right, above the `[[QR: live results]]` tile, which is now a white rounded tile with a gold-dark dashed frame and two tape strips. Authors moved onto `gx-page` under the gold bar (`gx-dark` Atkinson 700; affiliations `gx-grey`).
- **Cards:** white, 0.25 in radius, 1 pt `gx-rule` outline, 0.08 in `gx-shadow` drop. Red top rule gone. Kickers `gx-primary` Atkinson 700; heads `gx-dark` Atkinson 700, -0.02em. Featured gold left bar (0.12 in) on *What it does* and *Get started* only — the two ends of the 30-second read. Tilts and tape kept.
- **Receipts:** square, zig-zag tear kept; white fill, `gx-dark` ink, `gx-rule` leaders and dashed dividers, 0.06 in `gx-primary` "receipt printer" strip on the top edge, `gx-shadow`. Header words Atkinson Mono Bold.
- **Tape:** `gx-tape` fill, 1.2 pt `gx-grid-major` edge, saw-tooth ends; same strips, angles and placement.
- **Stamp:** PASS in `gx-ok` with a double border (6 pt + 2.5 pt) on a white ground. The drift answer `@8b20bc80ebf4` keeps `gx-danger`.
- **Pen notes:** Kalam in `gx-primary`; numbered badges are filled `gx-primary` circles with white Atkinson 700 numerals (also the Get-started steps). `hl()` fill is `gx-hl`, still `top-edge: "x-height"`.
- **Diagrams:** boxes `gx-tint`/white with 0.08 in radius and `gx-primary` strokes; gxwf and Planemo are gates (`gx-dark`, gold ring, white text); lane chips `gx-primary`; WORKFLOW BRIEF is `gx-gold` with `gx-dark` text. Metro spine `gx-primary`; open stations white with a `gx-primary` ring; the three receipt stops (5, 9, 10) are filled `gx-dark` with white numerals, and only the two checking gates (9 `gxwf validate`, 10 `planemo test`) get the gold ring, so the pin step doesn't read as a check. Fan dots `gx-info`.
- **QR codes:** pure black modules on white, 4-module quiet zone kept, corners rounded by clipping (no inset, so the preprint code is still 2.51 in vs the 2.5 in gate). Captions `gx-dark` Atkinson 700 28 pt.
- **Footer:** a flat `gx-deep` band from 0.4 in below the safe zone to the trim (decorative; see departures).
- **Copy:** one word forced by the restyle: "(red stops)" → "(dark stops)" in the route card's pen line.
- **Layout nudges:** card inset 0.6 → 0.55 in; the fan's note card 2.35 → 2.2 in and its leader gap 1.0 → 0.8 in (the longest skill name is wider in Atkinson Mono); header band and author block re-flowed as above. Column flow, widths and item order unchanged.
- **Tooling:** `audit.py` allows only the Atkinson, Kalam and Plex Mono faces, and fails if any span set in Plex Mono contains more than the fallback glyphs `№ → ✓`. `poster.typ` guards that title line 1 clears the logo. Deps dir is `/private/tmp/claude-503/receipts-trad-three-col-galaxy-deps`.

**Fonts** (all SIL OFL 1.1, embedded and subset; Typst runs with `ignore_system_fonts=True`)
- **Atkinson Hyperlegible** Regular, Bold, Italic, BoldItalic — title, card heads, prose, diagram labels, authors, references, captions. Static TTFs from `google/fonts` `ofl/atkinsonhyperlegible/`. License: `fonts/OFL-AtkinsonHyperlegible.txt`.
- **Atkinson Hyperlegible Mono** Regular, SemiBold, Bold — receipts, commands, skill names, station numbers. Google Fonts only ships the variable `AtkinsonHyperlegibleMono[wght].ttf`; the three statics were instanced at wght 400/600/700 with `fonttools varLib.instancer --update-name-table` (full glyph set). License: `fonts/OFL-AtkinsonHyperlegibleMono.txt`.
- **Kalam** Regular, Bold — pen notes, thesis. Unchanged.
- **IBM Plex Mono** Regular, Bold — glyph fallback only, because neither Atkinson face has `№` or `→`. The audit enforces that nothing else falls through. (SemiBold and Italic files are still vendored but unused.)
- Removed: Archivo Black, IBM Plex Sans.

**Departures from the guide**
1. **Mono tracking -0.03em.** Atkinson Mono is 0.632 em wide vs Plex Mono's 0.6 em; untracked, the longest pin row, the TESTED sub-line and the drift SIGNED line wrapped and column 2 overflowed by 68 pt. -0.03em restores the source pitch so every receipt keeps its line breaks. Sans and Kalam runs reset tracking to 0.
2. **Stroke weights:** pen-note arrows 3.5 pt (guide 2.5 pt) and the metro spine 6 pt (guide 4 pt; source 9 pt). At 25% the guide weights read as hairlines next to 0.31 in stations and 50 pt pen heads.
3. **Masthead grid** is pre-mixed 6% white over the gradient as an opaque gradient stroke, not `rgb(255,255,255,8)`, so there is no transparency; 6% rather than 3% so it survives print.
4. **References stay in the *Get started* card** (now Atkinson, `gx-grey`, 24 pt), not in the footer band: the band sits inside the 1 in safe zone, where no text may go. The footer band is therefore plain.
5. **Header tapes dropped:** the title slip became the band, so its two corner tapes went; the tape metaphor moves to the live-results tile.
6. **One soft mask:** the Galaxy logo's own gold bar fades to `stop-opacity:0`. Not edited (the guide forbids recoloring), so both PDFs carry exactly 1 `/SMask`. Everything else is opaque.
7. **Gold count:** masthead bar, accent bar, hero mark, thesis (Kalam gold, which the guide allows), two featured-card bars, two gate rings in *How it works*, two station rings and the WORKFLOW BRIEF fill: three per body region at most.
8. **Leaders and dividers in `gx-rule`** are faint by design; in greyscale they nearly vanish, but the rows are still separated by alignment.
9. **Logo source:** the guide cites `galaxy-hub/astro` at `ef2206269`; the local clone's `content/images/galaxy_logo_white.svg` (last changed `e80ba8d78`) was used unmodified.

**Checks**
- `./build.sh` passes every guard (columns, safe zone, `fit`, station bands, QR ≥ 2.5 in, title-vs-logo) and both audits (≥ 24 pt, ≥ 28 pt body, fonts, fallback leak) on poster, bleed and both SHOW_ASK renders.
- `pdffonts`: 9 faces, all embedded and subset. `pdfimages`: no raster images. `/SMask`: 1 (logo).
- `poster-bleed.pdf` cropped by 0.125 in differs from `poster.pdf` by 0 px at 40 ppi (the band always overhangs by 0.125 in, so its gradient is identical in both).
- `receipts.json` after `extract.py` is identical to the source's.
- All three QR codes decode (zxing-cpp) from 60 ppi colour and greyscale renders.
- No `node_modules` or symlinks.

**Word count:** `audit.py --count` reports **859 (SHOW_ASK=0) and 857 (SHOW_ASK=1)** vs the source's 932/930. The drop is extraction, not copy: the source's kickers were Plex Mono tracked 0.16em, which PyMuPDF split into 99 single-letter tokens; the new kickers extract as 27 words. `wordcheck.py` diffs the two count PDFs' tokens: besides the 99 fragments and the kicker words, the only differences are "red" → "dark", GALAXY in the route kicker splitting as `GAL`/`AXY`, and two different hyphenation breaks ("open-weight", `workflow-brief-to-galaxy`). Counted like for like, the source is ~859 too, so the change is ~0%, inside ±5%. Re-run it with `uv run --script wordcheck.py /private/tmp/claude-503/receipts-trad-three-col-deps/poster-count.pdf /private/tmp/claude-503/receipts-trad-three-col-galaxy-deps/poster-count.pdf` (the first file is the source's count render, written by the source's `build.sh`).

**Open questions**
1. Footer band: keep the plain `gx-deep` strip as a bookend, or drop it?
2. Stop 5 (pins) is dark but not gold-ringed, to keep it from reading as a check. Want all three receipt stops to match instead?
3. Mono tracking -0.03em, or keep Atkinson Mono's natural pitch and let some receipt rows shrink to 28 pt?
4. Leaders in `gx-rule` are very light at 6 ft. Darken to `gx-grid-major`?
5. The logo's gold fade adds one soft mask. Fine for the printer, or flatten to a solid bar (a logo edit)?
6. Atkinson's `0` is slashed in the mono face (hashes, versions). OK on a poster?

---

# Source README (receipts-trad-three-col)

The traditional-poster variant of `receipts-spike`, built under `../FEEDBACK_ROUND4.md` and `../FEEDBACK_ROUND3.md`. It keeps the round-3 visual language: graph paper, thermal slips with torn edges, tape, a red stamp, Kalam pen notes, the highlighter, Archivo Black and IBM Plex Mono. The title and header come from `receipts-side-by-side`, and the four receipts come from `receipts-spike`.

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
- **`replay.sh`** (unchanged from receipts-spike, optional) refreshes `data/` with `@galaxy-tool-util/cli@1.15.0`. It writes npm and its caches to `/private/tmp/claude-503/receipts-trad-three-col-deps`.
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
- `pdffonts`: 8 faces, all embedded and subset.
- `pdfimages`: no raster images.
- Transparency: no `/SMask` objects.
- Bleed: `poster-bleed.pdf` cropped by 0.125 in differs from `poster.pdf` by 0 px at 40 ppi.
- The directory has no `node_modules` and no symlinks (`build.sh` checks this).

## Fonts

All SIL OFL and embedded. Typst runs with `ignore_system_fonts=True`.
- **Archivo Black**: title, card heads, stamp. Copied from receipts-spike.
- **IBM Plex Mono** (Regular, SemiBold, Bold): receipts, commands, diagram labels, authors, references. Copied from receipts-spike.
- **Kalam** (Regular, Bold): pen notes, thesis, diagram annotations. Copied from receipts-spike.
- **IBM Plex Sans** (Regular, Bold): card prose and diagram boxes. **New in this variant.** These are static TTFs from fontsource (`cdn.jsdelivr.net/fontsource/fonts/ibm-plex-sans@latest/latin-{400,700}-normal.ttf`); the google/fonts repo only ships the variable font. It is the latin subset, which has no `→`. Every arrow is set in Plex Mono or drawn, and the audit catches any fallback.

## Body word count

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
2. **Card prose is set in IBM Plex Sans,** not mono. Mono at the 28 pt floor fits fewer words per line, and a separate face lets the eye separate *explanation* (cards) from *evidence* (receipts) and *commentary* (pen).
3. **The VALIDATED `map-over` row was dropped** for height. It is still in `receipts.json`.
4. **The cards are unnumbered** (kicker labels only). Numbers are reserved for the receipts and their pen notes, so "№3" and ③ mean one thing.
5. **The knowledge-base counts sit inside the machine's boxes,** not in a separate stats row. There is one dated set (`bc79096`, 2026-10-24), as the advice suggests.
6. **No pipeline count is printed** (7 at abstract time vs. 13 on `main`; R1 question 1).

## Open questions

1. Keep Orbit's 0/15 as an in-sentence aside, or drop it?
2. The header is as-is, so "Galaxy Workflow Foundry" first appears in the *What it does* body. Add a small kicker to the title slip?
3. Is Plex Sans for card prose OK, or keep strictly to the three keeper faces?
4. Step 3 uses bare skill names. The Claude Code form, `/foundry-skills:pipeline-…`, is inferred from the README's `/foundry-skills:discover-shed-tool`. Print it in full?
5. Drift: `ivar_variants` also drifted (`5e5dfc9e71e2` → `924aef5ed7ae`). Is one example enough?
6. The prior-work line cites Hokken from the same group's preprint. Is that OK under CSHL's "new and unpublished" rule?
7. Shop: edge-to-edge on the trim, or `poster-bleed.pdf`?
8. The centre column is the route card followed by three receipts (PINNED, ASKED AGAIN, TESTED). Each is keyed by № to a red stop on the card, but the lower half reads close to an evidence column. Insert a card between them?
9. Re-check the corpus counts and `discover-shed-tool` rev 5 at print (`./build.sh` after a `git fetch`).
