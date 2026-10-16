# Scope evaluation

**Recommendation: keep scope as implemented.** The branch is exactly the issue's Proposed Approach (serialize `order_index` + index-keyed params, re-key on import, skip-with-warning for legacy archives) in ~40 implementation lines with no schema change, reusing the parent's `WorkflowStep` helpers. None of the alternatives below clearly beats the settled decisions. The one worth a conscious "no" from John is dropping `order_index`-less step rows at import (normal review finding 5, "finding 4" in the debrief): it closes the rare cross-server "laundering" of legacy collisions for a few lines. It is additive and can follow later, so it does not justify reopening this branch. Two PR-description items, no code: the skip also covers an unknown *inner* subworkflow step id (a 500 on the parent), and legacy cross-server collisions are fixed only for new archives.

Evaluated at `5f914857f95`, stacked on `issue_24178_subworkflow_step_params_export` @ `5cf81e75c12` (base `dev` @ `88127f42979`): 4 commits, +117/−8 across 4 files (3 implementation, 1 API test).

## As implemented

`WorkflowRequestInputParameter.resolve_step_parameters()` is the single "stored step-id row → (step, index-keyed params)" conversion. `_serialize` uses it to add `order_index` + `step_parameters`, and import re-keys with `step_by_index` + `step_parameters_by_id`. The `/request` export uses it too and skips unresolvable rows with a warning, so legacy archives get a working Rerun and fall back to the workflow's saved values.

| Pros | Cons |
| --- | --- |
| <ul><li>Matches the issue's Proposed Approach item for item, including the parametrized flat and subworkflow API test that was red on the parent.</li><li>Store format only. Old Galaxies reading new archives behave as before, because `name`/`value` are kept.</li><li>Follows the existing per-step `order_index` convention (`WorkflowRequestStepState`, `attach_workflow_step`). No new mechanism.</li><li>One conversion point serves both the serializer and the request export.</li><li>Export never fails on a bad row, and the re-export of a legacy import is tested.</li></ul> | <ul><li>Legacy archives lose their step params silently. Nothing reaches the user, only a server log, because the request model has no warnings channel.</li><li>The legacy cross-server collision remains, and a re-export can "launder" it into a new-style archive.</li><li>The skip is slightly wider than the issue (unknown inner ids too). The PR description has to say so.</li><li>The stack means it can't merge before #24178, and a parent commit touching the same `/request` lines will conflict on rebase.</li></ul> |

<details><summary>Details</summary>

- Codex found no defects. The thermo-nuclear review called the design "about as small as it can be" and rejected the code-judo alternatives: recovering the mapping from data already in the archive is impossible (F6), and dropping `name`/`value` would break older importers.
- The test footprint was cut back on purpose (both unit tests and the mock change were dropped as redundant with the API tests). That is a contraction already applied inside scope, not a scope change.
- RO-Crate goes through the same `_import_workflow_invocations` path, and the store/RO-Crate API sweep passed, so the "(or RO-Crate)" route in the issue is covered.

</details>

## Alternative: merge into the #24178 PR

Ship #24178 and #24175 as one "step params aren't portable" server PR, as the issue and the spike both say is possible.

| Pros | Cons |
| --- | --- |
| <ul><li>One review instead of a stack. The helpers and their second consumer land together.</li><li>No rebase conflict on the shared `/request` lines.</li></ul> | <ul><li>Contradicts the settled four-sibling split.</li><li>The spike flagged #24175 as "the one reviewers will debate" (store format, legacy skip vs 4xx). Bundling it lets that debate hold up the uncontroversial #24178 fix.</li><li>#24178 already has its own records, reviews and scope evaluation. Merging would invalidate them.</li></ul> |

Not recommended. The split isolates the contested part, which is what the split is for.

## Alternative: drop or neutralise legacy step rows at import (normal review finding 5)

At import, skip (or blank) `type == "step"` rows that have no `order_index`, with a warning, instead of copying stale ids verbatim. Keep the request-time skip for invocations imported before the fix.

| Pros | Cons |
| --- | --- |
| <ul><li>Closes the cross-server collision for future legacy imports: a stale id can no longer match an unrelated step.</li><li>Stops a re-export from stamping a wrong `order_index` into a new-style archive ("laundering").</li><li>Small: a few lines in `_import_workflow_invocations` plus an assertion in the existing legacy API test.</li><li>For same-server imports the `/request` outcome is identical, because the row is skipped either way.</li></ul> | <ul><li>The issue rejected drop-on-import (as the primary fix, though not for unmappable rows specifically).</li><li>Destroys the raw record. Even if unmappable, it is the only trace of what the run used and could matter for provenance.</li><li>Still needs the request-time skip, so it adds a second legacy path instead of replacing one.</li><li>It needs a cross-server import of a pre-fix archive *and* an id collision. That is rare and shrinks as old archives age out.</li></ul> |

Not recommended for this branch. A reasonable small follow-up if John wants the collision closed. Needs John's decision (open question).

## Alternative: 4xx for legacy archives instead of skip

When `/request` meets an unresolvable step row, return a 4xx that says the step params were lost, instead of skipping.

| Pros | Cons |
| --- | --- |
| <ul><li>The user is told that their parameters were dropped. This matches #24177's "nothing tells them" theme.</li></ul> | <ul><li>Blocks Rerun entirely for every legacy imported invocation that had step params, so it is a regression in usefulness compared to the skip.</li><li>Contradicts the settled default.</li></ul> |

Not recommended. The better version is a non-blocking warning field on the request model, surfaced by the client. That belongs with #24177, not here.

## Alternative: contract to request-export skip only

Only make `/request` skip unknown step ids, with no store-format change and no import re-keying.

| Pros | Cons |
| --- | --- |
| <ul><li>About 10 lines, no store format change.</li></ul> | <ul><li>Every imported invocation loses its step params, not just legacy ones. This is the "drop" alternative the issue rejected.</li><li>Cross-server collisions persist for all archives.</li></ul> |

Not recommended.

## Alternative: also fix the latent `param_map` keyed-by-id bug

Fix `workflow_run_config_to_request`'s `param_map.get(step.order_index)` lookup for subworkflow steps.

| Pros | Cons |
| --- | --- |
| <ul><li>One-line fix in the same feature area, and it would stop stray rows on sub-invocations that `resolve_step_parameters` currently has to tolerate.</li></ul> | <ul><li>Changes what gets persisted on sub-invocations, which is a different behaviour change than this bug.</li><li>Explicitly out of scope per the coordinator. Better as its own follow-up issue.</li></ul> |

Not recommended here.

## Alternative: FK column + migration, or source `parameters` from `WorkflowRequestStepState`

The issue's two larger alternatives.

| Pros | Cons |
| --- | --- |
| <ul><li>Step-state sourcing would avoid id-keyed rows entirely.</li></ul> | <ul><li>FK: a migration + backfill, and the nested JSON ids still need re-keying.</li><li>Step states: changes what `parameters` means (every param of every step becomes an override).</li><li>John's note on the issue limits this work to "cleanly and without model migration".</li></ul> |

Not recommended.

## Open questions for John

- Drop `order_index`-less step rows at import (follow-up), or leave the legacy collision documented?
- Want a non-blocking "step params lost" warning in the request model as part of #24177?
- File the `param_map` bug as its own issue?
