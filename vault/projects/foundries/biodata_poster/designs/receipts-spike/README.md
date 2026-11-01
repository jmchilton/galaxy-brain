# receipts-spike

Outline 3 (`spike`) from `../RECEIPTS_OUTLINES.md`, built under `../FEEDBACK_ROUND3.md`. It uses the visual language of the three keepers: graph paper, thermal slips, torn edges, a red stamp, Kalam pen notes, Archivo Black and IBM Plex Mono. The layout guards come from `skills-are-binaries-receipt/`.

## The idea

**Hero (196 pt, title slip):** *Four programs sign off.* The words "sign off" are highlighted. Kicker: GALAXY WORKFLOW FOUNDRY.
**Thesis (pen, outline wording):** *The model translates and repairs. At every stage a program, not the model, prints the receipt and signs it.*

Four receipts from one Foundry run (`dengueseq-denv3-galaxy`) hang on a drawn receipt spike in run order. The spike is one straight pen line. It starts at a needle point above the first slip, passes through a punched hole in every header, shows in the gap between slips, and ends on a base. Each slip ends with a `SIGNED` line naming the program whose output it is. The four signatures are highlighted so they read as one set.

| № | Receipt | Lines | Signed by | Jobs run |
| - | - | - | - | - |
| 1 | **CAST**: the `discover-shed-tool` skill binary the run used | 5 + header | `foundry-build cast` | 0 |
| 2 | **PINNED**: 7 Tool Shed changesets | 9 + header | `gxwf tool-revisions` | 0 |
| 3 | **VALIDATED**: phase 9 type check, replayed | 8 + header | `gxwf validate` | 0 |
| 4 | **TESTED**: planemo test, red **PASS** stamp | 7 + header | `planemo test` | **7** |

**The one data visual** is a pen column at the right edge headed "jobs needed". It reads 0 · 0 · 0 · **7**, and each zero-job slip prints `JOBS RUN … 0 none needed`. Each numeral sits level with its receipt's `JOBS RUN` line (placed by measurement, not by fixed y), and the 7 is circled.

**Pen notes**, each beside its slip with an arrow onto one line:
1. *Skills are binaries.*
2. *Pinned, not named.*
3. *Typed, not guessed.*
4. *Not run, not known.* The QA:466 quote, plus "The fourth receipt is the only one with jobs on it."

Note 5, *Rails, not reminders.*, sits bottom left with no arrow. The closing line next to the spike base is the pitch: *Build better skills. Build better workflows. Keep the receipts.*

## Rebuild

```sh
./build.sh            # extract -> QR -> PDFs/previews -> audits -> checks/
REPLAY=1 ./build.sh   # also re-run gxwf over the run first (replay.sh; network on a cold cache)
```

What the build runs:
- `extract.py` (PyYAML) writes `receipts.json`. It reads:
  - the run directory, via `git show HEAD:`;
  - the run's `_scratch/planemo/planemo.log` and `_logs/galaxy.jsonl`;
  - the foundry clone at `eb2de3f1`;
  - `data/`.
- If the run directory or the foundry clone is missing, the build uses the committed `receipts.json`.
- `replay.sh` installs `@galaxy-tool-util/cli@1.15.0` and `@galaxy-foundry/gxwf-foundry@0.4.0` into `/private/tmp/claude-503/receipts-spike-deps`, with the npm cache there too. It writes:
  - `data/validate.json`;
  - `data/timing.txt` (5 runs);
  - `data/pins/*.json` (each phase-5 commit's `galaxy-tool-pin.json`);
  - `data/tool-revisions/*.json` (today's answers);
  - `data/verify-pins.txt`.
- `render.py` runs Typst 0.15.0 via `uvx --from typst==0.15.0 python`. It writes `poster.pdf`, `poster-bleed.pdf` (44.25 in) and `preview.png` (1496 px). Under the deps directory it also writes the count, SHOW_ASK=1 and SHOW_ASK=1 count renders.
- `audit.py` and `pdftoppm` then produce `checks/`:
  - `preview-25.png` (1056 px);
  - `preview-gray.png`;
  - `thumb-200.png`;
  - `show-ask-0.png` (identical to the poster);
  - `show-ask-1.png`.
- The build fails if the directory contains any `node_modules` or symlink. There are none.

**Flags (`sys_inputs`):**
- `bleed=1`;
- `count=1`, which hides the exempt text;
- `SHOW_ASK=1`;
- `noguard=1`, for debug only.

**Build guards** (all fail the build):

| Guard | Where |
| - | - |
| Any receipt slip covers another receipt's text; receipts don't step right; a receipt runs past the 1 in safe zone | `poster.typ` (measured geometry) |
| Any note, jobs-column entry, bottom block, closing line or QR row collides with anything already placed, or leaves the safe zone | `poster.typ` (`checked()`) |
| QR code (quiet zone excluded) < 2.5 in | `poster.typ` |
| Text < 24 pt; non-vendored or unembedded font | `audit.py`, on poster, bleed and ASK PDFs |
| Body text < 28 pt; body > 400 words | `audit.py --count`, on both SHOW_ASK renders |
| Pins disagree across the workflow, the pin files, the run's tool-revisions output and Galaxy's install log; the replay summary disagrees with the run's own validation result; the run used a different cast | `extract.py` asserts |

The collision guards fired during development, which shows they work: "bottom right collides with jobs 3", "bottom right collides with note 4" and "ask receipt runs past the safe zone". I also fired the word gate by setting the limit to 100.

**Also checked:**
- `pdffonts`: 6 faces, all embedded and subset.
- `pdfimages`: no raster images.
- Bleed: `poster-bleed.pdf` cropped by 0.125 in differs from `poster.pdf` by 0 px at 40 ppi.
- Transparency: none. Every colour is opaque.

## Fonts

All SIL OFL, copied from `../skills-are-binaries-receipt/fonts/` and embedded. Typst runs with `ignore_system_fonts=True`.
- Archivo Black: hero and stamp.
- IBM Plex Mono (Regular, SemiBold, Bold): receipts, authors and references.
- Kalam (Regular, Bold): pen notes, jobs column and closing line.

## Body word count

**307 body words with SHOW_ASK=0, and 304 with SHOW_ASK=1** (limit 400). It is counted the keeper way: every alphanumeric token in `poster-count.pdf`, including every receipt line item, hash, the `[[QR: live results]]` text and the closing pitch line.

Exempt and hidden in the count render:
- the title (kicker and hero);
- the authors and affiliations;
- the references block, which includes its one-line run footnote;
- the QR captions.

With SHOW_ASK=1 the pitch moves into the kicker line, so it becomes exempt there, and the 6-word ASK stub is added.

## Sources for every fact

Run: `~/projects/foundry-runs/dengueseq-denv3/dengueseq-denv3-galaxy` at HEAD `6737777`, abbreviated **RUN** below. Foundry: `~/projects/repositories/foundry` @ `eb2de3f1` (= origin/main, 2026-10-30).

| On the poster | Source |
| - | - |
| CAST: SKILL.md `discover-shed-tool`, MOLD rev 5 · `05c99cba`, cast 2026-09-13, 5 refs · 1 upfront · 4 on demand | `casts/claude/skills/discover-shed-tool/_provenance.json` @ `eb2de3f1` |
| This is the cast the run used | RUN `foundry-feedback.ledger.yml` `observed_in: {mold: discover-shed-tool, revision: 5, content_hash: 05c99cba…}`, asserted equal in `extract.py` |
| SIGNED `foundry-build cast`; note 1 "no model in the build" | foundry `package.json` script `cast` → `foundry-build.ts cast`. `packages/build-cli/src/commands/cast-mold.ts`: "there is no LLM phase, so a cast is byte-stable and --check-able" (asserted in `extract.py`) |
| PINNED: 7 × owner/tool, version, changeset | RUN `galaxy-workflow.gxwf.yml` (`tool_shed_repository.changeset_revision`). Asserted equal to each phase-5 commit's `galaxy-tool-pin.json` (`80de2f3 … b82fa5e`, all `status: hit`). |
| SIGNED `gxwf tool-revisions` | Every changeset appears in the run's own `gxwf tool-revisions` output, recorded in `_logs/galaxy.jsonl` (tool results of each `gxwf tool-revisions` call); asserted in `extract.py` |
| PINNED window 22:51–23:39 | RUN `foundry-run.yml` phase 5 `galaxy-tool-pin` artifact times (UTC) |
| Note 2 "Planemo installed exactly these" | `_scratch/planemo/planemo.log`: Galaxy `install_manager` "Cloning repository … at N:<changeset>" × 7, asserted equal to the pins |
| VALIDATED: command, tool state 7 ok · 0 fail · 0 skip, connections 12 ok · 0 invalid, all 7 steps map over list | `data/validate.json`: `gxwf validate --json --connections --strict` on the run's `galaxy-workflow.gxwf.yml`, cli **1.15.0**, replayed 2026-10-30. The run's own record (`galaxy-workflow-validation-result.json`, cli 1.14.0) has the same tool-state summary and `connections_valid: true`, asserted equal. |
| VALIDATED wall time < 1 s | `data/timing.txt`: 5 warm-cache runs, 0.58–0.59 s |
| VALIDATED at 00:00 | `foundry-run.yml` phase 9 artifact time |
| TESTED: tests 1 · failures 0 · errors 0; 7 jobs ok · 0 failed | RUN `tool_test_output.json` (planemo's JSON): `summary`; jobs from `invocation_details.steps[].jobs[].state` |
| Tool Shed repos at the pins 7; containers 6 | `planemo.log`: 7 install lines; 6 unique `quay.io/biocontainers/…` images |
| wall time 11 min | `tool_test_output.json` `start_datetime → end_datetime` (20:19:37 → 20:30:39 local, 11 min 2 s) |
| planemo test … success | `tool_test_output.json` `tests[0].data.status` (planemo's JSON) |
| planemo 0.75.47 | the command the run executed, `uvx --from planemo==0.75.47 planemo test …`, in `_logs/galaxy.jsonl`; asserted equal to `workflow-test-result.json` |
| TESTED at 00:33 | `foundry-run.yml` phase 10 artifact time |
| Thesis "The model translates and repairs" | `FP:1092` (per the known-unknowns keeper) |
| Note 4 quote | `QA:466` (`jmchiltondotnet/src/content/slides/foundry-qa.mdx`) |
| Note 5 "Guidance … not enforcement [1]" | Baker et al. 2026, p.16 ("Skills are guidance, not enforcement"); `research/r7-biorxiv-preprint.md` |
| [2] DengueSeq | Vogels et al. 2024, *BMC Genomics* 25:433 (`dengueseq-denv3/source-selection.md`) |

**QR codes:** vector, segno, 3.4 in tiles. Each URL returned HTTP 200 on 2026-10-30.
- The Foundry: `galaxyproject.github.io/foundry/`.
- Preprint: `doi.org/10.64898/2026.10.26.761864`.
- Install the skills: `galaxyproject.github.io/foundry/usage/`.
- `[[QR: live results]]`: a 4.2 in placeholder, top right.
- No lightning-talk QR.

## `[[ASK]]` slots

- **SHOW_ASK (default 0).** It adds a fifth stub on the spike under TESTED that reads `№5 [[ASK]] nf-core pipeline · Foundry-validated · Planemo-green`, with no numbers. To make room, the gaps tighten from 0.7 to 0.45 in and the pitch moves to the kicker line. Both renders are in `checks/` (`show-ask-0.png` and `show-ask-1.png`), and both pass every gate.
- **`[[QR: live results]]`.** Once the URL exists:
  1. add it to `LINKS` in `make_qr.py`;
  2. swap the `placeholder(...)` for `image("assets/qr-live.svg", width: live-w)`.

## Departures from the outline

1. **Gaps, not overlaps.** The slips hang 0.7 in apart instead of overlapping by up to 1 in. With an overlap, the spike was hidden behind the paper and read only as a tick mark at the top. The gaps let it show between every pair of slips.
2. **CAST signature is `foundry-build cast`**, the real command (`package.json`), not "foundry cast". The cast date sits in the header, not on the MOLD line. No NEVER HAND-EDITED stamp: TESTED keeps the only stamp. The outline's VERIFY line is dropped, because 2 of the 7 pins fail that gate on replay (review MUST 3). The zero-job slips say `none needed`, and the column is headed "jobs needed" (review MUST 2). PINNED has no column-header row.
3. **PINNED is signed `gxwf tool-revisions` only**, not "tool-search · tool-versions · tool-revisions". The changesets on the slip are tool-revisions output. Search and version choice went through the model.
4. **VALIDATED prints "12 ok · 0 invalid"** from the replay rather than "valid", and its header says "replayed with gxwf 1.15.0 · 2026-10-30".
5. **TESTED prints only program output.** "planemo test … success" replaces "exit 0", which appears only in the agent-written `workflow-test-result.json`, and the sub-line names `tool_test_output.json`. It adds "wall time 11 min", which mirrors VALIDATED's "< 1 s" and comes from planemo's own JSON. "failed 0" is folded into the JOBS RUN line.
6. **Note 1** adds "with no model in the build" (from `cast-mold.ts`). **Note 2** says "Planemo installed exactly these" (from the install log) instead of "The pins are what Planemo installs later".
7. **QR placement.** The Foundry, preprint and optional install QRs sit together bottom right. Note 5 and the references sit bottom left. The pitch is a closing pen line beside the spike base (FEEDBACK §5).
8. **Times are UTC** and are flagged once, in the run footnote.

## Left out (per the outline)

- IWC rnaseq-pe and the VOID plants.
- Draft burn-down, ledger, Z-report, oracle, blind regeneration and recast.
- nf-core comparison and any biology from the run.
- **Orbit 0/15: dropped entirely.**
- **The run's second test case.** `galaxy-workflow.gxwf-tests-denv3_test.yml` (~178 MB reads) was not run (`workflow-test-result.json` `tests_not_run`). "tests 1" is what planemo ran, not full coverage.

## Applied review (`REVIEW.md`)

| # | Item | Status |
| - | - | - |
| 1 | MUST: highlighter clips descenders on the line above | Applied: `hl()` default `top-edge` is now `x-height`; the hero keeps `cap-height`. Checked at 100 ppi on notes 3 and 4. |
| 2 | MUST: "jobs run 0 · 0 · 0" reads as failure | Applied: column header is "jobs needed"; the three zero slips print `JOBS RUN … 0 none needed` |
| 3 | MUST: CAST's VERIFY line implies the pins passed | Applied: row deleted (departs from outline; see Open question 1) |
| 4 | NICE: "Four programs" but gxwf signs twice | Skipped: the hero is the outline's title; 4 stages each signed by a program is still true. Left as Open question 3 for John. |
| 5 | NICE: PASS stamp brushes "pins" | Applied: `dx 6.6in, dy -0.80in`; it now crosses only leaders |
| 6 | NICE: wall-time rows don't match | Applied: VALIDATED reads `wall time … < 1 s`; the warm-cache caveat is in Sources |
| 7 | NICE: PINNED column-header row | Applied: deleted |
| 8 | NICE: drop the install QR to enlarge the required two | Skipped: the outline lists it as an option and the install path is useful; the required codes already print at 2.66 in (gate 2.5 in) |
| 9 | NICE: CAST date format | Applied: CAST prints `09-13`, like the other headers |

Body words after the review: 310 → **307** (SHOW_ASK=1: 307 → **304**). All guards re-run green on both SHOW_ASK renders.

## Open questions

1. **VERIFY vs PINNED (line now dropped).** Replaying the cast's own gate, `foundry validate-galaxy-tool-discovery --schema-sha256 c0940fc0…` (gxwf-foundry 0.4.0), over the 7 committed pin files passes 5 and rejects 2: `d366ab3` (bedtools) and `b82fa5e` (tp_sed). Both fail on `alternates[]` entries missing required fields (`data/verify-pins.txt`). CAST's VERIFY line was removed so it can't imply otherwise. Is this worth a foundry issue (the advance loop doesn't re-run the gate every iteration)?
2. **Tool Shed drift since the run.** Today `gxwf tool-revisions` names different changesets for 2 of the 7 versions (`data/tool-revisions/`):
   - `ivar_trim 1.4.4+galaxy1` → `8b20bc80ebf4` (repo updated 2026-10-26);
   - `ivar_variants 1.4.4+galaxy0` → `924aef5ed7ae`.

   The run pinned, and Galaxy installed, `6606a8c97889` and `5e5dfc9e71e2`. This is a strong real case for "Pinned, not named": same name and version, different code ten days later. It is not on the poster. Add a one-line pen aside on PINNED?
3. **Hero.** The signatures are 4 commands from 3 programs (gxwf signs twice). Keep "Four programs", or use "Four commands" (REVIEW #4)? Also, is "Four programs sign off." clear to a passer-by without the thesis? An option is a kicker that names the subject, e.g. "AGENT-BUILT GALAXY WORKFLOWS".
4. **Shop:** edge-to-edge on the trim, or `poster-bleed.pdf`?
