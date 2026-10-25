# Thermo-nuclear review: issue_204_unknown_map_over

Acted on finding 1 (commit `1577f9f7`); skipped findings 2-3.

Skipped:

- 2: `_resolveStepMapOver` still runs when map-over is unknown. Kept: incompatible map-over among known edges is still a real error.
- 3: TS-only tests. Kept: `check-sync` rejects local corpus extras; Galaxy-side fixture is follow-up work, not this branch.

<details><summary>Full review</summary>

Reviewed base 539c16c9..6ea680e7. Small, correct fix; file stays at ~420 lines.

**1. Same flag checked twice in one flow (fixed).** `mapOverUnknown` gated both the `stepResult.mapOver` assignment (`stepMapOver && !mapOverUnknown`) and a separate inline if/else-if over output resolution, with the unknown-output loop inlined beside `_resolveSubworkflowOutputs` / `_resolveOutputTypes`. Moved the loop into `_markOutputsUnknown(step, resolvedOutputTypes)`, a sibling of the existing resolvers, and branched once: unknown → mark outputs; else → set mapOver and resolve outputs as before. No behavior change; `make check` and connection-validation vitest (54 tests) pass.

**2. `_resolveStepMapOver` runs even when unknown.** Could skip it, but it records incompatible-map-over errors from the known edges, which remain valid. Left as is.

**3. Tests are TS-only.** Diverges from Python parity tests, but forced by corpus sync rules. The test file is focused (skip into collection consumer, propagation, known mapping beside skip, subworkflow outputs); no trivial tests to cut.

</details>
