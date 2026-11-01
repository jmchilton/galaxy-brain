# receipts-trad-header-footer

This is a traditional-poster variant of `receipts-spike`, built under `../FEEDBACK_ROUND4.md` and `../FEEDBACK_ROUND3.md` (round 4 lifts the 400-word cap). It keeps the visual language: graph paper, thermal slips with torn feet, tape, Kalam pen notes, the red stamp and the highlighter. The title slip is `receipts-side-by-side`'s, unchanged.

## The idea

A header band and a footer band of taped info cards, with one Foundry run drawn between them as a connected chain.

- **Title slip (as-is from side-by-side).** *Build better skills. Build better workflows. Keep the receipts.* It keeps the pen thesis, the `[[QR: live results]]` placeholder and the author block.
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
- `render.py` runs Typst 0.15.0 via `uvx --from typst==0.15.0 python` with vendored fonts only. It writes `poster.pdf` (44 in), `poster-bleed.pdf` (44.25 in) and `preview.png` (1496 px). It also writes the count render and the SHOW_ASK=1 renders into `/private/tmp/claude-503/receipts-trad-header-footer-deps/`.
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
- `pdffonts`: 6 faces, all embedded and subset.
- `pdfimages`: no raster images.
- `poster-bleed.pdf` cropped by 0.125 in differs from `poster.pdf` by 0 at 40 ppi.
- Greyscale: the highlights go pale grey but the text holds. The Nextflow lane stays distinct by its dashes.

## Fonts

All are SIL OFL, copied from `../receipts-spike/fonts/` and embedded. Typst runs with `ignore_system_fonts=True`.
- Archivo Black: title, card heads, stamp, lane chips.
- IBM Plex Mono: receipts, card bodies, commands, references.
- Kalam: pen notes, thesis, spine labels, tally.

## Body word count

**847 body words with SHOW_ASK=0, and 853 with SHOW_ASK=1** (target 700–1000). It is counted the keeper way: every alphanumeric token in the count render.

The title, authors, references, footnotes and QR captions are exempt and hidden. The thesis and the `[[QR: live results]]` text are counted.

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

All three URLs come from spike, which checked each for HTTP 200 on 2026-10-30. Printed tiles are 3.27 in, and the guard passes at ≥ 2.5 in of code. There is no lightning-talk QR.

## `[[ASK]]` slots

- **SHOW_ASK (default 0).** It adds one ochre line under the "other routes" note: `[[ASK]] nf-core routes: Foundry-validated, Planemo-green`. There are no numbers. Render: `checks/show-ask-1.png`; it passes every gate.
- **`[[QR: live results]]`** sits in the title slip, top right. Once the URL exists:
  1. add it to `LINKS` in `make_qr.py`;
  2. swap the `placeholder(...)` for `image("assets/qr-live.svg", width: live-w)`.

## Open questions

1. Get started points people at the two-step brief route (`pipeline-paper-to-workflow-brief`, then `pipeline-workflow-brief-to-galaxy`). Should it point at the direct routes instead?
2. "Same name, new changeset": is the `ivar_trim` drift worth a spot, or does it read as Tool Shed criticism?
3. 0/15 is kept as a parenthetical in Rails. Keep it or drop it?
4. The wiki tally (2026-10-24) needs a re-check at print. "51 oracles" counts Mold and Pipeline `eval.md` together.
5. The PAPER lane leads, as the dossier's chosen lead. Does the Nextflow lane need its own example, now only `[[ASK]]`?
6. Shop: trim edge-to-edge, or `poster-bleed.pdf`?
