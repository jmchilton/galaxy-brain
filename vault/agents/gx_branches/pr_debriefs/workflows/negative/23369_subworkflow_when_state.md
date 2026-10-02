# #23369 Keep subworkflow `when` state with the collection it was computed over

https://github.com/galaxyproject/galaxy/pull/23369. Branch `subworkflow_mapping_per_step`.
Opened ready for review 2026-08-25. Closed by John 2026-08-28 "for a smaller more bug focused
PR". Not merged. +622/-4 across 8 files.

## What happened

- There was a real crash. A mapped subworkflow with **no** `when` still built a list of `None`
  values, one per mapped element. A step inside the subworkflow that mapped over a longer
  collection then hit `IndexError` at `when_values[index]`.
- The PR bundled four things:
  1. the fix: collapse an all-`None` list to `None`;
  2. a new `is_aligned_with` provenance guard that **rejects** some conditional-subworkflow
     invocations;
  3. new `collection_semantics.yml` prose;
  4. a regenerated doc that also carried 102 unrelated lines left stale on dev.
- The description opened with mechanism ("`when_values` is a flat list read by element position
  … Those values mean something only for the collection they were computed over"), not with a
  failing workflow.
- mvdbeek spent "an hour" and concluded: "I am not sure what bug this is fixing?" He disputed the
  premise: `when_values` maps to jobs, and `_walk_collections` is the source of truth. He doubted
  twice that the test fixtures were legal, and said the error message took "this PR and half an
  hour of thinking" to decode.
- John split the work, as recorded in `projects/workflow_semantics/SUBCOLLECTION_WHEN_REVIEW_STATE.md`:
  - The doc regeneration merged quickly as #23376.
  - The crash-fix branch was later reopened as the #23426 RFC, after the editor-vs-scheduler
    disagreement surfaced.
  - The alignment-guard branch was never opened.
- **The crash fix is still not on `origin/dev`** (checked 2026-10-01: no all-`None` collapse in
  `SubWorkflowModule.execute`). It may live inside #23676.

## Why it stalled

1. **One small, provable fix was bundled with a larger, debatable behaviour change.** The
   `IndexError` fix is a few lines and needs no argument. The alignment guard adds a new failure
   mode and requires accepting a model of what `when_values` *mean*. The reviewer couldn't accept
   the first without working through the second.
2. **The description argued a model instead of showing a failure.** "Values mean something only
   for the collection they were computed over" is a claim about semantics, and mvdbeek, who wrote
   this code, held a different model. Opening on a contested framing invites a debate about that
   framing. A traceback plus the workflow that produces it does not.
3. **The tests weren't self-evidently legal.** The fixtures fed whole collections into a
   subworkflow whose inner steps take lists. Reading them correctly requires knowing that the
   child invocation receives whole collections, which was the very behaviour in question. A
   reviewer who stumbles on the test twice can't use it as evidence.
4. **Unrelated diff inflated the doc change.** The 102 stale lines made the doc change look about
   3× larger than it was. Regenerating first (#23376) merged without friction, which shows the
   cost was the bundling, not the content.
5. **The rejection message named neither the step nor the collections.** That made the new
   behaviour hard to evaluate even for someone who accepted it.

## What could have prevented it

- **First PR = the crash.** Title it as the symptom, for example "Mapped unconditional subworkflow
  fails with IndexError when an inner step maps over a longer collection". Include the minimal
  failing workflow, the traceback, and the all-`None` collapse. Nothing else. That PR would likely
  have merged in days.
- **Regenerate the stale generated doc first**, separately, before any PR touches it. In general,
  keep pre-existing drift out of feature diffs.
- **Make the guard a second PR framed as a question.** "Should Galaxy reject X or attempt Y?",
  asked of the person who owns the model, before writing code that encodes an answer.
- **Before opening, check the description against the reviewer's likely model.** Ask an agent to
  review it as mvdbeek would: "what would the author of `_walk_collections` object to?" His
  per-job framing could have been predicted from the code he wrote.
- **Write error messages a reviewer can judge**: include the step label and both collections'
  identities.
- **Land the small fix even after the scope moves.** When the investigation turned into the
  bigger subworkflow-semantics question (#23426 → #23676), the proven crash fix went with it. Ship
  it independently so the bigger debate can't hold it hostage.

## Signal

When a PR mixes a proof (a crash) with an argument (new semantics), the reviewer can review only
the argument, and the proof stalls with it. Split them, and lead each with evidence rather than
interpretation.
