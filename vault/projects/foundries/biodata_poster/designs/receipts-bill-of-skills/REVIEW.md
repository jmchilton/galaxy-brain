# Review: receipts-bill-of-skills

**Verdict:** ship after small tweaks. Feedback compliance is clean: no 0/15 (dropped, as the outline says), the guidance-not-enforcement and `tximport` framing is positive, there is no lightning-talk QR, the Foundry and preprint QRs are present, Scott Cain¹ is before Nekrutenko, and there is no Rumsfeld quote, Nextflow listing or typing receipt. Every printed number traces to the README sources table. The poster stays inside its outline: a bill with two stubs, not a Gantt chart. The README documents and justifies its departures. The hero reads at 25%, nothing is under 24 pt, and greyscale holds (band 5 is solid and band 10 is hatched). The real defect is legibility: highlighter bars clip the line above them in the pen notes.

Tweaks 1, 2, 7 and 8 were test-rendered in a scratch copy (`/private/tmp/claude-503/receipts-bill-of-skills-review/t/`), and each fixes what it targets.

1. **NICE (top priority, legibility).** *Location:* `poster.typ` line 73, `hl()`, which affects notes 1, 2, 4 and 5.
   - *Problem:* the highlight bar starts at the ascender, so it paints over the descenders of the line above. "Every slip" reads as "Everu slip" (note 5). "skill;" reads as "skill:" (note 2). "compiled" and "prompts" lose their p-tails (notes 1 and 4).
   - *Change:* `top-edge: "ascender"` → `top-edge: "x-height"`. Verified: the descenders come back, and the bar still covers the word.

2. **NICE.** *Location:* line 350, the pen arrow from the circled ×7 to the pins.
   - *Problem:* the arrowhead lands on the "T" of TOOL SHED PINS, and the shaft grazes pin number "1".
   - *Change:* replace `draw-arrow(x + 1.12in, y - 0.3in, sx + 2.4in, s1y + 0.25in, bend: 0.18)` with `draw-arrow(x + 1.12in, y - 0.3in, sx + 0.45in, s1y + 0.4in, bend: 0.12)`.
   - The head then sits in the empty corner left of the header. The shaft still crosses one DONE time (22:29/22:40). That can't be avoided while the times column sits between ×7 and the stub, and it is acceptable for pen on paper.

3. **NICE (density, outline drift).** *Location:* line 416, note 2 `foot:`.
   - *Problem:* "This run's feedback against the skill cites this exact Mold revision: rev 5 · 05c99cba." is not in the outline, and it repeats the stub's `MOLD rev … 5 · 05c99cba` line three inches away. It costs about 13 body words. It also introduces the only "Mold revision" (mixed case) against the stub's "MOLD rev".
   - *Change:* delete the `foot: [...]` argument from note 2.

4. **NICE (density).** *Location:* line 288, the stub 1 subtitle.
   - *Problem:* "one per line-5 iteration" is awkward, and the circled ×7, the arrow and the 1–7 numbering already say it. It costs 4 words.
   - *Change:* delete `#ln[#text(size: 30pt, fill: ink-soft)[one per line-5 iteration]]`, and keep the `#v(-0.25em)` or drop it to taste.

5. **NICE (fact clarity).** *Location:* line 241, the bill's date row.
   - *Problem:* `2026-10-20 … 22:11 → 00:34 UTC` crosses midnight, and the run finished 2026-10-21T00:34:52Z. As printed, it reads as a run that ended before it started.
   - *Change:* `#row[#d.run.date][#d.run.start_hm #sym.arrow.r #d.run.finish_hm UTC]` → `#row[#d.run.date][#d.run.start_hm #sym.arrow.r 10-21 #d.run.finish_hm UTC]`. The right column fits at 41 pt. Better still, derive `10-21` from `finished_at` in `extract.py`.

6. **NICE (slight overstatement).** *Location:* line 404, the note 4 body.
   - *Problem:* "Lines 9 and 10 run programs, not prompts". Lines 9 and 10 are skills, which are prompts; what is not a prompt is the verdict.
   - *Change:* replace it with "Lines 9 and 10 are judged by programs, not prompts:" and keep the rest. The word count is unchanged.

7. **NICE (collision).** *Location:* line 376, the ruler band labels.
   - *Problem:* "33 min" sits on top of the "00:34 UTC" end label, with no gap between them.
   - *Change:* `(y0 + y1) / 2 - 0.55in` → `(y0 + y1) / 2 - 0.7in`. Verified: there is a clear gap, and band 5's label still sits inside its band.

8. **NICE (collision).** *Location:* line 415, the note 2 arrow.
   - *Problem:* the arrow tail starts inside the circled "2" badge.
   - *Change:* `ady: 0.45in` → `ady: 0.0in`. Verified: the tail now starts above and left of the badge.

9. **NICE (naming).** *Location:* line 250, the bill subtotal `planemo 1 test · 0 failures`.
   - *Problem:* notes 3 and 4 say "Planemo", but this line says "planemo". The outline prints it lowercase, so this is optional.
   - *Change:* `sub[planemo …` → `sub[Planemo …` so the poster uses one spelling. (`gxwf` stays lowercase everywhere, which is correct.)

**Density cuts, in order:** #3 (note 2 footnote, −13 words) and #4 (stub subtitle, −4 words). That takes the body from 338 words to about 321.
