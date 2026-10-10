# LoginIndex

Selected originator: `client/src/components/Login/LoginIndex.test.js`. Baseline **1 test** → final **2 tests**.

The single "switching between register and login" case, built from a mutable `beforeEach` wrapper, splits into two named scenarios around a `mountLoginIndex()` factory: the initial render with user creation off, and the `allowUserCreation` false → true transition through `setProps`, which stays the scenario under test. `MountTarget` becomes `LoginIndex`, the deprecated `injectTestRouter` and top-level `router` option go (getLocalVue's default router already serves `GLink`'s `to`), and the card header gets a selector constant. `mount` stays, so `LoginForm` still renders for real.

Strengthened: the commented-out register-toggle checks and their TODO ("never appears because of the GLink change") were stale. With Vue 3 `GLink` renders `<a id="register-toggle" href="/register/start">`, so the second case now asserts the link's text ("Register here.") and `href` instead of inferring it from the disabled message's absence. Shown to fail on their own: pointing `REGISTER_TOGGLE` at a wrong id fails the case at the toggle's `text()` (empty wrapper), and a wrong expected `href` fails at the `href` assertion. The `[id=register-toggle]` selector became `#register-toggle`.

Every original assertion survives: header text, disabled message present and toggle absent before the change, disabled message absent after it.

Reuse: `getLocalVue` from `@tests/vitest/helpers`; no new helper.

Validation: 2 tests pass shuffled (seed `420101`, `NODE_OPTIONS=--no-webstorage`). ESLint, Prettier and full client vue-tsc pass.

Guidance: `Login/LoginForm.test.ts` carries the same stale TODO and commented assertions in its "props" case, and its "hides register link when local accounts are disabled" check (`findAll(REGISTER_TOGGLE).length === 0`) is meaningful again now that the link renders. Worth restoring there as a follow-up.
