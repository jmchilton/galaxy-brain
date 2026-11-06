# Test challenges review: `issue-669-repair-contract`

Profile `_shared/reviewers/generic_test_challenger.md`, model Opus 5.5 (`claude-opus-5-5`), effort not given to this agent. Reviewed `6f5be153` against `origin/main` `7453431d`, as `git diff origin/main...HEAD`. No PR exists.

The branch changes no unit tests. The material challenged is `eval.md`, `scenarios.md` and the `examples/` fixtures. Evidence and the test plan are in [test_challenges_debrief.md](test_challenges_debrief.md). All `gxwf` runs used 1.15.0 on scratch copies; the worktree wasn't touched.

## P1

### P1 1: the `fastqc-zip-no-port` scenario fails its own real repair

`scenarios.md:7-11` expects "Other steps' `tool_id`, `tool_version` and edges are unchanged" alongside an `add-step` with `fastqc_zip_archives` retargeted. `repaired.gxwf.yml:241`, the real repair and this fixture's golden, moves `aggregate_multiqc`'s edge to `fastqc_archive_per_read/TODO_zip_archives`. It has to: MultiQC reads the ZIPs. So a correct repair fails the case.

This is the defect the debrief uses to condemn the old `scenarios.md:21-23`, returned in the new text. It went unseen because this case had no agent run.

Fix: "Edges change only where they consumed the moved output; `aggregate_multiqc`'s ZIP edge follows it." Also say what happens to that edge on the removal branch, since `_plan_out` says the ZIPs feed MultiQC, which makes it a likely "a consumer truly needs the removed output" case under the Mold.

## P2

### P2 1: no scenario exercises the guard on removal

The riskiest new behaviour is removing a step, and the Mold's guard is three exits: leave the entry `open` when a consumer truly needs the output, when the step is realized, or when there's no citation. All removal scenarios expect removal. An agent that always removes passes every case. The old "no producer in reach" case was the only one allowing `open`, and it's gone. The `advance` trial in the debrief already removed a step on a partial citation.

Fix: add negative cases expecting no removal and no `kind: dropped`. Ledger-only variants of `dupradar-wrapper-absent` are cheap: `missing` that says only "not in the shared cache", and an entry with no citation. Add one for a realized step.

### P2 2: `sample-sheet-restore-last-drafty` pins a verdict the branch calls open

`scenarios.md:19-30` requires the entry `resolved` and the step gone, with a drop quoting "the searches or the collection semantics rule". The debrief says whether that partial citation is enough "is a question for John". The evidence is weak in the way the Mold warns about: the searches cover the Tool Shed, the stock option is only recorded as "no confirmed stock Apply-Rules pin", and the semantics rule establishes the gap rather than the absence of a remedy. An agent that leaves the entry `open` for lack of a full citation follows the Mold and fails the case.

Fix: settle it with John and write the answer into the case. Until then, accept either outcome, with the `draft: false` and extract expectations conditional on removal. The case's real purpose, the extract hole, stays tested on the removal branch.

### P2 3: the gate fix and `advance`'s new routing have no oracle

No Mold `eval.md` or `scenarios.md` mentions `topology_repair`, `open_history` or escalation (checked by grep). So the gate change in the ledger note (compare with the count the repair started from, the chain rule, header creation at first escalation) is untested. So are `advance` step 1's jump to step 5 and the third failure bucket's escalation. `advance/scenarios.md` has no case for the "repair removes it" clause added to `advance/eval.md`; the only binding is a sentence in repair's scenarios.

Fix: add `advance` properties for the budget (`escalations` up by one, the post-repair count appended, a repair leaving no fewer entries trips the gate, a chained producer trips it) and for "an entry recording no wrapper skips resolution". `sample-sheet-restore-last-drafty` starts at `open_history: [0]` with 2 open, so `[0, 1]` must not trip: it is the regression case for the fix. Add the `advance` scenario pointing at that fixture.

### P2 4: both synthetic fixtures sit in states the loop can't reach

- `dupradar-wrapper-absent`: the entry is `raised_by: advance-galaxy-draft-step` on `M19_dupradar`, but `gxwf draft-next-step` picks `M18_markdup`. `advance` raises entries against the step it picked, so `M18_markdup` would already be realized, with a real port rather than the `TODO_bam` the scenario requires removed. Driven through `advance`, the first call implements `M18_markdup` and never reaches step 1's new jump.
- `star-sa-index-input`: `raised_by: implement-galaxy-workflow-test` on a `draft: false` draft. The branch's default decision is that test-phase routing is out, and `advance` step 1 extracts and returns on `draft: false`, so nothing routes here.

Fix: realize `M18_markdup` in the dupRadar fixture (a real port makes the dead-port expectation honest), or change `raised_by` to a template Mold. For STAR, say in the README and case that it's direct invocation only, or add a drafty step so it's an in-loop case.

### P2 5: the loop-consumable oracle passes a broken edit on realized steps

`eval.md:57-61` names plain `gxwf draft-validate`. A STAR repair wiring the wrong key (`genomeSAindexNbases` without `refGenomeSource|`) exits 0 under it, and fails under `--concrete --strict-state --connections` with `No parameter definition matching connection key`. The `star-sa-index-input` case asks for no validator beyond this property, though the debrief's trial ran the stronger one. This matters because #571 is about nested keys.

Fix: make the property `--concrete --strict-state` when the draft's edited steps are realized, and name the command in the STAR case. The Mold's "After every edit" step 1 has the same gap.

### P2 6: the removal oracle misses a surviving false claim

In `sample-sheet-restore-last-drafty`, output `trimmed_reads` has `doc: ... retaining original sample metadata`. The expected repair retargets it to Seqtk's output, which drops that metadata. The scenario and `eval.md:35-41` check only mentions of the removed id and label, so the output passes with a public `doc` that is now false, for a resolved wrapper, which the "no claim" property doesn't reach either.

Fix: extend the stale property to `doc` text promising what the dropped `units` carried, add it to this case, and add the matching clause to the Mold's step 3.

### P2 7: the `add-step` path has no agent run on the new contract

Per the debrief, `fastqc-zip-no-port` had only its `command:` case run. All five trials exercised removal or promotion, so the Mold's original path has no evidence on the rewritten cast. Run this case once after P1 1, and record it in the debrief.

## P3

### P3 1: `check: deterministic` properties name no oracle

`eval-philosophy` says to run the named oracle for a deterministic verdict. "Every addressed entry" and "added steps" name none, and a fabricated `tool_id` on an added step exits 0 from `draft-validate`. "A note saying why" and "reports that none could be closed" aren't mechanical; use `deterministic + llm-judged`, as `advance/eval.md` does. "Copied, with its `state`" also conflicts with the Mold's "changes only the key that distinguishes it", so an exact check fails a correct copy. Mention checks are greppable, so the removal cases could carry a `command:` line.

### P3 2: several contract clauses have no fixture

No fixture has a `rename` or `change_datatype`, so the moved-action clause in `eval.md:35-41` and the Mold's step 4 can't fail. Nothing exercises a step copied from a realized step, `replace-tool`, or `expose-output`. Add the `rename` to a synthetic fixture, and either add the rest or note them as uncovered.

### P3 3: the `command:` case can't fail from a Mold change

`gxwf draft-next-step repaired.gxwf.yml` runs on a committed file, so it checks the golden and the CLI, not the Mold. The old case fed real output back. Keep it as a pin check, and add "the emitted draft reports `draft: true` naming the added step" to the first case. The golden also has no output ledger, so the ledger properties can't be applied to it.

### P3 4: the narrowing property's scope is unstated for this fixture

The sample-sheet input ledger holds an earlier `kind: dropped` entry whose `because` cites only a blocking entry and a missing cache pin, which `eval.md` says fails. The README explains why it's there, but neither the case nor the property says to judge only entries this repair added. One clause fixes it.
