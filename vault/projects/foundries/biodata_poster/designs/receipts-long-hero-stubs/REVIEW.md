# Review: receipts-long-hero-stubs

**Verdict:** ship after small tweaks. All feedback items pass:
- Orbit 0/15 is dropped, and note 6 frames it positively.
- No lightning-talk QR; the Foundry and preprint QRs are present.
- Scott Cain¹ is in the authors, before Anton.
- No Rumsfeld quote and no Nextflow drawing.
- Wall time comes before JOBS RUN.

The poster stays inside its outline. The hero reads at 25%, nothing fails in greyscale, and the smallest text is the 24 pt references.

One judgment call needs John (tweak 1): the TOOL CALLS list is the same "list in the middle" he complained about. The fact fix is tweak 2.

## Tweaks (most important first)

1. **NICE (strongly recommended; John decides). Hero, TOOL CALLS, subworkflow lines (`poster.typ` ~L221–222).**
   - **Problem:** this is the keeper's middle list, nearly line for line (15 rows at 35 pt). In typed-not-guessed, "lists in the middle" can only mean this receipt column. The README's open question 5 says shortening the list "costs the long tape". It doesn't: the slip height is fixed (`rb - ry` = 28.95 in) and the `1fr` spacers absorb any cut, so the tape stays 29 in.
   - **Change:** collapse the four subworkflow rows into one, `inside 4 subworkflows ........ 24  PASS`. Use `#item[#text(fill: ink-soft)[inside #d.subworkflows.len() subworkflows]][#d.subworkflows.map(s => s.qty).sum()][#pass]` and drop the `for s in d.subworkflows` loop.
   - **Then:** re-anchor the TYPED stamp from `at("a-subs") + 0.2in` to `at("a-state") - 0.95in`, so it doesn't sit on the new row.
   - **Gain:** 4 fewer lines and about 12 fewer words.
   - **If John wants more:** also drop the grey version strings (`#t.version`) from the 10 top-level rows.

2. **MUST (fact: implied benchmark). Note 3, line 2 (~L374).**
   - **Problem:** "CLI, editor, browser and CI: one core, under a second." claims every surface takes under a second. The only measurement is the CLI on one workflow with a warm cache (0.57–0.70 s, `data/timing.txt`), and the receipt already prints that, with its qualifier.
   - **Change:** replace "CLI, editor, browser and CI: one core, under a second." with "CLI, editor, browser and CI: one core." This also saves 3 words.

3. **NICE (fact, hedge). Thesis line 1 (L37).**
   - **Problem:** "Galaxy type-checks each tool call before a job runs." states as fact that every Galaxy run is statically type-checked. The receipt is a `gxwf validate` run, and the keeper said "Galaxy *can* type-check…".
   - **Change:** replace "Galaxy type-checks each tool call" with "Galaxy can type-check each tool call" (+1 word, total 389).

4. **NICE (collision). Build stub, NEVER HAND-EDITED stamp (L348).**
   - **Problem:** the stamp's top border kisses the descenders of the pen label "each step row wrote one" (see a 60 dpi crop).
   - **Change:** set `stamp(angle: -4deg, …)` to `angle: -2deg` and `dy: at("s2-stamp") - 1.5in` to `- 1.38in`. The 1.55 in spacer has room.

5. **NICE (copy clarity). Bridge label (L339).**
   - **Problem:** in "each step row wrote one", "one" what? The noun is two lines up, and a reader won't connect them.
   - **Change:** replace "each step row wrote one" with "each step row wrote this file". The word count is unchanged.

6. **NICE (naming). Hero VOID, FAIL head (L260).**
   - **Problem:** the TOOL CALLS list prints `featurecounts` (the tool id), but the VOID line prints `featureCounts`. It reads as two different tools.
   - **Change:** replace `featureCounts · paired_end_status` with `featurecounts · paired_end_status`.

7. **NICE ("every" vs "each"). Note 4 (L355).**
   - **Problem:** "checked at every resolution" is a process claim, but the evidence on the poster is a replay of each of the 7 commits.
   - **Change:** replace `#hl[every resolution]` with `#hl[each resolution]`.

8. **NICE (line break). Note 2 (L371).**
   - **Problem:** "map-over" breaks at the hyphen ("map- / over").
   - **Change:** replace `map-over` with `#box[map-over]`.

9. **NICE (density, exempt but loud). References (L409).**
   - **Problem:** the "Receipts printed from real files…" sentence wraps to 6 lines of grey 24 pt, which makes the bottom-left corner the densest patch on the sheet.
   - **Change:** shorten it to "Receipts from real files: gxwf #d.cli over IWC rnaseq-pe \@ #d.iwc; DengueSeq DENV3 run (Vogels et al. 2024), replayed with gxwf #dgx; foundry \@ #b.foundry.short." That is about 3 lines.

10. **NICE (orphan). Note 1 head (L367).**
    - **Problem:** "Types from the Tool Shed" wraps and leaves "Shed" alone on line 2.
    - **Change:** replace the head `[Types from the Tool Shed]` with `[Tool Shed types]`, which fits on one line. Or keep the wording and accept the wrap.

## Density: the cuts that help most
- Tweak 1: the subworkflow rows, and optionally the version strings.
- Tweak 2: the second half of note 3.
- Tweak 9: the reference provenance sentence.

## On the designer's open question 5 (full TOOL CALLS vs "lists in the middle")

Yes, it conflicts:
- John's complaint was about typed-not-guessed, and its middle column *is* this receipt.
- Here the list carries 165 of the poster's 388 body words, and TOOL CALLS is the densest block.

"Length is the argument" is about the tape, not the row count. The slip is fixed at 29 in, so trimming rows keeps the length and adds air. Tweak 1 is the minimal fix that keeps the 10 per-tool rows, and those rows are the evidence for "each tool call". Collapsing everything to a 3–4 line summary would go further than the feedback asks and would weaken the thesis.

A smaller related point: the list opens on `__FLATTEN__ 1.0.0`, an internal tool. If row order is free in `extract.py`, putting `fastp` first makes the first row read as science.
