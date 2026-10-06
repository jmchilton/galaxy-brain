# issue_23917_compat_vmodel_stubs — implementation debrief

Fixes galaxyproject/galaxy#23917 on `dev` at `253a4cb0b9c`. Two commits: `89eb4adf9ca` (hook + drop opt-outs), `ab8e9f17f51` (review follow-ups). Pushed to `jmchilton`. No PR.

## Change

- `client/tests/vitest/setup.ts`: `config.plugins.createStubs` returns the real component when its `compatConfig.COMPONENT_V_MODEL === false`, else `undefined` (VTU 2.5.1 falls back to its default stub). The outer cast stays because VTU's `CustomCreateStub` type omits the `undefined` return.
- Dropped the three `GFormInput: false` opt-outs from #23908: `History/Modals/CopyModal.test.ts`, `History/WorkflowExtractionForm.test.ts`, `Workflow/Editor/Index.test.ts`.
- New `client/tests/vitest/setup.test.ts`: shallow-mounts an inline parent with `<GFormInput v-model>`, checks `modelValue` and the `update:modelValue` round-trip. It's the first spec under `tests/vitest/`, which the vitest include glob already covers.

## Validation (node 22.20.0)

- Red: without the opt-outs or the hook, the 3 specs had 25 fail / 43 pass. The new spec run against dev's `setup.ts` fails with `expected undefined to be 'first'`.
- Green: 3 specs 68 pass; with the new spec and `VaultSecret.test.ts`, 72 pass.
- Full client vitest: 546 files, 4196 pass, 1 skipped. This run used the first commit; the second only adds the spec and removes a cast.
- vue-tsc (covers `tests/**/*.ts`), eslint and prettier are clean. Commit hooks passed.

## Review

A subagent reviewed against `_shared/REVIEW_FOCUS.md`. It found no blockers, and I acted on these:
- Dropped the inner cast. `ConcreteComponent` already has `compatConfig?: CompatConfig` in runtime-core 3.5.43, so a misspelled key now fails type-checking. The issue body's claim that "`compatConfig` also isn't on `ConcreteComponent`" is wrong. Fix it if the issue gets edited.
- The comment now says an explicit `stubs: { X: true }` also goes through the hook. Pass a stub component to force stubbing.
- Added the direct spec, so coverage no longer depends on the three consumer specs.

## Not done, and why

- **Not keying on `compatConfig.MODE === 3`.** MODE 3 also disables compat v-model, so `SortableList`, vue-multiselect, `RouterLink` and soon `AgGridVue` (`sample_sheet_vue3`) have the same stub bug in principle. Widening the hook would make every shallow spec render those for real, which is a suite-wide change in what shallow mounts render, and nothing on dev fails from it. `ActivityBar.test.js` already handles its draggable case with a stub that carries `compatConfig: { MODE: 3 }`.
- **Not pinning the `X: true` caveat in a test.** No spec uses `GFormInput: true` or `GCheckbox: true` today. It matters when `GTabs` or `GAlert` migrate: `DatasetView` has `GTabs: true`, and `UserPreferences`, `ExternalRegistration` and `VisualizationUnsavedChanges` have `GAlert: true`. Those specs would then render the real component unless they pass a stub component instead.
- **Legacy `Vue.extend` components.** They keep `compatConfig` under `.options`, so the hook doesn't see it. Not relevant: GFormInput and GCheckbox are `<script setup>`.
- **No upstream VTU issue filed.** Copying `compatConfig` in `createStub` next to `model` (vuejs/test-utils#1550) would fix it for everyone. Optional.

## Affected specs

`ConfigTemplates/VaultSecret.test.ts` is the only other shallow spec of a GFormInput/GCheckbox consumer. It now renders a real password `GFormInput`, its assertions don't touch it, and it passes. No snapshots or `*-stub` assertions reference these components.
