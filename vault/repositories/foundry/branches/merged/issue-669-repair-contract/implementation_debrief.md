# Implementation debrief

`issue-669-repair-contract`, base `origin/main` `7453431d`, head `6f5be153`. Built from the [plan](../../../issues/needs_decision/670/skunkworks_plan.md) as corrected by its [review](../../../issues/needs_decision/670/skunkworks_plan_review.md).

## What changed

- `repair-galaxy-draft-topology` (rev 6): a general trigger (an open blocking entry a structural edit closes), change-set kinds, interface and claims rules, a check after every edit, and a `draft-validate` reference plus on-demand `gxformat2-schema` and `galaxy-conditionals-patterns`.
- `advance-galaxy-draft-step` (rev 11): a blocking entry that already rules out a wrapper goes straight to step 5. Step 5 covers entries from earlier calls and continues at step 6 when a repair removes the last drafty step. The third failure bucket can escalate.
- `open-requirements-ledger` (rev 6), `galaxy-workflow-draft-format` (rev 5) and the glossary: the same widening, plus the gate fix and the header rule.
- `eval.md` no longer contradicts the Mold. `scenarios.md` uses two real and two synthetic fixtures.

## Evidence

No gate runs a Mold, so this comes in three forms.

**Oracle, no agent.** The real repair in `repaired.gxwf.yml` fails the old `scenarios.md:21-23`, because `fastqc_zip_archives`'s `outputSource` moved to the new step. It leaves inputs identical and realized `tool_id`s unchanged, so it meets the new "only where a named entry requires it". Old `eval.md:11-15` requires `surrendered` from the Mold, which `ledger:180` forbids.

**Run record.** `nf2g-demo-loop-repair` iteration 007 ended `draft: false` with no `galaxy-workflow.gxwf.yml`, and iteration 008 wrote it. I checked both directories.

**Agent runs.** Five fresh subagents followed the casts as runtime agents, and I judged their output against the scenarios. These are **single runs of a stochastic agent**, on synthetic fixtures for the first two rows, so they show behaviour can differ, not how often.

| Case | Base cast | Branch cast |
|---|---|---|
| `dupradar-wrapper-absent`: no new search | Fail: reran the searches | Pass |
| Dead inputs removed (`P4_...`, `annotation`) | Fail: both left, flagged in a new entry | Pass |
| Dead port `TODO_bam` removed | Fail | Pass |
| No mention left in the draft | Fail: 4 mentions | Pass: 0 |
| `kind: dropped` quoting the searches | Pass | Pass |
| `gxwf draft-validate` exit 0 | Pass | Pass |
| `star-sa-index-input`: promoted to an input as the entry names | Fail: declined it and added two `TODO` steps that derive the value, so a test job still can't set it | Pass |
| Interface otherwise unchanged, draft stays `draft: false` | Fail: now drafty | Pass, and `--concrete --strict-state --connections` is clean with 6 edges |
| `sample-sheet-restore-last-drafty` through `advance`: extract in the same call | Not run. The run record is the red. | Pass: `class: GalaxyWorkflow`, no `_plan_*`, `draft: false` |
| Step and label gone, `trimmed_reads` retargeted | Not run | Pass |
| `kind: dropped` quotes the searches | Not run | Pass |

`fastqc-zip-no-port` had no agent run. Only its `command:` case ran.

## What the trials found

- **Fixed on the branch.** My dupRadar scenario missed `annotation`, whose only consumer was the removed step. The trial found it by walking the draft, which is what the Mold asks for. A trial also had to guess whether a promoted literal leaves `state`, so the Mold now says so. The sample-sheet scenario's exact count of 1 was too strict, since a repair can also close the other open entry.
- **The guard behaved, partly.** The `advance` trial wrote: "stock Apply Rules is unproven, not absent. The ledger records only a missing cached pin, which is not evidence the tool cannot do this." It still removed the step, resting on the searches in the entry and labelling the rest as uncited debt. The Mold's rule reads "no citation, leave it open", and it did have one. Whether a partial citation is enough is a question for John, and one run can't settle it.
- **Scope widened.** The same trial also closed the second open blocking entry, on realized step `fastqc_per_read`, replacing public output `fastqc_zip_archives` with a new `fastqc_raw_text`. The entry named that remedy, and it recorded the drop. Step 5 scopes the escalation to the picked step, but nothing scopes repair to one entry. Left as is.
- **A real defect in that run's draft.** `trim_reads_seqtk` has `when: $(inputs.skip_trim == false)` with no `skip_trim` in its `in:`, and `draft-validate --concrete --strict-state --connections` stays green. The trial raised a blocking entry and left the step alone. With no drafty step left, the loop can't return to repair, so the extract ships with that entry open. I didn't check the runtime effect on Galaxy. It may be worth an upstream `gxwf` issue.
- **No `remove-output` kind.** The trial noticed the change-set vocabulary lacks one. The Interface paragraph covers removal, and the vocabulary belongs to `interview` and `apply`, so I left it.

## Not done

- `/test-mold` itself wasn't invoked as a command. The trials follow its steps by hand, and its refinement capture and run summary were skipped.
- No live Galaxy run of any repaired draft.
- Non-trial oracle properties that need judgement (`llm-judged`) were judged by me, the author of the change.

## Local gate

`make -k check` at `6f5be153`: everything passes (496 tests, casts, verify, pipelines, 15 fixtures) except:

- `check-vendored`: the known machine-only failure.
- `validate-roadmap`: fails the same way on clean `origin/main` `7453431d`. It reads live GitHub labels (`roadmap/substep` on #670 and #678, and the `**Substeps**` marker on #318). This branch doesn't touch the roadmap.

`make check-fixtures` doesn't reach the new fixtures, because `repair`'s `_verify.json` has no entries. I validated each with `gxwf draft-validate` 1.15.0 directly. CI hasn't run, since it starts when the PR opens.

## Collisions

As the plan says: #686 and `fix/advance-draft-needs-tool` conflict as text at `repair` and `advance:174`. I dropped their "step 2" phrase, because only their branch makes step 2 append. Whichever lands second should restore it.
