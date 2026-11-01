# receipts-stapled-bundle

Outline 4 of `../RECEIPTS_OUTLINES.md` (`stapled-bundle`), under the binding `../FEEDBACK_ROUND3.md`. It uses the keepers' visual language: graph paper, thermal slips, a red stamp, torn edges and Kalam pen notes. The tooling comes from `known-unknowns-receipt` (gxwf replay) and `skills-are-binaries-receipt` (the `count=1` word-count render, `put`/guard gates and `audit.py --count`).

## The idea

**Hero (158 pt, two lines):** *Write down what you don't know.* It sits under a `GALAXY WORKFLOW FOUNDRY` kicker.

**Pen thesis:** "A draft types its unknowns. A ledger lists the gaps it kept. A skill labels how far to trust each source. Each lives in a file, not a prompt."

**Three real receipts stapled at one corner.** This is the known-unknowns keeper's idea widened to three levels of explicit incompleteness. Each slip carries a `n/3` tag:

1. **Top: DRAFT STATEMENT** (`1/3 · STEPS`), the dengueseq-denv3 draft loop. It prints:
   - the opening balance `bd40715 … 31 TODO`;
   - the `map_reads` YAML (`tool_version: TODO`, the two `TODO_*` inputs, the first line of `_plan_state`);
   - the burn-down, 8 rows, each with step, `ok`, TODO left, a bar, and a SHA · tool sub-line;
   - `BALANCE DUE 0`, circled, then `GalaxyWorkflowDraft → GalaxyWorkflow` and the **PROMOTED** stamp.
2. **Middle: OPEN-REQUIREMENTS LEDGER** (`2/3 · REQUIREMENTS`), the same run's `entries:`:
   - 19 entries · 14 resolved · 5 open · of which 2 dropped on purpose;
   - the five open ids, each tagged `open` or `dropped`;
   - footer `gxwf 1.14.0 validate: pass · planemo 0.75.47 test: pass · with these five written down`;
   - stamp **CARRIED FORWARD**.
3. **Bottom: EVIDENCE TALLY** (`3/3 · SOURCES`), all 56 Mold casts at foundry `eb2de3f1`:
   - 360 citations: corpus-observed 223 · hypothesis 104 · cast-validated 33;
   - the schema rules "schema: hypothesis must name a verification · on-demand must name a trigger".

**Geometry.** One staple can't pierce three slips laid out side by side. Instead, the ledger and the tally are longer slips lying *behind* the draft. Their top-left corners share the draft's corner Q at the staple, and they are rotated about Q: the ledger +2° (right end down), the tally −3° (bottom swings right).
- The ledger prints only on the part that sticks out right of the draft.
- The tally prints only below the draft's torn edge.
- The hidden parts are blank paper.
- A sliver of the tally's corner peeks above the draft top, as a real fan would.

A pen line, "keep the receipts", points at the staple.

**Margin notes.** There are seven, each with an arrow to the slip line it explains:

| # | Note | Points at |
| - | - | - |
| 1 | Known unknowns [3] | the `TODO_*` inputs in the YAML |
| 2 | Valid at every resolution | the burn-down rows |
| 3 | Promote, don't translate | the promotion line |
| 4 | Gaps are output | the two `dropped` ledger lines |
| 5 | Hypothesis is a label | the tally's hypothesis row |
| 6 | Rails, not reminders, with the `tximport` catch as a typed foot | the tally's schema-rule footer |
| 7 | Unknown unknowns take a run, with the whole QA:466 quote | no arrow; it closes the poster |

**The one data visual** is the burn-down bars. The ledger and tally print numbers only.

## Rebuild

```sh
./build.sh
```

1. **Extract.** `extract.py` writes `receipt.json`, refreshing each section only when its sources exist (otherwise the committed section is kept):
   - **draft**: replays every draft commit through gxwf `draft-validate --json --concrete --connections` and asserts that the YAML diff agrees with gxwf's survey;
   - **ledger**: reads `entries:` with PyYAML from the run's `HEAD`. It asserts the ledger was last changed before the phase-10 test commit and not after it;
   - **tally**: walks every `casts/claude/skills/*/_provenance.json` at `FOUNDRY_REF` (default `origin/main`). It asserts that every on-demand ref has a trigger and that every hypothesis ref without a `verification` is a `companion_of` file.
2. **QR codes.** `make_qr.py` (segno) writes vector SVGs and `assets/qr.json`.
3. **Render.** `render.py` (Typst 0.15.0 via `uvx --from typst==0.15.0`, vendored fonts only) writes `poster.pdf`, `poster-bleed.pdf`, `preview.png` and the word-count render `poster-count.pdf`, which goes in the deps dir.
4. **Audit.** `audit.py` runs on both PDFs, plus `--count` on the count render.
5. **Checks.** `pdftoppm` writes `checks/preview-25.png` (1056 px), `checks/preview-gray.png` and `checks/thumb-200.png`.

**Requirements and locations:**
- **Tools:** `uv`, plus poppler for `checks/`.
- **gxwf, for the replay:** `npm i --prefix /private/tmp/claude-503/receipts-stapled-bundle-deps @galaxy-tool-util/cli@1.15.0`, with `npm_config_cache` under that directory. The tool cache is `…-deps/toolcache` (copied from the known-unknowns deps). Override with `POSTER_DEPS` or `GXWF`.
- **Other sources:** `FOUNDRY_RUNS` and `FOUNDRY_REPO` override the default paths. Run `git -C ~/projects/repositories/foundry fetch` first to print the latest tally.
- **Vault hygiene:** no `node_modules` and no symlinks in the vault.

**Debug render:** `sys_inputs={"noguard": "1"}` skips the layout gates.

### Build guards (the build fails on any of these)

| Guard | Where |
| - | - |
| Draft content overflows its slip; the footnote has no room below the promotion line | `poster.typ` |
| Ledger content overflows its slip; ledger print starts under the draft (bottom-left of print, rotated, vs the draft's right edge + 0.45 in); ledger past the right safe zone | `poster.typ` |
| Tally content overflows its slip; tally print starts above the draft's torn edge (top-right of print, rotated); tally into the right column or past the bottom safe zone; tally's peeking corner into the authors | `poster.typ` |
| Margin blocks overlap within a column (notes, QR tiles); a column past 43 in; the right column into the ledger; the left column into the ledger's fanned corner | `poster.typ` |
| A QR code (quiet zone excluded) under 2.5 in | `poster.typ` |
| A font outside the 7 vendored faces, or any unembedded font | `audit.py` |
| Any text under 24 pt (both PDFs) | `audit.py` |
| Any body text under 28 pt; body over 400 words | `audit.py --count` |

**Gates that fired during development:**
- draft footnote;
- ledger overflow;
- tally under the draft;
- left column past the safe zone;
- tally past the bottom safe zone.

The word-count gate first read 385. Tracked (letter-spaced) text split into single letters in extraction, so the slip tags now use 0.06 em tracking, and the count was 361 (355 after the applied review).

**Checked by hand:**
- **QR codes.** All three decode to their URLs (OpenCV, 60 dpi render), and each URL returned HTTP 200 on 2026-10-30.
- **Vectors.** Neither PDF has raster images.
- **Bleed.** `poster-bleed.pdf` is 44.25 in. Cropped by 0.125 in, it matches `poster.pdf` at 40 dpi (max channel diff 4, antialiasing).

## Fonts

All are SIL OFL fonts, copied from `../known-unknowns-receipt/fonts/`, embedded and subset; Typst runs with `ignore_system_fonts=True`.

| Font | Used for |
| - | - |
| Archivo Black | hero, stamps |
| IBM Plex Mono (Regular, SemiBold, Bold; Italic is vendored but unused) | slips, typed foots, authors, references |
| Kalam (Regular, Bold) | pen notes, thesis, "keep the receipts" |

## Body word count

**355 body words** (limit 400; 361 before the applied review). The method is the keeper way:
- **What counts:** every whitespace token with a letter or digit on the page, including every slip line item, hash, id, slip tag, note number and the `[[QR: live results]]` placeholder text.
- **What is exempt:** the kicker and hero, the authors and affiliations, the references and the QR captions. They are hidden in the `count=1` render, and `audit.py --count` counts what remains.

## Sources for every fact

`LT` is `gcc2026-lightning.mdx`, `GCC` is `gcc2026.mdx`, `FP` is `foundry-pattern.mdx` and `QA` is `foundry-qa.mdx`, all in `~/projects/repositories/jmchiltondotnet/src/content/slides/` (see the known-unknowns keeper). `RUN` is `~/projects/foundry-runs/dengueseq-denv3/dengueseq-denv3-galaxy`.

| On the poster | Source |
| - | - |
| TODO 31 → 27 → 24 → 19 → 13 → 9 → 4 → 0; `ok` on every row; step/tool/version per row; commits `bd40715 … b82fa5e`; 18:44–19:39 on 2026-10-20 | `extract.py` replay of `git log --reverse -- galaxy-workflow-draft.gxwf.yml` in `RUN`, using gxwf **1.15.0** `draft-validate` on 2026-10-30. "ok" means `ok`, `concrete.ok` and connections valid, with 0 failed and 0 skipped (known-unknowns predicate). This is a replay, not the run's own log, and the footnote says so. Matches catalogue C. |
| `7 steps planned` | step count of `bd40715` |
| YAML excerpt | `git show bd40715:./galaxy-workflow-draft.gxwf.yml`, lines 41–51. Abridged: the `label`, `tool_id` and `out:` lines are omitted without a mark; only the `_plan_state` cut is marked "…". |
| `GalaxyWorkflowDraft → GalaxyWorkflow` at `b82fa5e` | class of the draft at `bd40715`; `galaxy-workflow.gxwf.yml` at `b82fa5e` |
| Ledger: 19 entries · 14 resolved · 5 open · 2 dropped; the five ids and kinds | `RUN/open-requirements.ledger.yml`, `entries:` only, at `HEAD`. Matches catalogue F. |
| "as filed at run end" | The ledger last changed at `9673ccd` (phase 6). `extract.py` asserts that the phase-10 test commit `09ebf6d` and later commits did not touch it. |
| `gxwf 1.14.0 validate: pass` | `RUN/galaxy-workflow-validation-result.json` (`status`, `gxwf_package`) |
| `planemo 0.75.47 test: pass` | `RUN/workflow-test-result.json` (`status`, `planemo.version`) |
| `dropped` = source work deliberately not carried | foundry `content/research/open-requirements-ledger/index.md` (`kind: gap \| dropped`) |
| Tally: 56 skills, 360 citations, corpus-observed 223 · hypothesis 104 · cast-validated 33, @ `eb2de3f1` (2026-10-30) | `extract.py` over every `casts/claude/skills/*/_provenance.json` at foundry origin/main. 69 cast dirs = 56 Mold casts with provenance + 13 pipeline harnesses without. All six catalogue-M numbers were recomputed: load on-demand 226 · upfront 134; mode verbatim 326 · sidecar 34 (in `receipt.json`, not printed). |
| "schema: hypothesis must name a verification · on-demand must name a trigger" (tally footer) | `packages/gxwf-foundry-note-schema/src/types/context.ts:202-215`; `…/types/mold/kind.md:44-47`; `QA:724`, `QA:750` (via the skills-are-binaries keeper) |
| "A guess may ship if it says so" (note 5) | `…/types/pattern/kind.md` ("`hypothesis` is legal … a speculative pattern that is *marked* speculative can be safely loaded") |
| Note 1 (typed `TODO_*`, `_plan_*` intent) | `LT:32-72`; `GCC:962-1004` |
| Note 2 (checks the concrete, skips the deferred) | `LT:93` |
| Note 3 (ordinary gxformat2) | `GCC:1002` |
| Note 4: "Methods sections omit result-changing choices [1]" | Preprint pp.2, 5, 8 (`../../research/r7-biorxiv-preprint.md` §6.4); `../../DESIGN_DOSSIER.md` claim 6 |
| Note 6: "The model translates and repairs; the tools validate" | `FP:1092`, `FP:1046` |
| Note 6: "Guidance is not enforcement [1]" | Preprint p.16, "Skills are guidance, not enforcement" (r7 §F5) |
| Note 6 foot: the connection validator caught bad `tximport` wiring before it ran | Preprint p.4, pp.15–16, Fig S3A (r7 §6.2) |
| Note 7 quote | `QA:466` |
| [2] Vogels et al. 2024 | `RUN/../source-selection.md` (as in the known-unknowns keeper) |
| [3] "Known unknowns" | Rumsfeld, DoD news briefing, 12 Feb 2002 (the phrase only; the transcript ID is in the known-unknowns README) |

**QR codes:**

| Code | Target |
| - | - |
| The Foundry | `https://galaxyproject.github.io/foundry/` |
| Draft format docs (optional per outline) | `https://jmchilton.github.io/galaxy-tool-util-ts/#/guide/draft-format` |
| Preprint | `https://doi.org/10.64898/2026.10.26.761864` |
| `[[QR: live results]]` | placeholder, 4.2 in, top right |

There is no lightning-talk QR.

## `[[ASK]]` slots

**None.** The outline lists `[[ASK]]` under "deliberately left out", so Anton's nf-core work is absent. Nothing hides behind a flag, `SHOW_ASK=0` does not apply, and there is no no-ASK check render.

The only placeholder is `[[QR: live results]]`. Once the URL exists:
1. add it to `LINKS` in `make_qr.py`;
2. swap `placeholder(...)` in the header for `image("assets/qr-live.svg", width: live-w)`.

## Departures from the outline

1. **Fan angles.** The ledger is +2° and the tally −3°, not +2°/+4°. Both rotate about the shared corner, so a positive angle on the tall tally swings its bottom left into the margin notes. −3° (not −4°) keeps its torn edge inside the 43 in safe zone.
2. **Staple geometry.** The sketch can't share one staple, so the ledger and tally are long slips behind the draft with blank hidden parts (see "Geometry").
3. **Note placement.** Note 6 (Rails) moved to the bottom of the left column and note 7 to the bottom of the right column. With 5 and 6 both in the right column, their arrows into the tally crossed. Numbering and content are unchanged.
4. **Note 6 target and foot.** The arrow lands on the tally's schema-rule footer. 0/15 is **dropped**, which the outline allows. In its place is the positive preprint fact FEEDBACK_ROUND3 lists: the static connection validator caught the `tximport` wiring.
5. **Note 5 wording.** The outline's "each must name how it will be verified" with "104 of 360" is not printed, because 6 of the 104 provenance rows have no `verification`. All 6 are `companion_of` files whose primary reference carries one. So the poster prints the schema rule instead. The 104 appears once, on the tally.
6. **Thesis, last sentence.** "All three are checked, not promised" became "Each lives in a file, not a prompt." The ledger has no validator: its entry shape is "v1, loose" (`open-requirements-ledger/index.md`), and nothing schema-checks it. The draft and the skill labels are checked, but a thesis line must hold for all three.
7. **Ledger header.** "as filed at run end" replaces "after planemo test pass". The ledger last changed at phase 6, before the phase-10 test, and the test did not update it. The footer still carries both passes, with versions.
8. **Tally footer.** The outline's "the schema refuses the shortcut" is not printed. The footer is prefixed `schema:` instead, which names who enforces the rule.
9. **Added: `n/3` slip tags** (STEPS · REQUIREMENTS · SOURCES), 6 words. They make the three levels explicit, so the slips read as one case.
10. **Added: the "keep the receipts" pen line** at the staple. The pitch, in three words.
11. **YAML excerpt** is 7 printed lines: the outline's 6 plus `map_reads:` as the parent key, so the indentation stays honest.
12. **Draft footnote kept**, shortened to one line, though the outline cuts it. It states the replay's gxwf version (1.15.0) where the burn-down uses it; the ledger prints the run's own 1.14.0 validate.

## Open questions

1. **Kicker and hero.** Is the `GALAXY WORKFLOW FOUNDRY` kicker plus hero enough Galaxy context, or add a subtitle?
2. **Rumsfeld.** Keep the [3] attribution on "Known unknowns", or drop the reference?
3. **Two gxwf versions.** The burn-down is a 1.15.0 replay; the ledger footer prints the run's own 1.14.0 validate. OK to show both?
4. **"CARRIED FORWARD"** vs the note's term "surrendered". The run left the five as `status: open`, not `surrendered`. Keep the stamp?
5. **Note 6 target.** Is the tally footer (schema rules) right, or should rails point at the ledger's validate/test footer?
6. **Slip tags.** Worth their 6 words?
7. **Shop.** Print edge to edge on the trim, or use `poster-bleed.pdf`?

## Applied review

These are the eight NICE items from `REVIEW.md`. All were applied; none fight the outline, and none restructure the poster. Every guard passes after a rebuild, and `preview.png` was re-checked.

1. **Applied.** Highlighter `top-edge` changed from `"ascender"` to `"x-height"`, so the bars no longer clip descenders on the line above (notes 2, 3, 4 and 6, and the hero).
2. **Applied.** Burn-down `row-gutter` changed from 0.08 in to 0.2 in, and the trailing `v` from 0.2 in to 0.08 in. The sub-lines clear the step names, and the row pitch is unchanged.
3. **Applied.** Note 1's arrow now uses `ctrl: (12.4in, 15.1in)` and sweeps under `in:` onto `TODO_paired_reads`.
4. **Applied.** Note 4's arrowhead now lands in the ledger's left margin beside the `dropped` lines (`to: (-0.35in, 0.25in)`).
5. **Applied.**
   - (a) Each reference is its own paragraph (`#parbreak()`), so the hanging indent no longer indents [2] and [3].
   - (b) The DOI is joined with a zero-width space instead of a literal space.
6. **Applied.** The tally footer is prefixed `schema:` (+1 word), so the rule reads as the schema's, not as a property of all 104 rows.
7. **Applied.** The `at b82fa5e` line beside the PROMOTED stamp is cut (−2 words); `b82fa5e` is still printed on the `consensus_header` row.
8. **Applied.** Note 5's "The schema refuses the shortcut." is cut (−5 words), because the tally footer it points at now names the schema.

**Body word count: 355** (was 361).

