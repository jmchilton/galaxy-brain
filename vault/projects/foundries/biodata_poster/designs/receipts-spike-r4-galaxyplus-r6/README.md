# receipts-spike-r4-galaxyplus

Round-5 **Galaxy+** restyle of `../receipts-spike-r4/` (left untouched for side-by-side comparison), per `../FEEDBACK_ROUND5.md` and `../STYLE_GALAXYPLUS.md` (on top of `../STYLE_GALAXY.md`). Styling only: same text, facts, receipts, QR codes, route concept and density. Everything below "Round 4 changes" is the r4 README, kept as the content and sources record; the Fonts, Rebuild and Also-checked notes are updated for r5.

## Round 5 styling (Galaxy+)

**What changed**

| Element | Claude style (r4) | Galaxy+ (r5) |
| - | - | - |
| Ground | warm paper, grey-green grid | `gx-page` #edf4fa, 0.25 in grid in `gx-grid` / `gx-grid-major` |
| Title | taped white slip, Archivo Black, yellow highlighter on "sign off" | full-bleed **nebula masthead**: `gx-space` base, radial `gx-glow`/`gx-info` glow top right, faint nova glow bottom left, star-dot tiling, 2 white orbit rings at 15%, 0.25 in gold→gold→nova foot bar. Spaced mono kicker in gold; hero in white Atkinson Next 800 at 150 pt (was 164 pt; trimmed so its descenders clear the in-band authors), −0.03em; "sign off" in the gold→nova `hero-mark()` (boxed, so the ramp spans the word); no highlight |
| Thesis | Kalam navy | Kalam bold in `gx-tape` #cde0f0 on the masthead |
| Authors | mono on paper under the slip | inside the masthead: white Atkinson 700, affiliations `gx-tape`; white Galaxy logo, once, small, bottom right |
| Receipts | cream, square, torn | white, square, torn; **0.08 in gold→nova thermal strip** on top; ink `gx-dark`; header word Atkinson Mono 700; leaders blue-grey dots; dashed rules `gx-grey`; shadow `gx-shadow` at 0.08 in |
| Info cards (What, Rails, Get started) | taped torn slips | Hub cards: white, 0.25 in radius, `gx-shadow`, tape kept. What-the-Foundry-is is the one featured card (gold→nova left bar). Card heads are spaced mono kickers in `gx-nova-dark` |
| Machine diagram | cream boxes, ink outline, `→` glyphs | `gx-tint` boxes with 0.08 in radius and `gx-grid-major` edge; `foundry-build cast` is a `gx-dark` box with gold command text (a program, like the gates); vector arrows in `gx-primary` |
| Route | navy 0.2 in pen line, navy rings | `gx-primary` 0.16 in spine. Open stations: white, primary ring. **Gates** (5, 9, 10, where a program printed a receipt): `gx-dark` disc, gold ring, white numerals. START is a gold square ringed `gx-dark` (Galaxy's gold workflow-brief box); DONE a `gx-dark` square ringed gold |
| Draft loop | none | the poster's one **nova orbit swoosh**: an open 6 pt arc around stop 5 (7 passes) |
| Tape | cream | `gx-tape` with 1.2 pt `gx-grid-major` edge and saw-tooth ends; **one nova strip** (nova-dark edge) on TESTED, the hero receipt. The 2 header tapes went with the title slip |
| PASS stamp | red, single border, Archivo Black | `gx-ok` #006f50, double border, Atkinson Next 800, same rotation and place |
| Pen notes | Kalam navy, ringed numerals | Kalam `gx-primary`; numbered discs filled `gx-primary` with white Atkinson numerals; Rails (the featured note) disc in nova-dark |
| `hl()` | #f6e08a | `gx-hl` #fff489; same function (`top-edge: "x-height"`, 1 pt extent; hero no longer uses it) |
| QR codes | bare SVGs | pure black modules (#000), 4-module quiet zone, on white 0.25 in-radius tiles with the caption inside |
| Footer | none | text-free `gx-deep` band in the bottom margin, mirroring the masthead |

**Fonts** (all SIL OFL 1.1, vendored in `fonts/` with their OFL texts, embedded and subset, `ignore_system_fonts=True`):
- **Atkinson Hyperlegible Next** (Braille Institute; Google Fonts `ofl/atkinsonhyperlegiblenext`): Regular, Bold, ExtraBold (800), Italic. Title, body, cards, labels.
- **Atkinson Hyperlegible Mono** (same project; `ofl/atkinsonhyperlegiblemono`): Regular, Bold, Italic. Receipts, kickers, commands, stop times.
- **Kalam** (Indian Type Foundry): Regular, Bold. Pen notes, unchanged.
- **IBM Plex Mono** Regular (IBM; RFN "Plex", used unmodified): last fallback in every stack, only for `←`, `→` and `№`, which Atkinson and Kalam lack.
- The Atkinson files are static instances cut from the Google Fonts variable TTFs (`fontTools.varLib.instancer`, wght 400/700/800). The OFL lets you modify the fonts, and these two declare no Reserved Font Name. Archivo Black and the Plex SemiBold, Italic and Bold faces were removed.

**Departures from the guide**
1. **The route stays straight.** The guide asks for orbit arcs "where the layout allows". Every stop, receipt step and collision guard hangs off the linear `at-y()`, so an arc would be a layout revision. The orbit lives in the masthead rings and the stop-5 swoosh instead.
2. **One open swoosh, not a closed loop ring.** A closed 2.5 pt ellipse big enough to read cuts the "PINNED" header. The swoosh is a 6 pt nova arc of a tilted ellipse that leaves a gap on the header side. It also serves as the loop-station ring.
3. **No `gx-orbit` ring on light ground.** I tried one large ring around the route, but it ran through the origin text and the key, so I dropped it.
4. **The footer band carries no references.** The bottom 1 in is outside the safe zone, so the refs stay at the foot of the Get-started card, as in r4. The band is a decorative 0.6 in strip.
5. **Leader dots use `gx-grid-major`** (#aecce7), not `gx-rule` (#dee2e6). Dots in `gx-rule` disappear at 3 ft and in greyscale.
6. **The Rails disc is nova-dark** (#c2410c), not nova. White numerals on #ff6a2b fall under 3:1.
7. **The spine is 0.16 in (about 11.5 pt), not 4 pt, and the leader arrows are 4.5 pt, not 2.5 pt.** At 44 in, the spine is the poster's main structure.
8. **The receipt mono is tracked −0.025em.** Atkinson Mono is 5% wider than Plex Mono (632 vs 600 units). Without the tracking, the bedtools pin row and TESTED's italic line wrap, and the Get-started guard fires. No type size or receipt width changed.
9. **No nova cast arrow.** The nova budget goes to the loop swoosh instead. The budget is hero gradient end, thermal strips, one tape, the What-card bar end and the swoosh. That is 5. Nova-dark also appears as text in the two card kickers and as the Rails disc.
10. **Small calls the guide leaves open:**
    - the vignette is skipped, because the grid gives enough texture;
    - the affiliations stay at 28 pt, not 24 pt;
    - the `[[ASK]]` stub keeps its dashed gold-dark line, but its text moved to ink, so there is no gold text on a light ground;
    - the Galaxy logo, from `STYLE_GALAXY.md`, is added once.
    - the Foundry and preprint codes are 2.71 in, down from 2.90 in, because the 3.7 in tile now includes a 0.12 in white pad. Both still clear the 2.5 in guard and decode. The install code is unchanged at 3.2 in.

**Word count:** **697** with SHOW_ASK=0, the same as the source, and **705** with SHOW_ASK=1, against 706 in the source. The only difference is a line break: "Foundry-validated" now counts as one token instead of "Foundry-" plus "validated". The text is identical, and the diff of `receipts.json` against r4 is empty.

**Checks (r5):** all build guards pass (collision, safe zone, step-right, QR ≥ 2.5 in, 24/28 pt floors, vendored and embedded fonts, ≤ 720 words).
- `pdfimages`: none, so the logo and gradients are vector.
- Bleed: the bleed PDF cropped by 0.125 in differs from the trim PDF by 0 px at 40 ppi. The masthead is drawn with a fixed overhang, so its glow and stars don't shift.
- All three QR codes decode with OpenCV from a 60 ppi render, in colour and in greyscale.
- **Transparency is now present, and only on the masthead:** the glow gradients, the stars at 12–18% white and the orbit rings at 15% white. The PDF keeps them as live alpha, and each sits over the opaque `gx-space` base, a known ground.
- Greyscale: the hero, gates, stamp (word plus double border) and tape edges all hold. The highlights and the thermal strip go faint, as the guide predicts.

**Open questions**
1. Is the nova budget right at 6? Option: drop the What card's featured bar (it would keep its gold) and stay at 5.
2. Should the swoosh be bigger or bolder? At 6 ft it reads as a ring around stop 5, but not yet as "the loop".
3. The footer band has no text. Keep it as a frame, or drop it?
4. Pre-existing, also in r4: the VALIDATED command prints `–connections –strict –json` with en dashes, because Typst markup turns `--` into `–`. Fix it with `#raw` or `\-\-` in a content pass?
5. `#ffd700` gold sits at the CMYK gamut edge, so ask the printer for a proof.

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
- `replay.sh` installs `@galaxy-tool-util/cli@1.15.0` and `@galaxy-foundry/gxwf-foundry@0.4.0` into `/private/tmp/claude-503/receipts-spike-r4-galaxyplus-deps` (r5; r4 used `…-r4-deps`). It writes `data/validate.json`, `data/timing.txt`, `data/pins/`, `data/tool-revisions/` and `data/verify-pins.txt`. These are unchanged from round 3: the replay was not re-run, and the data is dated 2026-10-30.
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
- `pdffonts` (r5): 9 faces, all embedded and subset (Atkinson Next ×3, Atkinson Mono ×3, Kalam ×2, Plex Mono Regular for the arrows and №).
- `pdfimages`: none.
- Bleed: cropped by 0.125 in at 40 ppi, it differs from the trim PDF by 0 px.
- Greyscale: the line, stops, pen and stamp hold, and the highlights go faint.
- Transparency (r5): masthead only (glow, stars, orbit rings); see the Round 5 section.

## Fonts

r5: see "Round 5 styling (Galaxy+)" above (Atkinson Hyperlegible Next, Atkinson Hyperlegible Mono, Kalam, IBM Plex Mono Regular as glyph fallback; all OFL, texts in `fonts/`). `audit.py` `ALLOWED` lists exactly these faces.

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

## Round 6

- Dropped the results-QR placeholder tile from the masthead, its caption and its width variable (FEEDBACK_ROUND6). Nova budget now 5.
- Thesis block widened into the freed space (11.8 → 15.7 in).
- Spike masthead and Get started (r6b): logo + gold mono WORKFLOW FOUNDRY kicker row replaces the text kicker and the separate logo (logo once); trad title "Build better skills. Build better workflows. / Keep the receipts." at 122 pt full width with gold accent bar, gold-to-nova "receipts", pen thesis beside line 2; pen note now "Agents draft. Programs sign off."; GET STARTED uses the Claude Code / Codex / gxwf grid (old Checks line dropped).
