# Review: receipts-side-by-side

**Verdict:** ship after small tweaks. It meets all the feedback:
- Orbit 0/15 is dropped, and note 3 frames the finding positively (guidance, not enforcement; the `tximport` catch).
- There is no lightning-talk QR. The Foundry and preprint QRs are present, and the GCC slides QR is the full talk.
- Scott Cain¹ is in the authors, before Anton Nekrutenko.
- There is no Rumsfeld quote and no Nextflow workflow.
- `wall time` comes before `JOBS RUN`.

It also follows the outline:
- The two receipts have equal height, width and type size.
- Note 3 bridges VERIFY and `Connections: 57 ok, 0 invalid` on the same line.
- The tally and notes 1–6 are as specified.

`audit.py` passes on `poster.pdf`, and the hero is readable at 25%. No MUST items. One real legibility defect (tweak 1) was confirmed by a full-resolution crop and tested in a scratch copy.

## Tweaks

1. **NICE: highlights clip the descenders on the line above** (notes 2, 3 and 5). Each highlight's top edge is set at the ascender, so it paints over the line above. At 40 ppi, "pins" reads "nins", "typo" reads "tupo", "repairs" reads "renairs", and the comma in "fails here," looks like a period. Fix it in `poster.typ` line 87, `hl()`: replace `top-edge: "ascender"` with `top-edge: "x-height"`. Rendered in a scratch copy, this fixes all three notes, and the guards still pass.
2. **NICE: tool names in VOID don't match the TOOL CALLS lines.** The tool lines print `featurecounts` and `rna_star`, but the VOID heads say `featureCounts` and `STAR`. In `poster.typ` line 334, replace `featureCounts · paired_end_status` with `featurecounts · paired_end_status`. In line 337, replace `fastp #sym.arrow STAR · paired input` with `fastp #sym.arrow rna_star · paired input`.
3. **NICE: density cut 1, the thesis** (25 of 394 words). Its last clause repeats the title's line 2. In line 37, replace the thesis with: `Skills compile from notes people can read; workflows type-check before any job runs.` This saves about 12 words.
4. **NICE: density cut 2, the second sentence of note 4.** The TOOL CALLS and CONNECTIONS sections, and the arrow, already show what it says. In line 386, delete ` gxwf checks each tool call and top-level connection against them.` This saves 11 words. With tweak 3, the body comes to about 371, the outline's target of 370.
5. **NICE: the VOID caption implies a single typo.** There are two VOIDs, one planted per copy (`rerun_gxwf.sh` lines 27–29). In line 327, replace `one typo planted in a copy` with `one typo planted per copy`. The word count doesn't change.
6. **NICE: "here" in note 5 points the wrong way.** Note 5's arrow lands on `wall time`, but the typo fails down in VOID. In line 389, replace `A one-letter typo fails here, ` with `A one-letter typo fails ` (−1 word).
7. **NICE: the tally label wraps badly.** It reads "All of IWC, tool / state:". In line 397, replace `[All of IWC, tool state:]` with `[All of IWC, \ tool state:]`.
8. **NICE: density cut 3 (optional; README open question 4).** Drop the optional gxwf docs and GCC slides QR codes. That leaves one code per side column, under the notes, and adds air at the bottom of both columns. In lines 422–425, keep only `qr-tile("qr-foundry", …)` and `qr-tile("qr-preprint", …)`, and set `qr-stack` (line 368) to `qr-w + 0.45in` so each code still ends on the torn edge.

## Checked, no change
- **Greyscale:** the highlights fade to near-white, but all text keeps its contrast, and the stamps read as dark outlines.
- **Text size:** nothing is under 24 pt (the references sit at exactly 24 pt, and they are exempt).
- **Collisions:** none, apart from tweak 1.
- **Facts:** every number has a source in the README table: 39/0, 57/0, 5, 13, 24 (5+9+7+3), < 1 s, 133 / 3,217 / 0 / 1, 10,000+, `c0940fc0`, rev 5 and `05c99cba`. There are no benchmark rates. "Every reference has a hash" is true of all 5 references.
- **Naming:** "Format 2", "gxwf" and "MOLD revision" are each used consistently across the poster.
