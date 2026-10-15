# Debrief: invocation_deep_links

Source: `local/invocation_step_deep_link.md`, which proposed `?step=<order_index>` only. John widened the scope to cover steps, jobs, inputs and outputs: everything you can select in the invocation view should have a URL. Result: `proposed_invocation_deep_links.md`. Nothing was posted, committed or pushed. The Galaxy checkout was only read, through `origin-https/dev` at `36fe2ce8428`.

## Research

- **Nothing exists today, even partially.** No client code reads `step`, `job` or `output` from the query. The only query state on the invocation route is `success` and the Report tab's `/reports?id=<page>`, which is the precedent for keeping in-tab state in the query.
- **Where the selection lives:**
  - The selected node is `activeNodeId` in the scoped store `invocation-<id>`, and it equals `order_index`. It is set by graph clicks, Prev/Next, `WorkflowInvocationSearch` and the invocation error "view step" button.
  - The card tabs are an uncontrolled `GTabs`. Step Config is fetched in the tab's `@click`.
  - For jobs, `JobStep` keeps the state filter, page and sort in local refs, and `JobStepJobs` keeps the modal's job in a local ref.
  - `GenericItem` has no prop for starting expanded.
- **API keys:**
  - `inputs` is keyed by `order_index`, which led to the decision that an input is just its step.
  - `input_step_parameters` is keyed by label, falling back to `"N: Unnamed parameter"`.
  - `outputs` and `output_collections` are keyed by workflow output label, falling back to `"<name> (Step N)"`, which is 1-based.
- **Numbering:** the UI shows 1-based step numbers everywhere (`getStepTitle`), while `order_index` is 0-based.
- **Consumers that build bare links today:** the Share button (#19959), the "Workflow Invocation" row in `JobInformation`, and `WorkflowInvocationOverview.showSubworkflowInvocation`. The last one has a code comment saying the stepId "could be used to highlight a specific step".
- **Embedded copies:** `GridInvocation` rows embed `WorkflowInvocationState`, so the URL must be read and written only by the routed view.
- **Standalone routes:** `/jobs/:jobId/view` and `datasets/:datasetId/:tab?` exist. Collections only have edit and sheet routes.
- **GitHub:** searched for deep link, permalink, invocation step url, shareable invocation, job link and invocation tab url. No duplicate.
  - Related: #20133, which asked to "send someone directly to" the report or metrics. #20719 fixed it with routable tabs; this proposal is the next level down.
  - Also related: #21101 (release testing of invalid tabs), #18101 (imported invocations with misordered steps), and #22144 / #21086 (the Step Config tab).
  - No open PRs touch this area.

## Design decisions

- **Query params, not path segments.** `:tab?` already uses the next path segment, and step + job / step + output need to combine.
- **Three explicit step keys (John, 2026-10-14):** `step_index` (0-based `order_index`, for links built from API data), `step_number` (1-based, matching the "Step N" titles), `step_label` (readable, stable across position-shifting edits). Precedence `step_index` > `step_number` > `step_label`; each resolves to `order_index` at the route boundary. Write-back prefers `step_label`, else `step_number`. This replaced the agent's single 1-based `step` key; the "one `step` key" option is now the documented alternative (overloading by value type breaks on numeric labels).
- **`step_tab`** names the card tab, because `tab` is taken by the path param. `job=` implies the Jobs tab and `output=` implies the Outputs tab.
- **`job` requires a step key.** Mapped-over jobs are only known from the per-step fetch. Resolving a link from `job` alone is a follow-up, and it would also let the job page link into context.
- **Outputs:**
  - A step output is `?step_number=N&output=<output name>` (or either other step key).
  - A workflow output is `/outputs?output=<label>`, matching Markdown's `output="<label>"`.
- **Inputs** are steps, so they need no new key.
- **`router.replace` for selections, `push` for tab changes.** This keeps the address bar shareable without the back button replaying clicks.
- **In context vs standalone.** An in-context link answers "where does this sit in the run". Standalone pages stay as the new-tab links they already are.

## Review (one fresh subagent, one round)

- **Pushback, verified by me:** `Analysis.vue` keys `<router-view>` on `route.fullPath` (except `/galaxyai`), so every `router.replace` would remount the invocation page and reset the card tab, job filter and open dialog. The approach now keys this route on `route.path`. I added a check that the Report tab's `?id=` still switches notebooks without a remount.
- **Fixes:**
  - Steps do have a `/steps` tab, so a Steps-tab row was added and the path-segment argument rewritten.
  - Invalid values are ignored, not dropped.
  - A dangling "see open questions" was removed.
  - The Step Config fetch must move from `@click` to a watcher.
  - `GTabs` `v-model` is a position, so tab names must map to the tabs actually rendered.
  - The subworkflow jump passes a placeholder `0` for subworkflow steps in the path, and those must stay bare.
  - The #18101 claim was softened.
  - Line anchors were corrected.
  - #20133 is now cited.
- **I softened one claim:** "collections have no standalone page" is now "no view page, only edit and sheet pages".

## Not verified

- No browser run. Behaviour claims come from reading the code.
- `GTabs` `v-model` being position-based is inferred from two call sites. The library source isn't in the checkout.
- The root cause of #18101, and whether positional lookup actually misfires on dev today.
- Whether keying on `route.path` breaks anything else on this route beyond the Report tab check.

## Open questions for John

1. ~~Should `step` be 1-based or raw 0-based `order_index`?~~ Decided: `step_label`, `step_index` (0-based) and `step_number` (1-based).
2. Keep the Steps-tab row, or drop it to make the issue smaller?
3. ~~Accept step labels as an alias now, or later?~~ Decided: now, as `step_label`. Unverified: whether Galaxy enforces unique labels per workflow version; ambiguous labels are ignored either way.
4. Is changing the `<router-view>` key in scope here, or should it be a separate prep PR?
