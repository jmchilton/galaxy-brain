# Test challenges review: foundry#778

- Profile: generic_test_challenger
- Model: Claude Opus 5.5, effort medium
- Reviewed commit: `4e4df0290d0b6e4be25fbfc8df7d206bb2bf3f77`

Verdict: the new eval properties are behavioral, and none should be dropped. The gaps are runnability and oracle consistency. The PR's main new behavior, the repair fold, has a prose-only scenario and no eval property. One rewritten advance property contradicts its own Mold. Detail and the full test plan are in [test_challenges_debrief.md](test_challenges_debrief.md).

## P2 1: Commit one STAR fixture shared by the implement, advance and repair scenarios

The new implement case and the repair fold case both use prose fixtures. The repair case says "No committed fixture yet". The extended advance step-1 skip, an entry that records a found wrapper that can't serve the step, has no scenario at all. All three describe one chain, and the post-fold oracle mostly exists already as `repair-galaxy-draft-topology/examples/star-sa-index-input/galaxy-workflow-draft.gxwf.yml`.

Add `examples/star-index-fold/` holding:

- that draft plus a drafty `star_genome_index` step feeding both `rna_star` steps;
- the implement-raised blocking entry, as `open-requirements.ledger.yml`;
- a generated `rna_star` `galaxy-tool-summary`;
- optionally `folded.gxwf.yml`, so the repair case can carry a `command: gxwf draft-validate ... --concrete --strict-state`.

Bind the implement and repair cases to it. Add an advance case beside "entry that records the wrapper as confirmed absent": no discover call, no author call, straight to repair. The PR acknowledges the missing repair fixture; it's raised here because one small fixture makes three cases runnable.

## P2 2: Advance's "only a miss falls through" property fails a correct run

`advance-galaxy-draft-step/eval.md`: "invokes [[author-galaxy-tool-wrapper]] only when [[discover-shed-tool]] returns `miss`". But `index.md` step 2 says a `weak` candidate that confirmation rejects "counts as a `miss`", so authoring is correct there even though discovery returned `weak`. Reword it to: "only on a `miss`, or a `weak` candidate confirmation shows doesn't run the named work; authoring after a confirmed `weak` ... is a failure".

## P2 3: The repair fold has no eval property, and existing removal properties read against it

`repair-galaxy-draft-topology/eval.md` has no property for the fold clause. "A removal needs standing" says no step is removed "when a consumer truly needs its output", and the fold removes the index step its consumers read. "A narrowing is recorded" leaves open whether a fold needs a `kind: dropped` entry, and the scenario's expect doesn't say either.

Add a property: when the entry shows a consumer's wrapper does the work, the repair removes the step, rewires its inputs to every consumer, and sets the mode parameter. Adding a producer for the same work fails. State whether a fold is a narrowing, exempt it from "a removal needs standing", and put the `kind: dropped` expectation in the fold scenario.

## P3 1: The new "drop the setting, plain entry" rule is untested

The advance wrapper-choice-mismatch bucket now gives a wrapper that lacks only a parameter a plain entry, not a blocker. It is the only new rule that downgrades a blocker, and nothing covers it. Add a property: the dropped setting gets a plain entry naming it, and a missing declared output never gets only a plain entry.

## P3 2: Show red-to-green on the discover STAR case

The PR says no run exercised the change. The discover STAR case is one cheap Mold call. Run `/test-mold discover-shed-tool` on it with the base and branch casts in fresh subagents, and report status and candidate for each. The base should reproduce #678's `miss`. Note that these are single stochastic runs.

## P3 3: The old "runtime failure ownership hint" property overlaps the new blocking-entry property

`implement-galaxy-tool-step/index.md` narrowed Failure ownership to wrappers that carry the plan. The eval property and its scenario still say "mismatch ... inputs, outputs, datatype, or collection support". Because eval properties apply to every run, the STAR case is also judged on writing an ownership hint. Narrow the old property and its case to the new wording: the wrapper carries the plan but could still fail at runtime.

## P3 4: `rna_star` version drift between the new cases and the example they cite

The new implement and repair cases name `2.7.11b+galaxy1`. The repair case says the wiring is "as in `examples/star-sa-index-input/`", which pins `2.7.11b+galaxy0` (`de21b616f03a`). Choose one version for the new fixture, or say only the wiring is shared.

## No finding

The schema change is description-only: the enum is unchanged and the TS is regenerated. Existing schema tests don't assert descriptions, and nothing needs a new fixture.
