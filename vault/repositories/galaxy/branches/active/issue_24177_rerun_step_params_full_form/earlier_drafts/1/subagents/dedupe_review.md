# Dedupe review debrief (after rebase onto #24176 `8141bfccf87`)

I acted on the main finding. The separate `test_workflow_rerun_keeps_tool_step_parameters` duplicated the setup in #24176's `test_workflow_rerun_prefills_expanded_form`, so I dropped it. #24177's assertions now sit in #24176's test right after the expanded form appears: the reason alert and the absent Simple Form toggle. That test also resubmits the first rerun and asserts that the new invocation's request export keeps `num_lines` = 3. That resubmit check also passes on #24176, because its guard and seeding already cover it. I kept it as the issue's requested end-to-end proof, which no other test provides. The test passed under Playwright at `1d8829ef22d`.

Not acted on:
- The redundant `invocations.state_details` wait (nit). It is gone with the merge: the resubmit now waits only on `wait_for_history_workflows`.

<details><summary>Review summary</summary>

- No must-fix issues and no conflict-resolution mistakes. `range-diff` shows the Vue and vitest changes are byte-identical. No leftover selectors or imports.
- The reason/toggle assertions fail at the parent, as they should: there, `disableSimpleFormReason` stays undefined and the toggle renders.
- Should: the resubmit half passes at the parent too. Move it into the parent's test, or reword the docstring. I moved it into the parent's test.
- Should: the setup was repeated verbatim. Add the 3 assertion lines to the parent's test and drop the duplicate test. Done.
- Nit: `state_details` wait redundant with `wait_for_history_workflows`.
- Waits and Playwright parity: fine.

</details>
