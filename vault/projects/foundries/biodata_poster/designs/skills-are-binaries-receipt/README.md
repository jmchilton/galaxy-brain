# skills-are-binaries-receipt

Pitch 3 (`skills-are-binaries`, `../PITCHES.md`) in the visual language of the run-receipt concept (`../receipt-vision-v2/`): graph-paper ground, thermal-print slips, tape, a red stamp, torn edges, pen margin notes. Only the language is reused. The content and structure are new.

## The idea

The title is the thesis: **"Agent skills are binaries. Keep the source."** It is set at 168 pt on a taped slip. The pen line under it reads: *"Don't hand-edit agent skills: compile them from a knowledge base people read."*

The dominant object is a **BUILD RECEIPT**. It is one real cast, `discover-shed-tool`, printed from its own `_provenance.json`, `_required_tools.json` and `_verify.json`, plus the Mold's `eval.md`. The receipt *is* the build log, so the analogy is on the page rather than drawn beside it. A red **NEVER HAND-EDITED** stamp sits on the SKILL.md line. The footer says "KEEP THIS RECEIPT. It is the part a model cannot regenerate."

Six numbered pen notes each point at the receipt line they explain:

| # | Note | Points at | Pitch section |
| - | - | - | - |
| 1 | The picture: skill = binary, knowledge base = source, cast = compiler, provenance = build log; the "no serious engineering culture" quote | receipt head | 1 |
| 2 | Text is cheap: blind regeneration, two skills, the light one came back better | SKILL.md line | 2 |
| 3 | One action, sized to fit: progressive disclosure as a compile-time contract | REFERENCES (LOAD · MODE column; 1 upfront, 4 on demand) | 3 |
| 4 | One note, many skills | Z-report (the data visual) | 4 |
| 5 | An oracle, not a test suite: "Each property declares how it is judged"; the `integron_finder` false miss | ORACLE, eval.md property 3 | 5 |
| 6 | Knowing ≠ gating: a prompt asks, `_verify.json` gates; Orbit 0/15; pen sketch of prompt vs gate | TERMS / VERIFY | 5 and topic 9 |

Pitch section 6, "Every claim has a receipt", is the receipt itself. Each reference prints `src_hash = dst_hash` when it was copied verbatim, or `src_hash → dst_hash` when it was compiled to a sidecar. A one-line legend under REFERENCES explains this.

**The one data visual** is a taped **Z-REPORT** slip (a cash register's end-of-day tally). It shows five shared notes. Each row is a 56-cell unit bar, one cell per Mold skill, with the cells filled for the skills that cite that note: 20, 12, 11, 10, 9. Under the bars is one aggregate line: "104 of 360 skill→reference citations are marked hypothesis." The wording makes clear these are per-skill citations, not distinct notes.

## Word count

**355 body words** (limit 400). This counts **everything** on the page except the title (kicker plus hero), the author block, the references and the QR captions. It includes every receipt line item, every hash and the `[[QR: live results]]` placeholder text.

A word is any whitespace token containing a letter or digit. The dot leaders and `·` separators don't count.

The build enforces the limit. It renders `poster-count.pdf` with `count=1`, which hides only the exempt blocks, and `audit.py --count` fails the build above 400. I checked that the gate fires by setting the limit to 100.

## Rebuild

```sh
./build.sh
```

The build runs these steps:

1. **Extract.** `extract.py` reads the foundry clone with `git show` and writes `receipt.json`. The clone is `FOUNDRY_REPO`, default `~/projects/repositories/foundry`, at `FOUNDRY_REF`, default `origin/main`. Run `git -C ~/projects/repositories/foundry fetch` first to print the latest. With no clone, the committed `receipt.json` is used.
2. **QR codes.** `make_qr.py` (segno) writes vector QR SVGs and `assets/qr.json`.
3. **Render.** `render.py` runs Typst 0.15.0 via `uvx --from typst==0.15.0` and writes `poster.pdf`, `poster-bleed.pdf` (44.25 in) and `preview.png` (1496 px). It also writes `poster-count.pdf` to `/private/tmp/claude-503/skills-are-binaries-receipt-deps/` (override with `POSTER_TMP`).
4. **Audit.** `audit.py` (PyMuPDF) runs the gates listed below.
5. **Checks.** `pdftoppm` writes `checks/preview-25.png` (1056 px), `checks/preview-gray.png` and `checks/thumb-200.png`.

It needs `uv` and poppler. There is no npm, no `node_modules` and no symlinks. Tool caches stay in uv's cache, outside the vault.

**To edit the copy:**
- The title, thesis and authors are at the top of `poster.typ` (`kicker`, `hero1` (lead, highlighted word, tail), `hero2`, `thesis`).
- The receipt is the `// ---------- the receipt` block.
- The notes are the `#note-at(...)` calls. Each one has an absolute `y` and a `limit` (the next block's top), and the build fails if a note grows past its limit.

**Debug render:** `sys_inputs={"noguard": "1"}` skips the overflow asserts, so you can see what is colliding.

### Build guards

| Guard | Where |
| - | - |
| Overflow, receipt: content plus footer must fit the slip | `poster.typ` |
| Overflow, every placed block: `put()` and `note-at()` must stay inside the 1 in safe zone or the next block's top | `poster.typ` |
| Z-report must fit its slip | `poster.typ` |
| QR code (quiet zone excluded) ≥ 2.5 in | `poster.typ` |
| Text < 24 pt anywhere | `audit.py`, on both PDFs |
| Body text < 28 pt (exempt blocks hidden) | `audit.py --count` |
| Body > 400 words | `audit.py --count` |
| Any font outside the 7 vendored faces | `audit.py` |
| Any unembedded font | `audit.py` |

These gates fired during development, which shows they work. The unembedded-font, QR-size, Z-report-fit and body < 28 pt gates have not fired yet.
- receipt overflow;
- a block overflow;
- a DejaVu Sans Mono fallback from inline `code`;
- 23.2 pt inline code.

Also checked:
- **Bleed.** `poster-bleed.pdf`, cropped by 0.125 in, is pixel-identical to `poster.pdf` (max diff 0 at 40 ppi).
- **Fonts.** `pdffonts` shows all 6 used faces embedded and subset.
- **Transparency.** There is none. Every colour is opaque.

## Fonts

All are SIL OFL fonts from `github.com/google/fonts`, copied from `../receipt-vision-v2/fonts/` and embedded. Typst runs with `ignore_system_fonts=True`.

| Font | Used for |
| - | - |
| Archivo Black | hero, stamp, Orbit 0/15 |
| IBM Plex Mono (Regular, SemiBold, Bold) | receipt, Z-report, typed footnotes, authors, refs |
| Kalam (Regular, Bold) | pen notes and sketch |

## Sources for every fact

The foundry is `galaxyproject/foundry` at origin/main **`eb2de3f1`** (2026-10-30), which is printed on the receipt. The pitch quoted `9f83fd55`. Every receipt value, and every Z-report count and aggregate, is **identical** at both commits; I diffed `casts/claude/skills/discover-shed-tool` and `content/molds/discover-shed-tool` and recomputed the stats at both. `FP` is `foundry-pattern.mdx`, `QA` is `foundry-qa.mdx`, and `GCC` is `gcc2026.mdx`, all in `jmchiltondotnet` origin/main `ac69980`.

| On the poster | Source |
| - | - |
| Receipt head, SKILL.md, MOLD revision 5 · `05c99cba`, cast at 2026-09-13, cast target claude | `casts/claude/skills/discover-shed-tool/_provenance.json` (`mold`, `cast_at`, `cast_target`) |
| 5 references: name, kind, load, mode, evidence, src/dst hashes (8 chars) | the same file, `refs[]` |
| REQUIRES gxwf ^1.15.0 | `_required_tools.json` |
| VERIFY galaxy-tool-pin.json, schema `c0940fc0` | `_verify.json` (`--schema-sha256` arg) |
| ORACLE: 3 properties and their `check:` types | `content/molds/discover-shed-tool/eval.md` |
| "NEVER HAND-EDITED" | `QA:790` ("rendered from the Mold, never hand-edited"); `FP:172` ("The skill is never hand-maintained") |
| "the part a model cannot regenerate" | `ASSETS/foundry-pattern/foundry-machine.svg` ("the receipt a model cannot regenerate"); `FP:563-592` |
| Analogy: skill/KB/cast/provenance = binary/source/compiler/build log | `FP:197-220` (the deck says "the code"; the poster says "source", to match "Keep the source") |
| "No serious engineering culture treats the compiled binary as the place you make changes." | `FP:257` |
| Blind regeneration: two skills, from the topic alone; decision-grade page 85–90%; light page "the blind version was better"; it could not supply provenance or an enforced check | `FP:488-592`; QR → `galaxyproject.github.io/foundry-pattern/blog/2026-06-blind-regeneration/` |
| on-demand needs a trigger; hypothesis needs a verification; "The schema refuses the shortcut"; progressive disclosure as a compile-time contract | `QA:724`, `QA:750` |
| 1 upfront, 4 on demand | `refs[].load` (the deck words it as "output schema upfront and its four notes on demand", `QA:750`) |
| Z-report: 20 / 12 / 11 / 10 / 9 skills citing each note | `extract.py`: counts `refs[].src` over every `casts/claude/skills/*/_provenance.json` |
| 56 Mold skills, 360 references, 104 hypothesis | the same computation. 69 cast dirs = 56 Mold casts with `_provenance.json` + 13 pipeline harnesses with none, so the bars are "of 56". The pitch's "360 over all 69 casts" is the same 360. |
| `integron_finder`: no hits; the wrapper existed; "A false miss passes every static check"; surfaced by a pipeline run; property 3 now guards it | `FP:1754-1785`; foundry commit `73af1f62` (added the `eval.md` property "a miss survives query-variant normalization") |
| "An oracle, not a test suite" | `FP:1659` |
| "Each property declares how it is judged" (note 5) | each `eval.md` property carries `check: deterministic` or `check: llm-judged` (`FP:1665`). The poster does not say "the tools decide" here, because property 3 is llm-judged. |
| "`_verify.json` gates" | `packages/gxwf-pi-harness/src/runner.ts` (`validateArtifacts` runs the `_verify.json` validator on each emitted artifact and records a pass or fail); `packages/gxwf-foundry/src/meta/schema-pin.ts` (exit 4 unless the schema sha256 matches the pin) |
| Knowing vs gating sketch | redrawn after `ASSETS/foundry-pattern/knowing-gating.svg`. The SVG itself isn't embedded: its 11–14 px text would print under 24 pt, and it requests non-vendored fonts. The gate is labelled "verdict" (the deck uses "REFEREE"), not "until valid", because the harness records a verdict rather than looping. |
| Orbit 0/15 (open-weight models) | Baker et al. 2026, doi:10.64898/2026.10.26.761864, p.18 (dossier §3.5). It is attributed to the preprint, never to the Foundry. |

**Wording kept narrow on purpose:**
- Two of the three `eval.md` properties are `llm-judged`, including the `integron_finder` one. So the poster prints the `check:` type and does not claim a deterministic check caught the false miss.
- "Not run = failed trial" applies only to deterministic properties (`FP:1694-1696`), so it is left off rather than over-generalised.

**Fan-out exclusions.** The caption is "ONE NOTE → N SKILLS", not "most cited". Two higher-ranked sources are skipped:
- `open-requirements-ledger` (22), per the pitch, so the ledger doesn't take over;
- the `summarize-nextflow#summaryNextflowSchema` package (12), because it is a schema package, not a note.

`galaxy-collection-semantics` also has an 11-cast `.yml` companion, which is not shown.

**QR codes.** All are real vector codes from segno, with 2.8–3.0 in of printed code. Each URL returned HTTP 200 on 2026-10-30.

| Code | Target |
| - | - |
| The Foundry (in the receipt) | `galaxyproject.github.io/foundry/` |
| Slides (in the receipt) | `jmchilton.net/slides/foundry-pattern/` |
| Blind regeneration | the June 2026 blog post |
| Orbit preprint | doi.org link |
| `[[QR: live results]]` | 4.2 in placeholder, top right, always rendered |

## Included, and left out

- **In:**
  - the analogy;
  - blind regeneration;
  - progressive disclosure (load/mode/trigger/verification);
  - one note → many skills;
  - the eval.md oracle and the `integron_finder` false miss;
  - knowing vs gating, with Orbit 0/15;
  - provenance hashes.
- **Out:**
  - DengueSeq, gap ledgers, the draft format, Hokken and other Foundries;
  - the recompile narrative: no `256e3861 → 2e5fa1f8`, no PR #701, no fix → recast loop beyond "property 3 now guards it";
  - named skill repos (no `skill-mill-*.png`);
  - Pinecone Nexus;
  - `foundry-skills-install.png` (stale counters);
  - the 3-way load/mode/evidence sidebar, cut to the single "104 hypothesis" line;
  - `cast_history`, cut to keep the receipt short;
  - multi-target claims (only `casts/claude` exists, and the receipt prints "cast target: claude").

## `[[ASK]]` slots

- **None.** Anton's foundry-paper work (nf-core rnaseq/atacseq) has no place in this pitch, which is about skills as compiled artifacts, so it is left out entirely. There is no `SHOW_ASK` flag and no no-ASK check render (not applicable).
- **`[[QR: live results]]`** is the only placeholder. Once the URL exists:
  1. add it to `LINKS` in `make_qr.py`;
  2. replace the `placeholder(...)` in the header with `image("assets/qr-live.svg", width: live-w)`.

## Open questions

1. **Title.** The hero is the pitch's working title, with "GALAXY WORKFLOW FOUNDRY" as a kicker. Is that OK, or should it use a dossier title such as "From Papers and Conversations to Runnable Galaxy Workflows"? Dropping in a subtitle is one `#let` change.
2. **"source" vs "the code"** in the analogy: OK?
3. **"Text is cheap"** as the head for the commodity section, with the deck's "Restating canonical knowledge is a commodity" as a fallback?
4. **Re-check at print:**
   - the fan-out counts (`./build.sh` after a fetch);
   - that `discover-shed-tool` is still rev 5;
   - the QR URLs.
5. **Shop:** print edge-to-edge on the trim, or use `poster-bleed.pdf`?
