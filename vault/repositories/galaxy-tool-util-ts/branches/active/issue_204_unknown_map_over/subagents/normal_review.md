# Normal review debrief

Reviewed at `0aebee05`. Verdict: no P1/P2. Acted on the subworkflow P3: subworkflow steps have empty `outputs`, so they never became unknown, and downstream edges skipped as "Cannot resolve output". Fixed in `6ea680e7` with a red-to-green subworkflow test.

Not acted on:
- Narrowing the trigger to the ANY-source skip only: an unresolvable target input also means map-over is unknown, and typing outputs as datasets there is what produced false `invalid`s. Kept the conservative behaviour.
- Bumping `cli`/`core` in the changeset: packages are linked and version together.
- The comment wording nit was applied in `6ea680e7`.
- Python twin parity: recorded as a follow-up in the branch record.

<details><summary>Full review</summary>

Verdict: the branch looks correct and can merge as is. No P1 or P2. Tests pass (53/53).

- `_resolveStepMapOver` still runs on the known contributions, so incompatible-map-over errors still surface; only `stepResult.mapOver` is suppressed when unknown.
- An ANY source becomes `skip`, so the unknown state spreads through the graph as intended. Downstream steps lose validation, real errors included.
- P3: the skip trigger is broad. All three skip causes (unresolvable source output, unresolvable target input, ANY source) set it. An unresolvable target input usually means a tool-metadata mismatch, and a stale input name now blanks the rest of the graph. Suggested limiting it to ANY sources via a `skipReason` field; judgement call.
- P3: the subworkflow path bypasses `_resolveSubworkflowOutputs` and overwrites only keys already in `resolvedOutputTypes[stepId]`. If outer outputs aren't in `step.outputs`, they stay unset and the error message differs. No test covered it.
- ANY doesn't leak to users: `stepResult.mapOver` stays null, and the report maps ANY to `collection_type: null`.
- Changeset: patch on `connection-validation` is fine.
- Nits: comment wording; Python twin follow-up.

</details>
