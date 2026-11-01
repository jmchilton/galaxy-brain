# Review: receipts-reissue

**Verdict:** close to print. It meets every FEEDBACK_ROUND3 item:
- 0/15 is dropped, and "Rails, not reminders" carries the positive `tximport` catch.
- There is no lightning-talk QR. The Foundry and preprint QRs are present at 4.0 in.
- Scott Cain¹ is in the authors, before Nekrutenko.
- There is no Rumsfeld quote, no Nextflow and no typing receipt.
- The body is 350 words.

It stays on its outline: two slips, one correction, one row, and the notes point where the outline says. The hero is about 150 pt and easy to read at 25% and in greyscale. The red strikes still read in grey. The two MUSTs are copy claims. The one visible collision is a highlighter bug, and the fix for it has been test-rendered.

## Tweaks

1. **MUST: note 4 body overstates.**
   - **Location:** note 4 body, `poster.typ:422`.
   - **Problem:** "The fix lives in the source, not in a prompt." But the integron fix *is* guidance. It is an `index.md` rule that compiles into SKILL.md, which is a prompt, and its eval property is `llm-judged` (README, note 5 row). `_verify.json` did not catch this miss. The line also contradicts the foot's "Skills are guidance, not enforcement."
   - **Change:** replace `The fix lives in the source, not in a prompt.` with `The gate is code, not a prompt.`

2. **MUST: note 5 head has no source.**
   - **Location:** note 5 head "A false miss passes every static check" (`poster.typ:429`).
   - **Problem:** The README's sources table has no row for "every static check". The cited sources (commit message, `FP:1754-1785`, r1 §5.1) say only that a *run* surfaced the miss.
   - **Change:** either
     - add a README source row showing which static checks pass a miss (e.g. `validate-galaxy-tool-discovery` accepts a no-hit result), if that can be verified; or
     - change the head to `A false miss looks \ like a clean result`.

3. **NICE: highlighter clips the line above.**
   - **Location:** note 2 ("topic" in line 1 is cut by the "came back better" highlight) and note 5 ("wrapper" is cut by "authored one that already ships"). It is also faint on note 4 line 1.
   - **Problem:** `hl` uses `top-edge: "ascender"`. Kalam's ascender rises above the 0.26em leading, so the next line's yellow paints over the descenders above it.
   - **Change:** at `poster.typ:79`, `#let hl(body) = highlight(fill: hl-col, extent: 3pt, top-edge: "ascender", …` → `#let hl(body, top: "cap-height") = highlight(fill: hl-col, extent: 6pt, top-edge: top, …`. At `:194`, change `#hl(hero1.mark)` → `#hl(hero1.mark, top: "ascender")` so the hero is unchanged. A scratch render confirms both descenders are clear.

4. **NICE: note 3 arrow misses its target.**
   - **Location:** note 3 arrow, `poster.typ:413`.
   - **Problem:** The README says it points at the struck hash rows, but the tip lands under "cast at", beside the NEVER HAND-EDITED stamp.
   - **Change:** `tdy: -2.2in` → `tdy: -3.4in`. The tip then lands on the MOLD commit row (test-rendered).

5. **NICE, density cut 1: Z-row legend repeats.**
   - **Location:** Z-row legend, `poster.typ:380`.
   - **Problem:** "1 note revised → 8 skills reissued" repeats the big "8" and note 6's body.
   - **Change:** keep only `#box(...) = one skill`, which is −7 words.

6. **NICE, density cut 2: note 4 foot cites [1] twice.**
   - **Location:** note 4 foot, `poster.typ:421`.
   - **Change:** `Skills are guidance, not enforcement [1]. Galaxy’s validator caught…` → `Skills are guidance, not enforcement. Galaxy’s validator caught…` Keep the final `[1]`.

7. **NICE, density cut 3: "recast" appears three times on the reissue slip.**
   - **Location:** reissue head, `poster.typ:282`.
   - **Problem:** "recast" is in the head, in `SKILL.md … recast, not edited`, and on the RECAST stamp.
   - **Change:** `#d.skill · recast` → `#d.skill`. If more room is needed, the next cut is note 2 ("Text is cheap", about 30 words), as the README's open question 4 suggests.

8. **NICE, copy: Mold is capitalised two ways.**
   - **Location:** Z-report subhead, `poster.typ:373`.
   - **Problem:** It says "of 56 Mold skills", but the slips print the field as `MOLD` and the notes avoid the word.
   - **Change:** `of #p7.casts Mold skills` → `of #p7.casts skills`. The 56 are the casts that have provenance, so "skills" is accurate on the poster's own terms.
