# issue_23917_compat_vmodel_stubs — polish debrief

2026-10-06. Branch `a568fce6dd1` (on dev `253a4cb0b9c`, 0 behind). Client test infra only.

## CI
Fork CI on `ab8e9f17f51` all queued; nothing red. New head `a568fce6dd1` pushed.

## Checklist (GENERAL.md)
Subagent: every item pass or N/A; human-read left for John. VTU 2.5.1 fallback, "only GFormInput/GCheckbox opt out", and VaultSecret claims verified. Gap found: `setup.test.ts` only checked one direction. Added a plain-child `*-stub` case (`a568fce6dd1`); red-checked against a hook returning the real component for everything.

## Strengthening
Description-only: "and checks its v-model" (VaultSecret needed nothing); "no application code changes"; highlights trimmed to sentences; future `X: true` cost named (DatasetView `GTabs: true`, three `GAlert: true` specs); "Builds on #23908" (subagent wrongly thought it unmerged — merged 2026-10-05). Full client vitest re-run on head: 547 files, 4198 pass, 1 skipped.

Not done: scratch experiment migrating `GTabs` to show a later migration needs no spec changes.

## Questions for John (scope)
- Return a stub that copies `compatConfig` instead of the real component, so shallow semantics and `X: true` keep stubbing?
- Include `compatConfig: { MODE: 3 }` components (SortableList, vue-multiselect, RouterLink, upcoming AgGridVue)?
- File upstream VTU issue to copy `compatConfig` in `createStub` beside `model` (vuejs/test-utils#1550)?
- Issue #23917 body wrongly says `compatConfig` isn't on `ConcreteComponent`; edit it?
