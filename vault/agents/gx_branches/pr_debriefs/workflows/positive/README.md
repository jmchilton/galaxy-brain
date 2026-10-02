# Positive PR debriefs

These are the inverse of `../negative/`. They look at workflow-area PRs by John where mvdbeek was clearly
positive, and ask why. Written 2026-10-01 from GitHub threads (reviews, comments, inline comments, reactions) for
John's PRs opened since 2025-03.

## Calibrate first: how rare is real enthusiasm?

**Base rate.** John opened 61 `area/workflows`-labelled PRs in the window, and 47 merged. mvdbeek reviewed or commented
on 40 of them. Most approvals were empty or near-empty. Praise sorts into four tiers:

| Tier | Examples | Count among workflow PRs |
|---|---|---|
| **Strong**: a superlative, or a personal stake | "That is just awesome!" (#22179); "Awesome! I'd have noticed this if I actually went ahead and used #21859" (#21933); "Wonderful." (#22170); "Awesome, thank you!" (#20880) | ~4 (plus #21828, outside workflows: "Awesome, I think we should merge this!") |
| **Warm-routine** | "Looks great" (#23409); "Looks great to me" + ❤️ (#21907); "Very nice cleanup, thank you" (#22566); "Very nice!" (#22756); "Looks good to me!" (#23785) | ~5 |
| **Silent-positive**: empty approval plus an emoji | 🎉 #22134, #22706, #21503 | ~3 |
| **Boilerplate** | "Thank you @jmchilton!" at merge (#22222, #21616, #20528, #23433). He writes this on tool shed, Jest, jobs and docs PRs too | not counted |

**Mixed signals not counted as wins:**
- **#21335 (WES API):** 🚀, then "This is both cool and terrifying", then a long critique about OOM and pagination.
  It took 2 months.
- **#22675:** "approved" with "Looks good, i'm sure this will work better", but three inline comments meant the
  abstraction was wrong. It was closed and redone as #22706.
- **#22860 and #23676:** 🎉 and ❤️ on big ambitious drafts. Both are still open.

**Other authors.** A scan of 42 workflow-labelled PRs by others since 2025-06 found no instructive mvdbeek
enthusiasm, so these debriefs only cover John's PRs.

## Summary table

| PR | Outcome / time | Praise tier | Main signal |
|---|---|---|---|
| [#22179](22179_gxformat2_fixes.md) gxformat2 fixes | Merged; approved in 21 min, merged in ~3.5 h | Strong | Fix upstream; the Galaxy PR is a pin bump plus API tests |
| [#21933](21933_flat_over_paired_or_unpaired.md) flat over paired_or_unpaired | Merged in ~13.5 h | Strong | Completes the reviewer's own PR (#21859); "mirror the path that already works", line cited |
| [#22170](22170_paired_or_unpaired_fixes.md) more paired_or_unpaired | Merged in ~14.5 h (+3109) | Strong | Backend made to match already documented semantics; fix commits linked in a 3k-line PR |
| [#20880](20880_sample_sheet_column_validation.md) sample sheet column validation | Merged in ~2 d (1 d after ready) | Strong | Reject bad workflow input at the API with 400 tests; upstream-in-gxformat2 shape |
| [#23409](23409_when_flat_nested_inputs.md) flat nested `when` inputs | Approved in 9 min (draft); merged in 3 d | Warm | Issue first, corpus search, spelling table; the follow-up question became an issue before merge |
| [#21907](21907_planemo_test_syntax.md) Planemo test syntax | Approved overnight (draft); merged in ~17 h | Warm + ❤️ | Two syntaxes made one through shared code; the author owned the shortcut |
| [#22566](22566_workflow_test_schema.md) workflow test schema | Approved in 2 d; merged in 5 d (66 files) | Warm | Mechanical consolidation; agent slip disclosed as "Claude's Response" |
| [#22756](22756_udt_format2_test.md) UDT Format 2 test | Merged in ~5 d (waiting on upstream) | Warm | A deliberately red test proves the upstream backport is needed; the reviewer did the logistics |
| [#22134](22134_current_case_redundant.md) `__current_case__` redundant | Merged in ~5.5 h (1.7 h after ready) | Silent + 🎉 | Tests-only proof PR with a code walkthrough citing line numbers |
| [#22706](22706_extract_by_ids.md) extract by IDs (and #22675) | Merged in ~5 d | Silent + 🎉 | Superseded after review; "Why (response to review)" section; deleted the inference |
| [#21828](21828_yaml_tool_hardening.md) YAML tool hardening (adjacent) | Merged in ~41 h (+5160) | Strong | Author flagged the size, offered a split, named the hotspot files; agreed long-term direction |

## Cross-cutting patterns

1. **Parity and consolidation over new models.** Every strong or warm example either makes code match something
   already accepted, or merges two mechanisms into one:
   - matching something accepted: the API path (#21933), the documented spec (#22170), the editor (#21933);
   - one mechanism instead of two: test syntaxes (#21907, #22566).

   No praised PR asked mvdbeek to accept a new interpretation of how something works. The stalled ones all did
   (#23369, #23816).
2. **Building on the reviewer's own work earns the warmest replies.** "I'd have noticed this if I actually went ahead
   and used #21859" was the most personal praise found. Other examples:
   - #22756: he retargeted it and merged the upstream PR himself;
   - #21828: he pushed his own fix commits to the branch.

   When he acts on the branch, that is a stronger signal than his words.
3. **Upstream fix, thin Galaxy PR.** #22179, #20880 and #22756 put the logic in gxformat2 and shipped to Galaxy as a
   pin bump plus API or framework tests. These had the fastest approvals in the set.
4. **The evidence can live in the tests. The description only has to point at it.** Terse bodies were fine:
   - #22179: two sentences;
   - #20880: "xref #20831".

   They worked because the tests proved the change and nothing was contested. Rich descriptions paid off where scope
   or semantics could be questioned:
   - #23409: corpus search plus table;
   - #22134: code walkthrough;
   - #22706: a response-to-review section.
5. **Concede and rewrite instead of defending.** In #22706, John replied "Your read is right" to #22675's comments,
   then opened a fresh PR whose description lists what was deleted in answer to each objection. #22566's "I conflated
   it" and #23409's "Claude has nothing but shitty news" are smaller versions. Candour about agent mistakes has never
   cost a round. Defending the agent's design did (#23816).
6. **Drafts are no barrier.** mvdbeek approved #23409 nine minutes after it opened, and approved #21907, #21828 and
   #22134 while they were still drafts. John's flip to ready was usually the last step before merge.

## Against the problem-PR hypotheses

| Problem-PR pattern                        | Verdict                    | Evidence                                                                                                                                                                                                                                                                                                                                                       |
| ----------------------------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Lead with evidence, not interpretation | **Confirmed, refined**     | Evidence wins (#23409 table, #22756 red test, #22134 walkthrough). Refinement: for uncontested fixes, tests alone were enough evidence, and terse bodies merged fast.                                                                                                                                                                                          |
| 2. Split proofs from arguments            | **Confirmed**              | #22134 is a pure proof PR. #23409 was the narrow first slice of a series, and it merged while the broader follow-ups (#23816, #23817) stalled. #23681, a refactor split out ahead of #23676, got "Looks good so far". Nuance: #22170 bundled docs with fixes and was fine, because the docs were the spec the fixes satisfied, not claims to debate.           |
| 3. Show the agent's process evidence      | **Confirmed**              | Corpus search (#23409); "Claude discovered some gaps" alongside a test for each gap (#22170); a labelled "AI Generated Summary" that he praised and used (#21828). He is plainly aware agents "look to invent stuff" (#23409).                                                                                                                                 |
| 4. Audit agent artifacts                  | **Weakly confirmed**       | Found only as small items: removed readability annotations (#22566); a "speculative" agent comment (#22675); stray comments John promised to strip (#21828). Each was cheap because it was disclosed.                                                                                                                                                          |
| 5. Address mvdbeek's preferences up front | **Confirmed**              | Reuse cited (#21933 "mirrors basic.py:2675"; #22706 "Code quality / abstraction reuse"). Who hits this (#23409 corpora). The readable-errors question still came on #23409. Pre-empt it on any input-rejecting change.                                                                                                                                         |
| 6. Turn agreement into artifacts quickly  | **Confirmed**              | #23409: agreement in the thread, issue #23424 filed, then merge. #22675 → #22706 in 4 days. #21828: an out-of-scope idea became issue #21843.                                                                                                                                                                                                                  |
| 7. Size to the reviewer's patience        | **Contradicted as stated** | #22170 (+3109), #22566 (66 files), #21828 (+5160) and #22706 (+1515) were all praised and merged within 1–5 days. What decides it is size of *contested surface*, not lines. Large PRs landed when their bulk was tests, fixtures or docs, the direction was agreed, and the author pointed at the hotspots (linked commits in #22170; named files in #21828). |

**New, not in the problem set:**
- **Build on the reviewer's own recent PR** (pattern 2 above).
- **Fix upstream, then land a thin Galaxy PR** (pattern 3).
- **Treat an approval with doubtful inline comments as a redesign request.** #22675 was "approved" and still the wrong
  PR.
- **Excitement about a vision doesn't predict merge.** Emoji on ambitious drafts (#22860 🎉, #23676 ❤️, #21335 🚀)
  were followed by months open or heavy critique.
- **Documentation and tests alone draw silence; with a bug they found, they draw praise.** #22025 got no review; the
  same content plus two fixes (#22170) got "Wonderful." Compare #22217.

## Additions for the pre-open checklist

- [ ] Can this be framed as "make X match Y, which already works or is already documented"? If so, cite Y's line.
- [ ] Does this build on a recent mvdbeek PR? Say so in the first line.
- [ ] Could the logic live in gxformat2 or tool_util so the Galaxy PR is a pin bump plus tests?
- [ ] For a large PR: link the 2–3 commits or files that matter, and offer a split.
- [ ] Rejecting or altering input? Say what the user sees (the readable-error question).
- [ ] Redoing after review? Add a "Why (response to #N review)" section listing what was deleted.
