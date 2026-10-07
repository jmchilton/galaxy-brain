# dangling_when_lint — polish debrief (2026-10-07)

Polished at `ba30ef051eb` (was `9df25acd96c`; one commit, off dev, 0 behind). `optional_input_gating` was rebased onto it twice: first to `7965f588a8e`, now `bb133ad0b15`. No conflicts; its 762 editor/store vitest and vue-tsc pass.

## CI
- Fork CI on `9df25acd96c` was all queued at start, so there were no reds to check. Fork CI on `ba30ef051eb` is pending, including the Selenium assertion in `test_editor_create_conditional_step`, which hasn't run locally.

## Checklist (GENERAL + WORKFLOW_RELATED)
There were no hard fails. Fixed:
- **Hover highlight.** It did nothing for the main case: `when` isn't in `step.inputs`, which is all `workflowSearchStore` indexes, and nested names used `path.join("|")`. Gate items now highlight the tool input under its connection name, or else the step (`highlightType: "input" | "step"`). A reference that isn't a tool input is labelled as the condition wrote it (`queries[0].input2`).
- **`hasGatedSteps`.** It was a function computed separately in `Lint.vue` and `useLinting`. It's now a step store getter, like `hasInputSteps`.
- **Warning wording.** "…or fails while its condition is evaluated" became "…or its invocation fails".
- **`Lint.test.ts`.** It now asserts the item text `gated: when`, and awaits the store update; before, the section rendered only by accident of timing.
- **New unit tests.** Subworkflow step, input-vs-step highlight, and repeat naming.

## Strengthening round
Applied:
- **API test `test_run_workflow_fails_when_input_not_connected`.** `when: $(inputs.when)` with nothing connected fails with `when_not_boolean`, `Type is: NoneType`. Ran locally: 1 passed. It's evidence of the current runtime behaviour, not a red-to-green test (no backend change).
- **Description.**
  - It quotes the real UI failure text.
  - New bold lines: editor-only scope (backend/gxformat2 linting unchanged), and the double report with disconnected inputs.
  - Row 2's runtime cell is corrected: a disconnected tool data input is supplied in the run form, so the step isn't "skipped on every run".

Checks: 668 editor/store vitest (dangling_when_lint), vue-tsc, eslint (warnings only, all pre-existing kinds) and prettier all pass.

## Questions for John
- **Flag gates on disconnected tool inputs?** The run form asks for a disconnected data input, so a `!== null` gate on it tests the runner's choice rather than an upstream output. Options:
  - keep flagging it (it's usually a rewiring mistake, and it's what `optional_input_gating` relies on)
  - flag only optional tool inputs
  - drop the tool-input branch so only names nothing can supply are flagged
- **Double report.** A required disconnected input read by a gate appears in both disconnected inputs and conditional gates. The description says this is deliberate; dedupe instead?
