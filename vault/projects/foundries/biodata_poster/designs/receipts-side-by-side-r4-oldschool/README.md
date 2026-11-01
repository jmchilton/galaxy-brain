# receipts-side-by-side-r4-oldschool

Round-4 revision of `../receipts-side-by-side/` (left untouched for comparison), built under `../FEEDBACK_ROUND4.md` and `../FEEDBACK_ROUND3.md`, with `../ADVICE_ROUND4.md` (Part 1 and §2) as non-binding input. Round 4 kept the Claude-style visual language: graph paper, taped thermal slips, red stamps, tear lines, Kalam pen notes. This copy restyles it (see Round 5). `REVIEW.md` is the **round-3** review of the original poster, kept for history.

## Round 5 styling (Old-school)

This is a copy of `../receipts-side-by-side-r4/`, which was left untouched for side-by-side comparison. It is restyled under `../FEEDBACK_ROUND5.md` and `../STYLE_OLDSCHOOL.md`. It is a styling pass only: the text, facts, receipts, QR targets, layout and density are unchanged. The round-4 notes below describe the content and still apply.

### What changed

| Element | Claude style (r4) | Old-school |
| - | - | - |
| Ground | warm paper with a square grid | aged manila (`os-page`) under a radial vignette to `os-page-edge`, a faint cyan cross-process ring, and horizontal ledger ruling (0.5 in, a major line every 2 in). All of it is anchored to the trim, so the bleed crop still matches. |
| Ink | `#1d1d1b`, navy pen, red stamp | lifted black `os-ink`, graphite pen `os-pen`, faded stamp `os-stamp`. Nothing darker than `#2b2722`. |
| Slips (title, A, B, use-it card) | flat white | yellowed `slip-fill` that burns toward `os-slip-burn` at the foot, ~600 seeded vector grain specks per slip, and a hard 0.12 in `os-shadow` offset. The use-it card adds a square 1.5 pt `os-ink-soft` outline. |
| Torn edge | regular 0.38 in teeth | finer, irregular teeth (0.18 / 0.24 in steps, 0.13–0.17 in deep), filled `os-slip-burn`, with a 1 pt `os-shadow` hairline |
| Tape | flat cream | old masking tape: `tape-grad` with darker ends, a mixed `os-rule` outline, and a sparse `os-tape-edge` halftone |
| Stamps and A/B tags | Archivo Black, single rounded border | Oswald 600, letterspaced; square double border (4 pt outer and 3 pt inner, 6 pt apart); worn ink from ~45 seeded paper-coloured knockout specks |
| Title | Archivo Black 120 pt | Courier Prime Bold 108 pt, with a 1.8 pt ink stroke for typewriter ink spread. "receipts" is marked with an amber-over-`os-stamp` halftone (cap-height to baseline, as before). |
| Thesis | Kalam pen, rotated | Special Elite 54 pt `os-ink-soft` kicker, set straight, with a dotted rule under the title slip |
| Authors and refs | Plex Mono | IBM Plex Serif, with a thin `os-rule` above the authors. The 24 pt refs are set in `os-ink`, not `os-ink-soft`, because they sit in the vignette's darker band. |
| What it does | Kalam lead, pen-drawn rounded boxes | Oswald section head and a Plex Serif lead. The stations are printed cards: an Oswald title, a Plex Serif body and square corners. Skill and Tools judge are slips (`slip-fill`, 3 pt ink outline, offset shadow); the others are inner diagram boxes (`os-page` fill, 1.5 pt `os-ink-soft`). Station arrows use the route colour (`os-ink` mixed with 20% `os-cyan`). |
| Receipts | Plex Mono, 60 pt heads | Plex Mono body unchanged. Heads are Courier Prime Bold 66 pt. Timestamps (`@ eb2de3f1 · 2026-10-30`, `cast at`) and the footer use `os-ink-fade` semibold at ≥ 28 pt. |
| Pen notes, arrows, badges | Kalam navy, 5.5 pt arrows | Kalam in `os-pen`. Arrows are 4 pt with round caps. Number badges are hand-drawn, slightly out-of-round unfilled ellipses. |
| QR codes | `#1d1d1b` on white | `os-ink` modules on an opaque `os-qr-ground` with a 1.5 pt `os-rule` frame. The 4-module quiet zone is kept. There is no grain or vignette over the codes. The placeholder also sits on `os-qr-ground`. |
| `hl()` | `#f6e08a` | `os-hl` (sun-faded amber); `top-edge: "x-height"`, `bottom-edge: "descender"` unchanged |

**Build changes:**
- `build.sh` pins `FOUNDRY_REF=eb2de3f1`, so a later fetch can't change the receipts during the side-by-side. Override it to refresh.
- The deps and temp directory is `/private/tmp/claude-503/receipts-side-by-side-r4-oldschool-deps`.
- `make_qr.py` writes the old-school QR colours.
- `audit.py` has the new font allow-list. It also adds a word-count band gate, `WORD_BAND = (598, 660)` (±5% of the source's 629).
- New guards:
  - the title must fit its slip;
  - each receipt header must fit its fixed 2.15 in;
  - the station-card guard now measures the same content block it renders, not a hand-copied Kalam stand-in.

  All three were seen to fire on a deliberately oversized test copy.

### Fonts

| Font | Licence | Source | Used for |
| - | - | - | - |
| Courier Prime Bold | SIL OFL 1.1 (`fonts/OFL-CourierPrime.txt`) | google/fonts `ofl/courierprime` | title, receipt heads |
| Special Elite | Apache 2.0 (`fonts/LICENSE-Apache-2.0.txt`) | google/fonts `apache/specialelite` | thesis kicker |
| Oswald SemiBold (static) | SIL OFL 1.1 (`fonts/OFL-Oswald.txt`) | googlefonts/OswaldFont `fonts/ttf` | section heads, stamps, A/B tags, station titles |
| IBM Plex Serif (Regular, SemiBold) | SIL OFL 1.1 (`fonts/OFL-IBMPlexSerif.txt`) | google/fonts `ofl/ibmplexserif` | lead, station bodies, authors, refs |
| IBM Plex Mono (Regular, SemiBold, Bold) | SIL OFL 1.1 (`fonts/OFL-IBMPlexMono.txt`) | carried over from r4 | receipts, commands, counts, QR captions, every `→` |
| Kalam (Regular, Bold) | SIL OFL 1.1 (`fonts/OFL-Kalam.txt`) | carried over from r4 | pen notes, loop note, use-it steps, tally, closing note |

All 10 faces are embedded and subset (`pdffonts`). A per-glyph check found `→` and `·` only in Plex Mono, and `¹²³…` only in Plex Serif, so no glyph silently falls back to another face. Archivo Black is no longer used and was removed from `fonts/`. Only Plex Mono and Plex Serif have `→`, so every arrow is still set in Plex Mono.

### Departures from the guide

1. **Kalam, not Homemade Apple, for pen notes.** The guide lists Kalam as the fallback. Homemade Apple was tried on the closing line: it has a single light weight, its descenders collided with the next line, and it read worse than Kalam Bold at 6 ft. It is not vendored.
2. **Plex Mono, not VT323, in the receipts.** This is the guide's own "safest" option. The receipts are dense tables, and VT323 at 1.25× would not fit the fixed slips.
3. **Thicker strokes than the guide's hairlines**, scaled for a 44 in sheet:
   - stamp borders 4 pt / 3 pt, 6 pt apart (guide: 3 pt, 4 pt apart);
   - grain speck radius 1.2–2.6 pt (guide: 0.6 pt, which is below its own 0.04 in RIP floor);
   - ledger ruling 1.4 / 0.8 pt (guide: 0.8 / 0.5 pt);
   - arrows 4 pt (guide: 3 pt);
   - tape outline 1.2 pt (guide: 0.5 pt).
4. **Vignette clear zone widened**: page colour out to 62% of an 80% radius (guide: 55% / 75%). The amber highlights on the page (notes 1, 2, 4, 5 and the lead) then stay lighter than the ground near the edges. The cyan ring is at 74% (guide: 72%).
5. **Tape outline is an opaque mix** (`os-rule` 40% into `os-tape`) rather than 40% opacity. This keeps transparency to the vignette and grain, as the guide asks elsewhere.
6. **Title slip has no torn foot.** It keeps its tapes and fades at the foot. A torn edge would collide with the rule above the authors.
7. **Pen tally keeps its dashed, rounded pen border** rather than becoming a square card, because it reads as a pen stamp, not a box.
8. **Worn stamp knockout uses seeded specks**, not a regular white halftone. A regular dot screen read as a printed tint, not as wear.

### Word count

**629** (source 629; band 598–660, limit 700), from `audit.py --count`. Same counting rules as round 4; no words were added or removed.

### Checks done

- Previews were iterated three times against `../receipts-side-by-side-r4/preview.png`. Fixes along the way: the Special Elite leading, Homemade Apple dropped, stamp wear thinned after VOID's "I" read as "!", and an ink stroke added to the title.
- **6 ft** (`checks/thumb-200.png`): the title, the slips, the stamps and the vignette read as old-school.
- **3 ft** (`checks/preview-25.png`): every block is legible.
- **Greyscale** (`checks/preview-gray.png`): highlights read as light grey bands, stamps and tags as dark double outlines, and the cards separate from the ground by outline and shadow.
- **QR codes:** all three decode (zxing-cpp) from a 30 ppi render, in colour and in greyscale.
- **Bleed:** a crop of `poster-bleed.pdf` matches `poster.pdf` (max diff 1/255 at 40 ppi).
- **Vector:** `pdfimages -list` is empty, so there are no raster images.
- **`hl()`:** checked at 100 ppi on the lead and notes 2 and 5 (same fonts and leading as r4 elsewhere); no highlight covers a descender of the line above.

### Open questions (round 5)

1. Is the Courier Prime title (108 pt with an ink stroke) strong enough at 6 ft, or should the title go back to a heavier face (Archivo Black, in `os-ink`)?
2. Is the thesis OK as a typed Special Elite kicker? Or should it stay a pen note (Kalam, rotated) as in the Claude style?
3. Vignette depth: proof a 6×6 in swatch first. If the inkjet pushes the manila toward mustard, drop `os-page` to `#ebe4cf`, as the guide suggests.
4. Do the stamp wear specks survive print at this density (~45 per stamp)?

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
| Build: deps dir is now `/private/tmp/claude-503/receipts-side-by-side-r4-deps` (`-r4-oldschool-deps` in this copy); `extract_skill.py` also writes corpus counts; `make_qr.py` makes `qr-foundry`, `qr-usage`, `qr-preprint`. | |

### Body word count

**382 → 629** (limit 700), from `audit.py --count`. Every alphanumeric token on the page counts, including receipt line items, hashes, QTY, PASS, stamps, command lines and the `[[QR: live results]]` placeholder. The title, authors, references and QR captions are hidden in the count render.

| Region | Words |
| - | - |
| Thesis + live placeholder | 20 |
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
- `hl()` uses `top-edge: "x-height"`; only the hero's "receipts" uses `cap-height`. Checked at 100 ppi on every highlight (band lead, notes 1, 2, 3, 4, 5, receipt A `upfront`): no highlight covers a descender of the line above.

## Rebuild

```sh
./build.sh
```

1. `extract_skill.py` reads the foundry clone with `git show` and writes `receipt-skill.json`, including `corpus` counts by `git ls-tree`. Clone: `FOUNDRY_REPO` (default `~/projects/repositories/foundry`) at `FOUNDRY_REF` (in this copy `build.sh` defaults it to `eb2de3f1`; run `FOUNDRY_REF=origin/main ./build.sh` after `git -C ~/projects/repositories/foundry fetch` to print the latest). With no clone, the committed JSON is used.
2. `extract_typecheck.py` turns `data/` into `receipt-typecheck.json` (offline; asserts totals against gxwf's text summary).
3. `make_qr.py` (segno) writes vector SVGs and `assets/qr.json`.
4. `render.py` runs Typst 0.15.0 via `uvx --from typst==0.15.0`, vendored fonts only, and writes `poster.pdf` (44 in), `poster-bleed.pdf` (44.25 in), `preview.png` (1496 px) and a word-count PDF in `/private/tmp/claude-503/receipts-side-by-side-r4-oldschool-deps/` (override with `POSTER_TMP`).
5. `audit.py` runs the font, size and word-count gates.
6. `pdftoppm` writes `checks/preview-25.png` (1056 px), `checks/preview-gray.png` and `checks/thumb-200.png`.

`./rerun_gxwf.sh` is optional and was not re-run. It refreshes `data/` from IWC `23ccd9915` with `@galaxy-tool-util/cli@1.15.0`; npm and its cache go in `/private/tmp/claude-503/receipts-side-by-side-r4-oldschool-deps`.

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

Seen to fire this round: build receipt overflow, use-it card overflow, closing note overflow, and the vendored-font gate (Kalam has no `→`; arrows in Kalam text are now set in Plex Mono).

**Also checked (round 4; see Round 5 → Checks done for this copy):** `poster-bleed.pdf` cropped by 0.125 in is pixel-identical to `poster.pdf` (max diff 0 at 40 ppi); `pdffonts` shows all 6 faces embedded and subset; greyscale render keeps all text legible (highlights fade to light grey, stamps and tags read as dark outlines).

## Fonts

See **Round 5 styling → Fonts** above for this copy. Everything is vendored in `fonts/` and embedded, and Typst runs with `ignore_system_fonts=True`. (Round 4 used Archivo Black, IBM Plex Mono and Kalam.)

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
| Tally: 133 workflows · 3,217 tool calls · 0 failed · 1 skipped (version mismatch in file) | `data/iwc-tree-summary.json` (tool state only, non-strict) |
| "The Tool Shed serves typed schemas for 10,000+ tools. gxwf checks each tool call against its own." | GCC:408; `manuscript.md:5,146` ("served", not "validated"); `data/validate.json` per-step results |
| Note 3: "The model translates and repairs; the tools validate." / "guidance, not enforcement [1]" / `tximport` catch [1] | known-unknowns keeper note 6; preprint p.16; preprint p.4, pp.15–16, Fig S3A |

**QR codes.** Vector, from segno (`make_qr.py`); each printed code ≥ 2.5 in (guarded). Each URL returned HTTP 200 on 2026-10-30. No lightning-talk QR.

| Code | Target | Where |
| - | - | - |
| The Foundry (required) | `https://galaxyproject.github.io/foundry/` | right end of the machine band |
| Install guide | `https://galaxyproject.github.io/foundry/usage/` | use-it card |
| Preprint [1] (required) | `https://doi.org/10.64898/2026.10.26.761864` | gutter, under note 3 |
| `[[QR: live results]]` | placeholder, 3.3 in | title slip, top right |

## `[[ASK]]` items

**None.** Anton's foundry-paper nf-core work is left out, so there is no `SHOW_ASK` flag and no SHOW_ASK=0 render. The only placeholder is `[[QR: live results]]`: once the URL exists, add it to `LINKS` in `make_qr.py` and swap the `placeholder(...)` for `image("assets/qr-live.svg", width: live-w)`.

## Open questions

1. Route example in the card: `pipeline-paper-to-galaxy` (direct build), or the Plan & Build pair (`…-paper-to-workflow-brief`, then `…-workflow-brief-to-galaxy`) that matches how DengueSeq ran?
2. Pipeline count: print none (current), 7, or 13?
3. Corpus counts in the band (420 / 56 / 69 at `eb2de3f1`): keep, or drop for air? "69 skills" includes 13 pipeline harnesses, while `/usage/` shows "56 shared skills".
4. "Handed over." wording OK? It must not read as if slip B checked a Foundry-written workflow.
5. Machine station names: "Tools judge" vs "Validators" or "Oracles".
6. Re-check at print: `discover-shed-tool` still rev 5 at foundry HEAD, corpus counts, QR URLs (`FOUNDRY_REF=origin/main ./build.sh` after a fetch).
7. Print shop: trim edge-to-edge, or `poster-bleed.pdf`?
