# Debrief: invocation_graph_color_param_swatch_dead

Source: `raw.md` → `proposal.md`. Verified against dev `c63ffc2ccae` (scratch detached worktree, 2026-10-14). Nothing posted. The worktree was reverted afterwards: my temp test was deleted and `git checkout -- .` run. The three remaining untracked files there (`*.rerundropzq.test.ts`, `*.igpqbench.test.ts`, `*.igpqhoisted.ts`) belong to sibling agents and were left alone.

## Verdict

Proposed. Reproduced red in vitest. No duplicate found. Small cosmetic bug, so the issue is kept short: a table, then a one-line cause, with the code walk and the repro in `<details>`.

## Verified

- **Cause (dev line numbers match the draft):** `useInvocationGraph.ts:365-371` wraps every non-boolean param in `<b>`. `NodeInvocationText.vue:17-19` `isColor` uses the anchored regex. The swatch branch is at `:42-50` and the sanitize branch at `:51-53`. `useWorkflowRunGraph.ts:165-167` passes the raw hex for `ColorToolParameter`.
- **Repro (red):** a temp test, `client/src/composables/useInvocationGraph.color.test.ts`, mocks a `parameter_input` editor step and an invocation with `input_step_parameters.color.parameter_value = "#ff0000"`. It runs `loadInvocationGraph(false)` and then mounts `NodeInvocationText`.
  - Composable output: `nodeText = "<b>#ff0000</b>"`.
  - Mount: no `input[type=color]`.
  - The same component fed the raw `#ff0000` (run-graph shape) renders the swatch.
  - Ran under node 22.20.0 via pnpm vitest.
- **Fix tried (green):** the `outputs[0].type === "color"` check in `initializeGraphInput`, shown in the issue's sketch. The repro test, `useInvocationGraph.test.ts` and `NodeInvocationText.test.ts` pass (3 files, 19 tests). eslint reports only 2 pre-existing `any` warnings. vue-tsc was not run. The value-regex variant also went green earlier.
- **Type data is already present:** the editor workflow dict (`managers/workflows.py` ~L1576-1579) includes `outputs: module.get_all_outputs()`. `InputParameterModule.get_all_outputs` (`workflow/modules.py:1769-1783`) sets `type=parameter_type`. The client `ParameterOutput.type` union includes `"color"` (`stores/workflowStepStore.ts:56-61`). `useInvocationGraph` builds graph steps by spreading editor steps, so `graphStep.outputs[0].type` is available with no extra parsing. (`tool_state` itself is the JSON string from `get_tool_state()`, so reading `parameter_type` from it would mean double parsing. That's why the draft's suggestion was replaced.)
- **Backend:** `ColorToolParameter` values are plain `#rrggbb` strings. `run.py:684` `invocation.add_input(content, step.id)` stores the value as `WorkflowRequestInputStepParameter.parameter_value`, which `model/__init__.py` ~L10448-10458 serializes into `input_step_parameters[label].parameter_value`. This is from reading the code; no server was run.
- **Bold rendering:** inferred, not observed. `textHtml` allows `b`, and the `v-sanitize-html` default profile (DOMPurify HTML profile) keeps `<b>`. Under happy-dom the rendered span showed no `<b>` (DOMPurify is unreliable there, per the mock's comment).
- **History (never worked; not a regression):**
  - `d5228a530c6` (2024-09-03, in #18615 "Workflow Invocation view improvements", merged 2024-11-12) added the `<b>${parameter_value}</b>` wrap.
  - `e055d8a19d0` (2025-01-17) added `isColor` and the swatch, and `3cb00da0a22` added `useWorkflowRunGraph`, both in #19294 "Workflow Run Form Enhancements" (merged 2025-03-10).
  - `959c63ea01a` in #23791 moved to `v-sanitize-html` with no matching change.

## Related / duplicate search (none duplicates)

The searches used `gh search issues|prs --repo galaxyproject/galaxy`. The first batch, and the `--include-prs` variant, returned empty or hit the shared search rate limit, so they are discarded. Recorded runs:

- "color swatch", "swatch", "color invocation", "color parameter graph", "NodeInvocationText", "color workflow parameter", "color workflow", "invocation graph input", "invocation graph parameter", "color picker workflow", "graph input value": no results (issues and PRs).
- "color parameter": #3241, #20697 (linter); PRs #22909, #19374, #7475, #6829. All unrelated.
- "invocation graph": ~13 issues and ~13 PRs. The closest are #21086 (invocation step display improvements, closed, a checklist with no color item), #22768 (graph CSS paper cuts, no color item), #22144/#22159 (step form / IO toggle). None about parameter value rendering.
- "color in:title": 12 issues and ~24 PRs, all theme, tool or schema color topics.
- "color input": PR #12867 (vuefy color form element) and others. Unrelated.

## Changes from draft

- Title reworded to describe the symptom ("bold hex text instead of a color swatch").
- Opener is a single plain sentence. A run-graph vs invocation-graph table is up front; the code walk moved into `<details>`.
- Fix changed from a value-shape check / `parameter_type` lookup to the step's `outputs[0].type === "color"`. The draft's "parameter_type" idea was cheap after all, through the outputs rather than `tool_state`. Value regex (with a shared `isColor`) and "move bolding into the component" are now Alternatives. Removing `<b>` from HDA/HDCA `nodeText` was demoted to that second alternative.
- History filled in (#18615 / #19294 / #23791); framed as a gap that has always existed.
- Dropped "good first issue" and the local session/vault provenance.
- The repro test code and red output are included in `<details>`.

## Relation to siblings

The sibling `invocation_graph_no_e2e_coverage.md` proposes an E2E test for this swatch. This issue only proposes a unit test; the E2E one belongs to that draft. The issue text doesn't cross-reference it, so add a link if both get filed.

## Left over

- Whether to also show `Directory: <b>…</b>` for `directory_uri` params in the invocation graph, as the run graph does. That's another parity gap I noticed but didn't put in the issue.
- vue-tsc not run on the sketch (the cast `graphStep.outputs[0] as ParameterOutput | undefined` should be fine).
- Not checked in a browser.

## Reviewer

One fresh subagent, one round. Verdict: polished, no pushback. Line refs correct at `c63ffc2ccae`; PR history confirmed via commits→PR API (d5228a530c6 in #18615; e055d8a19d0 + 3cb00da0a22 in #19294; 959c63ea01a in #23791 only swaps v-html→v-sanitize-html) — "never worked" holds. Fix premise confirmed: graph steps come from `download?style=editor`, step dict has `outputs: module.get_all_outputs()`, `InputParameterModule.get_all_outputs` sets `type=parameter_type`, client `ParameterOutput.type` allows `"color"`. Reran repro: red (`expected '<b>#ff0000</b>' to be '#ff0000'`). Quick dup searches: none.

Edits in place:
- Repro intro: imports + `createTestingPinia` setup omitted from snippet.
- Result label: both mounts' HTML was logged (snippet has no log lines).
- happy-dom note: missing `<b>` is a DOMPurify-under-happy-dom artifact; browser `textHtml` + default `v-sanitize-html` keep it.
- Proposed Approach names type-data source (editor download, `get_all_outputs`).
- Alternative headings use `### Alternative: …` prefix.

Left over: bold rendering in real browser inferred, not seen; vue-tsc not run on sketch; cross-link with E2E-coverage issue if both filed.
