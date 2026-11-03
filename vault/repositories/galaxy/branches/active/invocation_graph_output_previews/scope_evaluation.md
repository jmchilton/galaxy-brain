Run via claude-opus-5-5 at high effort.

**Recommendation: expand by one small fix, and keep everything else as implemented.** Add one commit that fixes the existing step-state derivation in `client/src/composables/useInvocationGraph.ts`, which this branch already touches. Today a step whose jobs are only `new` and `queued` reads as `ok` (performance finding A). After the fix, a step with any non-terminal job is never shown as terminal. A mix of only pending jobs (`new`, `queued`, `waiting`, `resubmitted`) becomes `queued`, and a mix of pending and finished jobs becomes `running`. Add those cases to the existing "step state" tests. Put the commit before the feature commits, so a reviewer can split it out. The preview depends on this state: without the fix it loads collections that are still filling, and while the popover is open it refetches the whole collection each time the state flips between `running` and `ok`. The step headers, the job counts and the Steps tab all show the same wrong green check. Everything else the debriefs raised stays out of this branch:
- Bounding large collections is a stage 2 requirement ("very large outputs" is in its brief).
- Trimming the step-details payload needs a backend change.
- A keyboard-focusable trigger is a UI decision for John (an unverified cheap path is noted below).
- Hovering the whole node and fixing subworkflow step state are new behaviour or a separate design.
- The stale-text-content gap is a shared-store bug that is broader than the graph.

## Possible Decompositions

The branch adds about 300 lines of production code and about 520 lines of tests and selectors in four commits. It is under 1,000 lines, so two layouts are enough. They are listed for John to decide on later, not as a recommendation.

**Option 1: one PR, in the commit order shown.**
1. `8366af2b2b6` Selenium helper `_open_invocation` (test-only refactor; the six existing tests behave the same).
2. *(If the recommendation is taken)* Step-state fix in `getStepStateFromJobStates` / `updateStep`, plus Vitest cases.
3. `9506e07804f` `GraphStep.outputItems` and `invocationStepId`, from the invocation payload, plus 4 Vitest cases.
4. `b1da79e2130` The popover, the preview, `useStepOutputItems` and the one-line `Node.vue` mount, plus Vitest.
5. `5fb3b314b52` The E2E hover test, the `navigation.yml` selectors and the `CollectionTree` `data-description` hook.

**Option 2: split the fix out, then the feature.**
- **PR A, the step-state fix.** Commit 2 alone. It stands on its own as a user-visible dev bug, so it could also target a release branch. The feature doesn't need it in order to work, but it is only correct with it.
- **PR B, the feature.** Commits 1 and 3–5 on `dev`. It can land after A or in parallel. Its unit tests pass without A, because no test drives a mixed-pending map-over.

A data-layer-only PR (commit 3 by itself) isn't listed as an option: it would add `outputItems` with no reader. The Selenium helper refactor is three lines and isn't worth its own PR.

## As implemented

Hovering a scheduled step's output terminals opens one tooltip-role popover. It previews every output the step produced:
- Datasets through the Markdown `HistoryDatasetDisplay`.
- Collections through `CollectionDisplay`.
- Workflow inputs and outputs come from the invocation payload. Other outputs come from one step-details fetch, refreshed when the step's state changes.
- A not-ready placeholder shows while the step's jobs run.
- Previews stay mounted between hovers.

| Pros | Cons |
|---|---|
| - Covers the whole stage 1 brief: datatype-dependent previews through existing components, with no new renderers<br>- Small footprint in shared code (`Node.vue` +8, `CollectionTree.vue` one attribute)<br>- Already shaped for stages 2/3 (`InvocationOutputPreview`, `outputItems`), with no unused hooks<br>- Freshness, request volume and per-poll cost were measured and fixed during hardening | - The not-ready logic trusts a step state that is wrong for mapped-over steps (finding A), so the "isn't ready" placeholder fails exactly where it matters most<br>- Preview controls (pagination, collection Download/Import, tree toggles) can't be reached by keyboard inside a tooltip-role popover<br>- A large collection's first hover downloads and renders every element |

## Scope A (recommended): also fix mapped-over step state

`getStepStateFromJobStates` returns a state only when some job is error/running/paused/deleting, or when all jobs share one state. Any other mix falls back to `populated_state`, which is `ok` for implicit-collection jobs once every job exists. The fix: if any job state is in `NON_TERMINAL_STATES`, return `queued` when every job is still pending, and `running` otherwise. Leave the `populated_state` fallback for all-terminal mixes.

| Pros | Cons |
|---|---|
| - A related bug in a file the branch touches, and its feature depends on it: the not-ready placeholder and the refetch churn while a popover is open<br>- Fixes the green check over "143 jobs new / 357 jobs queued" on the node, the step card and the Steps tab together<br>- About 10 lines plus 2–3 cases in the existing `useInvocationGraph — step state` block. The existing fallback tests use `{ ok: 1 }`, which stays terminal, so they still pass<br>- Measured on this branch's Galaxy (performance debrief, finding A) | - Changes the state shown for every map-over in every invocation view, not only in the popover<br>- A pending-plus-finished mix shown as `running` while no job is running is a judgement call (the alternative is `queued`)<br>- A reviewer may ask for it as its own PR (Option 2 above makes that cheap) |

<details>
<summary>Why the fallback goes wrong, and the state choice</summary>

`SINGLE_INSTANCE_STATES` is `error, running, paused, deleting` and `ALL_INSTANCES_STATES` is `deleted, skipped, new, queued`. So `{new: 249, queued: 251}` matches neither list and falls through to `populated_state`. The performance step's polls showed `ok` from the time scheduling finished until the first job started running. Once a job runs, `running` wins. Reading the code, the same thing happens again at the tail of a map-over: `{ok: 480, queued: 20}` reads as `ok` while 20 jobs are still waiting. That case wasn't measured. So the bug isn't limited to start-up. Calling the mixed case `running` matches what the header icon means ("in progress"). Calling it `queued` would show a clock on a step that is half done. Either way it is better than `ok`, which stops the preview's not-ready check and makes the open popover refetch on every flip.
</details>

## Scope B: bound large collection previews

Make `CollectionDisplay` page its elements through `/api/dataset_collections/{hdca}/contents/{parent}?limit&offset`, or show a summary (`element_count`) above a threshold (performance finding B).

| Pros | Cons |
|---|---|
| - A 10k-element list currently costs about 12 MB and about 18 s on first hover (extrapolated)<br>- Stage 2 multiplies this cost (one load per embedded collection on every page load) | - Changes the Markdown collection display that reports and Pages share, which is a separate review<br>- Stage 2's brief explicitly owns "very large outputs" and lazy loading, so doing it here pre-empts John's stack<br>- The cost on hover is user-initiated, once per hover, and has been cached since hardening fix 1 |

## Scope C: lighter step-details payload

Add a server option so that `GET /api/invocations/steps/{id}` leaves out `jobs` (finding C: about 240 B per job, about 2.4 MB at 10k jobs).

| Pros | Cons |
|---|---|
| - Makes the fallback fetch cheap for huge map-overs | - The first backend/API change in a client-only branch<br>- Fetched only when some output isn't a workflow output, and at most once per state change; the step card already shares the cache<br>- More valuable for stage 3's per-node reads, which need their own batched source anyway |

## Scope D: keyboard access to preview controls

Make the popover `interactive`, so its controls can be reached from the keyboard. That needs a focusable trigger: either a new per-node button, or an existing element. Alternatively, strip the controls from the previews: add an `embedded` mode to `CollectionDisplay` and drop the buttons.

| Pros | Cons |
|---|---|
| - Fixes a real APG mismatch: tooltip role with focusable content<br>- Galaxy's Selenium axe checks make accessibility visible to reviewers | - A new trigger is new UI on every node, which is John's call<br>- Removing controls fixes only the buttons: tabular pagination and the tree toggles are what make the previews useful<br>- The step card is already a keyboard route to the same outputs; the PR can say so |

<details>
<summary>A possibly cheap trigger, not verified</summary>

Each output terminal already contains a real `<button class="connection-menu-button">` (in `NodeOutput.vue`). It is focusable, and focusing it already opens the popover. If the popover targeted that button instead of the terminal `div`, then `aria-haspopup`/`aria-expanded` would sit on a button, which axe accepts. That could allow `interactive` without new UI. But the button's label ("Connect output … to input. Press space…") and its click handler (the editor's connection menu) are wrong in invocation mode. So this would mean relabelling it and checking what space/enter do in a readonly graph. It is worth a short probe only if John wants keyboard reach in stage 1. Otherwise mention it in the PR as a follow-up.
</details>

## Scope E: hover the whole node

Open the popover from anywhere on the node rather than only from the output terminals.

| Pros | Cons |
|---|---|
| - A larger target, and closer to the spike's issue wording | - Panning across the graph would open popovers constantly<br>- Competes with the node's own click (select, step card) and with the input terminals<br>- The brief says "hovering any output", which the terminals already satisfy |

## Scope F: real subworkflow step state

Derive a subworkflow step's state from its subinvocation or outputs, rather than from the invocation step's `scheduled` (the existing TODO in `updateStep`).

| Pros | Cons |
|---|---|
| - Would remove the preview's subworkflow special case, and let subworkflow previews refetch on change | - Needs extra data (subinvocation state or output states) that the graph doesn't load: a separate design, next to #21989<br>- The branch's workaround (skip not-ready for subworkflows) is correct for what the graph knows today |

## Scope G: close the stale text-content gap

A dataset whose text another view cached while its job ran shows that stale content on its first graph hover. The general fix is for `datasetTextContentStore` to invalidate on dataset state or `update_time`. A local fix would be to force a refetch on first mount when content is already cached.

| Pros | Cons |
|---|---|
| - Removes the last known freshness gap | - The general fix is a shared-store bug that also affects the report tab and `DatasetView`, so it belongs in its own PR<br>- The local fix needs a non-fetching "is cached" check that the store doesn't expose, so it would still touch the shared store<br>- Narrow trigger: you have to view the report tab while the job runs, then hover the graph after it finishes |

## Scope H (contraction): drop the invocation-listed items and the keep-mounted logic

Always fetch step details for outputs (delete `outputItems`/`updateOutputItems`), and remount the previews on every hover with a plain refetch-on-mount instead of the module map and `previewsMounted`.

| Pros | Cons |
|---|---|
| - About 100 fewer production lines; no module-level map, no poll-time diffing | - Stages 2/3 read `outputItems` to embed workflow outputs without per-step fetches, so the code would come back next PR<br>- Brings back the measured 600 KB-per-hover collection refetch and the iframe reloads<br>- Throws away hardening work that was measured and mutation-tested |
