# Problem PR debriefs

These are debriefs of workflow PRs that hit major roadblocks. Each one asks what could have kept the PR
from stalling. Written 2026-10-01 from the GitHub threads and the existing vault notes.

| PR | Outcome | Main signal |
|---|---|---|
| [#22217](22217_workflow_semantics_tests.md) workflow semantics tests | Closed after 1 day | The PR shipped the research by-product (tests) without the deliverable (doc) or the evidence (duplicate search) |
| [#23369](23369_subworkflow_when_state.md) subworkflow `when` state | Closed after 3 days, split | A provable crash fix was bundled with a debatable semantics change; the description argued a model instead of showing a failure |
| [#23426](23426_subworkflow_design_rfc.md) subworkflow design RFC | Closed after 2 days; decision reached | The RFC itself worked; the decision and its conditions weren't recorded, so #23676 inherited an unclear scope |
| [#23816](23816_when_expression_analysis.md) `when` path matching | Draft, stalled | The reviewer objected to scope and support policy; the response defended the implementation |

## Cross-cutting patterns

1. **Lead with evidence, not interpretation.** A failing workflow, a traceback, or a two-row
   comparison table gets traction (#23426's table, #23376's regeneration). A paragraph on what a
   data structure "means" gets a debate (#23369, #23816).
2. **Split proofs from arguments.** The obviously correct piece should land on its own:
   - #23369's `IndexError` fix (still not on dev);
   - #23817's import validation, which mvdbeek asked for;
   - #22217's clearly new workflow-only tests.

   In each case it was stacked behind, or bundled with, the contested piece.

   The caveat is that this is about motivation, not size. Splitting for size alone doesn't help with
   mvdbeek: #22025 (docs and tests alone) got no review, and the same content plus two fixes (#22170)
   got "Wonderful." On #21828 he said merge the 5k-line PR rather than split it.
3. **Never cite an agent as evidence.** Examples from the stalled threads:
   - "we checked for duplicates" (#22217);
   - "Maybe the best agent description" and "both agents seem to agree" (#23426);
   - "I had an agent outline… and a second agent correct it" (#23816).

   None of these is something the reviewer can check, and each invites "do the agents
   understand?". Evidence is a failing workflow, a real example, a test, or a code line. If an
   agent found the problem, turn its finding into one of those before posting. Mentioning that an
   agent was used is fine (#22566 disclosed an agent slip and still got "Very nice cleanup"); using
   it as an authority isn't.
4. **Audit agent-written artifacts before review.** A stray fix, a misleading fixture name, a test
   failing for an unrelated reason, or a code comment touching a contested topic each cost a full
   review round (#23426, #23816).
5. **Address mvdbeek's known preferences up front.** Recurring ones:
   - test once, by the most direct route;
   - start simple; don't support what was never supported;
   - reuse existing machinery (schema compilation, the custom tool editor);
   - readable error messages;
   - "is this hit in the wild?"

   A short "Why not X?" or "Who hits this?" section in the description pre-empts the first-round
   objection.
6. **Turn agreement into artifacts quickly.** #22217's 👍 compromise and #23426's "that's
   ultimately what we want" were both followed by closing the PR, and neither was written down as
   a spec. Momentum was lost each time.
7. **Size to the reviewer's patience, not to the branch.** All four stalled PRs carried 250–700
   lines plus prose. The PRs that merged without friction (#23376, #23409) were narrow.

## Pre-open checklist (draft)

- [ ] Does the title name a symptom a user would see, or a decision being asked for?
- [ ] Is there a minimal failing case or comparison table in the first screen of the description?
- [ ] Split only along motivation. A piece can go first only if it carries its own reason: it fixes a failing
      case, proves a claim, or is a mechanical change with no behaviour change. Never split the payoff from the
      thing that justifies it (#22025, docs alone, got silence). Otherwise keep one PR, name the 2–3 hotspot
      files, and offer a split (#21828).
- [ ] Has a human read every test fixture and code comment the agent wrote?
- [ ] Is there a "Why not the simpler or existing approach?" section?
- [ ] Is there a "Who hits this in practice?" answer with real examples?
- [ ] Has stale generated or unrelated drift been removed from the diff?
- [ ] If the branch is older than about two weeks, have related threads been re-read for shifts
      in the reviewer's position?
