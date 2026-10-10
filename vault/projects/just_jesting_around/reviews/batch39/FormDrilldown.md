# FormDrilldown

Selected originator: `client/src/components/Form/Elements/FormDrilldown/FormDrilldown.test.js`. Baseline and final: **4 tests**.

The test was already small and scenario-local, so the changes are light. `mountDrilldown(multiple, value)` takes named `{ multiple, value }`, so each case reads which mode and starting selection it uses. The mount uses `props`/`global` in place of the legacy `propsData`/`localVue`. `toggle` uses `wrapper.get`, so a missing option fails with its selector instead of a `setValue` on an empty wrapper. A blank line separates action from assertion. Two names now say what they check: "removes only the deselected option, keeping its selected descendants" (deselecting `a` keeps `aa`) and "emits the chosen value alone when not multiple".

Preserved: all four cases, the `OPTIONS` tree, the starting values and every `emittedArg(wrapper, "input")` expectation are unchanged.

Coverage: unchanged.

Reuse: `emittedArg` and `getLocalVue` from `@tests/vitest/helpers`; no new helper. `utilities.test.js` next to it covers the pure tree helpers, so nothing moves there.

Validation: 4 tests pass shuffled (seed `390101`, `NODE_OPTIONS=--no-webstorage`). ESLint (`--max-warnings 0`), Prettier and full `vue-tsc --noEmit` pass.

Guidance: none.
