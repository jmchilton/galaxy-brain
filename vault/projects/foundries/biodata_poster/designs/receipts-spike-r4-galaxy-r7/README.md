# receipts-spike-r4-galaxy-r7

## Round 7
- Dropped the "Ten days later…" Tool Shed drift aside under note 2, plus its arrow, `dr` binding, `drift` data in `extract.py`/`receipts.json` and the drift assert.
- Note 2 moved down 1.4 in (centred beside PINNED); note 3 + ledger note moved up 0.6 in to close the gap.
- Note 1 retitled "Skills are like binaries." (fits; guards pass).
- Get started unchanged (already has explicit Codex commands). Deps now under `/private/tmp/claude-503/r7-deps/receipts-spike-r4-galaxy-r7`. Words: 653 / 661 (SHOW_ASK=1).

## Round 6

Copy of `../receipts-spike-r4-galaxy/` under `../FEEDBACK_ROUND6.md`.
- Fourth (header) QR tile, its caption, layout variable and README text removed per round 6; title and thesis now use the full masthead width.
- Header kicker from `receipts-trad-header-footer-galaxyplus`: small white Galaxy logo + gold tracked mono WORKFLOW FOUNDRY. Replaces the text kicker and the logo under the thesis (logo appears once).
- Trad title "Build better skills. Build better workflows. / Keep the **receipts**." (receipts in gold), Atkinson Bold 122 pt, full width; gold accent bar spans both lines; trad thesis in white Atkinson 42 pt beside line 2. Guards: line 1 in safe zone, line 2 descenders vs gold bar, thesis vs line 1, thesis vs gold bar.
- Closing pen note now "Agents draft. / Programs sign off." (old title), so it no longer repeats the title.
- Get started: bold head + 2-col grid (bold Claude Code / Codex / gxwf → full commands, 28 pt mono); "Checks:" line dropped; steps column and Install guide QR kept (step commands break after `/foundry-skills:`).
- Words: 680 (SHOW_ASK=0) / 688 (SHOW_ASK=1). All build guards pass; deps under `/private/tmp/claude-503/r6-deps/receipts-spike-r4-galaxy-r6`.

## Round 5 (history)

Round-5 **Galaxy-style** restyle of `../receipts-spike-r4/` (left untouched for side-by-side comparison), under `../FEEDBACK_ROUND5.md` and `../STYLE_GALAXY.md`. Same text, facts, receipts, QR codes, route concept and density; only tokens, fonts and surfaces changed. Everything below "Round 5 styling" is the round-4 README, kept as history and updated only where the restyle made it wrong (fonts, deps path, checks).

## Round 5 styling (Galaxy)

**What changed**

| Element | Claude style (r4) | Galaxy style (this) |
| - | - | - |
| Page | warm paper `#f2efe4`, grey-green grid | `gx-page` `#edf4fa`, 0.25 in grid in `gx-grid` / `gx-grid-major` |
| Title | taped cream slip, Archivo Black, "sign off" highlighted | full-bleed **masthead band**: 135° gradient `gx-dark` → `gx-primary`, 0.5 in grid at 3% white, 0.25 in `gx-gold` bar under it; kicker in `gx-tape`, hero white Atkinson Bold 162 pt, tracking −0.02 em, "sign off" in `gx-gold` (no highlight); gold vertical accent bar before the hero |
| Thesis | rotated Kalam pen note | white Atkinson 400, 42 pt, in the masthead |
| Galaxy logo | none | white wordmark (`assets/galaxy_logo_white.svg`, from `galaxy-hub/content/images/` @ `e80ba8d78`), once, 4.4 in, under the thesis; vector, not recoloured |
| Authors | Plex Mono semibold under the slip | `gx-dark` Atkinson 700 / affiliations `gx-grey` 400, on `gx-page` under the gold bar |
| Receipts | cream slips, ink dashes | white `gx-slip`, `gx-dark` ink in Atkinson Hyperlegible Mono, 0.06 in `gx-primary` printer strip on the top edge, `gx-shadow` shadow, torn foot and square corners kept |
| Stamp | red, single border, Archivo Black | `gx-ok` green, double border, Atkinson Bold; same rotation and place (PASS on TESTED only; no new stamps) |
| Tape | flat cream | `gx-tape` with a 1.2 pt `gx-grid-major` edge and saw-tooth ends, same angles and places |
| Cards (What it is, Rails, Get started) | torn cream slips | Hub cards: white, 0.25 in radius, 0.08 in `gx-shadow` offset, 1 pt `gx-rule` edge, tape kept; What it is and Rails are featured (0.12 in gold left bar); same footprints, so the guards are unchanged |
| Build-machine boxes | cream, 3 pt ink | `gx-tint`, 2.5 pt `gx-primary`, 0.08 in radius; `foundry-build cast` box in `gx-gold` with `gx-dark` text |
| Route | navy pen line, Kalam numerals | `gx-primary` line; open stops white with a `gx-primary` ring; the three receipt stops (5, 9, 10, where a program signed) are gates: `gx-dark` fill, gold ring, white numerals; START/DONE squares `gx-dark`, 0.08 in radius |
| Note badges | outlined Kalam numerals | `gx-primary` discs, white Atkinson 700 |
| Pen notes | Kalam, `#1f3a6b` | Kalam, `gx-primary` `#25537b`; arrows 4 pt |
| `hl()` | `#f6e08a` | `gx-hl` `#fff489`; still `top-edge: "x-height"` by default |
| Sources | foot of the Get-started card | flat `gx-deep` **footer band**, white 24 pt, in two rows (the Get-started card loses its foot and ends 0.45 in above the band) |

**Fonts** (all SIL OFL 1.1, vendored in `fonts/`, embedded and subset; `ignore_system_fonts=True`):
- **Atkinson Hyperlegible** Regular, Bold (also Italic, BoldItalic, vendored per the guide, unused): title, cards, labels, authors, sources. From `google/fonts` `ofl/atkinsonhyperlegible/`; licence `fonts/OFL-AtkinsonHyperlegible.txt`.
- **Atkinson Hyperlegible Mono** Regular, Bold, Italic: receipts and commands. Static instances from `googlefonts/atkinson-hyperlegible-next-mono` @ `154d503` (`fonts/ttf/`); licence `fonts/OFL-AtkinsonHyperlegibleMono.txt`.
- **Kalam** Regular, Bold: pen notes, as before.
- **IBM Plex Mono** Regular, Bold: glyph fallback only, for `№`, `←` and `→`, which none of the three faces above has (checked with fontTools).
- Archivo Black, Plex Mono SemiBold and Plex Mono Italic were removed. `audit.py` `ALLOWED` lists the new faces.

**Departures from `STYLE_GALAXY.md`**
1. **Route line stays 0.2 in** (≈14 pt), not the guide's 4 pt spine: here the line is the poster's main graphic, and 4 pt would vanish at 6 ft.
2. **Note arrows at 4 pt**, not 2.5 pt: a judgment call for a 44 in sheet (r4 used 5.5 pt); 2.5 pt was not rendered.
3. **Receipt dot leaders and dashed dividers in `gx-grid-major` `#aecce7`**, not `gx-rule` `#dee2e6`: `gx-rule` on white is about 1.3:1 (computed, not rendered), too faint for leaders.
4. **Masthead corner tapes dropped**: a full-bleed band has nothing to tape. Every receipt and card keeps its tape.
5. **Thesis in white Atkinson**, not Kalam gold, so the hero mark stays the masthead's only gold text.
6. **Gold count in the What-it-is card is two** (featured bar and the `foundry-build cast` box, the guide's "Workflow brief" analogue).
7. **Transparency:** the masthead grid is the one semi-transparent fill (3% white, per the guide); everything else is opaque.
8. **Receipt mono sizes:** Atkinson Mono is 5% wider than Plex Mono (0.632 vs 0.600 em), so the pin rows drop from 31/29 pt to 30/28 pt and the italic "does" lines from 29 to 28 pt, to keep every row on one line and the layout unchanged. All are still ≥ 28 pt.
9. **Hero 162 pt** (r4: 164 pt Archivo Black), the largest that keeps the descenders off the gold bar without moving the body down.

**Word count:** **697** (SHOW_ASK=0) and **705** (SHOW_ASK=1), against 697 / 706 in r4 (the 1-word difference is how `Foundry-validated` tokenises after the line break moved). A sorted-word diff of `pdftotext` for r4 vs this shows only extraction artefacts (r4's rotated thesis came out letter by letter, plus leader dots). `receipts.json`, `assets/qr.json` and the three QR SVGs are byte-identical to r4.

**Checks:** every build guard passes (plus new ones: hero vs gold bar, hero vs thesis, thesis vs logo, sources inside the safe zone); `pdffonts` shows 9 faces, all embedded and subset; `pdfimages`: none (the logo is vector); bleed cropped by 0.125 in at 40 ppi differs from the trim by 0 px above 8/255 (only the gradient's interpolation shifts); in greyscale the masthead, gates vs open stops, the stamp's word and its double border, and the card edges hold, while the gold and the highlights go pale (expected per the guide); QR codes keep `#1d1d1b` on white with the 4-module quiet zone (the tile's 0.25 in corner radius cuts only quiet zone).

**Open questions**
1. Footer band: keep it, or move the sources back into the Get-started card as in r4?
2. Logo under the thesis OK, or move it into the author row (colour wordmark)?
3. Thesis: white Atkinson, or Kalam in gold for a pen feel?
4. `#ffd700` gold is at the CMYK gamut edge: ask the printer for a proof.
5. All round-4 open questions below still stand.

**Rebuild:** `./build.sh` (deps and temp renders in `/private/tmp/claude-503/receipts-spike-r4-galaxy-deps`).

## Round 4 changes

**John's notes for this poster, and what answers each:**

| Note | Change |
| - | - |
| Doesn't understand the spike | The spike is gone. The same diagonal is now the **route of one Foundry run**: a pen line from START (the reviewed brief) to DONE (a tested workflow), with all 11 phases of `workflow-brief-to-galaxy` as numbered stops, labelled with short phase names and their UTC finish times. The receipts hang off the stops that printed them: PINNED on 5, VALIDATED on 9, TESTED on 10. A pen "How to read it" key in the left triangle spells the metaphor out. |
| Needs more information density | 307 → **697** body words (SHOW_ASK=1: 304 → 706). The empty margins, the jobs column and the bottom-left corner are now content: a What-the-Foundry-is card with the build machine, the CAST receipt, a Rails card, a Get-started card, the drift aside, the ledger note, the upstream (paper → brief → expert review) at the line's origin, and the model's part beside the bare stops. |
| Doesn't like the "jobs needed" column | Deleted, along with the three `JOBS RUN … 0 none needed` rows. Only TESTED keeps JOBS RUN (7), with wall time above it. Note 4 now reads "Only planemo test ran jobs: 7, in a real Galaxy." |
| Is this the best overall approach? | It keeps the one thing only this poster had, the whole journey of one run, and now also says what the Foundry is (machine card), how a run goes (the route), and how to use it (Get started, numbered like the run). |
| Global (round 4): say what it does and how to use it | WHAT THE FOUNDRY IS card (dossier §2 one-breath, plus KNOWLEDGE → MOLDS → `foundry-build cast` → SKILLS → YOUR AGENT as vector boxes, with corpus counts). GET STARTED card (Claude Code and Codex install, then the run's two pipelines as steps 1–3, plus `gxwf`) with the install QR. |

**Other changes:**
- **Hero names the subject and fixes the count:** *Agents draft. / Programs sign off.* ("sign off" highlighted), under the GALAXY WORKFLOW FOUNDRY kicker. It no longer claims "Four programs" (REVIEW #4: there were 4 commands from 3 programs). The pen deck beside it says what the Foundry is: agent skills that build Galaxy workflows from a paper or a Nextflow pipeline, with a program signing at each checkpoint.
- **CAST moved to the build machine** (right column, under the SKILLS box, with an arrow). It was printed by the build on 09-13, not by the run, so hanging it on stop 5 would misdate it. Its italic line says "the run used it at stop 5".
- **One italic "what this stop does" line per receipt**, e.g. PINNED: "Stop 5, 7 passes: the model picks the next step and a tool; `gxwf tool-revisions` names the exact changeset."
- **Drift aside** under note 2 (README Q2 from round 3): today the Tool Shed answers `ivar_trim 1.4.4+galaxy1` with `8b20bc80ebf4`, not the pinned `6606a8c97889`; 2 of the 7 tools have moved (a different changeset; the poster does not claim the tool code changed).
- **Ledger note** under note 3: the run's open-requirements ledger holds 19 obligations (14 resolved, 5 left open in writing), and the run recorded 28 feedback notes for the Foundry (4 major; all still `open`, no issues filed). This is the "written down, not hidden" half of the dossier's one-breath.
- **Model's part in pen** beside stops 1–4 ("the model designs: inputs, data flow, a skeleton, checked against IWC") and 6–8 ("the model finds test data and writes the test"), so "the model translates, a program signs" is visible along the line (advice idea b).
- **Origin of the line:** `paper-to-workflow-brief` read the DengueSeq paper and its code; an expert answered the brief's 10 open questions (1 edited, 9 accepted). This is the honest paper → Galaxy story; the route is not called `paper-to-galaxy`.
- **Rails card (note 5 grown into a box):** guidance, not enforcement (p.16); the connection check caught the mis-wired `tximport` step before it ran (p.4, pp.15–16, Fig S3A); Orbit's evidence gate refuses by default (pp.17–18). No 0/15 anywhere.
- **QR codes:** Foundry and preprint together under the closing pitch; the install QR moved into the Get-started card.
- **Sources** moved into the foot of the Get-started card (exempt, 24 pt).
- **Highlighter:** `top-edge: "x-height"` stays the default (hero: `cap-height`), and the x-height extent drops from 3 pt to 1 pt. Checked on a 100 ppi crop of every note highlight: no bar touches a descender on the line above.
- **Word guard:** `MAX_WORDS` 400 → **720** in `audit.py`. Target ≤ 700 with SHOW_ASK=0 (advice: 550–700); the 720 ceiling covers the 9-word ASK stub.
- **Deps path:** `build.sh`, `render.py` and `replay.sh` now default to `/private/tmp/claude-503/receipts-spike-r4-deps`, so r4 never overwrites the original's count or ASK renders.
- **Guard fix:** Typst closures capture variables by value, so the original's `checked()` only saw the boxes that existed when it was defined. Every placement helper now takes the current `boxes` list as an argument, and the collision guard sees everything placed so far. While I was laying out the page, the guards caught "model 6-8 collides with pinned slip", "stop 11 collides with tested slip", "note 2 collides with what card", "rails card collides with note 4" and "get started collides with tested slip".

**Word count:** **697** (SHOW_ASK=0) and **706** (SHOW_ASK=1), counted the keeper way: every alphanumeric token in the count render, with title, authors, sources and QR captions hidden. Before: 307 / 304.

**Departures from the advice:**
1. **CAST is not on stop 5.** The advice hangs CAST and PINNED on phase 5. CAST is a build-time receipt (cast 2026-09-13), so it sits with the build machine instead, and its italic line names stop 5 as where the run used it.
2. **Some boxes, despite "don't box it".** The receipts stay a stepped diagonal off the route line, but What it is, Rails and Get started are taped cards, because the round-4 general feedback asks every poster to say what the Foundry does and how to use it.
3. **No pipeline count is printed** (r1: 7 at abstract time vs 13 on main is John's call). The Get-started card names the two pipelines this run used.
4. **697 words**, at the top of the 550–700 target. I stopped cutting toward a lower number, per advice Part 1 §4.

## Open questions

1. **Hero:** "Agents draft. Programs sign off." OK, or keep "Four programs sign off." (now inaccurate as a count)?
2. **CAST placement:** keep it with the build machine, or hang it on stop 5 per the advice?
3. **Get started step 1** shows `/foundry-skills:pipeline-paper-to-workflow-brief` (the skill exists at `eb2de3f1`). Is that the invocation to advertise, or should it be the Nextflow route?
4. **VERIFY gap** (from round 3): 2 of the 7 pin files still fail discover-shed-tool's VERIFY schema on replay (`data/verify-pins.txt`). Nothing on the poster implies they pass. File a foundry issue?
5. **Shop:** edge-to-edge on the trim, or `poster-bleed.pdf`?
6. **SHOW_ASK stub:** is the nf-core `[[ASK]]` stub in the left triangle (under the key) the right spot?

## Rebuild

```sh
./build.sh            # extract -> QR -> PDFs/previews -> audits -> checks/
REPLAY=1 ./build.sh   # also re-run gxwf over the run first (replay.sh; network on a cold cache)
```

- `extract.py` (PyYAML) writes `receipts.json`, with asserts. It reads:
  - the run (`git show HEAD:`), its `_scratch/planemo/planemo.log` and `_logs/galaxy.jsonl`;
  - the brief run `dengueseq-denv3-brief` and `../review.md`;
  - the foundry clone at `eb2de3f1`;
  - `data/`.

  New in r4: `route` (11 phases, finish times, phase 5 `iterations: 7`), `upstream`, `drift` (asserted to be exactly ivar_trim and ivar_variants), `ledger` and `corpus`, plus asserts that the install commands are in the foundry README and that the four pipeline skills exist. If the run or the foundry clone is missing, the build uses the committed `receipts.json`.
- `replay.sh` installs `@galaxy-tool-util/cli@1.15.0` and `@galaxy-foundry/gxwf-foundry@0.4.0` into `/private/tmp/claude-503/receipts-spike-r4-galaxy-deps` (round 5; r4 used `…-r4-deps`). It writes `data/validate.json`, `data/timing.txt`, `data/pins/`, `data/tool-revisions/` and `data/verify-pins.txt`. These are unchanged from round 3: the replay was not re-run, and the data is dated 2026-10-30.
- `render.py` (Typst 0.15.0 via `uvx --from typst==0.15.0 python`) writes `poster.pdf`, `poster-bleed.pdf` (44.25 in) and `preview.png` (1496 px), plus the count, ASK and ASK-count renders under the deps dir.
- `audit.py` checks fonts, the 24 pt floor, and with `--count` the 28 pt body floor and MAX_WORDS 720.
- `checks/`: `preview-25.png` (1056 px), `preview-gray.png`, `thumb-200.png`, `show-ask-0.png` (= poster) and `show-ask-1.png`.
- The build fails on any `node_modules` or symlink. There are none.

**Flags (`sys_inputs`):** `bleed=1`, `count=1`, `SHOW_ASK=1`, `noguard=1` (debug only).

**Build guards** (all fail the build):
- any receipt slip covers another receipt's text;
- receipts don't step right;
- any placed element (stop label, origin, terminus, model notes, what card, CAST, notes 1–4, drift, ledger, rails, key, closing, QRs, get started, ASK stub) collides with anything placed before it or leaves the 1 in safe zone;
- Get started overlaps TESTED;
- QR code under 2.5 in;
- text < 24 pt, or a font that is non-vendored or unembedded;
- body < 28 pt, or more than 720 words;
- the `extract.py` asserts.

**Also checked:**
- `pdffonts`: 9 faces (round 5), all embedded and subset. `←`, `→` and `№` come from the Plex Mono fallback.
- `pdfimages`: none.
- Bleed: cropped by 0.125 in at 40 ppi, it differs from the trim PDF by 0 px (above 8/255).
- Greyscale: the line, stops, pen and stamp hold, and the highlights go faint.
- Transparency: only the masthead grid (round 5).

## Fonts

Round 5: see "Round 5 styling (Galaxy)" above. Atkinson Hyperlegible (title, cards, labels), Atkinson Hyperlegible Mono (receipts, commands), Kalam (pen notes), IBM Plex Mono Regular/Bold (fallback glyphs only). All SIL OFL, vendored in `fonts/`, embedded; `ignore_system_fonts=True`.

## Sources for every fact

Run: `~/projects/foundry-runs/dengueseq-denv3/dengueseq-denv3-galaxy` @ `6737777` (**RUN**). Brief run: `…/dengueseq-denv3-brief` @ `6b8b630` (**BRIEF**). Foundry: `~/projects/repositories/foundry` @ `eb2de3f1` (2026-10-30).

| On the poster | Source |
| - | - |
| Route: 11 stops, names, finish times (UTC), stop 5 "7 passes" | RUN `foundry-run.yml` `phases[]` (last artifact `at`; phase 5 `iterations: 7`) |
| Stop labels (interface, data flow, compare to IWC, skeleton, find test data, test plan, write the test, debug outputs) and the "does" lines | Mold `summary:` in `content/molds/<slug>/index.md` @ `eb2de3f1` for `workflow-brief-to-galaxy-*`, `compare-against-iwc-exemplar`, `advance-galaxy-draft-step`, `find-test-data`, `implement-galaxy-workflow-test`, `validate-galaxy-workflow`, `run-workflow-test`, `debug-galaxy-workflow-output` |
| "debug outputs: none failed" | RUN `workflow-debug-report.md` ("No failing outputs"), asserted |
| START: `paper-to-workflow-brief` read the paper and its code | BRIEF `foundry-run.yml` (pipeline, phases `summarize-paper`, `freeform-summary-to-workflow-brief`); `../source-selection.md` (paper + linked `DENV_pipeline` v1.0) |
| 10 open questions, 1 edited, 9 accepted | BRIEF `HEAD~1:workflow-brief.md` "### Open questions" (10 items, counted); `../review.md`, asserted |
| "a real DENV3 sample" | `../source-selection.md` (SRR25366733, DENV-3, the paper's Florida validation set) |
| Drift: `ivar_trim 1.4.4+galaxy1` → `8b20bc80ebf4` vs pinned `6606a8c97889`; 2 of 7 moved; "ten days later" | `data/tool-revisions/*.json` (replayed 2026-10-30) vs RUN `galaxy-workflow.gxwf.yml` pins (run 2026-10-20), computed and asserted in `extract.py` |
| Ledger: 19 obligations, 14 resolved, 5 open | RUN `open-requirements.ledger.yml` `entries[].status` |
| 28 feedback notes, 4 major | RUN `foundry-feedback.ledger.yml` `entries[]` (`severity`) |
| Machine: 420 notes, 54 patterns, 56 Molds, 69 skills | foundry `git ls-tree` @ `eb2de3f1`: `.md` under `content/`, `.md` under `content/patterns/`, dirs under `content/molds/`, dirs under `casts/claude/skills/` (r1 definitions; same values as r1 @ `bc79096`) |
| "no model in the build" | `packages/build-cli/src/commands/cast-mold.ts` "there is no LLM phase" (asserted) |
| Claude Code · Codex · Antigravity | foundry `README.md` "Install generated skills" @ `eb2de3f1` |
| What-it-is copy | `../../DESIGN_DOSSIER.md` §2 one-breath |
| Install commands | foundry `README.md` @ `eb2de3f1` (asserted verbatim in `extract.py`) |
| `/foundry-skills:pipeline-…` steps 1 and 3 | `casts/claude/skills/pipeline-paper-to-workflow-brief/` and `pipeline-workflow-brief-to-galaxy/` @ `eb2de3f1` (asserted); the `/foundry-skills:<skill>` form is from the README |
| "Agent skills that build Galaxy workflows from a paper or a Nextflow pipeline" | foundry `README.md` Goal; `nextflow-to-workflow-brief` and `paper-to-workflow-brief` pipelines @ `eb2de3f1` |
| `npm install -g @galaxy-tool-util/cli` gives `gxwf` | `replay.sh` (the package that provides the `gxwf` bin) |
| Rails card | Baker et al. 2026: p.16 ("Skills are guidance, not enforcement"); p.4, pp.15–16, Fig S3A (`tximport`); pp.17–18 (refusal default), per `../../research/r7-biorxiv-preprint.md` |
| CAST: SKILL.md `discover-shed-tool`, MOLD rev 5 · `05c99cba`, cast 09-13, 5 refs · 1 upfront · 4 on demand; used by this run | `casts/claude/skills/discover-shed-tool/_provenance.json` @ `eb2de3f1`; RUN `foundry-feedback.ledger.yml` `observed_in`, asserted |
| PINNED: 7 × owner/tool, version, changeset; window 22:51–23:39; signed `gxwf tool-revisions`; "Planemo installed exactly these" | RUN `galaxy-workflow.gxwf.yml`, each phase-5 `galaxy-tool-pin.json`, the run's own `gxwf tool-revisions` output in `_logs/galaxy.jsonl`, Galaxy's install lines in `planemo.log`, all asserted |
| VALIDATED: 7 ok · 0 fail · 0 skip, 12 ok · 0 invalid, 7 steps over list, < 1 s, 00:00 | `data/validate.json` (cli 1.15.0 replay, = the run's own summary), `data/timing.txt` (0.58–0.59 s), phase 9 time |
| TESTED: success; tests 1 · 0 · 0; 7 repos; 6 containers; 11 min; 7 jobs ok, 0 failed; planemo 0.75.47; 00:33 | RUN `tool_test_output.json`, `planemo.log`, `_logs/galaxy.jsonl`, phase 10 time |
| Note 4 quote | QA:466 (`jmchiltondotnet/src/content/slides/foundry-qa.mdx`) |
| [2] DengueSeq | Vogels et al. 2024, *BMC Genomics* 25:433 |

**QR codes** (vector, segno): the Foundry (`galaxyproject.github.io/foundry/`) and the preprint (`doi.org/10.64898/2026.10.26.761864`), 3.7 in tiles; install guide (`/foundry/usage/`), 3.2 in. All codes are ≥ 2.5 in excluding the quiet zone. There is no lightning-talk QR.

## `[[ASK]]` slots

- **SHOW_ASK (default 0):** a dashed ochre stub in the left triangle, "another way in: [[ASK]] nf-core pipeline · Foundry-validated · Planemo-green". It has no numbers. Both renders are in `checks/`, and both pass every guard.

## Left out

- Orbit 0/15 (absent).
- The full Rumsfeld quote.
- Any Nextflow workflow listing.
- Any pipeline count.
- Hokken.
- The run's second test case (`tests_not_run` 1: "tests 1" is what planemo ran).
- Any benchmark or success-rate claim.

## Note on `REVIEW.md`

`REVIEW.md` is the round-3 review, copied over unchanged from `../receipts-spike/` and kept as history. It does not describe this revision. Its jobs-column and 310-word items no longer apply.
