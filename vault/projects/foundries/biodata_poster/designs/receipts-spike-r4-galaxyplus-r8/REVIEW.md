# REVIEW — receipts-spike

**Verdict:** ship after small tweaks. Feedback compliance is clean: Orbit 0/15 is dropped, there is no lightning-talk QR, and the Foundry and preprint QRs are present. Scott Cain¹ sits before Nekrutenko. There is no Rumsfeld quote and no Nextflow workflow, and on VALIDATED the wall time comes before JOBS RUN. The poster stays on its outline, and the hero reads at 25%. The body is 310 words.

Two problems carry most of the weight. The highlighter bars clip the descenders on the line above them in 4 of the 5 notes. And three loud "0"s under a "jobs run" header repeat the failure read John flagged.

## Tweaks

1. **MUST: highlighter clips the line above (notes 1, 3, 4, 5).** At 100 ppi, the bars paint over these:
   - note 1: the "p" of "compiled";
   - note 3: both "g"s of "against";
   - note 4: the "y"s of "analysis", and "an";
   - note 5: the "p"s of "prompt", and the "[1]" brackets.

   Note 2 is unaffected, because its highlight is on line 1. Cause: `hl()` uses `top-edge: "ascender"` plus `extent: 3pt` at note leading 0.26em, and each later line's highlight is drawn over the earlier line's glyphs. **Change:** in `note-body` call sites (lines 349–352 and 369), use `#hl(top: "x-height")[…]`. Or change the `hl` default to `top: "x-height"` and keep `top: "cap-height"` for the hero, which already passes it. Neither option changes the layout. If it still touches, also set `extent: 3pt → 0pt` for the notes.

2. **MUST: "jobs run 0 · 0 · 0" reads as failure.** The pen column's header is "jobs run", and the three 130 pt "0"s under it, each paired with the 46 pt bold `JOBS RUN … 0` on its slip, are the loudest marks on three receipts. This is the same "row reads as if nothing works" problem John flagged on typed-not-guessed. **Change:**
   - jobs-column header (line 325): replace `jobs \ run` with `jobs \ needed`;
   - zero-job receipts (lines 165, 177, 190): replace `jobs[0]` with `jobs([0], tail: [none needed])`.

   This reuses the existing `tail` slot that TESTED already uses. It adds 6 body words, so the count becomes 316, under 400. With it, the 0s read as "signed without running anything", and note 4 explains why the 7 matters.

3. **MUST (fact by implication): CAST's VERIFY line sits directly above PINNED.** `VERIFY galaxy-tool-pin.json … schema c0940fc0` invites the reader to infer that the 7 pins passed that gate. Per README Open Q1, replaying it rejects 2 of the 7 (`d366ab3` bedtools, `b82fa5e` tp_sed). **Change:** delete `row[VERIFY #c.verify_file][schema #c.verify_schema]` (line 163). This also cuts 4 words. Note that the outline listed this line, so this is a departure, and the README should log it.

4. **NICE: hero says "Four programs", but there are three binaries.** The signatures are `foundry-build cast`, `gxwf tool-revisions`, `gxwf validate` and `planemo test`. That is 4 commands from 3 programs, and a careful reader will spot gxwf twice. Option A: replace the hero `Four programs` with `Four commands`. Option B: keep the hero and change the thesis "a program, not the model" to "a command, not the model". If John wants "programs", leave it, but decide deliberately.

5. **NICE: the PASS stamp sits on the dot leaders of 3 rows.** It is at `dx: 5.4in, dy: -0.92in` and overlaps the leaders of "at the pins", "containers" and "wall time". No values or labels are covered, but it brushes the "s" of "pins". **Change:** `dx: 5.4in → 6.6in` and `dy: -0.92in → -0.80in`, so the stamp clears the label text and only crosses the leaders.

6. **NICE (copy consistency): wall-time rows don't match.** VALIDATED reads `wall time, warm cache … < 1 s`, and TESTED reads `wall time … 11 min`. **Change:** line 188 `[wall time, warm cache]` → `[wall time]`. The warm-cache caveat already lives in the README sources. This cuts 2 words and makes the two rows rhyme.

7. **NICE (density cut): the PINNED column-header row.** The `OWNER/TOOL · VERSION … CHANGESET` row (line 174) restates what the `owner/` prefix and the `@` already show. **Change:** delete that `part(...)`. This removes 4 words and one line from the longest slip.

8. **NICE (density cut): the third QR.** "Install the skills" is optional per the outline. Dropping it widens the two required QRs from about 3.4 in to about 5.2 in, which scans better from the aisle. **Change:** remove `qr-tile("qr-usage", …)` and make it a two-column grid, `qw = (brw - 0.35in) / 2`. Keep it if John wants the install path.

9. **NICE (copy): CAST date format differs.** CAST's header shows `№1 2026-09-13`, while PINNED, VALIDATED and TESTED use `10-20 …` / `10-21 …`. The difference is legitimate (the cast is a month older), but it reads as inconsistent. **Change:** keep the full year on CAST only if intended. Otherwise print `09-13`, so the reader sees the same format and a different month.

## Checked, no change needed

- Text: nothing is under 24 pt. The references are at exactly 24 pt.
- Greyscale: the highlights go faint but the text holds, and the circled 7 still reads.
- Hero at 25%: legible.
- Collisions: none apart from #1 and #5.
- Sources: every number has a source in the README.
- Naming: "Tool Shed" is consistent, and "Planemo" is capitalised in prose while `planemo` stays lowercase as a command, which is fine.
- Note 4 quote: it is QA:466, and the outline wording is kept.
