# skills-are-binaries-receipt (round 4)

Round-4 revision of `../skills-are-binaries-receipt/`, which is left untouched for comparison. It is pitch 3 (`skills-are-binaries`, `../PITCHES.md`) in the run-receipt visual language: graph-paper ground, thermal-print slips, tape, a red stamp, torn edges and pen margin notes.

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
- **Highlighter:** `hl()` now uses `top-edge: "x-height"`; the hero uses `hl-hero()` with `cap-height`. At 100 ppi, the two-line highlights in note 2 ("light one came back / better") and note 3 ("compile- / time contract") start below the descenders of the line above.

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
3. **Render.** `render.py` runs Typst 0.15.0 via `uvx --from typst==0.15.0`. It writes `poster.pdf`, `poster-bleed.pdf` (44.25 in) and `preview.png` (1496 px). It also writes `poster-count.pdf` to `/private/tmp/claude-503/skills-are-binaries-receipt-r4-deps/` (override with `POSTER_TMP`).
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
| Any font outside the 7 vendored faces, or any unembedded font | `audit.py` |

Also checked:
- **Bleed.** `poster-bleed.pdf`, cropped by 0.125 in, is pixel-identical to `poster.pdf` (max diff 0 at 40 ppi).
- **Fonts.** `pdffonts` shows all 6 used faces embedded and subset.
- **Transparency.** There is none.

## Fonts

All are SIL OFL fonts from `github.com/google/fonts`, vendored in `fonts/`. Typst runs with `ignore_system_fonts=True`.

| Font | Used for |
| - | - |
| Archivo Black | hero, stamp |
| IBM Plex Mono (Regular, SemiBold, Bold) | receipt, card, stubs, typed footnotes, install lines, authors, refs |
| Kalam (Regular, Bold) | pen notes, machine sketch |

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
