# receipts-reissue

Round-3 outline 6 (`../RECEIPTS_OUTLINES.md`, `reissue`), built under `../FEEDBACK_ROUND3.md`. The visual language and the tooling come from `../skills-are-binaries-receipt/`: graph paper, thermal slips, tape, stamps, tear lines, Kalam pen notes. "Rails, not reminders" is carried over from `../known-unknowns-receipt/`.

## The idea

The hero is **"Fix the source. Reissue the binary."** at 150 pt, with "source" highlighted. The pen thesis beside it reads: *"When a skill is wrong, nobody hand-edits it. Fix what it was compiled from, recast, and keep the receipt."*

The poster carries two receipts for one skill, `discover-shed-tool`, either side of one real fix (foundry commit `73af1f62`):

- **BUILD RECEIPT, labelled "before" in pen.** It is rendered from `_provenance.json` and `_verify.json` at `73af1f62^`. It shows:
  - the SKILL.md line, MOLD revision, hash and commit, and cast-at;
  - the five references, each with its source hash;
  - VERIFY, the NEVER HAND-EDITED stamp and "KEEP THIS RECEIPT."
  - The three values the fix changed are struck through in red pen.
- **REISSUE slip, labelled "after".** It is stapled over the before slip's right margin.
  - Its rows sit level with the before slip's rows, and a build guard enforces this. The eye reads across: `256e3861 → 2e5fa1f8`, `8d6e79cb → aa9b9425`, `00:21Z → 00:55Z`. The old values are grey and struck in red, the new ones bold and highlighted. MOLD revision and REFERENCES print "same".
  - REASON: the two real `gxwf tool-search` queries.
  - FIXED IN THE SOURCE: the `index.md` rule, the new `eval.md` property, and `6 files +118 −5`.
  - `SKILL.md … recast, not edited`, a RECAST stamp and "KEEP BOTH RECEIPTS."

**The one data visual** is a single Z-report row on a taped slip under the reissue. It shows the second, larger event of the same kind. PR #701 revised one note, `planemo-asserts-idioms`, and 8 of 56 skills were reissued. That is a 56-cell bar with 8 filled cells, plus the note's `64c477c4 → 9a636385` hash pair, which is identical in all 8 casts. The Z-row prints that pair in the slips' strike-and-highlight style. That is what ties the three slips into one argument: a fix in the source shows up as a hash change on every receipt it touches.

**Six pen notes:**

| # | Head | Where it points |
| - | - | - |
| 1 | Skills are binaries (analogy grid plus the "no serious engineering culture" quote) | the head of the before receipt |
| 2 | Text is cheap (blind regeneration) | the SKILL.md line |
| 3 | The receipt is the diff | the struck hash rows |
| 4 | Rails, not reminders | VERIFY |
| 5 | A false miss passes every static check | REASON on the reissue |
| 6 | One fix, many skills | the Z-report |

Notes 1–4 are in the left margin. Notes 5 and 6 are in the band under the before slip, so their arrows stay short. The numbers follow reading order.

## Rebuild

```sh
./build.sh
```

The build runs these steps:

1. **Extract.** `extract.py` reads `~/projects/repositories/foundry` (override with `FOUNDRY_REPO`) read-only with `git show`, at `73af1f62^`, `73af1f62` and `9adc20b7^1..9adc20b7`. It writes `receipt.json`. With no clone, the committed `receipt.json` is used. It asserts:
   - the refs are identical before and after;
   - the Mold revision is unchanged;
   - exactly one new `eval.md` property;
   - the REASON strings exist in the commit's refinement journal;
   - the casts recast in #701 are exactly the casts that cite the note;
   - all 8 share one hash pair.
2. **QR codes.** `make_qr.py` (segno) writes vector SVG QR codes.
3. **Render.** `render.py` runs Typst 0.15.0 via `uvx --from typst==0.15.0 python`. It writes `poster.pdf` (44 in), `poster-bleed.pdf` (44.25 in), `preview.png` (1496 px), and the word-count render at `/private/tmp/claude-503/receipts-reissue-deps/poster-count.pdf` (override with `POSTER_TMP`).
4. **Audit.** `audit.py` (PyMuPDF) runs on both PDFs and on the count render.
5. **Checks.** `pdftoppm` writes `checks/preview-25.png` (1056 px), `checks/preview-gray.png` and `checks/thumb-200.png`.

It needs `uv` and poppler. There is no npm, no `node_modules` and no symlinks. Caches stay in uv's cache and the deps dir above.

**Debug render:** `sys_inputs={"noguard": "1"}` skips the layout asserts.

### Build guards

| Guard | Where |
| - | - |
| Overflow: before slip, reissue slip and Z slip content must fit the slip; every `put()` and `note-at()` must stay inside the 1 in safe zone or its limit | `poster.typ` |
| Reissue rows must sit level with the before rows (within 2 pt) | `poster.typ` |
| QR code (quiet zone excluded) ≥ 2.5 in | `poster.typ` |
| Text < 24 pt anywhere | `audit.py`, on both PDFs |
| Body text < 28 pt (exempt blocks hidden) | `audit.py --count` |
| Body > 400 words | `audit.py --count` |
| Any font outside the 7 vendored faces, or any unembedded font | `audit.py` |
| Any raster image; "0/15" or "0 of 15"; a lightning-talk URL; Scott Cain missing | `audit.py` (new for this poster) |

**Guards that fired during development:**
- before-receipt overflow;
- bottom-row overflow;
- the alignment guard;
- the word and < 24 pt gates, tested with a temporary copy set to 100 words and 30 pt.

**Also checked:**
- **QR codes.** All four decode to their URLs (OpenCV, 60 dpi), and every URL returned HTTP 200 on 2026-10-30.
- **Bleed.** `poster-bleed.pdf`, cropped by 0.125 in, is pixel-identical to `poster.pdf` (max diff 0 at 40 dpi).
- **Vector.** `pdfimages` lists no images.
- **Fonts.** `pdffonts` shows all 6 used faces embedded and subset.

## Fonts

All are SIL OFL fonts, copied from `../skills-are-binaries-receipt/fonts/` and embedded. Typst runs with `ignore_system_fonts=True`.

| Font | Used for |
| - | - |
| Archivo Black | hero, stamps |
| IBM Plex Mono (Regular, SemiBold, Bold) | slips, typed footnotes, authors, refs |
| Kalam (Regular, Bold) | pen notes, thesis, before/after labels |

## Body word count

**339 body words** (limit 400; the outline's target was 345).

- **What counts:** every alphanumeric token on the page, from PyMuPDF `get_text("words")` on the count render. That includes every receipt line, every hash, the badge numbers, the "before"/"after" labels and the `[[QR: live results]]` placeholder text.
- **What's exempt:** the kicker and hero, the authors and affiliations, the reference/source footnote, and the QR captions. These are the keeper's exemptions.

## Sources for every fact

The foundry is `galaxyproject/foundry`, fetched 2026-10-30. `origin/main` is `eb2de3f1`. Today's `discover-shed-tool` cast on main is Mold rev 5 · `05c99cba`. The poster deliberately shows the June pair instead, per the outline.

| On the poster | Source |
| - | - |
| Before slip: MOLD revision 4, hash `256e3861`, commit `8d6e79cb`, cast at 2026-06-19 00:21Z, cast target claude | `git show 73af1f62^:casts/claude/skills/discover-shed-tool/_provenance.json` (`73af1f62^` = `aa9b9425`) |
| Five references and their source hashes (`4a2e231e`, `e3bfd60c`, `597997fe`, `8b43c2cb`, `38f28eab`) | the same file, `refs[].src_hash` |
| VERIFY `galaxy-tool-pin.json` · `foundry validate-galaxy-tool-discovery` | `…/_verify.json` at `73af1f62^`, which has no `--schema-sha256` yet, so no schema pin is printed |
| After: hash `2e5fa1f8`, commit `aa9b9425`, cast at 00:55Z; revision 4 and 5 refs "same" | `git show 73af1f62:…/_provenance.json`; `extract.py` asserts the refs and revision are unchanged. r1 §5.1 notes `cast_history` got no entry either. |
| REISSUE `73af1f62` · 2026-06-19 | the commit, and the after `cast_at` date (UTC) |
| REASON: `gxwf tool-search integron_finder` → no hits; `"integron finder"` → `iuc/integron_finder` @ `5429646e486d` | `content/molds/discover-shed-tool/refinements/2026-06-17-tool-id-query-normalization.md` at `73af1f62`, asserted by `extract.py`. Also deck `foundry-pattern.mdx:1754-1785` and `research/r1-foundry-system.md` §5.1. |
| `index.md`: "normalize a tool-id-shaped need before searching" | the `+` lines of `git show 73af1f62 -- content/molds/discover-shed-tool/index.md` |
| `eval.md` +11 · property 3: "a miss survives query-variant normalization" | `git show --numstat 73af1f62`; the third `## Property:` in `eval.md` at `73af1f62` |
| 6 files · +118 −5 | `git show --numstat 73af1f62` |
| SKILL.md "recast, not edited" | commit message "re-cast claude bundle (verify clean)". SKILL.md does change in the diff, through the recast, which is why the thesis says "nobody hand-edits it". |
| NEVER HAND-EDITED; KEEP THIS RECEIPT | the keeper's sources (`QA:790`, `FP:172`, `FP:563-592`) |
| Note 1: analogy and "No serious engineering culture…" | `FP:197-220`, `FP:257` (from the keeper README) |
| Note 2: blind regeneration, two skills, light one came back better; could not supply provenance or an enforced check | `FP:488-592`, from the keeper README. QR → the June 2026 blog post. The keeper's 85–90% is left off. |
| Note 5 head: "A false miss passes every static check" | the same refinement journal at `73af1f62`: "a false `miss` that passes every static check"; also the `FP:1754-1785` slide title |
| Note 5: the search said no, the wrapper existed, a run would have authored one that already ships | `73af1f62` commit message ("wrongly fall-throughs to authoring a tool that already exists"); `FP:1754-1785` ("the run authors a wrapper for a tool the Tool Shed already ships"); r1 §5.1 ("would have sent the loop…"). "Its eval has a property for it" is worded that way because property 3 is `check: llm-judged`, not a deterministic gate. |
| Note 6 and the Z-row: PR #701, 2026-10-22, `planemo-asserts-idioms`, 8 of 56 Mold skills, note hash `64c477c4 → 9a636385` | `git diff --name-only 9adc20b7^1 9adc20b7`: 8 `_provenance.json`. Those are exactly the 8 of the 56 casts at `9adc20b7` that cite the note. Here 56 means Mold casts with a `_provenance.json`, out of 69 cast directories; the other 13 are pipeline harnesses. Both counts are the same at `eb2de3f1`. The hash pair is the note's `src_hash`, identical in all 8. The note went from revision 9 to 10. `research/r2-demo-targets.md` also says 8. |
| Note 4: "Skills are guidance, not enforcement"; Galaxy's validator caught an agent's bad `tximport` wiring before it ran | Baker et al. 2026, doi:10.64898/2026.10.26.761864: p.16, and p.4, pp.15–16, Fig S3A (`research/r7-biorxiv-preprint.md` §6) |
| Note 4: "The gate is code, not a prompt"; `_verify.json` gates the output | `packages/gxwf-pi-harness/src/runner.ts` `validateArtifacts`, from the keeper README |
| Note 3: "same revision number, same five references; the hash is what moved" | the before/after provenance diff above |

`FP` is `foundry-pattern.mdx` and `QA` is `foundry-qa.mdx`, both in `jmchiltondotnet/src/content/slides/` @ `ac69980`.

**Dates.** The slip prints recorded `cast_at` times in UTC (`Z`). Commit `73af1f62` was **authored** 2026-06-17T17:43 −04:00 and **committed** 2026-06-18T20:56 −04:00 (= 06-19 00:56Z). The before cast is 06-19 00:21Z and the after is 00:55Z. That is why the slip is dated 2026-06-19, not 06-17.

**QR codes**, all real vector codes:

| Code | Target | Printed size |
| - | - | - |
| The Foundry | `galaxyproject.github.io/foundry/` | 4.0 in tile |
| Preprint [1] | `doi.org/10.64898/2026.10.26.761864` | 4.0 in tile |
| Blind regeneration | the June 2026 blog post | 3.6 in tile |
| Slides | `jmchilton.net/slides/foundry-pattern/` | 3.6 in tile |
| `[[QR: live results]]` | 4.2 in placeholder, top right | — |

There is no lightning-talk QR.

## `[[ASK]]` items

- **None.** The outline lists `[[ASK]]` under "deliberately left out", so Anton's nf-core work is absent. There is no `SHOW_ASK` flag, and the SHOW_ASK=0 check render is **not applicable**.
- **`[[QR: live results]]`** is the only placeholder. Once the URL exists:
  1. add it to `LINKS` in `make_qr.py`;
  2. swap the `placeholder(...)` in the header for `image("assets/qr-live.svg", width: live-w)`.

## Departures from the outline

1. **One source hash per reference.** The before slip prints one source hash per reference. It drops the `load · mode · evidence` and the `src → dst` pairs. On this poster an arrow means "was → now", so the keeper's "compiled to" arrow would have read as a change. It also saves about 20 words.
2. **The reissue is dated 2026-06-19, not 2026-06-17.** See **Dates** above.
3. **No revision change is printed.** The Mold revision stayed 4 and `cast_history` didn't move, so the slip says "4 · same". That fact feeds note 3.
4. **No `@ aa9b9425` on the before slip head.** `73af1f62^` is `aa9b9425`, which is also the after's new MOLD commit, and printing both would confuse a reader. The ref is in the footnote.
5. **The Z-row has an extra hash line.** It adds `note hash 64c477c4 → 9a636385`, so the visual speaks the slips' language.
6. **0/15 is dropped.** The FEEDBACK makes it optional, and dropping it is the cleanest reading. Note 4 ("Rails, not reminders") adds the preprint's `tximport` validator catch, a positive "tools decide" fact. It also says "gates the output" rather than "against a pinned schema", because `_verify.json` at that ref had no schema pin.
7. **Note placement and numbering.** The false-miss and one-fix notes sit in the centre band under the before slip, not in the left margin and under the reissue as sketched. Their arrows stay short and don't cross the before slip. All notes are renumbered to reading order: the outline's 1, 2, 6, 5, 3, 4 print as 1–6.
8. **New copy.** Pen labels "before" and "after", and the reissue footer "KEEP BOTH RECEIPTS." (5 words).
9. **QR sizes.** Foundry and preprint are printed larger (4.0 in) than the optional codes.

## Open questions

1. Is "MOLD" OK unexplained on the slips? It is the real field name. The notes avoid it, and note 5 says "the source".
2. Is the 2026-06-19 recast date OK on the reissue, or should it be "found 06-17 · recast 06-19"? That would add 3 words.
3. Should the slips show today's rev 5 · `05c99cba` as a third, tiny "since then" stub? The outline cut it.
4. Is "Text is cheap" (note 2) worth its ~30 words here, or is it the first cut if density needs to drop?
5. Shop: print edge to edge on the trim, or use `poster-bleed.pdf`?
6. Before print: re-run `./build.sh` after `git fetch`. The extract asserts guard the historical refs, but the "of 56" count is taken at `9adc20b7`.

## Applied review

These items are from `REVIEW.md`. After the changes, the body is **339 words** (it was 350).

1. **MUST, note 4 body: applied.** It now reads "The gate is code, not a prompt."
2. **MUST, note 5 head: applied, via the source route.** The head is kept. A source row now cites the refinement journal at `73af1f62` ("a false `miss` that passes every static check") and the `FP:1754-1785` slide title.
3. **NICE, highlighter clipping: applied.** `hl` now uses `top-edge: cap-height` with 6 pt extent, and the hero keeps `ascender`. Descenders are clear in notes 2, 4 and 5.
4. **NICE, note 3 arrow: applied.** `tdy` changed from −2.2 in to −3.4 in, and the tip now lands on the MOLD hash/commit rows (checked in a 30 dpi crop).
5. **NICE, Z-row legend: applied.** It is cut to "■ = one skill".
6. **NICE, double [1] in note 4 foot: applied.**
7. **NICE, "recast" in the reissue head: applied.** The head is now `discover-shed-tool`.
8. **NICE, "of 56 Mold skills" → "of 56 skills": skipped.** `casts/claude/skills/` holds 69 directories, so "of 56 skills" would undercount. "Mold" names exactly which 56.

