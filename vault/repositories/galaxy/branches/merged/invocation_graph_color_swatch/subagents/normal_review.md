# Normal review debrief

Acted on nit 1 (fallback uses local `parameterValue`; amended into commit). Not acted on:

- Nit 2 (inline `parameterType` into color check): marginal; named local reads clearer.
- Nit 3 (`directory_uri` parity): pre-existing, out of scope; noted in debrief.

<details><summary>Full review</summary>

# Normal review: invocation_graph_color_swatch

**Verdict: approve. Fix is correct, minimal, typed by parameter type (not value shape), and covered by a red-to-green composable test. Only nits below; nothing must-fix.**

Reviewed `5beaf11913f` against `c63ffc2ccae`. Ran `useInvocationGraph.test.ts` on node 22.20.0: 19/19 pass.

## Checked, no change needed

- **`outputs[0]` as type signal.** Correct and the only one available. `getFullWorkflowCached` → `getWorkflowFull` downloads with `style: "editor"`. For `parameter_input` the backend's `InputParameterModule.get_all_outputs` (`lib/galaxy/workflow/modules.py` ~1773) always gives exactly one output, `type=parameter_type, parameter=True`, and it is recomputed from the module at download time, so older workflows get it too. `input_step_parameters` has no type field (only label/value/step id), so there's no better source. Subworkflow input steps are `data_input`/`data_collection_input`/`parameter_input` like any other, so nothing changes for them. `terminals.ts:291` uses the same `step.outputs[0]` pattern.
- **Existing helper/type guard.** None exists. No `isParameterOutput` guard is in `stores/workflowStepStore.ts`, `Editor/modules/`, or `Workflow/constants`. A cast is the established way here.
- **Sibling path consistency.** The run graph (`useWorkflowRunGraph.ts:165`) checks `ColorToolParameter` and passes `dataInput` raw. The invocation graph now checks `parameter_type === "color"` and passes the raw value. Both behave the same. The extra `typeof === "string"` is needed because `parameter_value` is `unknown`.
- **Safety.** The raw value reaches `NodeInvocationText` and renders through `{{ }}` only when it matches `isColor`'s strict hex regex. Anything else still goes through `textHtml` / `v-sanitize-html`. No new injection surface.
- **Test mock change.** `vi.hoisted` + `mockResolvedValueOnce` doesn't leak. Each composable instance calls `getFullWorkflowCached` exactly once (guarded by `loadedWorkflow`), so each test uses up its own `Once`. The vitest config has no `mockReset`/`restoreMocks`, so the hoisted default `mockResolvedValue` survives for the other tests.
- **Test value.** Both tests are meaningful. The color case was red before the fix. The "text param that looks like hex stays bold" case pins the type-based decision over value-shape guessing. That's a real behavior contract, not a trivial test.
- **NodeInvocationText mount.** Not needed. The `isColor` branch is unchanged. The bug was only in what the composable fed it. An E2E belongs to the sibling no-E2E-coverage issue.

## Findings

1. **nit**: `client/src/composables/useInvocationGraph.ts:373`. The fallback still reads `inputParam.parameter_value` after the new `parameterValue` local was introduced. Use `` `<b>${parameterValue}</b>` `` for consistency.
2. **nit**: `client/src/composables/useInvocationGraph.ts:367`. `parameterType` is computed for every parameter input, including booleans, even though only the color branch uses it. You could inline it as `else if ((graphStep.outputs[0] as ParameterOutput | undefined)?.type === "color" && typeof parameterValue === "string")`, or keep it as is. The current form reads fine; mention only if touching the line anyway.
3. **nit (pre-existing, out of scope, already noted in debrief)**: `stores/workflowStepStore.ts:56`. `ParameterTypes` omits `"directory_uri"`, though `Editor/modules/inputs.ts:11` and the run graph both know it. The invocation graph also lacks the run graph's `Directory: <b>…</b>` treatment. This is a separate follow-up, not for this branch.

</details>
