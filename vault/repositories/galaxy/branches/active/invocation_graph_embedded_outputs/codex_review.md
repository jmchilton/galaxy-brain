Run via gpt-6.1-sol (codex-cli 0.165.0).

# Codex review: invocation_graph_embedded_outputs (stage 3)

Codex reported no defects and one reuse finding. I confirmed the finding and fixed it in the invocation graph commit (`76413f31454`). Nothing was refuted, and nothing is left for John.

- **`usePreferredOutputItems` duplicated `useStepOutputItems`.** Both resolved an output from the invocation's listing or the step's details, and both refetched at most once per step state.
  - The fix exports two helpers from `useStepOutputItems.ts`, and both composables now use them:
    - `stepOutputItem(store, step, name)` returns the stored details object, not a copy. That keeps the performance pass's identity fix and extends it to stage 1's hover popover.
    - `useStepDetailsRefetch(store)` refetches once per step state.
  - `useStepOutputItems.items` now covers only the step's own outputs. Its one consumer, the hover popover, reads only those.
  - Verification:
    - Vitest: 58 files and 543 tests pass.
    - vue-tsc, eslint and prettier are clean.
    - The Playwright tests `test_embed_shows_steps_as_their_preferred_output` and `test_hover_previews_step_outputs` pass.

Codex's sandbox (bwrap) can't start on this host, as in stage 2, so the review ran read-only with everything on stdin. That included the full diff (`invocation_graph_embedded_workflow_outputs..24d04827bc0`) and the branch-head contents of every changed client file and the surrounding Graph composables. Python came as excerpts: the `WorkflowStep` class, the editor-dict and `.ga` export step loops, and `__module_from_dict`. It reviewed the head after E2E polish and ran in parallel with the performance pass. The performance pass's only change was the item-identity fix, which this one absorbs.

<details>
<summary>Findings and triage</summary>

### 1. P3 reuse: preferred-output resolution duplicates useStepOutputItems

**CONFIRMED** (`usePreferredOutputItems.ts:43`, `itemFor` and `fetchedUnderState`). Codex wrote: "itemFor and fetchedUnderState reproduce the existing useStepOutputItems abstraction: prefer invocation-listed items, resolve datasets and collections from cached step details, and refetch missing outputs after state changes. Extend that abstraction to accept the requested output names so preferred-output selection can reuse it while preserving the requirement to fetch only when the preferred output is missing."

The failure scenario Codex gave: "No current runtime failure established. This is duplicated maintenance logic."

The fix shares the two pieces rather than making `useStepOutputItems` take output names. `useStepOutputItems` works on one step ref, while `usePreferredOutputItems` works across all steps.

### Coverage notes

"Reviewed only the supplied diff, complete files, and excerpts. Python copy_to implementation was not present in the supplied excerpt. Tests were not executed."

`copy_to` copying `config` is covered by the test challenge's `test_preferred_output_kept_by_new_versions`, together with the mutation that drops it.

</details>
