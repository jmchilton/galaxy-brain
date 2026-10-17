# Normal review: re-scope

I acted on (a), (b), (c) and (e) in `88d38744136`; I left (d) and (f) as they were. There were no security findings.

- **(a) Acted on.** Legacy input steps that share an effective label no longer get the same prefilled value.
  - A new helper, `_request_input_labels()` in `managers/workflows.py`, sends `step_effective_label: null` for a label that more than one step uses. The client then falls back to `step_index`, so those steps aren't prefilled. Before this branch they weren't prefilled either.
  - A unit test, `test_request_input_labels`, sets legacy `tool_inputs` names directly, because neither import nor `yaml_to_model` can produce such rows.
- **(b) Acted on, test only.** Parent `b53a5d9fe8b` now raises `ValueError` when a row isn't a dict. I added a list row to `test_recover_step_parameters_skips_unusable_rows`.
- **(c) Acted on.** The API contract test now checks the pairing directly: `{effective_label or str(step_index)} == set(request.inputs)`.
- **(e) Acted on.** The `type` loop variable is renamed to `param_type`. I didn't extract a shared setup helper because the parent's `_resolve_step_parameter_row` builds a single row, and this test needs several.

Not acted on:
- **(d)** The `|| step.step_label` fallback stays. It covers run data that lacks the new field, such as the `run1.json` fixture.
- **(f)** The rerun wrappers aren't unmounted. This predates the branch, causes no warnings, and the tests pass.

<details><summary>Full review</summary>

Reviewed commits: re-scope `bdd3e7185ad`, `29cf3966eb2` and `2bf6fb753f1`, in the context of the whole branch diff from `8f358dbb341`.

Checks the reviewer ran:
- unit `test_run_parameters.py`: 13 passed
- vitest `Workflow/Run`: 77 passed
- eslint: 0 errors
- a `tsc` probe: the JSDoc `@template` on `withRerunValues` keeps `FormInputNode[]` under allowJs/checkJs=false

Findings:
- **(a) Medium.** Legacy input steps that share a name (old Galaxy saved the default "Input Dataset" for each one) collide in `recover_inputs` (last one wins). With the new field, every such step would be prefilled with the same dataset. Before, none were. Recommendation: use the effective label only when it is unique, and otherwise fall back to the index.
- **(b) Low.** Delegation keeps the old skip semantics. A non-dict JSON row raised an uncaught `AttributeError`. The right fix is in the parent's resolver, which has since made that fix.
- **(c) Low.** The API contract test should assert the label-or-index pairing directly.
- **(d) Nit.** The `|| step.step_label` fallback is redundant against a real server.
- **(e) Nit.** The `type` loop variable shadows the builtin, and the test's setup duplicates another test's.
- **(f) Nit.** The rerun wrappers are never unmounted, and `mountRerun` unmounts the outer wrapper twice.

Confirmed fine:
- `step_effective_label` naming follows the `step_*` keys.
- The simple form goes through `rerunInputValue`.
- The landing path keeps its own key format.
- The delegation and the move of `withRerunValues` are the right reuse.
- A bad row is tolerated in the run form and strict in the export.
- No new imports in functions, and no weakened tests.

</details>
