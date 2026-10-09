# galaxy #23776 - Convert the legacy workflow run form to `<script setup>`

- PR: https://github.com/galaxyproject/galaxy/pull/23776 (itisAliRH, base `dev`, not draft, review requested from dannon)
- Head reviewed: `62d056088d5`
- Worktree: `~/projects/worktrees/galaxy/pr/23776` (fetched `origin/dev` before diffing)
- Size: +1140/-564, 7 files. Three components converted to `<script setup lang="ts">`
  (`WorkflowRunForm`, `WorkflowRunDefaultStep`, `WorkflowRunInputStep`), three new vitest files, and a JSDoc fix in
  `services.js`. 9 commits: for each component, a `null`-target prep commit, then a test, then the conversion.

## Verdict

Approve. The conversion keeps behavior. I ran the 27 new tests against the pre-conversion components and all of
them pass, so they are real parity guards. `vue-tsc` is clean. The templates are unchanged apart from three
bindings, so Selenium selectors (`#run-workflow`, `.workflow-expanded-form`) still work. Nothing blocks. The
main suggestion is a follow-up: the converted `WorkflowRunInputStep` is now a near-copy of code in
`WorkflowRunFormSimple`.

## Where the +1140 comes from

- About 512 lines are the three new test files (178 + 185 + 149).
- The `.vue` files account for +626/-562. Almost all of the growth is typing overhead: `Props` interfaces with
  JSDoc per prop, typed `defineEmits`, multi-line typed destructured handler params (`onLoadMore`,
  `onSearchChange`), and local type aliases. I found no new features.
- The deliberate behavior deltas are listed in the PR body, and I checked each one (see below).

## Parity notes (checked, no issue)

- **Lifecycle and watchers.** `beforeUnmount` becomes `onBeforeUnmount` and still calls `onSearchChange.cancel()`
  in both steps. The debounce is created in setup, one per instance, the same as the old `created()` rebinding.
  The old `validationScrollTo`, `historyStatusKey` and `"model.inputs"` watchers were non-immediate and non-deep.
  They are now getter `watch`es with the same semantics. Nothing polls and no timers are left behind other than
  the debounce. A `getTool` / `searchHistoryContents` request that resolves after unmount only writes local refs
  on the dead instance. It doesn't re-arm anything, so the #23779 in-flight polling bug doesn't apply here.
- **Store access.** `mapState` becomes `storeToRefs` for `currentUser`, `currentHistoryId` and `lastUpdateTime`,
  and all of them stay reactive.
- **Emits.** The names (`showSimple`, `submissionSuccess`, `submissionError`, `onChange`, `onValidation`) and the
  argument order are unchanged. The submit path, the `err_data` -> `stepScrollTo` mapping and the
  `submissionError` fallback match line for line.
- **Non-reactive `stepData` / `stepValidations` / `inputs` / `resourceData` in `WorkflowRunForm`.** This does
  change current `dev`. Under Vue 3 `data()` is a deep Proxy, so these were reactive on `dev` even though they
  weren't under Vue 2. It is safe because the template reads only one of them: `stepData`, through
  `getReplaceParams` -> `getReplacements`. That function only reads `stepData[i].input` for `step_linked` sources
  where `isDataStep(...)` is true. Data steps render as `WorkflowRunInputStep`, and their values go into `inputs`
  (`onDefaultStepInputs`), never into `stepData`. So that branch can't see data today (this predates the PR), and
  `replaceParams` really depends only on `wpData`, which stays a `ref`. The upside is real: on `dev`, every
  tool-step `onChange` re-rendered the form, handed every step a new `replaceParams` object, and fired each
  `FormDisplay`'s sync `replaceParams` watcher (`FormDisplay.vue:218`).
- **`validationScrollTo` `[]` -> `null` to `FormDisplay`.** `onHighlight` ignores both (`val && val.length == 2`).
  The computed also stops passing a fresh `[]` to `FormDisplay` on every parent render. A repeat Run click with
  the same error still produces a new array (`stepValidation.slice()`), so the form still scrolls.
- **`OnCompleteActions :value` / `@input`.** This matches the declared `value` prop and `input` emit, and drops
  the dependence on compat `COMPONENT_V_MODEL`. Equivalent.
- **Non-reactive `modelIndex` / `modelData` in `DefaultStep`.** Neither is read in the template. `modelIndex`
  entries come from `visitInputs(modelInputs.value)`, so they are reactive proxies, and the
  `input.options = ...` writes in `onUpdate` still trigger before the JSON clone replaces the array anyway.
- **`modelInputs = ref(props.model.inputs)`.** The same deep-reactive wrap as `data()`, around the same
  object identity.

## Findings

### 1. Low (follow-up): `WorkflowRunInputStep` now duplicates `WorkflowRunFormSimple`

Now that both are TS, the duplication is word for word:

- `type PaginatedDataOption = Pick<DataOption, ...>` (`WorkflowRunInputStep.vue:34`, `WorkflowRunFormSimple.vue:60`)
- `shapeContentsRow` and `fetchStepOptions`: the same `searchHistoryContents` call and the same
  `${id}_${src}` dedupe-merge, which sets `options_meta` with `has_more: shaped.length === limit`
  (`WorkflowRunInputStep.vue:~95-150` vs `WorkflowRunFormSimple.vue:313-370`).
- `DefaultStep.mergeFetchedOptions` is also a copy of `ToolForm.vue:309` `mergeFetchedOptions`, which uses the
  tidier one-line filter.

This is a conversion PR, so I wouldn't block on it. But the conversion is the natural moment to stop the copies
from drifting. A small `Workflow/Run/historyContentsOptions.ts` (or `Form/` helper) exporting
`PaginatedDataOption`, `shapeContentsRow` and a `mergeOptionsBySrc(existing, incoming)` would serve all four call
sites. Note there is already a small drift: the converted `shapeContentsRow` now does `name: row.name ?? ""`
while the simple form keeps `name: row.name`.

### 2. Nit: the `step_linked` replacement path can't see data (predates the PR)

Described under parity. You could fix it either way: look sources up in `inputs`, or drop the branch. That would
be a behavior change, so it belongs outside this PR. It might be worth a one-line note in the PR or a follow-up
issue, since the "non-reactive is safe" argument depends on it.

### 3. Nit: emit / prop typing

`emit("onChange", index: string, ...)` matches `WorkflowRunModel` (`Object.entries` keys). But
`getValidationScrollTo(stepId: string)` uses `==` against `stepScrollTo.stepId`, so it keeps the old loose
comparison. That's fine, but a `WorkflowRunStep` type instead of `model: Record<string, any>` in all three
components would make it explicit. Optional.

### Tests

The tests are meaningful. They cover submission payload shape, the new-history toggle, client and server
validation scroll-to, error emission, `replaceParams` from workflow parameters, debounce coalescing and unmount
cancel, load-more merging, and history-change refresh. The mocks stay at the component's boundaries (child
components, `services`). None of the tests is trivial. All of them pass on the old Options API components, which
is what you want from a refactor.

## Verification

- `vitest` (node 22.20.0) `src/components/Workflow/Run/`: 10 files, 68/68 pass on head.
- Parity check: the three new test files run against the pre-conversion `.vue` from `fdd3eb97caf`,
  `e4ac1d600dd` and `8a12a38fd86`: 27/27 pass. Working tree restored afterwards.
- `vue-tsc --noEmit`: clean.
- `eslint` on the changed files: 0 errors. The 12 `v-on-event-hyphenation` warnings come from the existing
  `@onChange` / `@onValidation` / `@onClick` names that predate the PR.
- Selenium: `navigation.yml` `run_workflow` (`#run-workflow`) and `expanded_form` (`.workflow-expanded-form`)
  are untouched in the template. I didn't run any E2E tests.

## Risks

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door).
It's a client-only refactor of the legacy run form with no API or artifact changes. The one runtime difference
(non-reactive step state) reduces re-renders, and the `step_linked` branch that depends on that state can't
see data either way.

## Draft review comment

> *Posted by Claude (AI assistant) on behalf of jmchilton - not personally authored.*
>
> Thanks, this is a careful conversion, and the test-then-convert commit split made it easy to verify. I ran the
> three new test files against the pre-conversion components (27/27 pass), so they guard parity. vue-tsc is
> clean, and the `Workflow/Run` specs pass.
>
> I checked the non-reactive step state in `WorkflowRunForm` because it does change current `dev` (Vue 3's
> `data()` made those keys reactive). The template only reads `stepData`, through `getReplacements`. That function
> only reads it for `step_linked` data-step sources, but data steps write to `inputs` (`onDefaultStepInputs`),
> never to `stepData`, so that branch can't see data either way. `replaceParams` only depends on `wpData`, which
> stays reactive. So the change only removes the cascade of `replaceParams` watcher runs on every tool-step change.
> The `null` validation target and the explicit `:value`/`@input` on `OnCompleteActions` both look right too.
>
> One optional follow-up, not blocking: after the TS conversion, `WorkflowRunInputStep`'s `PaginatedDataOption`,
> `shapeContentsRow` and `fetchStepOptions` are a near-verbatim copy of the ones in `WorkflowRunFormSimple.vue`.
> `WorkflowRunDefaultStep.mergeFetchedOptions` also duplicates `ToolForm.vue`'s. A small shared helper
> (`PaginatedDataOption`, `shapeContentsRow`, a `mergeOptionsBySrc`) would keep them from drifting. One small
> drift has already crept in: `name: row.name ?? ""` here vs `name: row.name` in the simple form.
>
> Approving.
