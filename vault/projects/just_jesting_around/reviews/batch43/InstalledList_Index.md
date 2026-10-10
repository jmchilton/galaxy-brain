# InstalledList/Index

Selected originator: `client/src/components/Toolshed/InstalledList/Index.test.js`. Baseline **1 test** → final **3 tests**.

The single "test installed list" case splits into three named scenarios around a `mountInstalledList()` factory: the loading message until repositories arrive, the listed repositories with the newer-version badge, and the Tool Shed column that appears when repositories come from more than one Tool Shed. Stubs move from the top-level (adapter-translated) `stubs` into `global.stubs`, spreading `localVue.stubs` first so the Portal defaults stay. The `GLink: GLink` entry, which "stubbed" GLink with itself, goes; GLink still renders for real, and `RepositoryDetails` and `LoadingSpan` stay stubbed. `$nextTick` becomes `flushPromises()`. Selectors move into `SELECTORS`, and `.at(i)` becomes `nth`.

Removed dead mocks: `vi.mock("app")` and `vi.mock("onload/loadConfig", () => ({ getAppRoot: () => "/" }))`. Neither bare id has an alias in `vitest.config.mts`, a `node_modules` package or a `__mocks__` file, and nothing imports them. When their factories are swapped for ones that throw, the original suite stays green. As a positive control, the same throwing factory under the real id `@/onload/loadConfig` fails the suite on import. The `onload/loadConfig` mock was meant to stub `getAppRoot` for the component's `@/onload/loadConfig` import, but that stub never took effect: the real `getAppRoot` has always run. The component only stores its result in `this.root`, which the template never reads. The mock isn't repointed at the real path, because that would stub something the original ran for real.

Every original assertion survives: the loading span's message before the load, the installed count message, two names in order, three GLinks, the badge on the first repository's link, and "Tool Shed" among the column headers. Strengthened: the loading span is gone after the load, and the second repository's link (latest revision) has no badge. A mutation marking it not-latest fails that case. Collapsing both repositories onto one Tool Shed fails the column case.

Reuse: `getLocalVue`, `nth` from `@tests/vitest/helpers`. No new helper.

Validation: 3 tests pass shuffled (seed `430101`, `NODE_OPTIONS=--no-webstorage`). Per-file coverage across `src/**` is identical at base and tip (`Index.vue` 32/38 statements, 14/28 branches). ESLint, Prettier and full client vue-tsc pass.

Guidance: the sibling `InstalledList/Details.test.js` carries the same two dead mocks. A throwing factory is a quick way to prove a `vi.mock` is dead, as long as you check it against the real id as a positive control.
