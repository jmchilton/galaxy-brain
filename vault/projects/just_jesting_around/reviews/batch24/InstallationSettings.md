# InstallationSettings

Selected originator: `client/src/components/Toolshed/RepositoryDetails/InstallationSettings.test.js`. Baseline **1 test** → final **2 tests**.

The single "test tool repository installer interface" case is split into the two behaviors it checked: the dialog header (title, long description, owner/revision line) and the dependency defaults. A `mountInstallationSettings` helper holds the original props and awaits the `created()` request to `dynamic_tool_confs`, which previously settled after the test finished. The legacy `localVue`/`propsData` options become `global`/`props`.

The three `wrapper.vm.install*Dependencies` checks read internal data. They now assert what the user sees: a `dependencyOptions` helper maps each rendered checkbox label to its checked state, and the test expects all three ("Install resolvable/repository/tool dependencies") checked. Temporarily setting `install_repository_dependencies: false` in the config mock makes it fail, so it still ties the defaults to the configuration. The three header assertions are unchanged.

Removed `vi.mock("app")` (the component never reaches it; the suite passes without it) and the comment restating the config mock. The config mock stays local: `tests/vitest/mockConfig.js`'s `setupMockConfig` returns `config: { value }`, which this Options-API `data()` (reading `this.config.install_*` directly) would see as undefined.

Reuse: `getLocalVue`, `useServerMock`. No new helper.

Validation: 2 tests pass shuffled (seed `240101`); scoped ESLint and Prettier pass; full `vue-tsc --noEmit` passes.

Guidance: none.
