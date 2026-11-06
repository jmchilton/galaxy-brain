# Thermo-nuclear maintainability review: `issue-669-repair-contract`

- Profile: `_shared/reviewers/thermo_review.md`
- Model: Opus 5.5 (`claude-opus-5-5`). Effort: not stated in the brief.
- Reviewed commit: `6f5be153`, diff `origin/main...HEAD` (base `7453431d`). No code run, per the profile.

## Verdict

The rewritten Mold is a real improvement: a general trigger, a change-set vocabulary, a check after edits, and real fixtures. But the branch widens what a blocking entry *means* without widening what *acts* on one. The contract now lives in about seven restatements, and the gate it relies on can't be computed from what the ledger records.

The largest opportunity is one named repair gate in `advance`, with the ledger note as the only owner of the definitions. That deletes most of the routing prose and most of the drift below.

No P1. No security findings. Nothing here reopens the "Decisions taken by default" in `index.md`.

Paths below are short forms: `advance` is `content/molds/advance-galaxy-draft-step/index.md`, `repair` is `content/molds/repair-galaxy-draft-topology/index.md`, and `ledger` is `content/research/open-requirements-ledger/index.md`.

## Findings

### P2 1: The widened trigger has no matching dispatcher

`ledger:89` now counts entries against any step as blocking, and `repair:118` runs on "an open blocking entry". The only caller, `advance`, still dispatches per picked drafty step. No pipeline names `repair` as a phase. This leaves entries that are counted but can't be routed.

- **The picked-step gate.** Step 5 (`advance:174`) looks for entries "against this step". An entry against a realized step, or with no `step:`, never matches.
- **Extraction comes first.** Step 1 (`advance:159`) handles `draft: false` before any ledger check, so a fully realized draft extracts with blockers still open. The debrief reports this on a real trial: the `trim_reads_seqtk` entry "ships with that entry open".
- **The third failure bucket.** `advance:183` says to append an entry about an *earlier* step and "escalate as in step 5". Step 5's predicate excludes that entry, so the reader has to work out that the reference means only the action.
- **A scenario with no caller.** `star-sa-index-input` has no `step:`, is `raised_by: implement-galaxy-workflow-test`, and starts at `draft: false`. Its class, "a value that must vary per run", is named at `ledger:89`, but no invocation path reaches it. The test-phase decision explains why, but nothing in the scenario says it only exercises direct invocation.
- **The scope mismatch runs the other way too.** Dispatch is scoped to one step and repair is scoped to all entries. The debrief's "Scope widened" note records a trial closing a second entry on a different step.
- **Three entry points, three predicates.**
  - Step 1 jumps on "already records why no wrapper can serve it, or why its wired inputs can't supply it".
  - Step 5 fires on any blocking entry against the step.
  - Bucket 3 appends its own entry and fires.

Suggested fix, the code-judo move: define one **repair gate** in `advance`.

1. If an `open` blocking entry exists and the budget allows, escalate. Say explicitly whether that means any step or the picked step, then re-run `draft-next-step`.
2. Call the gate from step 1 before the `draft: false` branch, and after step 4.
3. Have bucket 3 append its entry and call the gate.

The step-1 special case, the "go to step 5" jump and "as in step 5" all disappear, and in-loop entries on realized steps get handled before extraction. Then either pass `repair` the entries it may address, or state in its Edit paragraph that it addresses all of them. Mark `star-sa-index-input` as direct invocation only, so the scenario doesn't imply a route that the test-phase decision excludes.

### P2 2: The convergence gate depends on data the ledger doesn't record, and has no exit

The branch correctly stopped requiring `open_history` to decrease monotonically, because entries raised between repairs can push it back up. But three gaps remain.

- **The pre-repair count isn't kept.** `ledger:212` now compares each repair with "the count it started from", while `open_history` still stores only post-repair counts. `[3, 2, 4, 3]` no longer shows whether the invariant held. `packages/build-cli/src/lib/run-model.ts:202` and the dashboard read only that array, so "the evidence the convergence gate reads" (`ledger:87`) can't be audited after the call.
- **Nothing identifies a repair-inserted step.** The new stop rule, "answering an entry against a step an earlier repair inserted" (`ledger:212`, also the "no convergence-defeating producer" property in `repair/eval.md`), needs to know which steps a repair inserted. No draft marker or ledger field records that, and the resolved note only has to name kinds. The `repair` body doesn't state the rule either, so the eval is judging a rule that sits in a budget section.
- **No exit after surrender.** Surrender makes the entry non-`open`, so step 1's jump stops applying. The drafty step is still picked and falls to step 2, which re-runs the searches this branch set out to stop. `ledger:180` itself says "a drafty step never leaves the loop", and a `while draft` harness has no exit. The same applies to the "ending escalation" trip, which the new "no citation, leave it open" path can reach on the first repair. The eval and Mold defer to "the terminal", but I found no Mold or pipeline that names itself as setting `surrendered`. This one is reported rather than hunted, so the bug reviewer should confirm it.

Suggested fix:

- Record `open_before` beside `open_history`. It's additive, so `run-ledgers.ts` keeps working.
- Require the resolved note to name inserted step ids, or drop the stop rule.
- Write the state transitions once in the ledger's budget section: repair, then `trip` or `cap`, then surrender, then what happens to the drafty step. If a surrendered drafty step should leave the loop, name the Mold that drops it.

### P2 3: The same rules are restated across the corpus and already disagree

The `blocking` definition appears at `ledger:39`, `ledger:89`, `ledger:154`, `repair:118`, the glossary and `galaxy-workflow-draft-format`. The convergence rule appears at `repair:136`, `advance:174`, `ledger:190`, `ledger:212`, `galaxy-workflow-draft-format:128`, the glossary and `repair/eval.md`. Both `advance` and `repair` load the ledger upfront and verbatim, so their copies add no information and only add places to drift.

The drift is already visible:

| Rule | Variants |
|---|---|
| What makes an entry blocking | "must close it" (`ledger:39`), "a structural edit closes it" (`ledger:89`, `ledger:154`), "only a structural edit can close" (glossary). "Must" and "only" exclude other remedies; "closes" doesn't. |
| Whether a repair must reduce the count | Unqualified "must leave fewer" (`repair:136`), but the eval adds "unless the repair reports that none of the entries could be closed", and `repair:136` also allows leaving entries open. |
| Missing wrapper | `implement-galaxy-tool-step:161` still says flatly "A missing Tool Shed wrapper is not this case", which contradicts `repair:118`'s "only when the discover-or-author branch is exhausted". `advance:159` uses a third phrasing, "records why no wrapper can serve it". |
| Cache miss is not absence | Stated only in `repair:118` and the eval, but the routing decision is made earlier at `advance:159`. The `sample-sheet-restore-last-drafty` ledger carries exactly this kind of drop. |

There's a layering problem too. `ledger:180` now holds `repair`-specific procedure ("removes one it can't close, when it can cite why") inside the protocol every ledger-carrying Mold loads, in a paragraph that opens by telling them to leave such entries open. Its stop rule at `ledger:212` is the same kind of leak.

The blocking classes also lack writers. Only the validation-failure class has a procedure (`advance:183`). The dupRadar fixture is `raised_by: advance-galaxy-draft-step`, yet step 2 has no "exhausted, so append a blocking entry" branch and still falls through to authoring.

Suggested fix: give the ledger note the only definition of `blocking`, of "confirmed absent" (including the cache-miss exclusion) and of the invariant. Reduce `advance`, `repair`, the format note and the glossary to pointers or a single clause. Correct `implement:161`. Move the removal procedure from `ledger:180` to `repair`, leaving "a resolved blocker may leave a `kind: dropped` entry open". Add the missing writer branch to `advance` step 2.

### P2 4: The Mold's removal contract is scattered across five paragraphs

Removal is the behaviour this rewrite exists for, but no one section states it.

- `repair:122` lists `remove-step`.
- `repair:124` covers public narrowing.
- `repair:126`, headed "Claims", holds the citation rule and "if the step isn't fully redundant, narrow it".
- `repair:131-133` covers cleanup.
- `repair:136` holds the decision and the conditions for leaving an entry open.

The results are visible:

- **Precedence is unstated.** "Narrow it" and "nothing can close, so remove" sit two paragraphs apart with no stated order. The debrief's question about whether a partial citation is enough arises where `repair:126` (what a citation is) and `repair:136` ("no citation") meet, without either addressing it.
- **"Claims" is a grab bag.** It holds five unrelated rules: unresolved-step claims, the meaning of "computable", what may be read, citations and narrowing.
- **"After every edit" is misnamed and misordered.** Items 2 to 4 apply only to removals and item 5 only to twins. Validation is item 1, then items 2 to 4 edit again, so the check that gives the list its purpose comes before the edits it should check. The only thing requiring a re-run is reading "every edit" recursively.
- **"Twin" is undefined.** `repair:134` is the only place in the Mold, glossary or format note that uses it, and it's a judgement call an agent has to guess. The term comes from the star fixture.
- **A dangling sentence.** "A tool version missing from a local cache is not absence. Don't search again." (`repair:118`) reads as a contradiction, because the two sentences answer different questions.

Suggested fix: split into **Removal** (decision ladder: narrow, then remove with citation, then leave open, followed by the cleanup), **Claims** (only the claims and "computable" rules), and a final **Check** (twins, then validate last). Define twin in a clause, for example "a step duplicated from the same tool and plan that differs only by a distinguishing key". The Mold doesn't grow.

### P3 1: Old vocabulary survives in the changed files

- `repair:35`, `repair:42` and `repair:67` purposes still say "re-wires", "re-wired" and "Re-wire", and they render into the cast's Load Upfront section. `repair`'s summary no longer describes re-wiring.
- `advance` step 5 is still titled "Check computability" and says "[[draft-validate]] cannot catch this", although it now covers entries that aren't computability gaps.
- `advance:134` still says "newly appended", and `advance:135` still says "strictly reduces".
- Step 6 (`advance:175`) says "this invocation concretized the last drafty step" even though step 5 can now route there after a removal. The intro line was updated to the neutral wording; this one wasn't.

### P3 2: The change-set vocabulary gets a third partial copy and doesn't cover what `repair` does

`repair:122` lists kinds also defined at `interview-to-galaxy-workflow-changeset:65` and partitioned at `apply-galaxy-workflow-changeset:80`. It tells the agent to "apply the direct kinds in place", but "direct" is only defined in `apply`, which is a `related_molds` link and isn't in the cast. `repair:124` allows removing an output, the vocabulary has no such kind, and `repair:136` and the first eval property require a note naming the kinds applied. A trial tripped over this and the debrief left it.

Suggested fix: state the direct/draft split in the sentence, as the first half of the paragraph nearly does, and either add `remove-output` to the canonical list or have `repair` say what to write when removing an output. Longer term, move the vocabulary into one reference note.

### P3 3: Fixtures aren't gated, and `advance` behaviour is tested from `repair`'s scenarios

- **Ungated fixtures.** About 1,000 lines of YAML fixtures were validated by hand. `scripts/lib/artifact-fixtures.ts` builds its registry from `_verify.json` entries, and the file is empty for `repair`, `advance` and `apply`, so no draft-format fixture is checked. Two READMEs record that `gxwf` 1.15.0 already forced a hand edit, so version drift is a live risk. The gap predates this branch but this branch adds to it. Suggested fix: register `gxwf draft-validate` for draft-format fixtures, as a follow-up if it's too large here.
- **Coverage in the wrong Mold.** "Driven through [[advance-galaxy-draft-step]], `galaxy-workflow.gxwf.yml` is written in the same call" sits in `repair/scenarios.md`. `advance/scenarios.md` has no case for the step-1 jump or for bucket-3 escalation, and neither do its evals: the routing property covers only wrapper-choice mismatch. Suggested fix: add those cases to `advance`.
- **A property the step-1 jump now bends.** The "one invocation advances exactly one step" property in `advance/eval.md` says a call resolves a wrapper and implements. A jump to step 5 does neither. The property should exempt repair calls.

## Checked, no finding

- **Casts.** The cast's `open-requirements-ledger.md` is byte-identical to its source, and `SKILL.md` carries the new Mold text. The debrief reports the verify gate green.
- **File size.** `repair` is 136 lines, `advance` 191 and `ledger` 230. Nothing is near the threshold.
- **Eval rewrite.** Removing the contradictory `surrendered` requirement is correct, and the new properties are concrete.
- **Fixture provenance.** The READMEs are short and honest about what is real, synthetic or edited. `repaired.gxwf.yml` being a full copy is appropriate for an oracle.
