# Debrief: vitest compat v-model stub hook

Source: `to_file/vitest_compat_vmodel_stub_hook.md` (from the #23908 review). Proposal: `to_file/proposed_vitest_compat_vmodel_stub_hook.md`.

## Research

- Checked on dev `244549a041e` (the #23908 merge) in a throwaway worktree: `scratchpad/gx_dev`.
- The three `GFormInput: false` opt-outs are present in `CopyModal`, `WorkflowExtractionForm` and `Workflow/Editor/Index` specs.
- Red to green:
  - Baseline: 68 pass.
  - Opt-outs removed: 25 fail. Example: `findComponent(GFormInput).props("modelValue")` is `undefined`.
  - Hook added: 68 pass.
  - Full client vitest suite with the hook: 537 files, 4112 tests pass.
  - `vue-tsc`, eslint and prettier are clean.
- New finding not in the source note: `vue-tsc` rejects the hook as written. VTU's `CustomCreateStub` type returns `ConcreteComponent`, but the runtime `??`-falls back on `undefined`. The patch therefore needs a cast. VTU doesn't export `createStub`, so a "copy compatConfig" stub isn't practical.
- Remaining `value`/`input` components in `packages/ui`: `GTabs` and `GCollapse`. `GAlert` takes both `value` and `modelValue`.
- #23830's post-merge checklist moves nearly every custom `v-model` component to `modelValue`, which makes the scaling argument stronger than the source note made it.
- Node 25 breaks happy-dom, so vitest has to run with `npm_config_use_node_version=22.20.0`.

## Review outcome

One review round found no wrong premise and no duplicate. The reviewer re-verified the 25-fail and 68-pass results and confirmed VTU/compat behavior from source. Changes made:

- Corrected a false claim. Explicit `X: true` stubs go through `createStubs` too, so the hook unstubs them; only `false` and component stubs still win. The draft now has a caveat naming the future affected specs:
  - `DatasetView` (`GTabs: true`)
  - `UserPreferences`, `ExternalRegistration` and `VisualizationUnsavedChanges` (`GAlert: true`)
- Shortened the opener and title.
- Made the "why" more precise: VTU copies `props` and the legacy `model` option, but not `compatConfig`.
- Added an alternative: fix it upstream in VTU by copying `compatConfig`, alongside the existing `model` copy from vuejs/test-utils#1550.

## Left over

- The hook can't tell an explicit `X: true` from `shallow`. The implementer either accepts that, as the caveat says, or switches those specs to stub components when GTabs/GAlert migrate.
- An upstream VTU issue isn't filed.
- The throwaway worktree `scratchpad/gx_dev` still has the patch applied, so it can seed a PR. Remove it with `git worktree remove`.
