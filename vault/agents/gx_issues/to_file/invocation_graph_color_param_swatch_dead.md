# Invocation graph never shows the color swatch for color workflow parameters

Filed from: galaxy-brain vault session 2026-10-14, while re-verifying `Component - Invocation Graph View` against dev `c63ffc2ccae`. Found by reading code. **Not reproduced in a browser yet**; repro is the first job.

## Behaviour (expected from code)

A workflow with a `color` parameter input (e.g. value `#ff0000`) should render in the invocation graph's input node as `#ff0000:` plus a readonly `<input type="color">` swatch. In practice the input node probably shows bold text `#ff0000` with no swatch.

The run-form graph shows the swatch correctly.

## Why

- `client/src/composables/useInvocationGraph.ts:365-371` (`initializeGraphInput`) sets `nodeText` to the raw boolean for booleans, and to `` `<b>${inputParam.parameter_value}</b>` `` for **every** other parameter value, colors included.
- `client/src/components/Workflow/Editor/NodeInvocationText.vue:17-19` uses `isColor(value)` = `/^#[0-9a-f]{6}$/i`. The branch at `:42` is the swatch.
- `"<b>#ff0000</b>"` never matches the anchored regex, so it falls through to the `v-sanitize-html` branch (`:51-53`).
- The run graph passes a raw hex value (`client/src/composables/useWorkflowRunGraph.ts:165-167`), which is why the swatch works there. The swatch branch in `NodeInvocationText` is shared by both graphs, but only the run graph can reach it.

## History

Unknown whether it ever worked in the invocation graph. To check: `git log -S'<b>${inputParam.parameter_value}</b>'` on `useInvocationGraph.ts` vs. `git log -S'isColor'` on `NodeInvocationText.vue`. #23791 (v-sanitize-html for node text) didn't change the matching.

## Suggested fix

In `initializeGraphInput`, don't wrap values in `<b>` when they're color-shaped (or, cleaner, when the workflow step's `parameter_type` is `color`), and pass the raw hex. The `NodeInvocationText` text branch could do the bolding itself instead of the composable embedding HTML. That would also remove the `<b>` from `nodeText` for HDA/HDCA inputs (`:358,363`), which only works because the sanitizer allows `<b>`.

Tests:
- **Unit (red first):** in `client/src/composables/useInvocationGraph.test.ts`, an invocation with a color `input_step_parameters` entry → `steps[i].nodeText === "#ff0000"`. Or a `NodeInvocationText.test.ts` mount via the composable output asserting `input[type=color]` exists.
- Existing `NodeInvocationText.test.ts` covers the sanitize path only.

## Scope

Cosmetic. Affects every workflow with a color parameter input viewed in the invocation Overview graph. Small fix, good first issue.
