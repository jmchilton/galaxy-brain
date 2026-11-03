Run via gpt-6.1-sol (codex-cli 0.165.0).

# Codex review: invocation_graph_output_previews

Codex found two defects, and I confirmed and fixed both. Each fix went into the hover commit (`a5abc580b62`) with a test that fails without it:

1. **An open popover never reloaded.** It now reloads missing outputs when the step's state changes while it's shown, instead of only when it opens.
2. **Subworkflow outputs were stuck behind "not ready".** The preview now takes the producing `GraphStep` instead of its state. A subworkflow step's state is its invocation step's, which stays `scheduled` (shown as `queued`), so its outputs are no longer held back.

Nothing was refuted, and nothing is left for John.

Codex's sandbox (bwrap) can't start on this host: "loopback: Failed RTM_NEWADDR". The first run therefore read nothing and returned an empty, meaningless result. Running without the sandbox was not allowed, so the second run stayed read-only. It got everything on stdin instead of a shell: the full diff (`577c683a957...f560972f84c`) and the complete branch-head contents of every changed file. It also got the surrounding code they depend on: the keyed cache, the dataset/text-content/invocation stores, the Markdown dataset and collection displays, `InvocationGraph.vue`, the first 320 lines of GPopover, history polling, `api/jobs.ts`, and the backend's synthesis of workflow-output labels. Codex reported reading all of these. It couldn't open anything outside the bundle.

Codex reviewed the head at the end of implementation, `f560972f84c`. It did not see the test-challenge rewrites. Those changed tests and two `data-description` hooks, not behavior.

<details>
<summary>Findings and triage</summary>

### 1. P1: missing outputs don't refresh while the popover stays open

**CONFIRMED.** `InvocationStepOutputsPopover.vue` called `load()` from `watch(show, …)` only. Suppose the step's details came back empty while its job ran, and the pointer stays on the terminal or the popover until the job finishes. The graph step's state changes, but nothing fetches the details again, so the popover keeps saying "No outputs produced yet."

Fixed: `watch([show, () => props.step.state], ([shown]) => shown && load())`. `load()` already refetches only when an output is missing and the state has changed. Test: "fetches the step's details again when the step's state changes while it's shown".

### 2. P1: completed subworkflow outputs blocked by the scheduling state

**CONFIRMED.** For a subworkflow step, `updateStep` in `useInvocationGraph.ts` sets `populatedState = invocationStep.state`. It then maps `scheduled` to `queued`, and the existing TODO there says subworkflows usually stay `scheduled` even after their outputs succeed. The not-ready placeholder treated `queued` as "jobs still running", so hovering a finished subworkflow's outputs said "This output isn't ready yet: the step is queued." indefinitely.

Fixed: `InvocationOutputPreview` takes `step: GraphStep`, not `stepState`, and skips the not-ready check for subworkflow steps. Freshness still keys on `step.state`. Test: "shows a subworkflow's output although the subworkflow step reads as queued".

For stage 2: the embedded cards pass the source graph step (`props.steps[output.sourceId]`) instead of its `.state`. Subworkflow outputs still never refetch on a state change, because their state doesn't change. That's an existing limitation of the graph's subworkflow state, and the debrief notes it.

### Coverage notes from codex

"Reviewed only the supplied bundle, including partial files and excerpts where provided. No shell commands or tests were run."

</details>
