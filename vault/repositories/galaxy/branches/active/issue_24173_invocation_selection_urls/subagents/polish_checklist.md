# PR checklist evaluation: issue_24173_invocation_selection_urls

Evaluated `195bbc6c7e0..bea9fe79755`: 7 commits, 24 files, +1536/-45. Paths are relative to `client/src/` unless they start with `lib/`. Line numbers are from HEAD. This was a read-only review, so no vitest or selenium tests were run. The red/green claims for the new tests come from the implementer. One environment fact was checked directly, with a node script against the worktree's `happy-dom` 20.14.5.

Changes since the previous evaluation (`a33bfd0d049`):

- Success-banner fix (`a8626fd29b0`).
- `Analysis.test.ts` removed; scrollIntoView stub cleanup (`69e09784c1f`).
- Terminal-step/invocation guards (`6f6f8686774`).
- GenericItem scroll fix and output browser test (`bea9fe79755`).

## Did a human read every test and every comment?

Left for John.

## What does the user see when it fails?

JUDGEMENT-CALL: there is still no message. Stale links now clean themselves up once the step or invocation is terminal. While it is running they stay, by design.

<details>

- **Bad or unknown step** (`step_number=0`, `step_index=1.5`, an unknown or duplicate `step_label`): unchanged. `resolveStep` returns null, the selector is removed from the URL, and the overview opens with nothing selected. Higher-priority keys never fall through to lower ones.
- **Unknown `job` / `output` / unavailable `step_tab` on a terminal step:** now cleared by the `watchEffect` at `components/WorkflowInvocationState/WorkflowInvocationStep.vue:202`. The URL drops them, and the card shows its default (first) tab with nothing expanded. Share no longer copies a selection the page isn't showing.
- **Unknown workflow `output` on a terminal invocation:** now cleared at `components/WorkflowInvocationState/WorkflowInvocationInputOutputTabs.vue:72`.
- **Running step or invocation:** the targets stay in the URL until they arrive or the step/invocation turns terminal. This is tested at `WorkflowInvocationInputOutputTabs.test.ts:247` and in the first half of `WorkflowInvocationStepSelection.test.ts:199`. While running, an unknown job or output shows nothing and gives no hint that it's pending.
- **Input and parameter steps:** the guard runs on them, but their template renders no GTabs and no selectable outputs. Keeping or stripping a target makes no visible difference there.
- **`job` on a single-job step:** the id is in `details.jobs`, so it's kept. `JobStep.vue:113` already shows the single job's details inline, so the link lands on visible content.
- **Workflow fetch failure:** swallowed (`composables/invocationSelection.ts:128-129`). The graph or list shows the shared request's error.
- **Optional:** a toast for a link to a target that doesn't exist, such as "Job not found in this step". This goes beyond the issue.

</details>

## Is the diff free of unrelated or stale generated changes?

Yes!

## Are unit tests not just testing the literal implementation?

FAIL (minor): the `WorkflowInvocationSteps.test.ts` scrollIntoView stub rests on a false premise, and its new cleanup deletes happy-dom's native method. Everything else is behavioral or acceptable.

<details>

**The stub (FAIL):**

- `components/Workflow/Invocation/Graph/WorkflowInvocationSteps.test.ts:64-65` says "jsdom has no scrollIntoView" and assigns `Element.prototype.scrollIntoView`. The suite actually runs under happy-dom (`vitest.config.mts:90`, no per-file override), and happy-dom 20.14.5 defines a native no-op `Element.prototype.scrollIntoView` (`node_modules/happy-dom/lib/nodes/element/Element.js:1029`).
- The `afterEach` at `:32-34` runs `delete Element.prototype.scrollIntoView`, which runs after test 1 too. Checked against `new Window()`: the method is an own property of `window.Element.prototype`, and after the delete `div.scrollIntoView` is `undefined`. The cleanup therefore removes the native method for every later test in the file.
- It's harmless today only because the stubbing test is last. No other test file stubs scrollIntoView.
- **Fix:** delete the stub line, its comment, the `afterEach` block and the unused `afterEach` import. Also drop the optional call in `components/History/Content/GenericItem.vue:85` (`scrollIntoView?.(` → `scrollIntoView(`). It exists only for the same nonexistent jsdom gap and is still inconsistent with `WorkflowInvocationSteps.vue:118`. Rerun both vitest files afterwards (not run here).

**New tests, behavioral:**

- **`lib/galaxy_test/selenium/test_workflow_invocation_details.py:245` `test_output_urls_expand_outputs`:** good. It loads the real URLs (`?step_label=cat_11&output=out_file1`; `/outputs?output=cat_output_11`) and asserts that the expanded `.dataset .details` is visible and inside the window. It also asserts that a non-target output (`cat_output_00`) is not expanded. This closes the previous coverage gap for workflow-output `?output=` and step-output expansion. The zero-padding comment explains a real YAML ordering trap.
- **`test_step_url_scrolls_steps_list`, now at `:231`:** same assertion via the shared `assert_in_window` (`:271`) and `cat_chain_workflow` (`:279`). Behavior is unchanged.
- **`lib/galaxy_test/selenium/test_workflow_run.py:120-122`:** good. It asserts `success` is not in `current_url` and that `.donemessagelarge` is present. That is the user-facing contract. Checking presence rather than visibility is correct, because the banner fades out by CSS. The implementer reports it red without `a8626fd29b0`.
- **`WorkflowInvocationStepSelection.test.ts:199`:**
  - Acceptable and behavioral at the selection-state level: it flips a job from running to ok and expects stale tab/job/output to clear, while a valid `job-1` survives.
  - Like the rest of the file, it drives the hand-built `InvocationSelection` ref bag rather than the URL, so it's coupled to that internal contract. Same caveat as before.
  - Running it requires mocking `fetchInvocationStepById` (`:28`), the poller.
- **`WorkflowInvocationInputOutputTabs.test.ts:239-243, 247`:** acceptable. It checks that an unknown output is cleared on a terminal invocation and kept on a running one.

**Carried over and resolved:**

- `Analysis.test.ts` deleted.
- JobStepSelection overlap with the browser test: unchanged and still mild.
- The GenericItem.test.ts controlled-expansion tests are still fine.

**Gap (optional, not a FAIL):** nothing tests the `userToggled` skip half of GenericItem scrolling (see the existing-workflows item). Because happy-dom has a native method, `vi.spyOn(Element.prototype, "scrollIntoView")` in `GenericItem.test.ts` would be cheap and needs no layout faking. One test could assert it is called when `expanded` flips from props and not called after a user click.

</details>

## Are baseline tests in their own leading commits (if applicable)?

Yes. The baseline-only `Analysis.test.ts` is gone (`69e09784c1f`), and every remaining new test exercises new behavior.

<details>

- **Non-blocking:** history still adds `Analysis.test.ts` in `c978b652038` and removes it in `69e09784c1f`. Likewise, `a8626fd29b0` fixes a regression introduced in `c978b652038`. Fold these fixups if the branch won't be squashed on merge.
- **Nit:** the `69e09784c1f` subject says "Analysis **layout** test", but it was a remount test.

</details>

## Are the comments free of excess archeology?

Mostly. The new comments are short and current-tense. One test comment is factually wrong, and one older nit carries over.

<details>

- **New and fine:**
  - `GenericItem.vue:34` ("An item the user just toggled is already in view…")
  - `GenericItem.vue:84` ("The target is still loading and will grow, so align its top.")
  - `WorkflowInvocationStep.vue:201`
  - `WorkflowInvocationInputOutputTabs.vue:71`
  - `WorkflowInvocationState.vue:72` ("Selection sync drops `success` from the URL without remounting; keep the banner for this visit.")
  - `test_workflow_run.py:120`
  - the selenium zero-padding comment
- **Wrong:** `WorkflowInvocationSteps.test.ts:64` "jsdom has no scrollIntoView" — the env is happy-dom, which has it. It goes away with the unit-test fix above.
- **Carried-over nit:** `composables/invocationSelection.ts:122` "full steps include labels before scheduling" is still cryptic. Suggested rewrite: "Invocation steps lack labels until scheduled; the full workflow always has them."

</details>

## If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve?

N/A

## Which existing workflows change behavior (if any)?

PASS: the success-banner regression is fixed. The remaining changes are intended, and the PR should list them.

<details>

**Banner (fixed):** `WorkflowInvocationState.vue:73` captures `props.success` once and passes it as `:success="justInvoked"` (`:326`). The flag still leaves the URL, so share links stay clean, and the banner survives the reuse-on-query-change. A non-reactive capture is safe: an invocation-id change is a path change, and `Analysis.vue` keys the router view on `route.path` for reuse routes, so the page remounts and recaptures. eslint-plugin-vue 10 has no setup-props-destructure rule to trip.

**GenericItem scrolling (new behavior, scoped to this branch):**

- `scrollOnExpand` does not exist on base (`git show 195bbc6c7e0:…/GenericItem.vue`). The change from `nearest` to `start` therefore touches no pre-existing consumer. Only the two output lists in `WorkflowInvocationStep.vue` and the workflow outputs tab use it.
- **`userToggled` correctness: PASS.**
  - The flag is set in `setExpanded` (`:37`) and `onViewCollection` (`:136`), and is consumed and reset on every `expanded` prop change (`:69-70`).
  - Both consumers mirror every user toggle into the prop: `WorkflowInvocationInputOutputTabs.selectOutput`, and `WorkflowInvocationStep.selectOutput` (`:271`).
  - The one collapse that `WorkflowInvocationStep.selectOutput` ignores (`!expanded && stepIndex !== this step`) only happens when the prop is already false. The item can't be expanded under a different step selection, so the flag can't go stale today.
  - Uncontrolled uses (ParameterStep, WorkflowInvocationError, embedded views without selection) pass `expanded === undefined` and never scroll.
  - The collection drill-in (`onViewCollection`) is a user toggle and is correctly marked. Nested element expansion lives in GenericElement and never reaches this flag.
- **Caveats:**
  - (a) The invariant "the parent always echoes the emit into `expanded`" is implicit. A future consumer that ignores `update:expanded` would leave the flag set and silently suppress the next URL-driven scroll. A one-line note on the prop, or resetting the flag on `nextTick` after the emit, would make it robust.
  - (b) The flag is per-instance. A remount re-runs the immediate watcher and scrolls again with `block: "start"`, for example collapsing and re-expanding a step card, or the GTabs `:key` rebuild when a running step gains outputs. Today that only affects the URL-selected output.
  - (c) The skip path is untested (see the unit-test item).

**Terminal guards (new behavior; could they strip a valid target?):**

- **Subworkflow steps: PASS.** `stepIsTerminal` is true once a subworkflow step is `scheduled` with no jobs. Its outputs are recorded in the same `SubWorkflowModule.execute` call that schedules it (`lib/galaxy/workflow/modules.py`, `progress.set_step_outputs` after `subworkflow_invoker.invoke()`), so `output=` keys exist by then. A `step_tab=jobs` on a subworkflow step is correctly cleared, since only tool steps have a Jobs tab.
- **Collection outputs: PASS.** Checked against `details.output_collections` as well as `details.outputs`.
- **Mapped and single-job steps: PASS.** Job ids are checked against `details.jobs`. A tool step is `scheduled` only after its jobs exist, and paused counts as terminal but keeps its job.
- **Workflow-output guard vs. step-output links: PASS.** `WorkflowInvocationInputOutputTabs` mounts only on the `inputs` or `outputs` path (`WorkflowInvocationState.vue` ~`:498`), and the guard also requires `props.tab === "outputs"`. An overview `?step_label=…&output=…` link is never seen by it.
- **Input steps:** an `output=output` link on a data-input step is a valid key, so it stays in the URL, but that card never renders a selectable output. Cosmetic.

**Other intended changes (unchanged from the previous evaluation; list them in the PR):**

- Selection writes the URL via `router.replace`.
- Query changes no longer remount the invocation page.
- A retained `activeNodeId` is written into a bare URL on revisit and skips the initial `fitWorkflow`.
- Step Config loads from a watcher.
- Subworkflow error links carry `step_index`.
- Share copies `route.fullPath`.
- Embedded views are unchanged.
- **Unverified UX note (from `c978b652038`, not these commits):** any interaction in a non-selected card on the Steps tab sets `stepIndex`, such as a tab click (`selectedTab` setter) or an output expand (`selectOutput`). The `WorkflowInvocationSteps.vue:103-120` watcher then scrolls that step's header to `block: "start"`, so the list may jump under the user's click. Worth a quick manual check.

</details>

## Who hits this in practice and what is the evidence?

JUDGEMENT-CALL: the evidence is thin and author-driven. John filed the issue, the AI drafted it, and it has 0 comments and 0 reactions.

<details>

- The issue argues from use cases: pointing a colleague at a failing mapped job, citing a result in notes, tickets or methods sections, and jumping to the same step in another run.
- It extends #20719, which made the invocation tabs routable after a user request in #20133.
- It fixes a TODO left in the code (subworkflow error target dropped in `WorkflowInvocationOverview.vue`).
- It unblocks two planned proposals that need step links: an "all runs of this step" table, and rerunning with one step's parameters edited.
- No external user report asks for these exact deep links.

</details>

## Were simpler or existing approaches considered? If yes, describe which and why they weren't pursued. If no, why not?

Yes, see `scope_evaluation.md`.

<details>

- **Step selectors only:** drops the failed-job and result-sharing cases.
- **Recombine prep and feature:** reverses the approved split.
- **Shared semantic GTabs identities, or job-only links:** broader API and migration burden. The issue defers job-only links.
- **Move GenericItem's controlled-expansion API into prep:** it would have no consumers there.
- **Reuse of existing pieces:** the existing `activeNodeId` store state, the `getFullWorkflowCached` cache, and the `/reports?id=` query precedent.
- **The new commits stay in the same vein:** the banner fix reuses the existing `success` prop instead of adding route state, and the terminal guards reuse the existing `stepIsTerminal` and `invocationAndJobTerminal` signals.

</details>

## Addendum — after `a161b912cd7` and `c69f43e3222`

- **Unit tests not just testing the literal implementation: now PASS.** The `scrollIntoView` stub and its `afterEach` delete are gone (happy-dom implements it), and GenericItem calls `scrollIntoView` directly. New behavioral tests, each red without its fix: GenericItem scrolls for externally expanded items but not user toggles; Share copies the routed selection; subworkflow error links carry `step_index`; the browser test asserts `job` leaves the URL when the dialog closes.
- Other verdicts unchanged.
