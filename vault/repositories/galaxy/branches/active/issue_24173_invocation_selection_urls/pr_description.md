Implement 🎯 #24173 - every step, job and output you select in the workflow invocation view now has a link you can share.

| `…?step_label=mixed_collection&job=<id>` | `…?step_label=cat_11&output=out_file1` | `…/steps?step_number=26` |
|---|---|---|
| ![Mapped-over job's state filter and page opened from a link](screenshots/invocation_mapped_job_table.png) | ![Step output opened from a link](screenshots/invocation_step_output_url.png) | ![Steps list scrolled to step 26](screenshots/invocation_steps_url_scrolled.png) |
| One of a step's 12 successful mapped-over jobs (it also has a failed one). The graph centers on the step and the Jobs tab opens filtered to "successful", on page 2 where the job is, with its [job dialog](screenshots/invocation_mapped_job_step_label.png) open (closed here to show the table). | The step's Outputs tab opens with `out_file1` expanded and scrolled into view. `/outputs?output=<label>` does the same for [workflow outputs](screenshots/invocation_workflow_output_url.png). | The Steps tab opens with step 26 expanded and scrolled into view. The run here is still scheduling, which is why its card has no details yet. |

On `dev`, the address bar stays at `/workflows/invocations/<id>` whatever you select, and the Share button copies that bare link. To point a colleague at "the failed job in step 7", you tell them to find step 7 in the graph, open Jobs, pick the "failed" filter, page through ten at a time and click the right row. The alternative is the standalone `/jobs/<id>/view` page, which drops which run, which step and which of N jobs it was.

Now the selection lives in the query string and stays current as you click, so copying the URL, Share, or a reload keeps it. A step can be named three ways: `step_number` (the "Step N" in the UI), `step_index` (`order_index`, for links built from API data) or `step_label` (readable). An invocation is pinned to one workflow version, so number and index links to it never shift; a label also finds the same step in runs of other versions. `step_tab`, `job` and `output` pick the card tab, job and output. Copied links use the label when the step has a unique one, otherwise the number. ***Selecting replaces the current history entry, so Back leaves the invocation instead of replaying your clicks.***

***Only the routed invocation page reads or writes the URL. Invocations embedded elsewhere (the invocation list, subworkflow cards) keep their local selection, and the job page's "Workflow Invocation" link stays bare (finding a job's step from the job alone is a follow-up, as the issue proposes).*** ***There is no server or REST API change; the new contract is six query keys on the existing `workflows/invocations/:invocationId/:tab?` route, behind the same access checks.*** ***A bare invocation link opens exactly as on `dev`.***

***The first four commits are 🌿[`issue_24173_invocation_selection_prep`](https://github.com/jmchilton/galaxy/tree/issue_24173_invocation_selection_prep) (order-index step lookup, measured graph centering, and test fixes). They show in this diff until that branch merges.*** Of the feature's +1,600 lines, about two thirds are tests.

<details><summary>What changes</summary>

- **Selection state.** `composables/invocationSelection.ts` parses and writes the query. `provideInvocationSelection` runs only on the routed page and provides `stepIndex`, `stepTab`, `job` and `output` to its descendants. `stepIndex` is the invocation graph's existing `activeNodeId`, so graph clicks, Prev/Next, search and error "view step" buttons all update the URL without new wiring.
  - Step selectors resolve in order `step_index`, `step_number`, `step_label`. A label must match exactly one step, and a numeric label is never read as a position. Unknown or malformed step selectors are ignored and removed on the next write.
  - Labels come from the full workflow (the same cached request the graph makes), so a label link works before the invocation finishes scheduling.
  - Writes use `router.replace`, so Back leaves the invocation or returns to the previous tab rather than replaying clicks. Tab changes still `push`.
  - `success` is dropped on the first write so a shared link doesn't show the "Successfully invoked workflow" banner again. The page keeps the banner it mounted with.
- **No remount on query change.** The Analysis layout keys its `<router-view>` on `route.fullPath`. The invocation route now sets `meta: { reuseOnQueryChange: true }` and is keyed by path, so a click doesn't rebuild the page. Other routes, including the legacy `/workflows/invocations/report?id=`, still remount per URL.
- **Step card tabs.** `WorkflowInvocationStep.vue` binds its `GTabs` by name (`jobs`, `outputs`, `config`) and maps names to the tabs the step actually shows. Step Config loads from a watcher instead of the tab's click handler, so a `step_tab=config` link loads it too.
- **Jobs.** `JobStep.vue` sets the state filter to the linked job's state. `JobStepJobs.vue` opens its dialog for the selected job and already moves to its page. Prev/Next update `job`, and closing the dialog removes it.
- **Outputs.** `GenericItem.vue` takes an optional controlled `expanded` prop (undefined keeps today's behavior for every other caller) and `scroll-on-expand`. A target expanded from the URL loads even when it starts off screen, and is scrolled so its top is in view. An item you click yourself isn't scrolled.
- **Steps tab.** Expanding a step in the list selects it in the URL. A step selector expands that step in the list, opening the grouped "Workflow Inputs" section first for an input, and scrolls to it.
- **Unresolvable targets.** Once a step is terminal, a `job`, `output` or `step_tab` it can't show is removed from the URL, so Share never copies a selection the page isn't showing. The same goes for workflow outputs once the invocation is terminal. While a step is still running, its link stays, because the job or output may yet appear.
- **Consumers.** Share copies the current URL. A subworkflow error's jump now passes the failing step as `step_index`. The old comment noted it "could be used to highlight a specific step".

</details>

## Risks

One-way door: the six query keys (`step_index`, `step_number`, `step_label`, `step_tab`, `job`, `output`) become link syntax that people paste into tickets, notes and papers, and they are hard to rename afterwards.

<details><summary>Risk Details</summary>

- The key names and semantics are public once links circulate. `step_number` is 1-based, `step_index` is `order_index`, `step_tab` values are `jobs`/`outputs`/`config`, and workflow outputs are addressed by label or the server's `"<output> (Step N)"` fallback key.
- `meta.reuseOnQueryChange` is a new router convention in the Analysis layout. A route that opts in must react to query changes itself.
- The invocation page no longer remounts on query changes. Any child that read the query once at setup would now go stale. The report tab's `?id=` notebook switching is covered by the prep branch's real-router test.
- Returning to the Overview with a step remembered in the store writes it into the bare URL, and the graph centers on that step instead of fitting the whole workflow.
- An unknown selector shows no message: the view opens with nothing selected (or the step without that job, output or tab), and the key is removed from the URL.
- The step card's tab binding goes through a keyed `GTabs` rebuild with guards, because `GTabs` assigns indices by registration order and emits index changes while children unregister. That is local to the card; giving `GTabs` named tabs would change every consumer, which #24173 doesn't need.

</details>

<details><summary>Risk Review Advice</summary>

Review the query contract as API surface: names, precedence, how labels are chosen when writing, and what happens to unknown values. In code, the selection composable and the card's tab adapter in `WorkflowInvocationStep.vue` deserve the closest reading. The adapter guards `GTabs`' index callbacks during rebuild and teardown, and a mistake there would show up as the wrong tab or a reselected old card.

</details>

## Context

Extends 🔀 #20719, which made the invocation tabs routable for 🎯 #20133; this carries the selection inside a tab into the URL too. Builds on 🔀 #17413 (invocation graph) and 🔀 #22144 (Step Config tab), and makes the 🔀 #19959 Share button carry the selection. Stacked on 🌿[`issue_24173_invocation_selection_prep`](https://github.com/jmchilton/galaxy/tree/issue_24173_invocation_selection_prep), which resolves invocation steps by `order_index` instead of array position (guarding against 🎯 #18101-style misordered steps) and waits for measured graph bounds before centering a step.

## Agentic Checks

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>Keep the full issue contract above the separate prep branch; no expansion or contraction recommended.</summary>

Rejected alternatives: shipping only step selectors and deferring jobs and outputs (drops the failed-job and result-sharing cases the issue leads with); recombining prep into this branch (a larger review diff for no added capability); redesigning `GTabs` around semantic names, or linking an invocation from a job id alone (broader API and migration work the issue defers); moving `GenericItem`'s controlled expansion into prep (it would land without a consumer).

</details>

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>One P2 fixed: query reuse was scoped to the invocation route by metadata instead of a URL prefix.</summary>

The first version kept the component alive for any `/workflows/invocations/` path. That also covered the legacy `/workflows/invocations/report?id=` page, which loads its report once and would have kept showing report A after navigating to report B. The route now opts in with `meta.reuseOnQueryChange`. The review also accepted the selection composable as the ownership boundary, the reuse of the graph's `activeNodeId` instead of a second selected-step model, `GenericItem`'s optional controlled mode, and the card-local `GTabs` adapter. The change pushes no file past 1,000 lines.

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>Layout-dependent checks moved to browser tests; component tests kept for behavior the browser scenario can't reach.</summary>

Graph centering and list scrolling are asserted in real browsers (centered within 5px for all three selector forms; step 26 in the window), not with faked jsdom geometry. Both were confirmed to fail with their fix removed. Component tests that duplicated the browser scenario were removed. What remains covers selector precedence and malformed input, labels that load after the invocation, inactive-card isolation, tab rebuild while outputs arrive, embedded views, and disposal, using a real router, Pinia, `GTabs` and MSW where those interactions matter.

</details>

## John's Checklist

- [ ] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? The view opens with nothing selected, or with the step but without the missing job, output or tab, and the unresolved key is removed from the URL. No error message is shown.
  <details>

  - Unknown, malformed or ambiguous step selectors are dropped on the first write.
  - A `job`, `output` or `step_tab` the step can't show is dropped once the step is terminal (workflow outputs: once the invocation is terminal). While running, it stays.
  - `job` without a valid step selector is ignored.
  </details>
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. They drive the composable through a real router and Pinia, and the components through real `GTabs` and MSW. Layout behavior is asserted in browser tests.
- [x] Are baseline tests in their own leading commits (if applicable)? Yes. Baselines for pre-existing behavior live in the prep branch's commits.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A
- [x] Which existing workflows change behavior (if any)? Workflow runs, scheduling and the API are untouched. In the invocation view, selections now update the URL, query changes no longer remount the page, Share copies the selection, and subworkflow error links carry the step.
- [x] Who hits this in practice and what is the evidence? Anyone sharing or citing part of a run: debugging a failed mapped-over job with a colleague, citing a result in notes or a ticket. The subworkflow-error code carried a TODO for highlighting the step, and the issue lists two planned proposals that need step links ("all runs of this step", rerun-with-edits landing on a step). 🔀 #20719 made tabs linkable for 🎯 #20133; this is the next level down.
- [x] Were simpler or existing approaches considered? Yes. A single `step` key has to pick one meaning, and a label can be `"7"`. Path segments would compete with `:tab`. Linking standalone job and dataset pages loses the run context. Deferring jobs and outputs drops the issue's main cases.

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Tests</summary>

- Browser (`test_workflow_invocation_details.py`):
  - `test_mapped_job_selection_urls`: `step_number`, `step_index` and `step_label` each open the same mapped-over job on page 2 with the right state filter and center the node. Prev updates `job`, closing the dialog removes it, and clicking another node rewrites the URL without remounting.
  - `test_output_urls_expand_outputs`: step and workflow output links expand the named output and scroll it into the window.
  - `test_step_url_scrolls_steps_list`: a 26-step invocation opened at step 26 scrolls it into the window.
- Browser (`test_workflow_run.py::test_simple_execution`): after a run, `success` is gone from the URL and the banner is still mounted.
- Client: `invocationSelection.test.ts` (parsing, precedence, label choice, delayed labels, embedded views, disposal), `WorkflowInvocationStepSelection.test.ts` (card scoping, named tabs, config loading, dropping unresolvable targets), `JobStepSelection.test.ts`, `WorkflowInvocationInputOutputTabs.test.ts`, `WorkflowInvocationSteps.test.ts`, `GenericItem.test.ts` (scrolls for links, not for clicks), `WorkflowInvocationShare.test.ts` (copies the selection), `WorkflowInvocationOverview.test.js` (subworkflow error links carry the step).

</details>

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
