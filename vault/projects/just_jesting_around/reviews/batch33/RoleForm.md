# RoleForm (supporting)

Supporting test: `client/src/components/admin/RoleForm.test.ts`. Baseline and final: **12 tests**. It adopts the shared filter mock, as QuotaForm did. It is not a readability pass.

What changed: the local `vi.mock("@/composables/filter/filter.js", ...)` factory and its comment are replaced by the side-effect import `@/composables/__mocks__/filter`. The local mock returned no options. The shared one passes them through. The role-type selection is still driven by emitting `input` on FormSelection, and the users dropdown is vue-multiselect, so no assertion depends on the change.

Validation: 12 tests pass shuffled (seed `330101`, `NODE_OPTIONS=--no-webstorage`). ESLint (`--max-warnings 0`), Prettier and `vue-tsc --noEmit` pass.

Follow-up: it shares QuotaForm's other leftovers: `localVue`/`propsData`, a per-file `getLocalVue()` with a `beforeEach` `setActivePinia`, the `RoleForm as object` cast, a `roleType!` non-null assertion, and the `useGroups` name. A readability pass could apply QuotaForm's changes.
