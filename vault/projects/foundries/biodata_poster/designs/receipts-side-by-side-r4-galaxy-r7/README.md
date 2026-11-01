# receipts-side-by-side-r4-galaxy

Round-5 **Galaxy style** restyle of `../receipts-side-by-side-r4/` (left untouched for side-by-side comparison), per `../FEEDBACK_ROUND5.md` and `../STYLE_GALAXY.md`. Styling only: same text, facts, receipts, QR codes, layout and density. Everything below "Round 4 changes" describes the content, which is unchanged; the Fonts, Rebuild and "Also checked" parts are updated for this copy. `REVIEW.md` is the **round-3** review of the original poster, kept for history.


## Round 6

- Dropped the `[[QR: live results]]` tile and its caption.
- Header kicker added above the title: white Galaxy logo (0.62 in) + gold tracked mono **WORKFLOW FOUNDRY** (36 pt). The 4.6 in top-right logo is gone, so the logo appears once. Guards: kicker in safe zone, kicker clears the title.
- Title, accent bar and thesis moved down ~0.65 in, authors 0.4 in; band height unchanged. The thesis widens to 23.1 in into the freed right end.

## Round 5 styling (Galaxy)

### What changed

| Element | Claude style (r4) | Galaxy style (this copy) |
| - | - | - |
| Page | warm paper `#f2efe4`, grey-green grid | `gx-page` `#edf4fa`, 0.25 in grid in `gx-grid` / `gx-grid-major` |
| Title | white slip with tape, Archivo Black, "receipts" highlighted | full-bleed **masthead band**: 45° (CSS 135°) gradient `gx-dark` → `gx-primary`, 0.5 in grid of 1 pt lines at 3% white, 0.25 in gold bar along its bottom, gold vertical accent bar before the title. Title white Atkinson Bold 124 pt, tracking −0.02em; "receipts" in `gx-gold`, unhighlighted |
| Thesis | Kalam navy | Kalam Bold `gx-gold`, same rotation |
| Logo | none | Galaxy white wordmark (`assets/galaxy_logo_white.svg`, from `galaxy-hub@e80ba8d78`), once, 0.62 in in the header kicker (r6), vector, not recoloured |
| Authors | Plex Mono on paper under the slip | inside the masthead: white Atkinson Bold 40 pt; affiliations Atkinson 28 pt in `gx-tape` |
| What-it-does lead | Kalam pen | Atkinson: heading Bold 60 pt, lead 40 pt `gx-dark`, `hl()` kept |
| Machine stations | pen-outlined Kalam boxes | `gx-tint` boxes, 0.08 in radius, 2 pt `gx-grid-major` edge, Atkinson. Skill and Tools judge (the slip A/B stations) are the gates: `gx-dark` fill, 6 pt gold ring, white text. Arrows and the dashed loop: `gx-primary` 4 pt |
| Receipts | cream slip, ink `#1d1d1b`, Plex Mono 30 pt | white slip, ink `gx-dark`, Atkinson Hyperlegible Mono at 28.5 pt (keeps the r4 line measure: Atkinson Mono is 0.632 em vs Plex 0.600). 0.06 in `gx-primary` printer strip along the top edge; square corners, torn bottom, `gx-shadow` shadow. PASS in `gx-ok` |
| A/B tags | red outlined Archivo boxes | `gx-primary` fill, white Atkinson Bold, 0.08 in radius (inverse, white on the dark gate stations) |
| Stamps | single red border, Archivo Black | **double border** (6 pt + 2.5 pt), Atkinson Bold, same rotation and row size. TYPED and NEVER HAND-EDITED in `gx-ok`; VOID, FAIL, INVALID and `"PE_fragment"` in `gx-danger` |
| Tape | cream rectangles | `gx-tape` at full opacity, 1.2 pt `gx-grid-major` edge, saw-tooth ends; same strips, angles and placement |
| Pen notes | Kalam navy, outlined Kalam badges | Kalam in `gx-primary`; badges are `gx-primary` discs with white Atkinson Bold numerals; leaders `gx-primary` 3.5 pt |
| Use-it card | untorn slip with tape | Hub card: white, 0.25 in radius, 0.08 in `gx-shadow`, 0.12 in gold left bar; tape kept. Atkinson headings and steps, Atkinson Mono Bold commands |
| QR codes | square white tiles | black modules on a white tile with 0.25 in radius (cut from the 4-module quiet zone, guarded) and a `gx-shadow` offset; captions Atkinson Bold `gx-dark` 28 pt. Install-guide QR 3.15 in (code 2.54 in) for breathing room beside the longest command |
| References | Plex Mono grey on paper | full-bleed `gx-deep` **footer band**, white Atkinson 24 pt |

Small layout moves: the masthead band is 7.1 in tall + a 0.25 in gold bar, holding kicker, title, thesis and authors; the what-it-does band stays at 8.5 in; the footer band starts at 42.27 in, refs at 42.42 in; the use-it card ends 0.3 in above the footer; the closing note moved up 0.05 in. Nothing else moved. Per the guide ("Atkinson everywhere except the pen notes"), the lead and machine moved from Kalam to Atkinson; the loop note, notes 1–6, the tally, the card tagline and the thesis stay Kalam.

### Fonts and licenses

All vendored in `fonts/`, embedded and subset (`pdffonts`), Typst run with `ignore_system_fonts=True`.

| Font | Use | License / source |
| - | - | - |
| Atkinson Hyperlegible Regular, Bold, Italic (BoldItalic vendored, unused) | title, authors, lead, stations, tags, stamps, card, captions, references | SIL OFL 1.1 (`fonts/OFL-AtkinsonHyperlegible.txt`), `github.com/google/fonts` `ofl/atkinsonhyperlegible` |
| Atkinson Hyperlegible Mono Regular, Bold | receipts, commands, counts, placeholder | SIL OFL 1.1 (`fonts/OFL-AtkinsonHyperlegibleMono.txt`, no Reserved Font Name). Google Fonts ships only the variable `[wght]` file, so the 400 and 700 statics were instanced with fontTools `varLib.instancer` |
| IBM Plex Mono Regular, Bold (SemiBold vendored, unused) | fallback only, for `→` (neither Atkinson face nor Kalam has it) and the guard message | SIL OFL 1.1, as in r4 |
| Kalam Regular, Bold | thesis, pen notes, loop note, tally, closing note, card tagline | SIL OFL 1.1, as in r4 |

Archivo Black is removed from `fonts/` and from `audit.py`'s allowed set.

### Departures from the guide

1. **No tape on the masthead.** The r4 title slip had two corner tapes; the masthead is a full-bleed band, not a slip, so tape there reads wrong. Every receipt and the use-it card keep theirs.
2. **Dot leaders in `gx-grid-major`, not `gx-rule`.** `#dee2e6` on white is about 1.3:1, too faint for dotted leaders at 3 ft (chosen before rendering, not A/B tested); dividers and tear lines are `gx-grey`.
3. **Note leaders 3.5 pt, not 2.5 pt.** 2.5 pt was faint at the 25% check on a 44 in sheet (r4 used 5.5 pt). Route arrows are the guide's 4 pt.
4. **Receipt mono at 28.5 pt, not 30 pt**, so Atkinson Mono keeps r4's line measure (no rewrapped rows; still ≥ 28 pt body).
5. **Sans fallback is Plex Mono, not Plex Sans** (`sans = ("Atkinson Hyperlegible", "IBM Plex Mono")`): Plex Sans isn't vendored and is only reached for `→`.
6. **Thesis beside title line 2, not under the title** (r4 placement kept; there is room, and moving it would push the authors out of the band).
7. **NEVER HAND-EDITED is a `gx-ok` stamp** (the guide lists only PASS/VALIDATED/SIGNED vs FAIL/REFUSED; it is an attestation, like SIGNED).
8. **Gold count**: masthead bar, accent bar, hero mark and thesis in the masthead; two gate rings in the band; one card bar. Slightly over "about 3 per region" in the masthead, because the guide itself offers Kalam gold for the thesis.

### Word count

**629 → 629** (0%), `audit.py --count`. No copy changed.

### Checks run

- Build guards all pass (`./build.sh`): overflow, station fit, safe zone, QR ≥ 2.5 in, text ≥ 24 pt, body ≥ 28 pt, ≤ 700 words, vendored fonts only.
- New guard: **one-line rows**. `row`, `ln`, `item`, `ref-item` and `cmd` fail the build if their content would wrap (a wrapped row used to be absorbed by the `v(1fr)` slack). Seen to fire with receipts at 30 pt (`receipt line wraps`). New guard: the QR tile radius must sit inside the quiet zone.
- QR: all three codes decode (zxing-cpp, 100 ppi render) to the Foundry, preprint and usage URLs.
- `poster-bleed.pdf` cropped by 0.125 in vs `poster.pdf` at 40 ppi: 18 px differ (max 33/255), all on the anti-aliased right edge of the rounded QR shadows; the bands are drawn from the page origin and run full-bleed.
- Gradient angle confirmed on a render: dark top-left to `gx-primary` bottom-right.
- Greyscale (`checks/preview-gray.png`): masthead, gold bar, gate stations, slips, tags and stamps (double border + word) separate; PASS reads dark. Highlights vanish (see open questions).
- `receipt-skill.json` and `receipt-typecheck.json` are byte-identical to r4's (foundry `origin/main` is still `eb2de3f1`).

### Open questions (Galaxy)

1. `hl()` highlights sit on `gx-page`, not white slips, so they disappear in greyscale and are faint in colour. Accept, or put note bodies on white?
2. Thesis: Kalam gold (current) or white Atkinson 40 pt+ (guide's other option, one less gold use)?
4. Gate stations dark: good emphasis for slip A/B, or too heavy under the dark masthead?
5. `#ffd700` gold bar/hero mark: ask the printer for a proof (edge of CMYK gamut).
6. Masthead tapes dropped (departure 1). Want a tape or two back, e.g. over the gold bar at the corners?

## Round 4 changes

John's notes for this poster: best title and a good "Rails, not reminders" note, but **a reader doesn't learn what the Foundry does or how to use it**, and it is **too symmetric**.

| Change | Why |
| - | - |
| **"What it does" band** under the authors: a lead sentence (knowledge problem, not syntax problem) and a pen-drawn machine of 6 stations, Notes → Mold → Cast → Skill → Agent → Tools judge, each with a 1–2 line explanation, plus a dashed return loop "Wrong? Fix the note, not the skill, and re-cast: the hash changes." Notes, Molds and skills carry corpus counts. | Teaches what the Foundry is before any evidence (feedback: "what it does"). Uses the FP deck's machine (slides 7–10) as vector boxes, not the generated PNG. |
| **Slips tagged A and B, and the band points at them.** The Skill station carries a `slip A` tag, Tools judge a `slip B` tag; the receipts carry matching red A/B tabs. | Turns the receipts from loose evidence into proof of two named stations. |
| **Asymmetry with a direction.** BUILD (A) is narrower (12.2 in), higher (top 16.4 in) and shorter (17.9 in). TYPE-CHECK (B) is wider (13.0 in), lower (top 18.1 in) and longer (22.0 in). A pen arrow runs from A's head down to B's head, with the gutter note "Handed over." | "Too symmetric." The shared `yb` bridge line and equal-height slips are gone; the order (skill, then gate) is now visible. |
| **"Use it." card** (bottom left): "Install once. Choose a route. Run the work."; the Claude Code and Codex install lines; one route invocation; `npm install -g @galaxy-tool-util/cli` and a `gxwf validate` line; `/usage/` QR beside it. | Feedback: "how to use it". |
| **Notes rewritten to explain the slip.** Note 1 is now "One skill, one Mold" (what SKILL.md and the Mold are). Note 2 explains LOAD (upfront / on demand) and MODE (verbatim / sidecar) before "each hash pins the exact note cast". Note 4 gets back its second sentence. | Note 1's analogy grid duplicated the machine; the receipt's LOAD · MODE column was unexplained. |
| **QR codes:** Foundry (in the band, beside the machine), Install guide `/usage/` (in the card), Preprint [1] (in the gutter, under note 3, which cites it). gxwf docs and GCC slides QRs dropped; no mirrored stacks. | Advice: cut the mirrored stacks and an optional QR; each code now sits by its topic. |
| **Thesis** cut to "A skill is compiled from notes people can read; a workflow is type-checked before any job runs." | Round-3 review item 3 / open question 1; advice. |
| **IWC tally** restyled as a large rotated pen stamp across B's bottom-right corner (96 pt numbers). | Advice idea (b): the right side is heavier on purpose. |
| **Closing note 6** moved under B and the gutter; its second line is now GCC's three boxes: "Format 2: more intuitive, less context, robust tooling." | The old second line ("agents write Format 2; gxwf judges it") is now the band's last two stations. |
| Word gate raised from 400 to **700** (`audit.py` `MAX_WORDS`). | Round 4 lifts the cap; advice band for this poster is 550–700. |
| Build: deps dir is now `/private/tmp/claude-503/receipts-side-by-side-r4-deps` (this copy: `…-r4-galaxy-deps`); `extract_skill.py` also writes corpus counts; `make_qr.py` makes `qr-foundry`, `qr-usage`, `qr-preprint`. | |

### Body word count

**382 → 629** (limit 700), from `audit.py --count`. Every alphanumeric token on the page counts, including receipt line items, hashes, QTY, PASS, stamps, command lines. The title, authors, references and QR captions are hidden in the count render.

| Region | Words |
| - | - |
| Thesis | 20 |
| What-it-does band (lead, 6 stations, counts, loop) | 141 |
| Left notes 1–2 | 56 |
| BUILD receipt A | 82 |
| Gutter: "Handed over." + note 3 | 62 |
| TYPE-CHECK receipt B | 132 |
| Right notes 4–5 + tally | 63 |
| Use-it card | 57 |
| Closing note 6 | 16 |

### Departures from the advice

1. **No "the skill the agent used → the workflow it wrote" arrow.** That caption would be false: slip B is `gxwf validate` over IWC's unmodified, human-authored `rnaseq-pe.ga`, not a workflow written by a Foundry agent (and it is `.ga`, not Format 2). The arrow's note says instead: "The agent runs skill A; every workflow it writes goes through gxwf validate, the check on slip B. Here it runs on IWC's own rnaseq-pe." It names the command, not B's strict flags, because the Foundry's `validate-galaxy-workflow` uses `--connections --strict` only optionally (r1 §4.1).
2. **Band has 6 stations** (Notes, Mold, Cast, Skill, Agent, Tools judge) rather than the advice's 5-step string; "Skill" and "Agent" are split so each receipt hangs off its own station.
3. **QR codes are placed by topic, not in one row.** A single row of three 3.3 in tiles would not fit beside the install lines (28 pt floor) without wrapping a command.
4. **`cast_history` not restored** (round-3 open question 2). Its last entry is rev 5 on 2026-05-07, which reads as contradicting the slip's `cast at 2026-09-13` (r1 §5.1: the history lags content-hash re-casts). A stays short, as the advice says, rather than padded.
5. **No slip tilt or overlap** (advice idea a). Rotated slips would move the anchors the arrows land on; the height, width and position offsets carry the asymmetry.
6. **No pipeline count** is printed (7 at abstract time vs 13 on main is John's call, r1 line 13). The card shows one route invocation, not a list.
7. DengueSeq is not mentioned, so nothing can imply all 7 tool pins pass `discover-shed-tool`'s VERIFY schema.

## Round-3 global fixes (checked)

- Authors verbatim with Scott Cain¹ before Anton Nekrutenko¹.
- Foundry and preprint QR codes present (doi:10.64898/2026.10.26.761864). No lightning-talk QR.
- No Orbit 0/15 anywhere. No Rumsfeld quote.
- `wall time` comes before `JOBS RUN` (JOBS RUN at 36 pt, not hero size).
- `hl()` uses `top-edge: "x-height"` everywhere. Round 5: the hero's "receipts" has no highlight (gold on the masthead). Re-checked at 100 ppi after the font swap (receipt A `upfront` under `galaxy-tool-discovery`, note 2 `exact note`, band lead): no highlight covers a descender of the line above.

## Rebuild

```sh
./build.sh
```

1. `extract_skill.py` reads the foundry clone with `git show` and writes `receipt-skill.json`, including `corpus` counts by `git ls-tree`. Clone: `FOUNDRY_REPO` (default `~/projects/repositories/foundry`) at `FOUNDRY_REF` (default `origin/main`). `git -C ~/projects/repositories/foundry fetch` first to print the latest. With no clone, the committed JSON is used.
2. `extract_typecheck.py` turns `data/` into `receipt-typecheck.json` (offline; asserts totals against gxwf's text summary).
3. `make_qr.py` (segno) writes vector SVGs and `assets/qr.json`.
4. `render.py` runs Typst 0.15.0 via `uvx --from typst==0.15.0`, vendored fonts only, and writes `poster.pdf` (44 in), `poster-bleed.pdf` (44.25 in), `preview.png` (1496 px) and a word-count PDF in `/private/tmp/claude-503/receipts-side-by-side-r4-galaxy-deps/` (override with `POSTER_TMP`).
5. `audit.py` runs the font, size and word-count gates.
6. `pdftoppm` writes `checks/preview-25.png` (1056 px), `checks/preview-gray.png` and `checks/thumb-200.png`.

`./rerun_gxwf.sh` is optional and was not re-run. It refreshes `data/` from IWC `23ccd9915` with `@galaxy-tool-util/cli@1.15.0`; npm and its cache go in `/private/tmp/claude-503/receipts-side-by-side-r4-galaxy-deps`.

Needs `uv` and poppler. No `node_modules`, no symlinks in this directory.

**Debug renders:** `sys_inputs={"noguard": "1"}` turns overflow asserts into red on-page messages; `debug=1` prints each receipt's natural height against its space.

**To edit the copy:**
- Title, thesis and authors: top of `poster.typ`.
- The machine: the `stations` array (title, body, count) and the loop note.
- Receipts: the two `#receipt(...)` calls (`ax/ay/aw/ah`, `bx/by/bw/bh` set their boxes).
- Notes: `note-at(...)` calls, the gutter `context` block (note 3), the tally `put`, the use-it card, the closing `put`.

### Build guards

| Guard | Where |
| - | - |
| Each receipt's content fits its slip | `poster.typ` (`receipt`) |
| Each station's text fits its box | `poster.typ` (station loop) |
| Every note, tally, QR, thesis, author block, card, closing line and reference block stays inside its limit or the 1 in safe zone | `poster.typ` (`put`, `note-at`, note 3) |
| Gutter ≥ 3.7 in; right column ≥ 5.2 in; columns inside the safe zone | `poster.typ` |
| QR code (quiet zone excluded) ≥ 2.5 in | `poster.typ` (`qr-tile`) |
| Text < 24 pt anywhere | `audit.py`, both PDFs |
| Body text < 28 pt (exempt blocks hidden) | `audit.py --count` |
| Body > 700 words | `audit.py --count` |
| A font outside the vendored set, or unembedded | `audit.py` |
| A one-line receipt row, tool line, ref line or command wraps (round 5) | `poster.typ` (`one-line`) |
| QR tile radius cuts into the code (round 5) | `poster.typ` (`qr-tile`) |

Seen to fire in round 4: build receipt overflow, use-it card overflow, closing note overflow, and the vendored-font gate (Kalam has no `→`; arrows in Kalam text are now set in Plex Mono).

**Also checked (round 5):** see "Checks run" under Round 5 styling (bleed crop, `pdffonts` 9 faces embedded and subset, QR decode, greyscale).

## Fonts

Round 5 (Galaxy): see "Fonts and licenses" under Round 5 styling. Atkinson Hyperlegible and Atkinson Hyperlegible Mono replace Archivo Black and most Plex Mono use; Kalam stays for pen notes; Plex Mono is only a glyph fallback.

## Sources for every fact

- **Foundry:** `galaxyproject/foundry` at origin/main **`eb2de3f1`** (2026-10-30, fetched at build).
- **IWC:** `23ccd9915`, gxwf `@galaxy-tool-util/cli` 1.15.0, run 2026-10-30 (the typed keeper's saved run, in `data/`).
- **Abbreviations:** `FP` = `foundry-pattern.mdx`, `QA` = `foundry-qa.mdx`, `GCC` = `gcc2026.mdx`, all in `~/projects/repositories/jmchiltondotnet/src/content/slides/`. `r1` = `../../research/r1-foundry-system.md`. "Dossier" = `../../DESIGN_DOSSIER.md`. "Preprint" = Baker et al. 2026, doi:10.64898/2026.10.26.761864, as summarised in `../../research/r7-biorxiv-preprint.md`.

| On the poster | Source |
| - | - |
| "Writing a correct Galaxy workflow is a knowledge problem, not a syntax problem … lets tools, not the model, decide." | Dossier §2 (the one-breath argument) |
| Notes: "Plain files written to be read by a person: patterns, schemas, CLI pages." | FP slide 7 (lines 95–115); r1 §1.1 note kinds |
| Mold: "One action. A typed list of the notes it needs, and how to load each." | FP slide 8 (lines 117–144: "typed reference manifest", load policy) |
| Cast: "A compiler, not a model: scoped, isolated, frozen. Hashes every source." | FP slide 9 (lines 146–176), FP:211–212 ("the compiler"); r1 §3.2 (every ref `source: deterministic`, no LLM in the cast step; src/dst hashes) |
| Skill: "What the agent loads, with its build receipt. Never hand-edited." | FP:172, QA:790; FP slide 10 (provenance) |
| Agent: "Reads a paper or a pipeline; writes a Format 2 workflow, one step at a time." | Dossier §3.4 (routes from paper, Nextflow, CWL); r1 §2 (`advance-galaxy-draft-step` loop); Foundry runs emit `galaxy-workflow.gxwf.yml` |
| Tools judge: "gxwf checks tools, state and connections. Planemo runs the tests." | Dossier §3.5; r1 §4.1 |
| 420 notes · 56 Molds · 69 skills | `receipt-skill.json` `corpus`, counted by `extract_skill.py` at `eb2de3f1` with the dossier/r1 definitions (`.md` under `content/`, dirs in `content/molds/` and `casts/claude/skills/`). Same as dossier §4 (2026-10-24). 69 = 56 Mold casts + 13 pipeline harnesses (r1 §8). |
| Loop: "Wrong? Fix the note, not the skill, and re-cast: the hash changes." | FP slide 9 note; dossier §3.7; r1 §5.1 (`73af1f62`, `content_hash` changed) |
| Note 1: SKILL.md is what the agent loads; the Mold is its source, one action and the notes it needs | r1 §3.1–3.2; FP slide 8 |
| Note 2: upfront / on demand + trigger; verbatim copies, sidecar compiles (CLI page → JSON); each hash pins the note | FP slide 8 (load policy, placement); r1 §3.2 ("a sidecar transforms its source … markdown CLI page into JSON"; "a verbatim copy proves itself") |
| "Handed over." note | `discover-shed-tool` runs inside `advance-galaxy-draft-step`; `validate-galaxy-workflow` runs `gxwf validate` (r1 §2.1, §4.1). Slip B is IWC `rnaseq-pe` (`data/run-meta.txt`). |
| Use it: `/plugin marketplace add galaxyproject/foundry`, `/plugin install foundry-skills@galaxy-workflow-foundry`, `codex plugin marketplace add galaxyproject/foundry`, `codex plugin add foundry-skills@galaxy-workflow-foundry` | foundry `README.md` @ `eb2de3f1` lines 43–52 (r1 lines 333–334) |
| "Install once. Choose a route. Run the work."; `/foundry-skills:pipeline-paper-to-galaxy` | `https://galaxyproject.github.io/foundry/usage/`, fetched 2026-10-30 (HTTP 200) |
| `npm install -g @galaxy-tool-util/cli` | GCC:459 ("Published CLI + docs") |
| `gxwf validate <workflow> --connections` | the receipt's own command (`rerun_gxwf.sh`) |
| "Format 2: more intuitive, less context, robust tooling."; "Good for humans, so good for agents" | GCC:602–619 |
| BUILD receipt lines (SKILL.md, MOLD revision 5 · `05c99cba`, cast at 2026-09-13, 5 refs with load · mode and 8-char hashes, REQUIRES gxwf ^1.15.0, VERIFY galaxy-tool-pin.json schema `c0940fc0`) | `casts/claude/skills/discover-shed-tool/_provenance.json`, `_required_tools.json`, `_verify.json` via `extract_skill.py` |
| "NEVER HAND-EDITED"; "KEEP THIS RECEIPT. It is the part a model cannot regenerate." | QA:790, FP:172; `foundry-machine.svg`, FP:563–592 |
| TYPE-CHECK head, command, 10 tool lines, `inside 4 subworkflows 24`, Tool state 39/0, `list:paired → fastp`, 5 map-overs, 13 reductions, Connections 57/0 | `data/run-meta.txt`, `data/validate.json`, `data/validate.txt` via `extract_typecheck.py` |
| wall time < 1 s; "Under a second" | `data/timing.txt` (5 runs, 0.57–0.70 s) |
| JOBS RUN 0 | `gxwf validate` is static and runs no jobs |
| VOID FAIL / INVALID lines; "one typo planted per copy"; "A one-letter typo" | `data/void-param.json`, `data/void-conn.json` (planted by `rerun_gxwf.sh`); `PE_fragments` → `PE_fragment` |
| Tally: 133 workflows · 3,217 tool calls · 0 failed | `data/iwc-tree-summary.json` (tool state only, non-strict) |
| "The Tool Shed serves typed schemas for 10,000+ tools. gxwf checks each tool call against its own." | GCC:408; `manuscript.md:5,146` ("served", not "validated"); `data/validate.json` per-step results |
| Note 3: "The model translates and repairs; the tools validate." / "guidance, not enforcement [1]" / `tximport` catch [1] | known-unknowns keeper note 6; preprint p.16; preprint p.4, pp.15–16, Fig S3A |

**QR codes.** Vector, from segno (`make_qr.py`); each printed code ≥ 2.5 in (guarded). Each URL returned HTTP 200 on 2026-10-30. No lightning-talk QR.

| Code | Target | Where |
| - | - | - |
| The Foundry (required) | `https://galaxyproject.github.io/foundry/` | right end of the machine band |
| Install guide | `https://galaxyproject.github.io/foundry/usage/` | use-it card |
| Preprint [1] (required) | `https://doi.org/10.64898/2026.10.26.761864` | gutter, under note 3 |

## `[[ASK]]` items

**None.** Anton's foundry-paper nf-core work is left out, so there is no `SHOW_ASK` flag and no SHOW_ASK=0 render. There are no placeholders.

## Open questions

1. Route example in the card: `pipeline-paper-to-galaxy` (direct build), or the Plan & Build pair (`…-paper-to-workflow-brief`, then `…-workflow-brief-to-galaxy`) that matches how DengueSeq ran?
2. Pipeline count: print none (current), 7, or 13?
3. Corpus counts in the band (420 / 56 / 69 at `eb2de3f1`): keep, or drop for air? "69 skills" includes 13 pipeline harnesses, while `/usage/` shows "56 shared skills".
4. "Handed over." wording OK? It must not read as if slip B checked a Foundry-written workflow.
5. Machine station names: "Tools judge" vs "Validators" or "Oracles".
6. Re-check at print: `discover-shed-tool` still rev 5 at foundry HEAD, corpus counts, QR URLs (`./build.sh` after a fetch).
7. Print shop: trim edge-to-edge, or `poster-bleed.pdf`?

## Round 7

- Learning-loop arrow (Tools judge → Notes) is now one dashed pen swoop ~0.9 in below the station bottoms that curls up at both ends (quad curls + straight run, drawn from the Notes tip so the dash starts solid under the arrowhead). The "Wrong? Fix the note…" line moved down to loop-y + 1.25 in; a guard keeps the swoop ≥ 0.25 in above it.
- Receipt tapes shorter (2.6 in), flatter (±6–7°) and lower so they clear the pen line; guard checks each tape top sits below the line's box.
- IWC tally drops "skipped" and "(version mismatch in file)"; `0 failed` raised to 96 pt to match the other two lines.
- No Tool Shed drift story existed here; Codex commands were already explicit in Get started.
