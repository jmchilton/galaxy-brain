# vNoSanitizeHtml

Selected originator: `client/src/directives/vNoSanitizeHtml.test.ts`. Baseline **2 tests** → final **7 tests**.

The base file failed `eslint --max-warnings 0` with two `vue/one-component-per-file` warnings: `mountWith` had one host and the v-if reuse case defined a second. Following the sibling `vSanitizeHtml.test.ts`, there is now one host: `mountWith(value)` takes `other` and `rich` props, and `rich` switches between same-tag v-if/v-else `.target` divs. The reuse case is `mountWith("<b>rich</b>")` then `setProps({ rich: false })`. `targetOf(wrapper)` names the element under test. No `eslint-disable` was added. The one multi-step case (mount, change, null) is split into three, one behavior each. A `beforeEach` clears the global `sanitizeHtml` spy, so the "not called" checks don't depend on what else ran.

Every original assertion survives. Mount renders the markup as given and the sanitizer isn't called. A changed value replaces the markup. A null value clears it. The reuse case shows `<b>rich</b>` and then `plain`. The change case also asserts the sanitizer wasn't called (new). Three cases are new and mirror the sibling: mounted with null renders nothing; an unrelated re-render (`other` prop) leaves the DOM alone (it fails if the `value !== oldValue` guard in `beforeUpdate` is removed, checked); and the markup stays while the element is being destroyed (the directive has no unmount cleanup on purpose). Coverage of `vNoSanitizeHtml.ts` goes from 4/6 branches to 6/6; statements stay 100%.

Reuse: the global directive registration and the `sanitizeHtml` spy from `tests/vitest/setup.ts` / `directives/__mocks__/sanitizeHtml.ts`. The host shape matches `vSanitizeHtml.test.ts`. No new helper.

Validation: 7 tests pass shuffled (seed `450101`, `NODE_OPTIONS=--no-webstorage`). ESLint (`--max-warnings 0`), Prettier and full client vue-tsc pass.

Guidance: none.
