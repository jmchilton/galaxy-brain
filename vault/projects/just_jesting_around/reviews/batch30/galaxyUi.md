# galaxyUi (Tool Shed)

Selected originator: `lib/tool_shed/webapp/frontend/src/components/galaxyUi.test.ts`. Baseline and final: **8 tests**.

The local `makeRouter()` is gone; the router-linked `it.each` rows mount with the shared `createMemoryRouter()` from `@/test-utils`, and the `vue-router` import goes. Auto-unmount is added.

The three ESLint warnings at HEAD are cleared without disables. Both v-model cases built a `defineComponent` parent just to write `v-model` in a template (the two `vue/one-component-per-file` warnings) and then read or wrote the parent's ref through `wrapper.vm as unknown as {...}`. On plain Vue 3, `v-model` on a component compiles to the `modelValue` prop plus an `onUpdate:modelValue` listener, so the cases now mount GTabs and GCollapse directly with those, the pattern `client/packages/ui` already uses in `GCheckbox.test.ts` and `GFormInput.test.ts`. The `findAll(".nav-link")[0]!` non-null assertion becomes `get(".nav-link")`, which fails loudly when the first tab is missing. A comment line above the describe states the compile equivalence so the reader sees why no template is needed. A scoped `/* eslint-disable vue/one-component-per-file -- ... */` (precedent: `client/src/directives/vGTooltip.test.ts`) would have kept the template harnesses. It was not used because the direct mount is shorter, needs no casts, and still fails if either component goes back to `value`/`input`.

Preserved: GTabs still renders "Two" active from an initial model of 1, and a click on the first tab still has to reach the parent as `update:modelValue` with 0 (`emitted(...)` is `[[0]]`, where the parent ref used to read 0). Strengthened: the listener feeds the value back through `setProps`, and the test checks the first tab is then the active one, so the round trip is covered, not just the emit. GCollapse still opens when its model turns true; it now also checks it starts closed, matching the compat twin in `client/packages/ui/src/components/vModelContract.test.ts`. The four click cases are unchanged apart from the router.

Reuse: adopts `createMemoryRouter()` (the batch 29 follow-up); no new helper.

Validation, from `lib/tool_shed/webapp/frontend/`: 8 tests pass shuffled (seed `300101`, `NODE_OPTIONS=--no-webstorage`). ESLint (`--max-warnings 0`) and Prettier pass. Tool Shed `pnpm typecheck` and client `vue-tsc --noEmit` pass.

Guidance: none.
