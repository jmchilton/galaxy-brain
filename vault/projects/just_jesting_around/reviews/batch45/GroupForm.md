# GroupForm

Selected originator: `client/src/components/admin/GroupForm.test.ts`. Baseline **3 tests** → final **6 tests**.

The group, user and role literals inside `useGroupHandlers` are now named fixtures (`GROUP`, `GROUP_USER`, `GROUP_ROLE`). Every case served them, so `serveGroup()` now runs in `beforeEach`, still before each mount. The PUT capture's response reuses `GROUP`. `mountTarget` is `mountGroupForm`. It mounts with Vue Test Utils v2 options (`props`, `global: { ...localVue, stubs }`) instead of the adapter-translated `localVue`/`propsData`/top-level `stubs`, and the `as object` cast is gone (vue-tsc accepts it). Stubs are unchanged: `localVue.stubs` (Portal, PortalTarget) plus FontAwesomeIcon (the spread was restored at review). The two ids live in `SELECTORS`. `enableAutoUnmount(afterEach)` was added, and the describe is `GroupForm edit mode`.

Every original assertion survives. The rename case was split in two. One case checks that the title shows `Group 'Group 1'` before and after the name is edited. The other checks that saving PUTs `{ name: "Renamed", user_ids: ["u1"], role_ids: ["r1"] }` and pushes `/admin/groups`. The empty-name case keeps its message, no request and no push. The users-load failure is now one row of an `it.each` over the three load requests. Each row has its own error message ("Users failed" as before; "Group failed" and "Roles failed" are new), and each asserts the message and that the submit button is gone. Group and roles failures each take their own early return in `loadGroupData`. GroupForm.vue coverage goes from 51 to 59 lines and 22 to 24 branches. No other file changes.

Reuse: `useServerMock` and `getLocalVue`, as before. `RoleForm.test.ts` and `QuotaForm.test.ts` (other lanes) have the same `vue-router` push mock and legacy mount options. No shared helper is proposed: the push mock is three lines, and those files aren't this lane's.

Validation: 6 tests pass shuffled (seed `450101`, `NODE_OPTIONS=--no-webstorage`). ESLint (`--max-warnings 0`), Prettier and full client vue-tsc pass. Per-file coverage at base and tip: no file lost lines, branches or functions.

Guidance: none.
