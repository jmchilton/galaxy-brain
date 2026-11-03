Run via claude-opus-5-5 at high effort.

# Initial implementation debrief: invocation_graph_output_previews

Stage 1 of the [invocation_graph_embedded_outputs](../../../../../agents/gx_standing/standing_branches/invocation_graph_embedded_outputs/index.md) standing branch, extracted from the spike (`3e4312f7c1d`) onto current `dev` (`577c683a957`). In the invocation graph, hovering a step's output terminals opens one popover that previews every output the step produced: tables, images and text through the Markdown dataset display, and collections through the Markdown collection display.

```text
created /home/ubuntu/projects/repositories/galaxy-brain/vault/repositories/galaxy/branches/active/invocation_graph_output_previews/differential-review/snapshots/20261103T145034Z-implementation-f560972f84cb.json
  implementation @ f560972f84cb vs origin/dev (merge-base 577c683a9572)
  first snapshot: 3 commits, 10 files, 16 hunks
```

## Commits

| Commit | What |
|---|---|
| `94c3576a979` | `useInvocationGraph`: each scheduled graph step gets `invocationStepId`, plus `outputItems` for the items the invocation lists (workflow input dataset or collection, workflow outputs matched by label or by the `"<output> (Step N)"` key, and by `workflow_step_id`). |
| `519305782b2` | `InvocationOutputPreview.vue`, `useStepOutputItems.ts`, `InvocationStepOutputsPopover.vue`, and one line in `Node.vue`. Vitest for the preview and the popover. |
| `f560972f84c` | Selenium test `test_hover_previews_step_outputs` using the spike's 10-step workflow, with four screenshots, plus `navigation.yml` selectors. Also folds the old `_open_two_branches_invocation` body into an `_open_invocation` helper. |

## How it differs from the spike

- **The popover is its own component.** The spike put the popover, the output list and the item loading into `Node.vue`, which the workflow editor shares. Here `Node.vue` gains one `v-if="isInvocation"` tag and a `topOutputTerminal()` target function.
- **Not `interactive`.** An interactive GPopover puts `aria-haspopup`/`aria-expanded` on its target. The target is the terminal `div`, and the Selenium axe check fails on that. So the popover is tooltip-role. It still stays open while hovered, and keyboard focus on the terminal's button opens it, but its content can't be tabbed into.
- **Freshness.** The spike's `stepState` watch only fired while a preview was mounted, and popover content unmounts between hovers. Here a module-level map records the step state each dataset preview last loaded under, so a remount after the state changes refetches. Collections remount (`:key`) on a state change. While the step's jobs are in a non-terminal state, the preview shows "This output isn't ready yet: the step is running." and loads nothing.
- **Fewer requests.** `useStepOutputItems` reads step details only when the invocation doesn't list every output. It refetches on a later hover only once the step's state has changed.
- **Dropped:** the spike's loop over `invocationStep.outputs`. The invocation payload never fills it.
- **Not previewed:** parameter inputs (their value is already on the node) and unscheduled steps. A step with nothing yet shows "No outputs produced yet.", or a loading line while details load.
- **Width.** The popover is `max-content` wide, between 16rem and 40rem, rather than a fixed 40rem. One-line text outputs get a narrow card.

## Stage 2/3 hooks (already used by stage 1, not added for later)

- `GraphStep.outputItems` / `invocationStepId` and the `InvocationOutputItem` type, in `client/src/composables/useInvocationGraph.ts`.
- `InvocationOutputPreview.vue` takes `item` + `stepState`, which matches the spike's embedded cards.
- `useStepOutputItems(step)` returns `{ items, loading, load }`. The spike returned `{ items, load }`, and `load()` now also checks for a state change. Stage 3's preferred-output watch (`[show, state] → load()`) still works with it.
- The spike's `fitWorkflow(extraRectangles)` change in `WorkflowGraph.vue` is stage 2 only, so it isn't here.

## Verification

- Vitest under node 22.20.0, covering `Workflow/Editor`, `Workflow/Invocation`, `WorkflowInvocationState`, `Markdown` and `useInvocationGraph`: all pass. The new tests fail without the change.
- `vue-tsc --noEmit` is clean. It needs `NODE_OPTIONS=--max-old-space-size=8192` here. eslint reports no errors.
- Selenium (Playwright backend): all 8 tests in `test_workflow_invocation_graph.py` pass.
- The normal review's debrief is in [subagents/normal_review.md](subagents/normal_review.md). Fixes went into the commits above.

## Baseline tests

No "Baseline tests" commit was made. Every new test covers new behavior: output items, the popover and the preview. There's no current behavior of these to pin. The Selenium helper refactor is pure test code, and the hardening baseline-refactor step will decide whether to split it out.

## Open questions

- **Keyboard access to preview controls.** Pagination, the collection Download/Import buttons and the tree toggles are mouse-only inside a tooltip-role popover. The fix is a real focusable per-step trigger, which would allow `interactive`. Is that new UI on every node worth it, or is the step card enough as the keyboard route?
- **Hover target.** Should hovering the whole node open the popover, as the spike's issue wording suggests? Today only the output terminals do, which keeps the popover from appearing while you move across the graph.
- **Stale-cache gap.** A dataset whose text content another view (e.g. the report tab) cached while its job ran shows that content on the first graph hover. Later state changes do refetch.

## Environment notes

- `galaxy_e2e.sh` (galaxy-playwright skill) is `#!/bin/zsh`, and zsh isn't installed on this host. A bash port in the session scratchpad works. pytest also needs `-p no:postgresql`, because psycopg has no libpq here.
