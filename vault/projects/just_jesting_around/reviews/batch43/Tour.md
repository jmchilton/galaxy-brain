# Tour

Selected originator: `client/src/components/Tour/Tour.test.js` (tests `TourList.vue`). Baseline and final: **2 tests**.

The `beforeEach` that served two tours and mounted into a shared `wrapper` becomes `mountTourList(tours)`, which serves the given tours, shallow-mounts and flushes. Each case now states its own tours. Before, the sanitize case also got the `beforeEach` mount of the default tours, then overrode the handler and mounted a second, legacy-option (`propsData`/`localVue`) TourList. Now it mounts once with its single markup tour. It also clears the `sanitizeHtml` spy first, as LoginForm does, so earlier mounts can't satisfy the call assertion. The describe is renamed `TourList` after the component under test, the empty `props: {}` goes, and the link selector sits in `SELECTORS`.

Removed dead mock: `vi.mock("app")`. There's no `app` alias, package or `__mocks__` file, and nothing imports it. A throwing factory in its place leaves the original suite green. Nothing in the test depended on it.

Every original assertion survives: two tour links; the `sanitizeHtml(description, "default")` call and the rendered `<b>` text. Strengthened: each link's text names its tour, in order. Swapping the expected names fails the case. `shallowMount` stays, so `GLink` and `DelayedInput` are stubbed exactly as before.

Reuse: `getLocalVue`, `nth` from `@tests/vitest/helpers`, `useServerMock`. No new helper.

Validation: 2 tests pass shuffled (seed `430101`, `NODE_OPTIONS=--no-webstorage`). Per-file coverage across `src/**` is identical at base and tip (`TourList.vue` 16/19 statements, 12/24 branches). ESLint, Prettier and full client vue-tsc pass.

Guidance: none.
