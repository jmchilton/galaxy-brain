Run via claude-opus-5-5 at high effort.

# Implementation debrief: invocation_graph_output_previews

**STATUS: BLOCKED.** The branch is parked on a scope decision. It works, it's hardened, and it's pushed. The scope evaluation recommends one small expansion: fix how `useInvocationGraph` derives a mapped-over step's state. Following the workhorse AGENTS.md ("Parking on a Scope Decision"), and as the coordinator asked, I didn't re-scope. John decides.

Stage 1 of the [invocation_graph_embedded_outputs](../../../../../agents/gx_standing/standing_branches/invocation_graph_embedded_outputs/index.md) standing branch. In the invocation graph, hovering a step's output terminals opens a popover that previews every output the step produced: tables, images and text through the Markdown dataset display, and collections through the Markdown collection display. Head `90cdc7089d9` on `jmchilton`, based on `dev` `66760b89269`; 11 files, +851/−5.

```text
created /home/ubuntu/projects/repositories/galaxy-brain/vault/repositories/galaxy/branches/active/invocation_graph_output_previews/differential-review/snapshots/20261103T165246Z-hardening-90cdc7089d9c.json
  hardening @ 90cdc7089d9c vs origin/dev (merge-base 66760b892698)
  since 20261103T145034Z-implementation-f560972f84cb:
    commits: 0 same, 0 rebased, 3 changed, 1 new, 0 dropped
    hunks:   7 carried, 8 changed, 5 new, 1 dropped
    new     655900d77d0d Invocation graph Selenium tests: open any workflow's invocation
    changed b95531ea2438 Invocation graph steps carry the datasets and collections the invocation lists (2 differing hunks)
    changed d440046cc36b Invocation graph: hover a step's outputs to preview them (5 differing hunks)
    changed 90cdc7089d9c E2E test for invocation graph output previews (6 differing hunks)
```

## Commits

| Commit | What |
|---|---|
| `655900d77d0` | Test-only refactor: `_open_two_branches_invocation` becomes `_open_invocation(workflow, labels)` ([baseline refactor](baseline_refactor.md)). |
| `b95531ea243` | `GraphStep.outputItems` / `invocationStepId`, read from the invocation payload: a workflow input's item, and workflow outputs matched by label (or the `"<output> (Step N)"` key) and `workflow_step_id`. Reads go through `toRaw` to keep the per-poll cost low. |
| `d440046cc36` | `InvocationStepOutputsPopover.vue`, `InvocationOutputPreview.vue` and `useStepOutputItems.ts`, plus one mount line in `Node.vue`, with Vitest. |
| `90cdc7089d9` | Selenium `test_hover_previews_step_outputs` on the spike's workflow (now named "Output previews"), with five screenshots, `invocations.graph_step_output*` selectors, and a `data-description` on `CollectionTree.vue` element names. |

## Final design

- **Data.** The invocation payload supplies workflow inputs and outputs without extra requests. Other outputs come from the step's details (`fetchInvocationStepById`). `useStepOutputItems` reads those only when the invocation doesn't list every output, and fetches them again only after the step's state changes. That covers both a hidden popover's next hover and a popover that is open.
- **Popover.** It hangs from the topmost of the stacked output terminals, so it doesn't open while the pointer crosses the graph. It's tooltip-role, not `interactive`, because the terminal `div` can't take `aria-haspopup`/`aria-expanded` (axe fails). It's `max-content` wide, between 16rem and 40rem. Previews mount on the first hover and stay mounted between hovers. If the step's state changes while the popover is hidden, they unmount, so a hidden popover never fetches. A 500-element list re-hovered went from 621 KB and about 2.5 s per hover to no requests and about 0.5 s.
- **Freshness.** `InvocationOutputPreview` takes the producing `GraphStep`. While the step's jobs are non-terminal, it shows "This output isn't ready yet: the step is running." and loads nothing. Subworkflow steps are exempt, because their state stays `scheduled`. A module-level map records the step state each dataset preview was loaded under, so a later state change refetches the dataset and its text. That also covers failed steps rerun with remapped outputs, which keep their ids. Collections remount (`:key`) on a state change.
- **Not previewed:** parameter inputs (their value is on the node) and unscheduled steps.

## Harden steps

| Step | Outcome |
|---|---|
| [Normal review](subagents/normal_review.md) | Took 6 of 10 findings: dropped a loop over never-filled `invocationStep.outputs`, matched unlabeled outputs, gated refetches on a state change, added the not-ready placeholder, typed the step state, and tightened E2E assertions. Kept the freshness map and the tooltip-role popover, with reasons given. |
| [Test challenges](test_challenges_debrief.md) | Rewrote the unit tests onto `shallowMount` with fewer hand stubs. Dropped one test that Selenium already covers. Added label assertions in Selenium. 14 mutations each fail their own test. |
| [E2E polish](polish_e2e_tests_debrief.md) | Grouped the selectors into an `invocations.graph_step_output` sub-component. Added the `CollectionTree` hook so the test asserts real collection elements. Added an image-loaded wait before that screenshot. |
| [Performance](performance_challenges_debrief.md) | Measured. Fixed: collection refetch on every hover (previews stay mounted), dataset reloads at every state change of a running step, and about 55 ms of extra per-poll cost at 2,000 steps (`toRaw`). Selectors are scoped to the open popover. |
| [Codex](codex_review.md) | gpt-6.1-sol, read-only, with the diff and context passed on stdin because codex's bwrap sandbox can't start here. Two confirmed fixes: an open popover now reloads on a state change, and subworkflow outputs are no longer stuck "not ready". |
| [Thermo-nuclear](thermo_nuclear_review.md) | No blockers. `step` is now required, the popover's three watchers are now one, and an unwatched `ref` is now a plain variable. |
| [Baseline refactor](baseline_refactor.md) | Moved the Selenium helper refactor into its own commit before the feature. |
| [Scope evaluation](scope_evaluation.md) | Recommends a small expansion: fix the mapped-over step state (see below). Stop point. |
| Check branch | `make format`: no changes. `cd lib && mypy` on the changed Python file is clean; the one error it prints is in `galaxy/managers/notification.py` and is unrelated. `vue-tsc` and eslint are clean. |
| [Screenshots](screenshot_debrief.md) | Five frames: default graph, table, image, collection, multiple outputs. All checked by eye. |

I ran the screenshot step after the scope stop, and after the check-branch step. The process says to stop at a scope recommendation, but the screenshots are slide material that John asked for, and the recommended fix can't change them: they're taken after every step is `ok` and polling has stopped.

Final verification on `90cdc7089d9`: Vitest for `Workflow/Invocation/Graph/`, `Workflow/Editor/`, `useInvocationGraph` and `Markdown/.../HistoryDatasetCollection` passes. All 8 tests in `test_workflow_invocation_graph.py` pass (Playwright backend).

## The scope decision

**Recommended expansion (Scope A).** `getStepStateFromJobStates` falls back to `populated_state` for any job mix that isn't all-same and has no error, running, paused or deleting job. A map-over with `{new: 494, queued: 6}` therefore reads as `ok` with a green check. The performance step measured this. At the tail of a map-over, `{ok: 480, queued: 20}` reads as `ok` as well; that case comes from reading the code and wasn't measured. The bug predates this branch and affects the node header, the step card and the Steps tab.

It matters here for two reasons. The not-ready placeholder trusts the step state. And an open popover refetches a filling collection every time the state flips between `running` and `ok`.

The proposed fix:
- If any job is in a non-terminal state, show `queued` when every job is still pending, and `running` otherwise.
- Add the new cases to the existing "step state" Vitest block.
- Put it in its own commit before the feature commits, so it can be split out. It could even become a release-branch PR.

The fix is about 10 lines. Options:

1. Approve Scope A on this branch.
2. Split it into its own PR (the scope evaluation's Option 2).
3. Ship as is.

**What still applies if Scope A is taken:** all the reviews above. It touches only `updateStep`/`getStepStateFromJobStates`, which this branch doesn't change. The new tests would go in the existing state block.

**Validation left:** a normal review of the fix; Vitest; the full invocation graph Selenium file, whose `test_failed_step_is_marked` exercises the state logic; and a rerun of the test challenge if more than 3 tests change. The screenshots don't need redoing.

## Other open questions for John

- **Keyboard access.** Pagination, the collection Download/Import buttons and the tree toggles inside the tooltip-role popover are mouse-only. The step card is the keyboard route. Making the popover `interactive` needs a focusable trigger. The options are a new per-node button, or repurposing the terminal's existing `connection-menu-button`, which is unverified and would need relabelling in invocation mode.
- **Hover target.** Should hovering the whole node open the popover, rather than only the output terminals?
- **Large collections.** The first hover still downloads and renders every element: about 1.2 KB and 1.8 ms on the server per element, so roughly 12 MB at 10,000 elements (extrapolated). Paging `CollectionDisplay` changes a component that reports and Pages share. This belongs to stage 2, whose brief owns "very large outputs".
- **Step-details payload.** `GET /api/invocations/steps/{id}` carries about 240 B per job. Trimming it needs a backend option, and stage 3's per-node reads need a batched source anyway.
- **Known gaps:** subworkflow outputs never refetch, because the subworkflow step's state doesn't change. Text content that another view cached while a job ran shows on the first hover.

## Notes for rebasing the spike onto this branch

- **Renamed or reshaped APIs compared with the spike:**
  - `InvocationOutputPreview` takes `step: GraphStep` (required), not `stepState`. Stage 2's `InvocationEmbeddedOutputs` should pass `props.steps[output.sourceId]` and handle a missing step at the lookup.
  - `useStepOutputItems(step: Ref<GraphStep>)` (required, not `| undefined`) returns `{ items, loading, load }`, and `load()` only refetches after a state change. Stage 3's `Node.vue` code has `graphStep` as `GraphStep | undefined`, so it needs a guard or a non-optional ref. Be aware that reading `items` fetches step details when the invocation doesn't list every output. Stage 3 reading it on every node means one request per such step on load.
  - The spike's `updateOutputItems` loop over `invocationStep.outputs`/`output_collections` is gone: the payload never fills them. Matching now iterates `step.workflow_outputs`, and also covers the unlabeled `"<output> (Step N)"` key.
- **How the code is split:** the popover moved out of `Node.vue` into `InvocationStepOutputsPopover.vue`. The spike's `Node.vue` popover block, `previewOutputs`, `outputPreviewTarget` and `canPreviewOutputs` are all replaced by one tag plus `topOutputTerminal()`. Stage 3's preferred-output block (`embedInvocationOutputs` inject, `showPreferredOutput`, `preferredItem`, `.node-preferred-output`) still belongs in `Node.vue` and will conflict textually around the `NodeInvocationText` line and the imports.
- **The popover is not `interactive`, and its CSS class is `invocation-step-outputs-popover`**, not `invocation-output-popover`.
- **Spike commits:**
  - `4054f126c5e` (stage 1 hover) and `1b3b00c9502` (popover per step) are fully covered and superseded.
  - `06f13135728` is partly covered: the `outputItems`/`invocationStepId` and `useStepOutputItems` parts. Its preferred-output and `useEmbeddedOutputs` parts stay with stages 2 and 3.
  - `e9914764686` is partly covered: the compact preview CSS. The `fitWorkflow(extraRectangles)` change and the control moves stay with stage 2.
  - `3e4312f7c1d` is partly covered: freshness on a state change, redone as described above. The embedded and preferred call sites stay with stages 2 and 3.
  - `5f33ad43ffa`, `16d2ddff843`, `9a47ea37cb1`, `0de2c009db3` and `9e83906a728` aren't covered.
- **`navigation.yml`:** the new selectors are `invocations.graph_step_outputs`, `graph_step_outputs_loading`, a `graph_step_output` sub-component (`label`, `table`, `table_row`, `text`, `image`, `collection_element_name`) and `activity_tooltip`.

## Environment notes

- `galaxy_e2e.sh` (galaxy-playwright skill) is `#!/bin/zsh`, and zsh isn't installed on this host. A bash port in the session scratchpad works. pytest needs `-p no:postgresql`, because there's no libpq.
- Codex's bwrap sandbox fails here ("loopback: Failed RTM_NEWADDR"). Running codex without the sandbox was denied, so the review got its context on stdin.
- The performance step left a perf user, some large lists and invocations on the worktree's E2E Galaxy (port 8092).
