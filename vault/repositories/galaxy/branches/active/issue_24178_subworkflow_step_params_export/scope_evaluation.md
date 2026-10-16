# Scope evaluation (re-scope, second pass)

**Recommendation: a modest docs-only expansion; otherwise keep the scope as implemented.** Document the step-parameter contract this branch now enforces in the shared schema descriptions in `lib/galaxy/schema/workflows.py`. `STEP_PARAMETERS_DESCRIPTION` gets the subworkflow key form `"<inner step index>|<name>"`, and `"<i>|<j>|<name>"` when nested. `STEP_PARAMETERS_NORMALIZED_DESCRIPTION` gets the rule that keys matching no step are rejected with a 400, on normalized requests only. While there, fix the "we the resulting" typo at `schema/invocation.py:647`, then regenerate `client/packages/api-client/src/schema/schema.ts` with `make update-client-api-schema`, which the OpenAPI lint CI enforces. Everything else stays as is: the fix, A (`param_map.get(step.id)`), B (unknown outer index gives a 400) and C (the shared resolver). Nothing touches `model/__init__.py`, the resolver or the `run_request.py` hunks, so the resolver contract and the restacking #24175/#24176 are unaffected.

Evaluated at head `b53a5d9fe8b` against base `5bf7abf5e32`. The settled decisions (base `dev`, backport after merge, the resolver living here, the "step params lost" notice being out of scope) are not re-opened.

## As implemented (fix + A + B + C)

The export re-keys stored subworkflow params to `"<inner index>|name"` through `WorkflowStep.step_parameters_by_index`, via the shared `WorkflowRequestInputParameter.resolve_step_parameters()`. Invoke reverses that with `step_parameters_by_id`. Bad inner keys and unknown outer indices on normalized requests return a 400. Subworkflow invocations now record their own step params.

| Pros | Cons |
| --- | --- |
| • Fixes the issue as proposed, plus the persistence bug (A) on the same call path.<br>• Inner and outer unknown-index handling is now symmetric (B).<br>• One row resolver for the whole stack (C), with its contract pinned by unit tests and hardened by the Codex finding.<br>• Reviewed five ways (normal, test challenges, Codex, two thermo passes). No open must-fix. | • B tightens a public API, and the behaviour change is described only in the PR description. Neither the OpenAPI docs nor the field descriptions say what key shapes are valid or what is rejected.<br>• The resolver has two failure signals that three of four stack callers fold together. Frozen for now (see follow-ups). |

## D. Document the step-parameter key contract in the API schema (recommended)

Extend the two shared description constants in `schema/workflows.py`.

- **`STEP_PARAMETERS_DESCRIPTION`:** subworkflow step params are keyed `"<inner step index>|<name>"`, and `"<i>|<j>|<name>"` when nested. This is the same form as the run form and the `/request` export.
- **`STEP_PARAMETERS_NORMALIZED_DESCRIPTION`:** when true, keys must be existing step indices, and unknown or malformed keys are rejected. The legacy path is unchanged.

Fix the "we the resulting" typo in the export model's `parameters` description, then run `make update-client-api-schema`.

This is not extending the legacy feature, which the issue's note limits. It documents behaviour that this branch itself changed: the inner-key 400s, B's outer-index 400, and the export's new key form.

| Pros | Cons |
| --- | --- |
| • The issue's root cause was an undocumented shape mismatch between export and invoke. This writes the shape down at the API boundary.<br>• One constant feeds both ends of the round trip: the invoke payload (`schema/workflows.py:191`) and the export model (`schema/invocation.py:647`, as an f-string prefix).<br>• Documents B's API tightening for bioblend and external callers, beyond the PR description.<br>• No sibling touches `schema/workflows.py`, `schema/invocation.py` or `schema.ts` (checked by name against all three sibling heads), so restacking is conflict-free.<br>• No code-path or contract change, and no new tests. | • Forces a regen of the generated `schema.ts` (4 JSDoc lines) and one more restack of #24175/#24176, though a conflict-free one.<br>• The descriptions are labelled "Legacy". Reviewers may see documenting a legacy field as low value.<br>• Easy to drop at review if a reviewer objects; it is independent of everything else. |

<details><summary>Details</summary>

- Nested form verified against the recursion. For a nested subworkflow, `step_parameters_by_index` returns `"<j>|name"`, which the outer level prefixes to `"<i>|<j>|name"`. `step_parameters_by_id` splits on the first `|` and recurses.
- `schema.ts` currently carries the text at lines ~18418/18428 (invoke payload) and ~28823/28830 (request model).
- CI enforces the regeneration. `.github/workflows/lint_openapi_schema.yml` runs `make update-client-api-schema` and fails on any `git status` change. It also runs codespell over the dumped schema, so new wording gets spell-checked. Regenerate locally instead of hand-editing `schema.ts`.
- Suggested wording stays short. Avoid restating the 400 message text, so the docs don't pin error strings.

</details>

## E. Contraction: drop B, the unknown outer index → 400 (rejected)

Revert to silently dropping top-level keys that match no step on normalized invokes.

| Pros | Cons |
| --- | --- |
| • Smallest public-API blast radius. External clients that send stale keys keep working. | • John approved B. The normal review confirmed that every in-tree producer (run form, export, populators, batch) sends only valid indices.<br>• Re-creates the inner/outer asymmetry this branch fixed.<br>• It is already flagged for the PR description, and D documents it. |

## F. Contraction: original scope only (rejected)

Ship `a171dbed419`, which is kept as `jmchilton/issue_24178_subworkflow_step_params_export_alt_original_scope`.

| Pros | Cons |
| --- | --- |
| • Pre-re-scope reviewed diff, with no persistence change. | • Re-opens the approved re-scope.<br>• Breaks the resolver dependency that #24175/#24176 are restacking onto.<br>• Leaves the `param_map` collision bug in place. |

## Backport

Settled: the base stays `dev`, and a `release_26.2` cherry-pick is decided after merge. D adds no reason to change that. A backport would carry the description change and a hand-regenerated `schema.ts` on the release branch.

## Belongs elsewhere / follow-ups

| Candidate | Owner | Why not here |
| --- | --- | --- |
| Single "unusable row" signal from the resolver (thermo #1) | post-merge follow-up, after #24175/#24176 land | Changes the frozen resolver contract (`None` for an unknown step, `ValueError` for a malformed row) that the siblings are restacking onto. Three of the four call sites would lose their try/except-to-`None` blocks. |
| Export delegates to `WorkflowInvocation.recover_step_parameters()` with a strict mode (thermo #2) | post-merge, #24176 owns `recover_step_parameters` | The function lives on a sibling and its policy differs (skip vs raise). After merge, the export's STEP_PARAMETERS branch shrinks to about one line. |
| Batch detection inside subworkflow step params | own issue (not filed; unverified end to end) | `expand_workflow_inputs` (`tools/parameters/meta.py:114`) checks only one level deep, so a `{"batch": true, ...}` value nested under an inner step id is never expanded. It predates this branch, is a feature rather than part of the export/invoke round trip, and no in-tree producer is known to send it. |
| Legacy `parameter_input` `"input"` values inside subworkflows stay in `param_map` instead of becoming formal input step parameters | own issue, if anyone cares | The top-level pop in `build_workflow_run_configs` only walks `workflow.steps`. This is legacy-form behaviour, and the issue's note limits the legacy run form work to this fix. |
| `parametrize` the `test_resolve_step_parameters_malformed_row` loop; `from e` on the subworkflow re-raise in `run_request.py`; "No-op for other step types" docstring wording | post-restack polish | Cosmetic. Each touches a hunk #24175/#24176 are restacking, so doing them now only causes conflicts. |
| Import re-keying, the export's skip-with-warning for imported invocations, and the nested-invocation import case | #24175 | Sibling scope. A makes the nested import case newly reachable, and #24175 already has it flagged. |
| Run-form seeding from an invocation's step params | #24176 | Sibling scope. |
| Client rerun forms, `withRerunValues` duplication | #24177 / #24176 | Client-only. |
| "Step params lost" notice | #24175/#24177 | Settled as out of scope. |
| `replacement_dict` key for the client simple form | its own issue (not filed) | Not on this branch's code path. |
| Legacy unlabeled input steps not prefilled; full-form object store UI | #24176 follow-up; its own feature | Input keying and UI, not step params. |
