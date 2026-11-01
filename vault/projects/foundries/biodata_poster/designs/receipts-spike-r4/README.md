# receipts-spike-r4

Round-4 revision of `../receipts-spike/` (left untouched for comparison), under `../FEEDBACK_ROUND4.md` and `../FEEDBACK_ROUND3.md`, with the receipts-spike section and Part 1 of `../ADVICE_ROUND4.md` as non-binding advice. Same visual language: graph paper, thermal slips, torn edges, tape, the red PASS stamp, Kalam pen notes, Archivo Black and IBM Plex Mono.

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
- **QR codes:** Foundry and preprint together under the closing pitch; the install QR moved into the Get-started card. The live-results placeholder stays in the header.
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
- `replay.sh` installs `@galaxy-tool-util/cli@1.15.0` and `@galaxy-foundry/gxwf-foundry@0.4.0` into `/private/tmp/claude-503/receipts-spike-r4-deps`. It writes `data/validate.json`, `data/timing.txt`, `data/pins/`, `data/tool-revisions/` and `data/verify-pins.txt`. These are unchanged from round 3: the replay was not re-run, and the data is dated 2026-10-30.
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
- `pdffonts`: 7 faces, all embedded and subset. The Kalam `←`/`→` fell back to Libertinus until they were set in Plex Mono.
- `pdfimages`: none.
- Bleed: cropped by 0.125 in at 40 ppi, it differs from the trim PDF by 0 px.
- Greyscale: the line, stops, pen and stamp hold, and the highlights go faint.
- Transparency: none.

## Fonts

All SIL OFL, vendored in `fonts/`, embedded; `ignore_system_fonts=True`.
- Archivo Black: hero, stamp.
- IBM Plex Mono (Regular, SemiBold, Bold, Italic): receipts, cards, stop labels, arrows.
- Kalam (Regular, Bold): pen notes, key, model notes, closing.

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

**QR codes** (vector, segno): the Foundry (`galaxyproject.github.io/foundry/`) and the preprint (`doi.org/10.64898/2026.10.26.761864`), 3.7 in tiles; install guide (`/foundry/usage/`), 3.2 in. All codes are ≥ 2.5 in excluding the quiet zone. `[[QR: live results]]` is a placeholder in the header. There is no lightning-talk QR.

## `[[ASK]]` slots

- **SHOW_ASK (default 0):** a dashed ochre stub in the left triangle, "another way in: [[ASK]] nf-core pipeline · Foundry-validated · Planemo-green". It has no numbers. Both renders are in `checks/`, and both pass every guard.
- **`[[QR: live results]]`:** once the URL exists, add it to `LINKS` in `make_qr.py` and swap the `placeholder(...)` in the header for the image.

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
