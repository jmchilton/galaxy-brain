Run via Claude Opus at high effort.

# Phase C: normal review (client and E2E)

I reviewed the client and E2E commits (the picker, the pop-out workflow view, "rerun with this changed" and E2E) against [phase_c_merged_picker.md](phase_c_merged_picker.md), [phase_a_redesign.md](phase_a_redesign.md), [api_design.md](../api_design.md) and [REVIEW_FOCUS.md](../../../../../../agents/_shared/REVIEW_FOCUS.md). The structure is sound. There is one picker with two views over one picked set, it has its own store scope, and it reuses `WorkflowGraph`'s invocation mode, `getFullWorkflowCached` and the `FormDisplay` cards. The shared `NodeInvocationText.vue` change is safe.

I acted on the coordinator's three UX points and on two findings of my own: keyboard access to the workflow view, and narrow typing. Every fix went into the commit it belongs to. The API series is untouched, so the extraction branch `workflow_step_parameter_overrides_api` needed no re-sync. Nothing pushed. No security-sensitive findings.

| SHA (before → after) | Commit | Fix |
|---|---|---|
| `7ecb000ea36`, `6ad285f7797`, `4f70c613dc3` | API series | unchanged |
| `5bfccb3e62f` → `6f1e8696b7f` | picker | inner-step labels, dropped-alert labels, locked rows, typing |
| `d2d2c15ada8` → `6b07cd83848` | workflow view | step select and live region in the panel, one cast dropped |
| `7b0fb025045` → `d9c3cc51d18` | rerun with this changed | re-picked only |
| `788f2c8e826` → `f404830c413` | E2E | label assertions, the step select used in one test, new selector |

- **Inner steps lead with their subworkflows.** An inner step is now "nested › Step 2: echo", and two levels down "QC › Deeper › Step 1: Deepest". The tree, the workflow panel's groups and the cards' breadcrumbs show the same label.
  - Before: the tree and panel showed "Step 2: echo" under "Step 2: nested". Cards showed "Step 2: nested › Step 2: echo › …", so the number appeared twice.
  - Leaf breadcrumbs now start at the step label, which already names the subworkflows, so cards don't repeat the outer step.
- **Labels in the dropped-parameters alert.** It shows "Step 3: echo › Filter type › pattern - no such parameter…" instead of `2/cond/pattern`. The new `stepParameterKeyLabel(tree, key)` follows the key down the tree as far as the tree goes. Node ids are key prefixes, so this needs no new data. Anything left over is shown as is, with steps and repeat instances counted from 1 ("Step 10 › x", "Query 6 › column_name"). The raw key stays on the `<li>` as `data-parameter-key`.
- **Locked rows explain themselves.** The tooltip was there (GTooltip shows it on hover and focus and sets `aria-describedby`), but it only fired on the small lock icon, and the focusable lock span had no accessible name.
  - The tooltip target now covers the lock icon and the label, with a `cursor: help` pointer.
  - It carries screen-reader text "Locked:" ahead of the label.
  - On focus it reads "Locked: Column", then the reason.
- **Keyboard path in the workflow view.** `WorkflowGraph` nodes can't take focus: `Node.vue` listens for `keyup.enter`, but nothing gives it `tabindex`. So the panel was reachable only by mouse.
  - The panel now starts with a labelled "Step" `<select>` of the tree's top-level steps, bound to the same scoped `activeNodeId` the graph sets, so the select and the graph stay in step.
  - A persistent `sr-only` `aria-live` region announces the chosen step's title.
  - The E2E sharing test picks the subworkflow step with the select.
- **Typing.** The tree now uses the Form package's own `FormInputNode` (`ToolInput` adds `title`, `is_dynamic`, `data_ref`) in place of `any`.
  - A `StepParameterLeaf` type with an `isLeaf` guard makes `treeLeaves` and `resolveStepParameterKeys` return leaves whose `key`, `stepPath`, `paramPath`, `path` and `input` are required.
  - That removes all the `as any[]`, `as string`, `as number[]` and `as ParameterPath` casts in `WorkflowRunStepParameters.vue`, `stepParameterGraph.ts` and the tests, and `steps: any[]` becomes `RunStep[]`.
  - Two eslint `any` warnings are left, both in `buildStepParameterOverrides` (below).

Screenshots in [../screenshots/](../screenshots/) are refreshed from this E2E run. They show the step select and the "nested › Step 2: echo" group.

## Not acted on

- **Two `any`s in `buildStepParameterOverrides`.** Typing a nested object/array writer without casts needs a recursive container type, and the writer is local and covered by tests. That isn't worth it for two warnings.
- **Two copies of the same unlabeled subworkflow get the same prefix.** In that case, cards and the alert read "QC › Step 2: fastqc" for both, because the prefix uses `step_label || step_name`, and only labels are unique. The tree and the panel stay unambiguous by position. The fix would be to add the outer step number only when names collide.
- **Graph nodes still can't take keyboard focus.** Making them focusable would mean `tabindex` and key handling in the shared `Node.vue`, which every graph uses. The panel's select covers this view, and the list view covers everything.
- **A parameter of an inactive conditional case shows its raw name** in the alert ("… › Filter type › pattern"). The tree holds only the active case's inputs, so there is no label for it.
- **Clicking an input node leaves the step select blank**, because inputs have no parameters and are not options. The panel says so.
- **Server `err_data` paths still aren't mapped onto cards.** This is a known Phase A gap. `stepParameterKeyLabel` could label them in the submission alert later.

<details>
<summary>Full review</summary>

## Vue/TS quality and reuse

- **Reuse is good.**
  - The picker uses `GModal` with `fullscreen` and `GButton`.
  - The view uses `WorkflowGraph` in `is-invocation` mode, `provideScopedWorkflowStores`, `getFullWorkflowCached`, `fromSimple`, `getHeaderClass` and `storeToRefs(useDatatypesMapperStore())`.
  - The cards use `FormDisplay` with `buildNestedState` for typing and `matchCase` for conditionals.
  - Not reusing `useWorkflowRunGraph` is right: it loads into the run form's own scope.
- **`stepParameterGraph.ts`** is a small pure function with its own tests, and it keeps `Node.vue` and `WorkflowGraph.vue` unchanged. Good.
- **`cardInput`** deep-copies with `JSON.parse(JSON.stringify(...))`. `structuredClone` would throw on the reactive proxies the tree is built from, so this is right as it is.
- **`StepParameterTreeNode`**'s old `v-else` span branch was dead: the only non-leaf row is a conditional, which is always locked. It went with the lock rework, and the template now has two branches, locked and checkbox.

## State management between the views

- There is one draft `Set`, reset from `selectedKeys` on each open. Both views emit `toggle`, Apply emits the whole set and Cancel drops it. The tests cover sync across both views, removals and reopening without Apply.
- The workflow view is `v-if="show && view === 'workflow'"`, so it mounts only when used. The scope (`<id>-<version>-step-parameters`) survives a quick remount, and the `fromSimple` guard prevents duplicate connections. If the version changes, the scope id changes with it. Correct.
- `activeNodeId` is reset on load, so a reopened view starts with the empty panel. The new select writes the same ref, so lineage dimming (`useFocusedNodes`) follows the select too.
- Focus when the view changes: the header toggle's two `GButton`s are `v-if`/`v-else` siblings with no key, so Vue patches one element in place and focus stays on the toggle.

## Typing

See the top line. `FormInputNode` is the existing shape for tool inputs (`Form/composables/useFormState.ts`). `displayValue` takes `Pick<ToolInput, "value" | "options">` and narrows `options` with `Array.isArray`, since `FormInputNode.options` is `Record | unknown[]`. Conditionals now also require `test_param`, and a missing case reads as no inputs, where before it would have thrown.

## Accessibility

- **Graph nodes:** not focusable (above). Fixed for this view with the select and live region.
- **Labels:** checkboxes are wrapped in `<label>`. Help buttons have `aria-label="Help for …"`. GPopover triggers on hover and focus. The new select is inside a `<label>`.
- **Locked rows:** fixed (above). WCAG exempts inactive controls from contrast, so the 0.6 opacity stays.
- **Remove buttons on cards:** `title` with `tooltip`, as elsewhere in the run form.

## Tests

- **Vitest is not trivial.**
  - `stepParameterGraph.test.ts` checks counts across nested subworkflows and the header class only when something is picked.
  - `StepParameterPicker.test.ts` checks the one set across views, removals and reopening.
  - New tree tests check the scoped inner-step labels at depth 2 and `stepParameterKeyLabel` for a matched leaf, an unknown repeat index, an unknown param, an unknown inner step and an unknown top-level step.
  - The dropped-label test asserts locked and unknown keys.
  - The section test asserts the alert's label through `data-parameter-key`.
- **E2E:**
  - Every selector comes from `navigation.yml`, plus the new `workflow_step_select`. Raw CSS appears only for the generic `.popover-body` and `.g-tooltip` overlays, as in Phase A.
  - The link test now asserts the labels in the alert.
  - The sharing test asserts "nested › Step 2: echo" and drives the panel through the select.

## `NodeInvocationText.vue` (shared)

- **Safe.**
  - `useInvocationGraph` sets `nodeText` only for input steps (`initializeGraphInput`), and only when `graphStepFromWfStep.nodeText === undefined`. Tool steps there take the jobs branch first.
  - `useWorkflowRunGraph` sets `nodeText` on non-input steps only through `getWorkflowRunStepValidation`. Its `stepValidation` comes from the simple form's input validation, so it names input steps.
  - If a tool step ever did carry a validation message, the run graph would now show it instead of "This step has no jobs as of yet.", which is better.
- The branch sits after the `jobs` and input branches, so the invocation graph's tool and subworkflow nodes render as before.
- The `Node*`, `Index`, `Invocation/*`, `useInvocationGraph` and `canvasDraw` suites pass.

## Fixture `position:` edits

`WORKFLOW_STEP_PARAMETER_OVERRIDES` and `_NESTED` were added by this branch's API commit 1. The only users are this branch's API and selenium step-parameter tests (checked with grep). API tests key by step index and ignore layout, and step order comes from the gxformat2 step order, not from position. No other test depends on the positions being absent.

## Other notes

- `WorkflowRunFormSimple` passes `model.runData.version`. A rerun of an older version shows that version's graph, which matches the tree.
- The tree filter matches inner steps by their subworkflow names now too, which it already did through the ancestor match.

</details>

## Tests run

- **vue-tsc `--noEmit`** (`NODE_OPTIONS=--max-old-space-size=8192`): clean at the head, and clean at the picker commit `6f1e8696b7f` on its own.
- **Vitest** (node 22.20.0, `.venv/bin/node`), on Phase C's suites (`Workflow/Run/`, `Workflow/Editor/Node*`, `Workflow/Editor/Index.test.ts`, `JobParameters`, `WorkflowInvocationState`, `JobInformation`, `Workflow/Invocation`, `useInvocationGraph.test.ts`, `canvasDraw.test.ts`): **41 files, 253 tests pass**, Phase C's 251 plus the 2 new tree tests. At the picker commit alone, `Workflow/Run/` passes 15 files and 107 tests.
- **eslint:** 0 errors on the branch's client files. Of 18 warnings, 16 are existing `v-on-event-hyphenation` warnings in untouched lines of `WorkflowRun*.vue`, and 2 are the `any`s noted above.
- **prettier:** clean, including `navigation.yml`. **black and ruff:** clean on the selenium test.
- **E2E** (Playwright, headless, against Galaxy on :8091 with the built client in `static/dist`): **8/8 pass** for `test_workflow_run_step_parameter_overrides.py`.
  - It ran on the pre-rebase working tree. That tree is byte-identical to the rebased head: `git diff` from the fixup head to the rebased head is empty.
  - That Galaxy is stopped. The other session's :8090 and :5180 servers were not touched.
- **Rebase:** `WorkflowRunStepParameters.vue` conflicted twice, as expected, because Phase C's commit changes the same lines. I resolved it at the picker commit by re-applying the edits to that commit's version, and at the workflow-view commit by taking the final version, since later commits don't touch the file.
