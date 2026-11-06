# Domain review: `issue-669-repair-contract`

Profile: `foundry_domain_review`. Model: Claude Opus 5.5 (`claude-opus-5-5`). Effort: not set explicitly on this subagent. Reviewed commit: `6f5be153`, diff `origin/main...HEAD` (`7453431d`).

## What I checked

- Hand-written `content/` diff: `repair`, `advance`, `ledger`, draft-format note, glossary, evals, scenarios, fixtures.
- Fixtures under gxwf 1.15.0: all five drafts report `draft valid`. `draft-next-step` gives `fastqc_per_read`, `fastqc_archive_per_read` (repaired) and `restore_trimmed_sample_sheet_metadata` as expected, and `draft: false` for STAR.
- `npm run cast -- <mold> --target=claude --check` is clean for `repair` and `advance`. I didn't read the casts.
- Run records: `nf2g-demo-rerun-7-10`, `stock-version` and `loop-repair`, final iterations.

I found nothing against the four "Decisions taken by default" themselves. P2 4 touches the consequence of the removal guard, and P3 4 touches the test-phase default.

## Findings

### P1 1: The guard and its only oracle both pass a removal that rests on an uncited claim

§2 (expectations checked against real behaviour), `AGENTS.md` "a fixture is a claim", and the plan review's "serious one".

`scenarios.md`'s "repair removes the last drafty step" accepts a `kind: dropped` that "quotes the searches or the collection semantics rule". The searches in that fixture's entry are Tool Shed searches. `advance` step 2 says a stock tool "does **not** route through [[discover-shed-tool]]", so they can't speak to `__APPLY_RULES__`, the mechanism the entry leaves unproven with "The shared cache has no confirmed stock Apply-Rules pin". That is the same evidence shape as this run's earlier drop of `explode_and_label_input_reads`, and `rerun-7-10`'s final workflow has that step on `tool_id: __APPLY_RULES__`.

The debrief's trial said stock Apply Rules is "unproven, not absent", removed the step anyway, and scored a pass on "`kind: dropped` quotes the searches". So the case can't catch the failure the review set out to prevent. The Mold's wording allows it too: "no citation" reads as "no citation at all", and the ledger's "A reason you cannot cite is still recorded" invites labelled debt.

A sufficient citation exists for this fixture. `rerun-7-10` removed the same step on the packaged `SAMPLE_SHEET_MAPPING` rule, which shows mapping a tool over a `sample_sheet` produces a `sample_sheet`. I checked the rule: it settles the collection type and doesn't state that `columns` values carry over, so the `sample` metadata part stays a narrowing to record.

Ask, with exact wording under Question 1 below:

- `repair` Ledger and `eval.md`: the quoted artifacts alone must carry the removal.
- `scenarios.md`: drop "the searches or". Expect the `because` to quote the semantics rule, or the entry to stay `open` with a note.

### P2 1: The citation the Mold names isn't loaded on a removal

§6.4 (references need the right trigger).

Claims lists "the semantics rule" as a primary artifact for a `because`, but `[[galaxy-collection-semantics]]` is on-demand with the trigger "When the repair inserts or rewires steps touching collection inputs...", and its purpose speaks only of an "inserted producer step". An agent removing a step has no cue to open it. This may be why the trial fell back on the searches, though one run can't show that.

Ask: extend the trigger to "or a removal rests on collection semantics", and generalize the purpose.

### P2 2: `advance` step 1 sends a cache-miss entry straight to repair

Plan review correction 2 (a template-raised guess isn't dropped untested).

Step 1's shortcut fires when an entry "already records why no wrapper can serve it". The guard "A tool version missing from a local cache is not absence" lives only in `repair`, past the shortcut. The sample-sheet entry's note reads "confirmed no acceptable Tool Shed wrapper or cached stock pin", which an agent reasonably takes as qualifying. Steps 2-4 are then skipped, and they are where a stock pin would be tried.

Ask: add to step 1 "A cache miss doesn't record that."

### P2 3: "when the step is already realized" reads as forbidding what the branch adds

§4 (unparseable paragraphs).

The `repair` Ledger paragraph says to leave an entry `open` "when the step is already realized". Read flat, that blocks three things:

- The third failure bucket in `advance`, which escalates defects on earlier, realized steps.
- The ledger's new "validation failure on an edge an earlier step settled".
- The trial's correct closure of `fastqc-zip-output-unavailable` on realized `fastqc_per_read`, by the remedy its entry named.

The review's intent (correction 8) was about removal only.

Ask: "Don't remove a realized step. If no other edit closes its entry, leave it `open`."

### P2 4: "for the terminal path" doesn't exist for a drafty step

The `repair` Ledger paragraph leaves an uncited entry `open` "for the terminal path". The ledger, in the same change, says "A drafty step never leaves the loop". Extract only runs at `draft: false`, and no pipeline source bounds `while draft`.

Tracing it: the entry stays `open`, step 1 goes to step 5, the repair doesn't lower the count, and the gate trips and surrenders. On the next call no `open` entry remains, so steps 2-4 rerun for the same step, and a new entry returns to step 5. The run produces no `galaxy-workflow.gxwf.yml`. The plan review's "can end a run early" overstates this, since nothing in Foundry ends it. The plan assigns the stop to #686's "How a call ends", but this branch adds a new way to reach that state.

Ask: split the sentence so the drafty case doesn't promise a terminal. Have the PR description state the dependency on #686, or carry one sentence saying the call reports and stops at a drafty step with no route left.

### P2 5: A tripped gate leaves nothing the next call can read

§6.3 (deterministic state). `open_history` keeps post-repair counts, while the new gate compares against the pre-repair count, which isn't recorded and can't be derived once entries are raised between escalations. "Ending escalation as the cap does" therefore has no persisted form. The cap is visible as `escalations >= cap`, but a trip is visible only as surrendered entries, and a newly raised entry would escalate again. The ledger also calls itself "the countable state the termination guard depends on".

Ask: one clause, keeping the dashboard shape: "Tripping sets `escalations` to `cap`."

### P2 6: `advance`'s new routing has no oracle

§2, §6.3. `advance/eval.md` has no property for escalation, the budget, step 1's shortcut or the third bucket, and `scenarios.md` has no case. The only edit is the extract clause. Step 1's rule, which separates an entry with evidence from one without, is the routing that decides whether a step gets dropped untested, and it sits in a `reviewed` Mold.

Ask: two `bucket: routing` properties:

- An entry recording why skips discovery. An entry without that evidence goes through steps 2-4.
- An earlier-step defect a structural edit closes appends an entry and escalates.

### P3 1: Cut the chain rule

§6.7. See Question 3. Remove the sentence from the ledger's `open_history` bullet and the clause from `eval.md`'s convergence property.

### P3 2: Stale wording left behind by the widening

§4.

- `advance` frontmatter, ledger reference: purpose says "a newly appended blocking entry", verification says "an escalation that strictly reduces the open count".
- `advance` step 5: the title "Check computability" and "[[draft-validate]] cannot catch this" now sit over entries that aren't computability gaps, including third-bucket validation failures.
- `repair` frontmatter: "re-wires", "the re-wired draft" and "re-wired steps" in two reference purposes.

### P3 3: Output removal has no change-set kind

`repair` says edits are "named by change-set kind", and `eval.md`'s deterministic property requires a note "naming the change-set kinds", while `fastqc-zip-no-port` accepts removing a public output. The vocabulary has `remove-input` but no `remove-output` (`apply:80`, `interview:65`). The debrief left this. An honest removal can't satisfy the property as worded.

Ask: add `remove-output` to `interview`, `apply` and `repair`, or have the eval accept a note naming the drop, as the Mold already says.

### P3 4: `star-sa-index-input` can't reach the Mold in any pipeline

§2. Its entry is `raised_by: implement-galaxy-workflow-test` with no `step:`, and the draft is `draft: false`, so `advance` step 1 extracts and never escalates. That matches the test-phase default, but the ledger now tells test-phase Molds to set `blocking: true` for "a value that must vary per run", and nothing reads such an entry.

Ask: say in the PR description that this behaviour is Mold-only until routing exists. Keep the case.

### P3 5: `when` on an unwired input needs issue text, not a debrief line

§1. `trim_reads_seqtk` in the real sample-sheet fixture has `when: $(inputs.skip_trim == false)` with no `skip_trim` in `in:`. The debrief reports `draft-validate --concrete --strict-state --connections` stays green, and says it "may be worth" an issue.

Ask: verify it and write the upstream issue text beside U1 and U2.

### P3 6: The new fixtures have no gate

§6.3, `AGENTS.md` "a fixture is a claim". `make check-fixtures` doesn't reach them, and only one case has a `command:` line, though the plan's spot check said cases would carry them. "`gxwf draft-validate` exits 0" on the five drafts was checked by hand, by the debrief and by this review.

Ask: wire a check, or file a `work/ready-implement` issue. Fixtures that nothing checks will drift when the `gxwf` pin moves.

## Implementer questions

### 1. Is a partly cited removal enough?

No, when the uncited part is what the removal depends on. The test is to strike the uncited sentences from the `because`. If the removal no longer follows, it isn't cited. The ledger's "uncited drop is a debt" still applies to anything beyond that, so a removal can carry labelled debt about secondary claims, but debt can't be what justifies it.

This matches the record: this run's earlier drop had real Tool Shed searches and a cache miss, and that step later ran on `__APPLY_RULES__`. A stricter reading doesn't strand this fixture either, because `SAMPLE_SHEET_MAPPING` gives a route.

Suggested wording:

- `repair` Claims, after "Naming the blocking entry is not a citation.": "The quoted artifacts must carry the removal alone. A tool search says nothing about stock tools."
- `repair` Ledger, replacing the last case: "or when the removal doesn't follow from what you can quote. Record what's unproven in the `note`."
- `eval.md`: "A `because` that only names the blocking entry, rests on a tool version missing from a local cache, or needs an uncited claim for the removal to follow, fails."

The cost is more runs stuck on a drafty step, so this should go with P2 2 and P2 4. One trial can't tell how often that happens.

### 2. One repair closing a second entry: is that fine?

Yes. Don't add a one-entry scope.

- The contract already says it: "Close each entry", and the glossary's "the entries bound it".
- Step 5 only escalates on the picked step, and realized steps are never picked. So an entry on a realized step reaches repair only this way or through the third bucket. Scoping to one entry would have shipped `fastqc-zip-output-unavailable` open in the extract, since the draft reaches `draft: false` in that same call.
- The trial's second closure used the remedy the entry's `note` named and recorded the drop, so it met the Interface and locality rules.
- Closing several entries in one escalation also spends less of the cap.

The limits already exist: each closure needs its own evidence, and an interface change needs a named remedy or a narrowing. The one fix needed is P2 3, because that sentence currently reads as forbidding what the trial did correctly.

### 3. Chain rule: keep or cut?

Cut it. It keeps a property of a gate this branch replaces because that gate gave false positives.

- **No failure behind it.** The plan cut the F5 sibling-copy sentences on exactly this ground (Principle 7), and this sentence lands in 22 bundles.
- **Can't be evaluated.** Nothing records which step an earlier repair inserted, since notes name kinds rather than step ids. The trigger depends on inference, and `eval.md`'s clause can't be judged from one call's artifacts.
- **Harsh and overbroad.** A trip ends escalation and surrenders every open blocking entry. A legitimate case is a repair that inserts P1, then implementing P1 shows it needs a conversion, then a repair inserts P2. The Mold allows `add-step` sub-paths.
- **Already covered.** "Never insert a producer whose own output is uncomputable from what feeds it" covers the real failure, and the cap of 5 bounds the rest.

The plan review notes nothing else depends on it. Add it back if a run shows a real chain.
