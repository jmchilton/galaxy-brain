# REVIEW: receipts-stapled-bundle

**Verdict: ship after small tweaks. No MUSTs.** It complies with the feedback:
- 0/15 is dropped, and note 6 carries "guidance is not enforcement" plus the `tximport` catch;
- no lightning-talk QR, and the Foundry, preprint and `[[QR: live results]]` codes are present;
- Scott Cain¹ is in the authors, before Nekrutenko;
- the Rumsfeld phrase appears only in [3], and there is no Nextflow and no typing receipt;
- the body is 361 words.

The poster stays inside outline 4, and its departures are documented in the README. At 25% the hero is clearly readable, and greyscale holds: `dropped` and `open` differ by the word itself, not only by colour.

Tweaks 1–5 were tried in a scratch copy (`/private/tmp/claude-503/receipts-stapled-bundle-review/t/poster.typ`). It compiled with all `poster.typ` guards on, and crops confirmed each fix. The audits were not re-run.

1. **NICE: highlighter bars clip the line above** (`poster.typ` `#let hl`, line 95).
   - **Problem:** With `top-edge: "ascender"` and tight Kalam leading, each bar paints over the descenders of the previous line:
     - note 4: "Each g~~a~~p" (the g and p of "gap" are cut by "dropped on purpose");
     - note 2: the bottoms of "checks what is";
     - note 3: "At zero" and the y of "ordinary";
     - note 6: "The model translates";
     - hero: the bar on "don't know." cuts the baseline of "Write down what".
   - **Change:** replace `top-edge: "ascender"` with `top-edge: "x-height"` in `hl`. Verified that this clears every case and the bars still read as highlighter.
2. **NICE: burn-down sub-lines collide with the step names** (`burn-row`).
   - **Problem:** The descenders and underscores of `filter_mapped_primary`, `primer_trim` and `per_base_depth` sit on the SHA · tool line.
   - **Change:** `row-gutter: 0.08in` → `0.2in`, and the trailing `v(0.2in)` → `v(0.08in)`. Row pitch is unchanged and the guards pass.
3. **NICE: note 1 arrow strikes through `in:`** in the YAML excerpt.
   - **Change:** in `#note("left", y1, …)`, replace `bend: 0.08` with `ctrl: (12.4in, 15.1in)`. The arrow then sweeps in under `in:` and lands on `TODO_paired_reads`.
4. **NICE: note 4 arrowhead sits on the "d" of the second `dropped`, and the shaft overlaps the `open` tags.**
   - **Change:** in `#note("right", y4, …)`, replace `to: (0.0in, 0.2in)` with `to: (-0.35in, 0.25in)`. The head then lands in the ledger's left margin, beside the two `dropped` lines.
5. **NICE: references block.** There are two problems:
   - **(a)** One paragraph with `\` breaks means the hanging indent also indents [2] and [3].
     - **Change:** replace `#for r in refs [#r \ ]` with `#for r in refs [#r #parbreak()]`.
   - **(b)** The DOI prints a literal space: `doi:10.64898/ 2026.10.26.761864`.
     - **Change:** replace `10.64898/ 2026` with `10.64898/#sym.zws;2026`. It still wraps there but reads as one DOI.
6. **NICE: tally footer, a small overstatement.**
   - **Problem:** "hypothesis must name a verification", printed under "hypothesis … 104", reads as if all 104 rows carry one. Six don't: they are `companion_of` files, per the README and `receipt.json`. The rule is the schema's (`context.ts:209`), not a property of every row.
   - **Change:** replace `hypothesis must name a verification \ on-demand must name a trigger` with `schema: hypothesis must name a verification \ on-demand must name a trigger`. This adds 1 word.
7. **NICE: density cut 1, the draft's `at b82fa5e` line beside the PROMOTED stamp.**
   - **Problem:** It repeats the SHA already printed on the `consensus_header` row two lines up.
   - **Change:** replace `text(size: 28pt, fill: ink-soft)[at #dr.promoted.sha]` with `[]`. This saves 2 words and clears the grey line out from under the stamp.
8. **NICE: density cut 2, note 5's last sentence, "The schema refuses the shortcut."**
   - **Problem:** The tally footer, which the arrow points at, already states the rule.
   - **Change:** cut that sentence, which saves 5 words. With tweak 6 the footer names the schema itself. If you would rather keep the pen voice, cut the footer's `schema:` prefix from tweak 6 instead and leave note 5 as it is.

No typos found. Naming is consistent: `gxformat2` on note 3 and the stamp, `gxwf`, `draft-validate`, and "Draft format docs". Every printed number traces to `receipt.json` and the README source table; QA:466 and the preprint `tximport` line were spot-checked against their sources.
