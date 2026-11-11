Run via Claude Opus 5.5 at medium effort.

# Review: `issue-789-readme-no-archeology` (a4988f41)

**Verdict:** Approve with small changes. The diagnosis is right, the eval property is abstract (no fixture names or magic values, per mold-spec), and the cast bundle and Dashboard regen match the Mold. One real gap: the Testing section. The Mold, scenario and fixture don't say what happens to the *final* invocation id and the "test passed" claim, and benchmark tables aren't covered at all. Those made up most of iwc-lab#4's README. Two smaller wording conflicts are also worth fixing.

## Issues

### P2 1: Final test results and benchmarks are left ambiguous

The new bullet only bans "earlier or superseded runs and invocation ids", and the README scope includes "the bundled test data". Read together, the final passing invocation and its "passed on usegalaxy.org" claim are allowed to stay. The fixture's `## Testing` has exactly that (`4ae2da923366f120`, "The bundled test passed on usegalaxy.org"), and the scenario says nothing about it, so either outcome passes. Three problems follow:

- A pass claim in the emitted README is a validation claim. The Mold's Non-goals forbid that ("No Planemo execution or validation claim"), and phase 2 runs before phases 3 and 4, so it can't have that evidence.
- The fixture supplies no `galaxy-workflow-test`, so "the bundled test passed" isn't evidenced by any input.
- In iwc-lab#4, sections A and B of "Testing and validation" (invocation ids, F1 tables, the HG002 benchmark derivation) were the bulk of the archeology, and the new text doesn't mention them.

Suggested Mold text (replace the second new bullet):

> - Keep development and run evidence out of the README: invocation ids (final ones included), test or benchmark outcomes, earlier or superseded runs, failed or abandoned tools and versions, environment-only failures, validator caveats, reviewer notes, and the story of how the result was reached. The README may describe the bundled test data (what it is, where it comes from). Put the rest, including any such section in a supplied README, in the maturation report instead.

Suggested scenario `expect` (append):

> The final invocation `4ae2da923366f120` and the "bundled test passed" claim also leave the README: no test was supplied, and this Mold makes no test claim. They move to the report.

If John wants a short accuracy summary to stay (e.g. "SNV F1 0.95 against GIAB HG001"), say so explicitly as an allowed limitation/accuracy sentence instead. Either way, pick one and put it in the scenario.

### P3 1: "Preserve useful supplied material" now contradicts the next bullet

Step 5's first bullet still says "Preserve useful supplied material." The input description for `iwc-workflow-readme` says "preserving accurate material that remains relevant after maturation." A supplied History block is "useful" to someone, so an agent has two conflicting instructions. Scope the first bullet:

> - Create or update a README from evidenced workflow purpose, valid inputs, and expected outputs. Preserve useful supplied material other than development history (see below). State unknown comparisons or tutorial links as unresolved; do not invent them.

The eval property's "not silently dropped" covers the move, so the frontmatter description can stay as is.

### P3 2: Pipeline harness gap — run evidence arrives after this Mold

In `galaxy-workflow-maturation`, phase 2 (this Mold) writes the README before phases 3 and 4 produce validation and Planemo evidence. The iwc-lab#4 history (Planemo runs, the medaka failures, the gxwf false positive) is phase 3 and 4 or repair-loop material, so a harness or agent added it to the README after this Mold ran. The Mold rule only catches it if that README gets fed back in as `iwc-workflow-readme` on a rerun. The eval's "or from the run" is also ambiguous, because this Mold runs nothing. Suggestions:

- Add a harness note to `content/pipelines/galaxy-workflow-maturation/index.md`:
  > "Phase 3 and 4 evidence, reruns and repair attempts go in the maturation report or PR description, never the README. When a rerun carries a prior README, supply it as `iwc-workflow-readme` so phase 2 applies its README scope again."
- In eval.md, change "whether that came from a supplied README or from the run" to "whether it came from a supplied README or from validation and test evidence".

## Nits

- **Reuse:** no other Mold writes an IWC README. `review-galaxy-workflow` only reviews one, under pinned upstream policy. So duplication isn't a problem today, and a shared note would be premature. If a second README writer appears (e.g. a finalize step in nextflow-to-galaxy, or the #784 divergence report feeding "how it differs from its source"), move the README scope rule into `[[iwc-test-data-conventions]]`, which already covers companion-file conventions.
- The fixture's `steps: []` / `outputs: []` matches the sibling fixtures (`already-mature`), so the unevidenced Clair3 step is fine. The scenario doesn't need an Outputs expectation.
- The eval property partly restates the body (mold-spec warns against that), but it targets a real omission failure mode ("moved, not silently dropped"), so it earns its place.
- The changelog sentence and the report addition are consistent with the new bullets. The Dashboard row moved only because of the `revised` date (generated), which is fine.

No security issues.
