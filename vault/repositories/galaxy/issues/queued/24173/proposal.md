# Give every step, job and output selected in the invocation view a shareable URL

Whatever you select in the workflow invocation view, the address bar keeps showing `/workflows/invocations/<id>`, so you can't send a colleague a link to "step 7 of this run", a single failed job of a mapped-over step, or one output.

The links we want, for an invocation whose steps are shown as "Step 1" … "Step 12" in the UI:

| Thing | Link | What opens |
| --- | --- | --- |
| A step, by number shown in the UI | `/workflows/invocations/<id>?step_number=7` | Overview, graph scrolled to the node, node active, "Step 7" card open below |
| The same step, by `order_index` | `…?step_index=6` | Same. For links built by code from API data, which is keyed by `order_index`. |
| The same step, by label | `…?step_label=trim_reads` | Same. Readable, and survives a workflow edit that shifts step positions. |
| A tab of a step's card | `…?step_number=7&step_tab=config` (`jobs` · `outputs` · `config`) | Same, with that card tab selected; Step Config loads as if clicked |
| One job of a mapped-over step | `…?step_number=7&job=<job id>` | Jobs tab, filtered to that job's state, on the page that contains it, with its job details dialog open |
| One output of a step | `…?step_number=7&output=out_file1` | Outputs tab of the card, that output scrolled to and expanded |
| A workflow input | `…?step_number=1` (or its label) | The input step's card, which already shows the dataset, collection or parameter value. An input is a step; no new key. |
| A workflow output | `/workflows/invocations/<id>/outputs?output=counts` | Outputs tab, the output labelled `counts` scrolled to and expanded |
| A step in the Steps tab list | `/workflows/invocations/<id>/steps?step_number=7` | Steps tab, "Step 7" expanded and scrolled to |
| A step inside a subworkflow | `/workflows/invocations/<subworkflow invocation id>?step_number=3` | Already its own invocation; works without extra keys |

Today each of these links is the bare invocation URL. The recipient lands on the Overview with nothing selected and has to find step 7 in the graph, open its Jobs tab, pick the "failed" filter, page through the jobs ten at a time and click the right row. Their only other option is to swap the invocation for standalone `/jobs/<id>/view` and `/datasets/<id>/…` pages, which lose which run, which step and which of N jobs the item belonged to.

Users want a stable address for each thing in a run: to point a colleague at the failing job, to cite a result in notes, a ticket or a paper's methods, and to jump from one run to the same step in another. The view already keeps this state; it just never reaches the URL. The Share button copies the bare link. The job page's "Workflow Invocation" row links to the bare invocation. When an invocation error says the problem is in a subworkflow, the user is sent to the subworkflow invocation, but [the step to highlight is dropped](https://github.com/galaxyproject/galaxy/blob/36fe2ce8428611a56625aa9eb0a9de5a8c3ad9ac/client/src/components/WorkflowInvocationState/WorkflowInvocationOverview.vue#L46-L51) with a note that "the stepId parameter could be used to highlight a specific step".

Selecting things should keep the address bar current, so copying the URL or using Share always gives the current selection, and reloading the page keeps it.

<details><summary>Where the selection lives today (dev <code>36fe2ce8428</code>)</summary>

- The route `workflows/invocations/:invocationId/:tab?` ([`router.js`](https://github.com/galaxyproject/galaxy/blob/36fe2ce8428611a56625aa9eb0a9de5a8c3ad9ac/client/src/entry/analysis/router.js#L826-L837)) passes `invocationId`, `tab` and `success` only. The Report tab already uses a query parameter for in-tab state (`/reports?id=<page id>`).
- The route sits under the Analysis layout, whose `<router-view>` is [keyed on `route.fullPath`](https://github.com/galaxyproject/galaxy/blob/36fe2ce8428611a56625aa9eb0a9de5a8c3ad9ac/client/src/entry/analysis/modules/Analysis.vue#L56) for every route except `/galaxyai`. Any change to the query remounts the whole invocation page.
- The selected graph node is `activeNodeId` in the invocation's scoped workflow state store (`invocation-<id>`). It is the step's `order_index`, which is also the key of `workflow.steps`. It is set by graph clicks, the card's Prev/Next buttons, the header search ([`WorkflowInvocationSearch.vue`](https://github.com/galaxyproject/galaxy/blob/36fe2ce8428611a56625aa9eb0a9de5a8c3ad9ac/client/src/components/WorkflowInvocationState/WorkflowInvocationSearch.vue)) and the "view step" buttons of invocation error messages. Nothing reads it from or writes it to the route.
- The step card's Jobs / Outputs / Step Config tabs are an uncontrolled `GTabs` in [`WorkflowInvocationStep.vue`](https://github.com/galaxyproject/galaxy/blob/36fe2ce8428611a56625aa9eb0a9de5a8c3ad9ac/client/src/components/WorkflowInvocationState/WorkflowInvocationStep.vue). Jobs and Outputs are only rendered for some steps. Step Config loads its form from the tab's `@click` handler when the graph step doesn't already carry it. The Steps tab renders the same component once per step, each expanded or collapsed locally.
- For a mapped-over step, [`JobStep.vue`](https://github.com/galaxyproject/galaxy/blob/36fe2ce8428611a56625aa9eb0a9de5a8c3ad9ac/client/src/components/WorkflowInvocationState/JobStep.vue) keeps the state filter, page and sort order in local refs. [`JobStepJobs.vue`](https://github.com/galaxyproject/galaxy/blob/36fe2ce8428611a56625aa9eb0a9de5a8c3ad9ac/client/src/components/WorkflowInvocationState/JobStepJobs.vue) keeps the job shown in its details dialog as a local ref and already switches to the page containing that job; each row also links to `/jobs/<id>/view` in a new tab. A single-job step shows its job details inline.
- The step card's Outputs tab lists the step's outputs by output name. The Outputs tab of the view ([`WorkflowInvocationInputOutputTabs.vue`](https://github.com/galaxyproject/galaxy/blob/36fe2ce8428611a56625aa9eb0a9de5a8c3ad9ac/client/src/components/WorkflowInvocationState/WorkflowInvocationInputOutputTabs.vue)) lists workflow outputs by their label. Both use `GenericItem`, whose expanded state is internal, so it always starts collapsed.
- In the API ([`WorkflowInvocation.to_dict`](https://github.com/galaxyproject/galaxy/blob/36fe2ce8428611a56625aa9eb0a9de5a8c3ad9ac/lib/galaxy/model/__init__.py#L10427-L10486)), invocation inputs are keyed by the input step's `order_index`. Outputs are keyed by workflow output label, falling back to `"<output name> (Step N)"` with the same 1-based N the UI shows.
- The Share button ([`WorkflowInvocationShare.vue`](https://github.com/galaxyproject/galaxy/blob/36fe2ce8428611a56625aa9eb0a9de5a8c3ad9ac/client/src/components/WorkflowInvocationState/WorkflowInvocationShare.vue)) and the job page's invocation row ([`JobInformation.vue`](https://github.com/galaxyproject/galaxy/blob/36fe2ce8428611a56625aa9eb0a9de5a8c3ad9ac/client/src/components/JobInformation/JobInformation.vue)) both build the bare invocation URL.

</details>

## Context

An extension to 🔀 #20719, which made the invocation tabs routable for 🎯 #20133 ("send someone directly to a workflow's invocation report or job metrics"); this carries the selection inside a tab into the URL too. It builds on 🔀 #17413 (invocation graph) and 🔀 #22144 (Step Config tab, part of 🎯 #21086), and makes the 🔀 #19959 Share button more precise. Two planned proposals depend on step links: an "all runs of this step" table whose rows open the same step in another invocation, and rerunning an invocation with one step's parameters edited, which lands the user on that step of the new invocation.

## Proposed Approach

Read the selection from query parameters on the invocation route and keep it there. A step can be named three ways: `step_index` (0-based `order_index`, what the API and graph use), `step_number` (1-based, matching the "Step N" titles) and `step_label` (the step's label). Jobs are identified by encoded id, step outputs by output name and workflow outputs by label (`job`, `output`, `step_tab`). Key the Analysis `<router-view>` on `route.path` for this route, as `/galaxyai` already is, so query changes no longer remount the page. On load, the routed view applies the query once the graph and step details are ready, and again whenever the query changes. Afterwards, a single watcher on the scoped store's `activeNodeId`, and on the card tab, job dialog and output selections, writes them back with `router.replace`. Only the routed page reads and writes the URL; copies embedded elsewhere, such as rows in the invocation list, are left alone. The Share button copies the current URL.

<details><summary>Approach details</summary>

- **Step keys.** An invocation is pinned to one workflow version, so `order_index` is unambiguous within it.
  - `step_index` is the raw `order_index`: no conversion for code that builds links from API data (invocation inputs and steps are keyed by it).
  - `step_number` is `order_index + 1`, the number in the step titles ("Step 7" ↔ `step_number=7`), the "Step 2 → Step 5" paths in invocation errors and the API's fallback keys for unlabeled outputs. It's the form for hand-edited or quoted links.
  - `step_label` matches what Galaxy Markdown already uses (`step="<label>"`) and keeps pointing at the same step when an edit shifts positions, which matters for links between runs of different workflow versions. A label that matches no step, or more than one, is ignored like any unknown value.
  - If more than one is given, `step_index` wins, then `step_number`, then `step_label`. Each is resolved to an `order_index` once, at the route boundary.
  - When writing the URL back, use `step_label` if the step has one, otherwise `step_number`, so copied links are readable. Code that builds links uses whichever key it has.
- **Other keys.** Job ids are already global. Output names are unique within a step. Workflow output labels are unique within a workflow, and Galaxy Markdown reports already address outputs with `output="<label>"`. The query key is `step_tab` because `tab` is the route's path parameter.
- **No remount.** Today every query change rebuilds the page, which would reset the card tab, the job filter and the open dialog on each click. Keying by path keeps tab switches remounting as they do now; check that the Report tab's `?id=` still switches notebooks without a remount. The workflow editor needed a similar guard (`skipNextReload`) before it could keep its `version` query parameter in sync with `replace`.
- **History behavior.** Selections inside a tab use `replace`; tab changes keep using `push`, as they do now. Back leaves the invocation, or returns to the previous tab, instead of replaying 20 node clicks.
- **Leaving and returning.** The tab links drop the query, but the scoped store keeps `activeNodeId`. When the Overview mounts with no step key but an active node, write it to the URL so the two stay in agreement. Unknown or out-of-range values are ignored, as unknown tabs are, and removed on the next write. Drop `success` on the first `replace` so a shared link doesn't repeat the "just ran" header.
- **Card tabs.** Bind the card's `GTabs` with `v-model`, as other components already do. Its value is a position, and Jobs and Outputs are only rendered for some steps, so map the `step_tab` names to the tabs actually shown. Move the Step Config fetch from the tab's `@click` to a watcher on the selected tab, so a link loads it too.
- **Jobs.** `job` requires a step key. Steps list a `job_id` only for single-job steps; mapped-over jobs come from the per-step fetch the card already makes. Landing on a job sets the state filter to its state and opens the dialog; `JobStepJobs` already moves to the page that contains it. Prev/Next in the dialog updates `job`, and closing the dialog removes it. On a single-job step, `job` changes nothing.
- **Outputs.** Add an "initially expanded" option to `GenericItem` and scroll the item into view. Unlabeled workflow outputs keep the server's fallback key; it is ugly but stable.
- **Steps tab.** A step key on the Steps tab expands that step and scrolls to it, opening the grouped "Workflow Inputs" section first when it targets an input; the most recently expanded step is the one in the URL.
- **Consumers to update in the same change:** the Share button, and the subworkflow jump from invocation errors, which can pass the failing step. That jump also fires with a placeholder step `0` for subworkflow steps in the path; those must stay bare links. The job page's "Workflow Invocation" row knows the job but not its step, so it stays a bare link; resolving a step from `job` alone is a follow-up.
- **Lookup by `order_index`.** The card and graph look up invocation steps by array position (`invocation.steps[activeNodeId]`), which matches `order_index` only while every step is present and in order. Each step already carries its `order_index`; look it up by that so a link can't open the wrong card (🎯 #18101 reports misordered steps on imported invocations).
- **Tests.** Client unit tests for parsing and writing the query. One end-to-end test that opens `?step_number=N&job=<id>` on a mapped-over step, resolves the same step via `step_index` and `step_label` and asserts that the card and job dialog are shown, then clicks another node and asserts the URL changed without the page reloading.

</details>

## Alternative Approaches

We could use a single `step` key, add path segments, or just link the standalone job and dataset pages. A single key has to pick one meaning, and every choice is wrong for someone: labels are optional, `order_index` is off by one from every number Galaxy shows, and the 1-based number needs converting by every client building links from API data. Overloading one key by value type is ambiguous, since a label can be `"7"`. Path segments would compete with the existing `:tab` parameter. Standalone pages lose the run context that makes a link useful. Three explicit step keys on the existing route add no routes, sit beside the Report tab's `?id=`, and leave the standalone pages as they are.

<details><summary>Alternatives In Detail</summary>

### Alternative: One `step` key

<details><summary>Description</summary>

#### Details

`?step=7`, meaning either the 1-based number, the raw `order_index`, or (when not numeric) a label.

#### Why the proposed approach is preferred

Each single meaning serves one audience badly. The 1-based number reads well but every client building links from API data must add one; the raw `order_index` is off by one from the page; labels are optional, so they can't be the only key. Guessing by value type breaks on numeric labels. Explicit keys cost nothing and say what they mean.

</details>

### Alternative: Path segments (`/workflows/invocations/<id>/steps/7/jobs/<job id>`)

<details><summary>Description</summary>

#### Details

These look tidier, and each would be a real route.

#### Why the proposed approach is preferred

`:tab?` already occupies the next path segment, and `steps` is already the Steps tab. The step card people want to share lives on the Overview, so nested routes would either duplicate tabs or redirect. Query parameters compose (step + job, step + output) without a route for each combination, and work on any tab.

</details>

### Alternative: Only link the standalone pages (`/jobs/<id>/view`, `/datasets/<id>/details`)

<details><summary>Description</summary>

#### Details

Those pages already exist, and the jobs table already opens them in a new tab.

#### Why the proposed approach is preferred

They answer "what is this object", not "where does it sit in this run": no graph, no step, no "job 37 of 400", no Prev/Next. Collection outputs have no standalone view page, only edit and sheet pages. Both kinds of link are useful, and the proposal keeps the existing new-tab links next to the in-context ones.

</details>

</details>
