Run via Claude Opus at high effort.

# Thermo-nuclear code quality review, round 2: workflow_step_parameter_overrides

2026-11-03. I reviewed `46db8f9d5b6..HEAD` fresh with [the thermo-nuclear prompt](../../../../../agents/_shared/prompts/thermo-nuclear-code-quality-review.md), after the re-scope. I looked hardest at what changed after round 1, which the brief listed. I read [round 1's review](earlier_drafts/1/thermo_nuclear_review.md) and reconsidered each of its declines.

The round-2 additions are in reasonable shape. No file crosses 1,000 lines. The server-side nesting is minimal. The picker's performance fix is sound. The structural problem is layout: the client picker had become 13 files spread flat through `Workflow/Run/`, with a `stepParameter` prefix standing in for a directory. One of those files also mixed two concepts. I fixed that, made two smaller cleanups, and tried a bigger change to who owns the card errors, which I then reverted (see "Tried and reverted").

**Changed:**

1. **The picker is now a module, `client/src/components/Workflow/Run/StepParameters/`** (picker, workflow view and rerun commits).
2. **The `step_parameter_overrides` payload code is split out of `stepParameterTree.ts`** into `stepParameterOverrides.ts` (picker commit).
3. **`stepParameterErrors` no longer has an unused `undefined` result.** It shares one `isPlainObject`, and the alert-message logic is flatter (picker commit).
4. **The picker gates both of its views behind one `v-if="show"`** (workflow view commit).

The behaviour is unchanged. The bottom five commits are unchanged, so the extraction branch didn't need a re-sync. Nothing is security-sensitive.

## Findings

### 1. The client picker had no module of its own (fixed)

`Workflow/Run/` already held about 40 files. The branch added 13 more there, all named `StepParameter*` or `stepParameter*`: 4 components, 4 pure modules and their tests. Only two of them are meant to be used from outside:

- `WorkflowRunStepParameters.vue`, the run form's section;
- the payload helpers, which `WorkflowRunForm`, `simpleFormDisabledReason` and `JobParameters` use.

The client already groups a feature's files like this: `Workflow/Invocation/Graph/`, `Workflow/Invocation/Export/` and `Workflow/Editor/Comments/`.

They now live in `Workflow/Run/StepParameters/`. Every import between the module's files is still `./`. Only six files outside it changed an import path: `WorkflowRunFormSimple.vue`, `WorkflowRunForm.vue`, `simpleFormDisabledReason.ts`, `JobParameters.vue`, plus the two tree test files. The file names stay as they were, so they still read clearly when imported from outside.

### 2. `stepParameterTree.ts` mixed the tree with the request payload (fixed)

At 398 lines, it held three things:

- the run model → picker tree code: building, filtering, resolving keys and labels;
- tool input value display and typing;
- the `step_parameter_overrides` codec: the key format, `buildStepParameterOverrides`, `stepParameterOverrideValues`, `parseStepParameterOverridesArg` and `isPlainObject`.

`JobParameters.vue` needs only the codec, but it imported the whole tree module, and with it the Form utilities.

The codec is now `stepParameterOverrides.ts` (91 lines), and it depends on nothing in the picker. The tree (310 lines) imports `parameterKey` and `ParameterPath` from it, and `JobParameters` imports only the codec. The import graph has no cycles: tree → overrides, errors → tree and overrides.

The tests split the same way. The codec's three tests moved to `stepParameterOverrides.test.ts`. "round trips through the tree's leaves" and "types card values" stay with the tree, under `describe("card values")`, because they use the tree.

### 3. `stepParameterErrors` returned optionality nobody used (fixed)

- **`undefined` versus `[]`.** `stepParameterErrors` returned `undefined` for `err_data` not keyed by step, and an array otherwise. Its only caller immediately wrote `?? []`, so the distinction was never read. It now returns `[]`, and the 4 test assertions changed from `toBeUndefined()` to `toEqual([])`.
- **Two copies of `isPlainObject`.** `stepParameterErrors.ts` and `stepParameterTree.ts` each defined their own. There is one now, exported from the codec. The client has no shared helper for this: `workflowInputPath.ts` and `uploadResponse.ts` have local copies too. lodash's `isPlainObject` isn't a type guard, so using it would add casts.
- **The alert message.** `stepParameterSubmissionErrors` built it through a `marked` string and a nested ternary with an inline punctuation regex. It now branches once, on whether any card shows an error, and the punctuation check is a named `sentence` step. The output is the same, which the 3 `stepParameterSubmissionErrors` tests confirm.

### 4. The picker's `v-if` (fixed, small)

The `v-if` itself is the right fix (GModal renders its slot while closed). But the list was `<div v-if="show" v-show="view === 'list'">` and the workflow view was `v-if="show && view === 'workflow'"`, so the same gate was written twice. Both now sit in one `<template v-if="show">` under the existing comment, as they did in the picker commit before the workflow view split them. The DOM is the same.

The in-place `Set` mutation in `toggle` is fine:

- `selected` is a `ref` of a `Set`, which Vue 3 tracks per key through `has`;
- opening the picker assigns a fresh `Set` from the cards' keys, so Cancel still discards;
- children only read it.

I left it as it was.

### 5. Card-error plumbing (reviewed; tried and reverted, see below)

`WorkflowRunFormSimple.onSubmissionError` rebuilds the tree. It gets the shown keys by flattening its own `stepParameterOverrides` back to keys, and hands the card errors down as an `errors` prop. `WorkflowRunStepParameters` copies that prop onto each card's `errors` and clears a card's copy when the card changes. So errors are held twice: the parent's last-submission map, and the cards' current display state.

### 6. `WorkflowModuleInjector.inject`'s error nesting (no change)

It's an 8-line `try`/`except MessageException` around the subworkflow's `populate_module_and_state`. It wraps `err_data` one level per subworkflow, under the int `order_index` key that `compute_runtime_state` already uses. Errors without `err_data` (such as `ToolMissingException`) pass through. I don't see a cleaner home: the alternative is passing a key prefix down through `populate_module_and_state`, which would spread the feature into a shared signature.

### 7. `workflow_run_ensure_expanded` (no change)

The nested `is_absent` check is the direct fix, and its comment says why. Reading the toggle's pressed state would check the same thing less directly, as the E2E polish found.

### 8. The unit-test rewrite (no change)

`ToolWorkflow` goes through the public `apply_step_parameter_overrides`. The query test compares a 2-step workflow with a 6-step one instead of hard-coding a count. `tools_support` is gone. It's tight and boring, as it should be.

### 9. The round-2 test restructure (no change)

The E2E helpers are direct, use SmartTarget methods and have no sleeps. `_open_link` and `_open_rerun` are thin, but they're used 4 and 3 times and name what the URL is for.

## Tried and reverted

**Making `WorkflowRunStepParameters` own its card errors.** The idea was to expose `showSubmissionErrors(errData, errMsg): string` and `clearSubmissionErrors()` through `defineExpose`. The parent's catch would then become a single call through a template ref. That would delete the parent's `stepParameterCardErrors` ref, the `errors` prop, the child's watch, and the parent's tree build and key round-trip.

It broke 4 of the existing `WorkflowRunFormSimple.test.ts` tests from #24177's stack. They `shallowMount` the form, the stub child has no exposed methods, and `stepParameters.value?.clearSubmissionErrors is not a function` was thrown on submit. Keeping it would have meant one of two things:

- guarding with `?.()`, a silent fallback around an invariant;
- adding a stub with fake methods to a base test that the round-2 test challenges had deliberately restored.

Both are worse than the duplication they remove. And the prop design is defensible as it stands:

- the parent derives the keys from the overrides it submitted, which is exactly "errors for what was sent";
- the prop is the last submission's result, and `card.errors` is what's shown now.

I reverted it. I didn't find a prop-only design that also removes the tree build: the parent's alert needs to know which errors have no card.

## Round 1's declines, reconsidered

| Decline | Still holds? |
|---|---|
| Pure-data `/request` subtraction instead of detached ORM copies | Yes. Nothing changed. It still needs #24178 on `dev` to keep the API series extractable. |
| Recording overrides only in the meta row | Yes. Scheduling, child invocations and the expanded-form rerun seeding still read the step rows. |
| Replacing the walker with `populate_state` or `visit_input_values` | Yes. The walker is unchanged, and the codex fix (`pending` in `_with_defaults`) is the kind of rule the generic helpers don't know. |
| Dropping `OVERRIDABLE_PARAMETER_TYPES` | Yes. It's unchanged. It still mirrors `EXPOSABLE_TYPES` (now in `StepParameters/stepParameterTree.ts`), and a shared contract isn't worth it for six strings. |
| `isTopLevelInvocation` lookup | Yes. It's unchanged. |
| The two `any`s in `buildStepParameterOverrides` | Yes. They moved with the codec, unchanged. |
| Building the tree only once | Yes. There are still four builders: the section, `simpleFormDisabledReason`, the expanded form's link list and the parent's error mapping. The revert above is why the fourth stays. Each runs once per load or rejection, at 2.4 ms for 3,040 leaves (round-2 performance numbers). |

## Growth

| File | Base | Now |
|---|---|---|
| `WorkflowRunFormSimple.vue` | 805 | 839 (+34; +1 since round 1, an import line) |
| `StepParameters/stepParameterTree.ts` | - | 310 (was 398) |
| `StepParameters/stepParameterOverrides.ts` | - | 91 (new) |
| `StepParameters/WorkflowRunStepParameters.vue` | - | 238 |
| `StepParameters/StepParameterWorkflowView.vue` | - | 149 |
| `StepParameters/StepParameterPicker.vue` | - | 128 |
| `StepParameters/stepParameterErrors.ts` | - | 111 (was 118) |
| `StepParameters/StepParameterTreeNode.vue` | - | 100 |
| `StepParameters/stepParameterGraph.ts` | - | 57 |
| `lib/galaxy/workflow/step_parameter_overrides.py` | - | 416 (unchanged) |

No file is near 1,000 lines. The largest new client file is now 310 lines.

## Commits

| Commit | Before | After | Change |
|---|---|---|---|
| Baseline tests | `58a86dec561` | `58a86dec561` | unchanged |
| Refactor | `b682078c173` | `b682078c173` | unchanged |
| API 1 | `0919ef03fb4` | `0919ef03fb4` | unchanged |
| API 2 | `3bfb3a7732c` | `3bfb3a7732c` | unchanged |
| API 3 | `d7952c3ab81` | `d7952c3ab81` | unchanged |
| Picker | `324aa6a72a2` | `e1c0b115a1d` | Findings 1–3: `StepParameters/`, the codec split and its tests, the `stepParameterErrors` cleanup, import paths in the run forms and `simpleFormDisabledReason` |
| Workflow view | `b4123c5a23b` | `74402d218bd` | Finding 1: `StepParameterWorkflowView` and `stepParameterGraph` (+ test) into `StepParameters/`. Finding 4: the single `v-if` |
| Rerun with this changed | `63818a09456` | `0969ce6e2de` | `JobParameters.vue` imports the codec from `StepParameters/stepParameterOverrides` |
| E2E | `1cdd468d681` | `3595a8429e3` | rebased only |

- The two code fixups went in with `--fixup` and autosquash, and the squashed tree was identical to the pre-squash tree.
- I applied the move and split in place, with `edit` stops at the picker, workflow-view and rerun commits. The workflow-view replay had one import-list conflict in `WorkflowRunStepParameters.vue`, which I resolved to keep the new `StepParameterPickerView` import.
- `git diff -M` from the pre-move HEAD shows only renames, the codec split and import lines.
- Commit messages and author dates are preserved.
- The bottom five commits are unchanged, so `workflow_step_parameter_overrides_api` needed no re-sync.

## Tests

- **Vitest**: the brief's suites (`Workflow/Run`, `Workflow/Editor/Node*`, `Editor/Index`, `JobParameters`, `WorkflowInvocationState`, `JobInformation`, `Workflow/Invocation`, `useInvocationGraph`, `canvasDraw`): 41 files, 249 tests passed. Before this pass it was 40 files and 249 tests. The extra file is `stepParameterOverrides.test.ts`; its 3 tests moved there from `stepParameterTree.test.ts`.
  - Per commit, `Workflow/Run`: picker 16 files and 104 tests, workflow view 106 tests, all passing.
- **vue-tsc**: clean.
- **eslint**: 0 errors on all the branch's client files. The 25 warnings are 16 `v-on-event-hyphenation` in the run forms' existing `@onChange`/`@onValidation` handlers and 9 `no-explicit-any`. This pass added none of them.
- **prettier**: clean, including `navigation.yml`.
- **Python**: no Python changed in this pass.
  - `test/unit/workflows/test_step_parameter_overrides.py` and the module doctest: 4 passed.
  - API: `test_workflow_step_parameter_overrides.py`, both `test_jobs.py` `parameters_display` tests and the baseline `test_run_subworkflow_runtime_parameters_invalid_value`: 14 passed.
  - I didn't rerun ruff, black, isort or mypy: no Python file changed since the round-2 test challenges ran them clean.
- **E2E**: 12/12 passed in 448s on HEAD `3595a8429e3`. That is all 11 tests in `test_workflow_run_step_parameter_overrides.py`, plus #24177's `test_workflow_rerun.py::TestWorkflowRun::test_workflow_rerun_prefills_expanded_form`.
  - The run used Playwright, headless, against a single Galaxy on :8099. It served a `static/dist` rebuilt from HEAD (`static/client_build_hash.txt` is `3595a8429e3`).
  - That Galaxy is stopped.
  - I ran E2E even though behaviour didn't change: it is the only coverage of the card-error path through the moved files.

## Not acted on

- **Sharing `stepParameterOverrideValues(...).keys()`.** Four callers spell this out. A `stepParameterOverrideKeys` helper would be a one-line wrapper.
- **Renaming files inside `StepParameters/`**, for example `stepParameterTree.ts` to `tree.ts`. The prefix is redundant inside the directory, but it keeps imports from outside it readable. It also kept the move a pure rename, which let the rebase carry later commits' edits across.
