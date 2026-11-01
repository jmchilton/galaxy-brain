# skills-are-binaries-receipt (round 4, Galaxy+ styling)

Round-5 **Galaxy+** restyle (`../STYLE_GALAXYPLUS.md`, on top of `../STYLE_GALAXY.md`) of `../skills-are-binaries-receipt-r4/`, which is left untouched for side-by-side comparison. Text, facts, receipt, fan, QR codes, layout and density are the round-4 poster's; only the styling changed. The round-4 sections below still describe the content and still hold, except where the Round 5 section overrides them.

## Round 5 styling (Galaxy+)

Driven by `../FEEDBACK_ROUND5.md` ("start from Galaxy, then add some splash"). All `FEEDBACK_ROUND3/4` content rules still hold.

**What changed**
- **Masthead.** The taped title slip became a full-bleed nebula band: `gx-space` base, a `glow`→`info` radial glow from the top right, a faint nova glow from the bottom left, the 8%-white star-dot tiling and 2 white orbit rings at about 16%. It closes with the 0.25 in gold→gold→nova bar.
  - Kicker: Atkinson Mono 700, +0.18em, in gold.
  - Title: white Atkinson Next 800 at 168 pt, −0.03em. "binaries" uses `hero-mark()`, a boxed gold→nova gradient, so it runs gold at the "b" to nova at the "s". The hero highlighter (`hl-hero`) is gone, as the guide asks.
  - Thesis: Kalam 56 pt in `gx-tape`.
  - The authors (white 700) and affiliations (`gx-tape`, 28 pt) moved inside the band.
  - `[[QR: live results]]`: a white rounded tile with a 3 pt nova ring, the text in `gx-nova-dark`.
  - The one-breath line sits on `gx-page` under the bar.
- **Ground.** `gx-page` with the same 0.25 in grid, in `gx-grid` / `gx-grid-major`.
- **Receipt.** White and square, with the same zig-zag foot. Ink is `gx-dark`, the shadow is `gx-shadow` offset 0.08 in, and there is a 0.08 in gold→nova thermal strip along the top. All receipt text is Atkinson Mono. Dot leaders and dashed dividers are `#9aa3ad`.
- **Stamp.** "NEVER HAND-EDITED" is now `gx-ok` green with a double border (6 pt + 2.5 pt), rotated −4°, in Atkinson Next 800.
- **Tape.** `gx-tape` with a 1.2 pt `gx-grid-major` edge. The receipt's right-hand tape is the one nova strip (`gx-nova-dark` edge).
- **Notes.** Badges are filled `gx-primary` discs with white Atkinson 700 numerals. Note 6, "One note, many skills", is the featured note, with a nova disc. Heads are Atkinson 700 in `gx-dark` at 64 pt (they were Kalam 72 pt). Bodies stay Kalam in `gx-primary`. The typed footnotes are Atkinson Next 29 pt. Leader arrows are `gx-primary` at 4 pt.
- **Machine (note 1).** Boxes are `gx-tint` with a 0.08 in radius and a 3 pt `gx-primary` edge. Titles are Atkinson 700 and sublabels Atkinson 28 pt; the analogues stay Kalam. The **cast** arrow is the one nova arrow.
- **Fan.**
  - The index card is the featured card: white, 0.25 in radius, with the gold→nova left bar and a `gx-info` card rule.
  - The 20 rays are `gx-info` at 2.5 pt. They leave a nova star with a gold ring.
  - One `gx-orbit` ring sits half hidden behind the card: the poster's single light-ground orbit.
  - The hashes, `c7dc5421` on the card and on all 20 stubs, are `gx-nova-dark` in place of the old stamp red. They are still the same tick everywhere.
- **Cards.** Get started and the preprint QR tile are white, 0.25 in radius, with a `gx-shadow`. "GET STARTED" is a spaced mono kicker in `gx-nova-dark`.
- **QR.** The same segno SVGs, black on white, with the 4-module quiet zone, clipped to 0.25 in rounded tiles (the radius sits inside the quiet zone). OpenCV decodes Foundry and preprint from a full-page 40 ppi render, and Install from a 40 ppi crop. The multi-code detector misses Install on the full page, and it does the same on the source poster.
- **Small layout moves.**
  - The masthead tapes and the pink notebook margin rule were dropped.
  - The fan card moved up 0.7 in, because note 6's head now fits on one line. The stub gap grew from 0.11 to 0.145 in to fill the space.
  - The receipt's top inset and stamp row shrank by 0.15 in total, because Atkinson Mono is 5% wider than Plex Mono.
  - Note 5's head breaks as "An oracle, / not a test suite" so "suite" isn't left alone on a line.

**Fonts** (all SIL OFL 1.1, embedded and subset, with OFL texts in `fonts/`)

| Font | Source | Used for |
| - | - | - |
| Atkinson Hyperlegible Next: Regular, Bold, ExtraBold | `googlefonts/atkinson-hyperlegible-next` @ `7925f50f`, `fonts/ttf/` (static instances; no Reserved Font Name) | title (800), heads, body, footnotes, authors, refs, stamp |
| Atkinson Hyperlegible Mono: Regular, Bold | `googlefonts/atkinson-hyperlegible-next-mono` @ `154d5036`, `fonts/ttf/` | receipt, kicker, stubs, card path, install lines, "GET STARTED" |
| IBM Plex Mono: Regular, Bold | already vendored (RFN "Plex", used unmodified) | fallback only: Atkinson has no `→`, so Plex Bold supplies the 4 hash arrows |
| Kalam: Regular, Bold | already vendored | pen notes, thesis, machine analogues |

Archivo Black, Plex Mono SemiBold/Italic and Atkinson Next Italic were removed (unused). `audit.py`'s font whitelist is now these 9 faces. 8 appear in the PDF; Plex Regular is held as the regular-weight `→` fallback.

**Departures from the guide**
- **Note heads are Atkinson 700 in `gx-dark`, not Kalam.** The guide keeps pen notes in Kalam. Here the bodies stay Kalam in `gx-primary`, but the heads now read as printed Galaxy headings over handwritten notes.
- **Masthead tapes dropped.** Taping a full-bleed band makes no sense. Every slip and card keeps its tape: the receipt, the fan card and Get started.
- **No footer band.** This layout has no footer. The references stay bottom right, beside the preprint QR, rather than in a new `gx-deep` band, which would push the Get started card.
- **No Galaxy logo.** The kicker already says Galaxy, and leaving the logo out keeps the "might be Galaxy, might be something else" ambiguity. It could go small in the masthead, between the thesis and the live QR.
- **Hash colour.** The guide has no rule for it. `gx-nova-dark` keeps the "same red tick ×21" idea without reading as `gx-danger` FAIL. Counting the hash ticks, nova and nova-dark appear in about 6 places: hero, thermal strip, tape, note 6 (disc, card bar and star), cast arrow and the live-QR ring. The guide suggests about 5.
- **Stamp in `gx-ok`.** "NEVER HAND-EDITED" is a guarantee, so it uses the PASS/VALIDATED ink rather than red. Red would also sit next to the nova tape and strip.
- **Dot leaders and dividers are `#9aa3ad`, not `gx-rule`.** `#dee2e6` disappears on white at 3 ft.
- **Leader arrows are 4 pt, not 2.5 pt,** so they read at 6 ft.
- **Masthead text runs 36 in wide** at x = 1.15 in (the left-column edge), not on the slip's old inset.
- **The masthead layers have alpha** (glows, stars, rings), as the guide allows. Everything below the masthead is opaque.

**Word count: 539 body words** (round 4: 540, so −0.2%). `audit.py --count` reports 547, because PyMuPDF splits the +0.18em-tracked "GET STARTED" into 10 single letters (+8). The line-break change that joined "re-hashes" accounts for the other −1. The limit is unchanged at 560.

**Checks.** All build guards pass: receipt fit, left column, fan, the overflow limits, QR size, the 24/28 pt floors, the word limit and the font whitelist. `poster-bleed.pdf` cropped by 0.125 in is pixel-identical to `poster.pdf` (max diff 0 at 40 ppi), because the masthead layers are anchored to the trim. `pdfimages` lists no rasters. `receipt.json` and the QR SVGs are byte-identical to the source's (foundry `eb2de3f1`).

**Round 5 open questions**
1. Is the stamp OK in green, or should it go back to red (`gx-danger`)?
2. Hashes in nova-dark, or `gx-primary` bold to cut the nova count?
3. Add the small white Galaxy logo to the masthead?
4. Should note heads stay Atkinson, or go back to Kalam for more pen feel?
5. In greyscale the highlights on `gx-page` (notes 1–5) almost vanish, as the guide predicts. Is that OK, or should the left notes sit on white cards?
6. Gold and nova are near the CMYK gamut edge. Ask for a proof of the masthead bar and the hero word.

## Round 4 changes

Driven by `../FEEDBACK_ROUND4.md` (John ranked this poster 3rd: "the whole right panel is largely wasted"; likes "one note, many skills" and wants it shown visually) and the round-3 rules in `../FEEDBACK_ROUND3.md`.

**What changed, and why**
- **Right panel rebuilt as "One note, many skills" (note 6).** The Z-report bars and the prompt/gate sketch are gone. In their place:
  - `galaxy-workflow-testability-design` is a taped index card showing its path, its own `summary:` line, revision 3 and sha256 `c7dc5421` in red;
  - 20 pen rays fan from the card to 20 tear-off stubs, one per cast that cites the note. Each stub shows the real skill name and the same red `c7dc5421`. All 20 casts copy the note **verbatim**, so `src_hash = dst_hash =` sha256 of the note. That makes advice idea (a), "the same red tick on all 20", literal and real;
  - the caption is "Fix a caveat once, in the note, not in 20 copies. Then recast.", with a typed footnote: all 20 casts carry the note's bytes verbatim and share one hash, and CI re-hashes every cast against the notes it copies;
  - the ranked tail (12, 11, 10, 9) is a list of dot-leader rows, with the "104 of 360 … hypothesis" line as the footnote.
- **"What it does" (note 1) is now the machine.** It is a pen sketch after `foundry-machine.svg`: Knowledge base → Mold → cast ("same bytes, every time") → Skill + Provenance. The analogy sits on each box (= source, = compiler, = binary, = build log), so the old two-column "The picture" table is folded in. The arrow still points at the receipt head, which is the provenance.
- **A one-breath "what it is" line** under the authors: "The Galaxy Workflow Foundry keeps Galaxy know-how in a wiki people read, compiles it into agent skills, and lets gxwf and Planemo judge workflows." The "judge" claim is scoped to workflows, because note 5 shows llm-judged Mold properties.
- **"Get started" card** under the receipt, filling the empty band there: the Claude Code and Codex install lines, verbatim from the foundry README and `/usage/`, plus `npm install -g @galaxy-tool-util/cli` for gxwf (the package comes from the cast's `_required_tools.json`). The receipt-foot **Slides** QR is now **Install** (`/usage/`).
- **"Knowing ≠ gating" became "Rails, not reminders" (note 4, left column).** It is text only and still points at TERMS / VERIFY: "This skill ends in a typed file. A program checks it against a pinned schema." Its footnote cites the Orbit preprint: "Skills are guidance, not enforcement"; the connection check caught the `tximport` wiring before it ran; and 0 of 15 graded runs on open-weight models, as one plain 29 pt clause.
- **Note 5 (oracle) simplified**, because round 3 called it a little too technical. "Each property says how it is judged: by a program or by a model." The `integron_finder` footnote is shorter.
- **Note 2 lost its footnote** (advice). Its punchline moved into the body: "Neither could supply provenance or an enforced check."
- **Note 3 head shortened** to "Sized to fit", so it fits on one line.
- **Notes renumbered** 1–5 down the left (in receipt order) and 6 on the right.

**Round-3 global fixes**
- Scott Cain¹ added before Anton Nekrutenko. The author string is verbatim.
- QR codes: the Foundry and Install codes are in the receipt; the preprint code is bottom right; `[[QR: live results]]` is in the header. There is no lightning-talk QR. The blind-regeneration QR was dropped to make room for the left column (its URL is still under Sources).
- Orbit 0/15 is no longer a 72 pt Archivo numeral. It is one 29 pt attributed clause.
- No Rumsfeld quote. No JOBS RUN or wall-time row exists on this poster. No DengueSeq content, so there is no pin-schema claim.
- **Highlighter:** `hl()` now uses `top-edge: "x-height"`; the hero used `hl-hero()` with `cap-height` (round 5 replaced it with the `hero-mark()` gradient). At 100 ppi, the two-line highlights in note 2 ("light one came back / better") and note 3 ("compile- / time contract") start below the descenders of the line above.

**Word count: 355 → 540 body words.** The guard is now 560 (`MAX_WORDS` in `audit.py`). I confirmed it fires by setting it to 500.

**Departures from the advice**
- **Words.** The advice gave 400–500. I landed at 540, 40 over, because the brief and the round-4 general notes ask every poster to say what the Foundry does and how to use it. The one-breath line and the Get started card are what push it past 500.
- **Stub labels are 24 pt.** At 28 pt, the 36-character skill names plus the hash don't fit the column. They are diagram labels, not body text (see "Diagram labels" below).
- **The blind-regeneration QR was cut** rather than squeezing the left column's notes.
- **Rails note moved to the left column**, so the right panel is entirely the fan, which the advice asked for.
- **"The picture" is merged into the machine** rather than drawn as a separate sketch beside note 1.

## Word count

**540 body words** (limit 560). This counts everything on the page except the title (kicker plus hero), the author and affiliation lines, the references and the QR captions. It includes the one-breath line, every receipt line, every stub name and hash, and the `[[QR: live results]]` placeholder text.

A word is any whitespace token containing a letter or digit. The dot leaders and `·` separators don't count.

The build enforces the limit: it renders `poster-count.pdf` with `count=1`, which hides only the exempt blocks, and `audit.py --count` fails the build above `MAX_WORDS`.

**Diagram labels.** The 20 stub names, their 20 hashes and the card's `NOTE · content/research/` line are set at 24 pt, which meets the 24 pt text floor. In the count render only, `lbl()` prints them in the marker colour `#010203`. `audit.py --count` still counts their words and still enforces 24 pt on them, but skips the 28 pt body check for them alone. That is 41 spans. I confirmed that without the marker, the 28 pt gate fails on exactly those 41 spans.

## Rebuild

```sh
./build.sh
```

The build runs these steps:

1. **Extract.** `extract.py` reads the foundry clone with `git show` and writes `receipt.json`, including the new `fan_note` block (the note's path, revision, summary and sha256, plus every citing cast's name, mode, load and hashes). The clone is `FOUNDRY_REPO`, default `~/projects/repositories/foundry`, at `FOUNDRY_REF`, default `origin/main`. Run `git -C ~/projects/repositories/foundry fetch` first to print the latest. With no clone, the committed `receipt.json` is used.
2. **QR codes.** `make_qr.py` (segno) writes vector QR SVGs and `assets/qr.json`.
3. **Render.** `render.py` runs Typst 0.15.0 via `uvx --from typst==0.15.0`. It writes `poster.pdf`, `poster-bleed.pdf` (44.25 in) and `preview.png` (1496 px). It also writes `poster-count.pdf` to `/private/tmp/claude-503/skills-are-binaries-receipt-r4-galaxyplus-deps/` (override with `POSTER_TMP`).
4. **Audit.** `audit.py` (PyMuPDF) runs the gates below.
5. **Checks.** `pdftoppm` writes `checks/preview-25.png` (1056 px), `checks/preview-gray.png` and `checks/thumb-200.png`.

It needs `uv` and poppler. `UV_CACHE_DIR` defaults to `$POSTER_TMP/uv-cache`, so tool caches stay out of the vault. There is no npm, no `node_modules` and no symlinks.

**To edit the copy:**
- The title, thesis, authors and one-breath line are at the top of `poster.typ`.
- The receipt is the `// ---------- the receipt` block.
- The left notes are the `left-notes` array. They are spaced evenly in the column, and a guard fails the build if their natural height plus 0.4 in gaps exceeds the column.
- The fan is under `// ---------- right column`.

**Debug render:** `sys_inputs={"noguard": "1"}` skips the asserts.

### Build guards

| Guard | Where |
| - | - |
| Receipt content plus footer must fit the slip | `poster.typ` |
| Left column: the notes' natural height plus gaps must fit between the receipt top and 42.6 in | `poster.typ` |
| Fan: the stub list length equals the note's citation count | `poster.typ` |
| Fan: every stub is `mode: verbatim` with `src_hash == dst_hash ==` sha256 of the note at `FOUNDRY_REF` (confirmed it fires by flipping one cast to sidecar) | `poster.typ` |
| The fan foot, Get started card, note 6 head, card and bottom-right block stay inside their limits or the 1 in safe zone | `poster.typ` |
| QR code (quiet zone excluded) ≥ 2.5 in | `poster.typ` |
| Text < 24 pt anywhere | `audit.py`, on both PDFs |
| Body text < 28 pt (exempt blocks hidden; marked diagram labels skipped) | `audit.py --count` |
| Body > 560 words | `audit.py --count` |
| Any font outside the 9 vendored faces, or any unembedded font | `audit.py` |

Also checked:
- **Bleed.** `poster-bleed.pdf`, cropped by 0.125 in, is pixel-identical to `poster.pdf` (max diff 0 at 40 ppi).
- **Fonts.** `pdffonts` shows all 8 used faces embedded and subset.
- **Transparency.** Only in the masthead: the glows, stars and orbit rings. Everything else is opaque.

## Fonts

See the Round 5 fonts table. All are SIL OFL 1.1 and vendored in `fonts/`, with their OFL texts. Typst runs with `ignore_system_fonts=True`.

## Sources for every fact

The foundry is `galaxyproject/foundry` at origin/main **`eb2de3f1`** (2026-10-30), fetched again on 2026-10-30 and unchanged. `FP` is `foundry-pattern.mdx`, `QA` is `foundry-qa.mdx`, and `GCC` is `gcc2026.mdx`, all in `jmchiltondotnet` origin/main `ac69980`. `r1` and `r7` are `../../research/r1-foundry-system.md` and `r7-biorxiv-preprint.md`.

| On the poster | Source |
| - | - |
| Receipt head, SKILL.md, MOLD revision 5 · `05c99cba`, cast at 2026-09-13, cast target claude | `casts/claude/skills/discover-shed-tool/_provenance.json` |
| 5 references: name, kind, load, mode, evidence, src/dst hashes | the same file, `refs[]` |
| REQUIRES gxwf ^1.15.0; `@galaxy-tool-util/cli` | `_required_tools.json` |
| VERIFY galaxy-tool-pin.json, schema `c0940fc0` | `_verify.json` |
| ORACLE: 3 properties and their `check:` types | `content/molds/discover-shed-tool/eval.md` |
| "NEVER HAND-EDITED" | `QA:790`; `FP:172` |
| "the part a model cannot regenerate" | `foundry-machine.svg` ("the receipt a model cannot regenerate") |
| Machine: Knowledge base (notes · schemas · references), Mold (one action, typed references + procedure), cast ("same bytes, every time"), frozen skill ("scoped · isolated · portable · no links home"), provenance (revision · target · resolved refs · checks) | `public/slides/foundry-pattern/foundry-machine.svg`; FP slides 6–10 |
| "People maintain the source. Agents get small, frozen skills." | FP slide 6 note ("People maintain the source. Agents receive small, frozen artifacts.") |
| Analogy = source / compiler / binary / build log | `FP:197-220` (the deck says "the code"; the poster says "source") |
| "No serious engineering culture treats the compiled binary as the place you make changes." | `FP:257` |
| Blind regeneration: two skills, 85–90%, light one came back better, could not supply provenance or an enforced check | `FP:488-592`; blog `galaxyproject.github.io/foundry-pattern/blog/2026-06-blind-regeneration/` |
| on-demand trigger, hypothesis verification, "The schema refuses the shortcut", compile-time contract | `QA:724`, `QA:750` |
| Rails note: "This skill ends in a typed file. A program checks it against a pinned schema." Scoped to *this* skill because only 35 of the 56 Mold casts have a non-empty `_verify.json` (21 have zero entries, at `eb2de3f1`). | `SKILL.md` "Validation" section (run `foundry validate-galaxy-tool-discovery --schema-sha256 …` before returning `galaxy-tool-pin.json`); `_verify.json`; `packages/gxwf-pi-harness/src/runner.ts` |
| "Skills are guidance, not enforcement"; `tximport` caught before execution; 0 of 15 graded runs on open-weight models (prompt-only rule; Qwen3, Llama 3.3 via TACC) | Baker et al. 2026, doi:10.64898/2026.10.26.761864: p.16; p.4, pp.15–16, Fig S3A; p.18 (`r7` §5.3, §6) |
| `integron_finder` false miss; property 3 | `FP:1754-1785`; foundry commit `73af1f62` |
| "One note, many skills" card: path, `revision: 3`, `summary:`, sha256 `c7dc5421…` | `content/research/galaxy-workflow-testability-design/index.md` (frontmatter, and sha256 of the file at `eb2de3f1`) |
| 20 stubs: skill names and hashes; all `mode: verbatim`, `load: on-demand` | every `casts/claude/skills/*/_provenance.json` `refs[]` entry whose `src` is that note (`extract.py` → `fan_note.casts`) |
| "CI re-hashes every cast against the notes it copies" | `packages/build-cli/src/commands/cast-sweep.ts` (header comment: only re-hashing the source against the record catches a stale verbatim copy, over the whole corpus); `Makefile:36-37` (`check-casts` → `cast-all --check`); `.github/workflows/packages.yml:100` (`make check-casts`) |
| Other shared notes 12 / 11 / 10 / 9; 104 of 360 hypothesis | `extract.py` corpus counts over 56 Mold casts |
| "must name how to verify them" | `QA:724` (hypothesis needs a verification) |
| Install lines (Claude Code, Codex) | foundry `README.md` "Install generated skills" @ `eb2de3f1`; `/usage/` page (HTTP 200, same commands, 2026-10-30); `r1` §8 |
| `npm install -g @galaxy-tool-util/cli` | `GCC:456-459` |
| One-breath line | dossier §2 |

**Wording kept narrow on purpose:**
- The CI line says "re-hashes every cast against the notes it copies", not "recasts automatically". `check-casts` detects staleness; `make casts` recasts.
- The card's caveat is generic ("Fix a caveat once"). No specific fix to this note is claimed.
- The caption doesn't say "most cited": `open-requirements-ledger` (22) is skipped on purpose, as in round 2.

**QR codes.** All are segno vector codes with 2.8–3.0 in of printed code. Each URL returned HTTP 200 on 2026-10-30.

| Code | Target |
| - | - |
| The Foundry (in the receipt) | `galaxyproject.github.io/foundry/` |
| Install (in the receipt) | `galaxyproject.github.io/foundry/usage/` |
| Orbit preprint | `doi.org/10.64898/2026.10.26.761864` |
| `[[QR: live results]]` | 4.2 in placeholder, header top right |

## `[[ASK]]` slots

- **None. Not applicable.** Anton's foundry-paper nf-core work has no place in a poster about skills as compiled artifacts. There is no `SHOW_ASK` flag, so there is no SHOW_ASK=0 render.
- **`[[QR: live results]]`** is the only placeholder. Once the URL exists, add it to `LINKS` in `make_qr.py` and replace the `placeholder(...)` in the header with `image("assets/qr-live.svg", width: live-w)`.

## Open questions

1. **Stub labels at 24 pt.** This is the only below-28 text with words that count. Is that OK, or should the stubs become blank tear-offs, with the names dropped?
2. **"Rails, not reminders"** is borrowed from known-unknowns. Is it OK to reuse it here, or should this keep its own "Knowing ≠ gating"?
3. **Blind-regeneration QR**: is dropping it OK? It could come back in place of the Install QR.
4. **Title**, and "source" vs "the code": same as round 2, still open.
5. **Re-check at print:** the fan (`./build.sh` after a fetch; the guard fails if any copy stops being verbatim), that `discover-shed-tool` is still rev 5, and the QR URLs.
6. **Shop:** print edge-to-edge on the trim, or use `poster-bleed.pdf`?
