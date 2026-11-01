# Content pass: trace, noticeboard, ten-questions

Content and clarity editor, 2026-10-29. All three posters were edited in place (`content.yml` only, plus each README's
new "Content pass" section) and rebuilt with their documented commands. All guards pass. The before state is in each
`checks/preview-draft1.png`. No `node_modules` or symlinks are left in the vault.

## What was verified (shared by all three)

Checked against primary files, not the dossier alone:

- **Run times** (both `foundry-run.yml` files):
  - brief run 15:06:38–15:13:00;
  - build run 22:11:22–00:34:52;
  - review gap 6 h 58 min;
  - gxwf phase 83 s, Planemo phase 33 min.
- **Ledger:** 19 entries; 5 open, 2 of them `kind: dropped`; 14 resolved. The 10,707 N / empty-sequence note and the
  two BAQ `brief_change_recommendations` (`proposed`) are in it.
- **Review:** 10 proposals, Q2 `expert-edited`; Q1–Q5 low confidence as proposed; reviewer John Chilton (`review.md`).
- **Brief evidence:**
  - Q1: Florida pan-serotype;
  - Q6: 10 in Methods, code and Fig. S1; 20× in Results.
- **Verdicts:**
  - gxwf 1.14.0: pass, 7/0, connections valid;
  - Planemo 0.75.47: pass, 7/7 jobs, `denv3_test` not run, Galaxy `b18269a1` not pinned, 7 Tool Shed repos installed.
- **Debug report:** the BAQ probe was the wrapper chain *outside Galaxy*, and Galaxy output bytes were not kept.
- **Mold hashes:** every trace-row Mold hash, and `discover-shed-tool` rev 5 `05c99cba`, match
  `_plugin/f275059e/…/_provenance.json`.
- **foundry git:**
  - `f275059e` 2026-10-19 (PR #688);
  - `73af1f62` 2026-06-17 (`integron_finder`, MRSA re-run, `iuc/integron_finder`);
  - `9adc20b7` 2026-10-22 (#701).
- **Upstream, via `gh` today:**
  - IUC #8808 merged 10-29;
  - usegalaxy-tools #1791 merged 10-29;
  - galaxy #24435 open;
  - `jmchilton/galaxy-tool-util-ts` #205 merged 10-26.
- **Content guards:**
  - 0/15 is attributed to the Orbit study, open-weight models, on all three.
  - "Paper + linked code" is on all three.
  - "An author (J.C.)" is on all three.
  - No N-of-M rate.
  - "Galaxy Workflow Foundry" is used in full on first use.
  - EGAPx and sarek are absent by design.

## trace

**Changes**

- **Hero beat 3:** "Nothing is off the record" → "The gaps are written down." The old line was an absolute claim on a poster that
  also prints "bytes not retained".
- **Hero gloss rewritten.** It glosses Mold ("one per action, declaring what it needs") and names the judges: "Tool
  Shed (registry), gxwf (validator), Planemo (tests)".
- **Stat strip:**
  - "1 paper: dengue sequencing [3] + its code, picked after the skills were built";
  - "13 phases" kept (more than 13 skills ran);
  - the time cell is labelled "paper → brief, then brief → tested workflow";
  - "PASS in a real Galaxy (Planemo)".
- **Tool rows** now say "gxwf: …" and "Planemo: …".
- **Pin note:** "Looked up in the Tool Shed index, not recalled by the model."
- **0/15 cite:** "pp. 16, 18".
- **"cast" → "build" / "recompiled"** everywhere. The build caption is "Compiling runs no model…".
- **Ledger caption:** a plain-English reading of the YAML replaces the duplicated "1 of 19 entries, abridged".

**Notes for the design agent**

- **Copy is at capacity.**
  - The trace sits at 40.2% of the page, right at its guard.
  - Rows only just clear the 76 px guard; drafts of this pass failed it at 74–75 px.
  - The bottom band's tallest column sets the trace height, so every added line there costs the trace.
  - The glossary for the three tools had to go in the hero gloss because the middle column couldn't take it. If you
    free height, add "Molds append and resolve; what nothing closes stays open" back under the ledger caption.
- **Nothing large says "dengue".** At 20 seconds the subject of the run is only in the small grey text of stat cell 1.
  Consider a subject line at heading size over the trace, built from the run labels: "One run: the DengueSeq paper
  (dengue virus) → a tested Galaxy workflow".
- **Hero beat 3 is now wider,** so the gloss column beside it is narrower. Keep the gloss at 3 lines.
- **The burndown note** ("19 raised, 14 resolved…") sits very close to "0: never reached". Leave it clear room.
- **Title.** The short title (sign-off #4) would give the trace its first real headroom.

## noticeboard

**Changes**

- **BAQ probe line:** "A later probe of the wrapper chain, outside Galaxy and after the ledger was written". It used to
  read as a Galaxy result.
- **LOST & FOUND:** "Again in October" (which implied a second false miss) → "October, #701: a test-assertion defect
  in 3 runs".
- **"The model drafts; the tools decide."** now opens INSPECTED's note. Before, the phrase was nowhere on the board.
- **Glosses:**
  - Molds: "one per action, listing its needs".
  - Skills: "each hashing its sources".
  - Tool Shed: "Galaxy's tool registry".
  - gxwf: "validator".
  - Planemo: "1 test, in a real Galaxy". It replaces "1 of 2 tests run", which read like a rate.
- **"The paper's chain / pileups" → "the paper's code".**
- **MISSING sub** → "A zero-read sample's all-N consensus" (N2).
- **CUT item 1** → "The paper's genome-completeness metric".
- **FREE sub** → "Agent-built, for dengue virus: DengueSeq DENV3 [2]".
- **0/15 cite** → p. 18.
- **Eyebrow:** Oxford comma.
- **Cut for space:** "Skills are guidance, not enforcement".
- **Legend** adds "Second test case not yet run" (a must-say that "1 of 2 tests run" used to carry).

**Notes for the design agent**

- **Col-b is tight** (slack 23 px; col-a 54, col-c 76). If you widen it or shrink the FREE node strip, restore "Skills
  are guidance, not enforcement [1, pp. 16, 18]" to INSPECTED.
- **Make "The model drafts; the tools decide." a typeset subhead** under INSPECTED at 40–48 pt. It is the board's only
  statement of the tools-decide idea and is currently bold body text. It needs a new template field; the copy is in
  `inspected.why`.
- **N2 depends on the subline being read.** Give "A zero-read sample's all-N consensus" and the empty Galaxy record more
  weight, for example the empty record at the same size as the N block, side by side. Then the eye reads "the paper's
  code gives N; Galaxy's wrapper gives nothing" rather than "the paper is missing data".
- **The rail hero doesn't say what's on the board.** If there is room, a 40 pt strip under the rail would help: "One
  agent-built Galaxy workflow, from a dengue sequencing paper. What it couldn't match is posted here." The copy is ready
  to drop into `content.yml`; it has no field yet.

## ten-questions

**Changes**

- **Q6 tag softened:** "Which applies is your call, not a model's." The evidence line is now "Results report coverage at
  20×". The 10 vs 20× split is masking depth vs reporting threshold, not a contradiction, and Q6 was not a LOW proposal.
- **Tool rows glossed:** "Galaxy's tool registry", "workflow validator", "test runner".
- **Molds glossed** in the wiki block.
- **BAQ glossed** at first use. The NEW lines are now "Consensus: …" / "Variants: …".
- **Form source** adds "(dengue virus)".
- **Legend** folds in the reviewer: "“You” was one of us, an author (J.C.)".
- **"cast" / "recast" removed.**
- **Cuts to pay for these:**
  - the tally is now "19 raised; 14 resolved, 5 written down";
  - `--strict`, "installable" and SRR25366733 were dropped from the tool rows.

**Notes for the design agent**

- **Word-budget bound: 549 / 550.** Any room you free should go to the form (larger questions, more air between rows),
  not to more copy.
- **The thesis's first line nearly touches the hero's descenders.** "A correct workflow is…" sits tight under "it asked
  you ten questions." Open that gap.
- **The tool glosses are small grey detail lines.** Consider setting the gloss word ("workflow validator", "test
  runner") in the darker weight, so the 72 pt tool name and its meaning read together.
- **The form is still about 33% of the page.** The short title (sign-off #4) gives it about 1.5 in.
- **The Consensus/BAQ line wraps to two lines** in "Five things stayed open". That is fine, but keep the ring glyph
  top-aligned.

## Sign-off still open (all three)

- **#4 title.** "Conversations" stays, but no conversation route is shown.
- **#5** unpublished run dirs.
- **#12** BAQ probe numbers (noticeboard).
- **#13** Anton's `[[ASK]]` slots.
- **#17** live URL.
- **#18** re-count at print.
- **#19** Karpathy.
- **T2** `b18269a1` "not pinned".
- **Per poster:**
  - trace: T1 and the hero beat change;
  - noticeboard: N1 and N2;
  - ten-questions: Q1–Q3.
