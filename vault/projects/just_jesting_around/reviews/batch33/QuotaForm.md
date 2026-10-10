# QuotaForm

Selected originator: `client/src/components/admin/QuotaForm.test.ts`. Baseline **13 tests** → final **14**. The first edit-mode case is split in two: "loads all quota fields" and "keeps the saved name in the title while the name is edited".

What changed:
- **Filter mock.** The hand-written `vi.mock("@/composables/filter/filter.js")` factory is replaced by the shared side-effect import `@/composables/__mocks__/filter`, the same one FormSelect, FormData, NotificationForm, BroadcastForm, ToolInstallationRequestForm and ToolBoxSearch use. The local mock returned an empty `filtered` list. The shared one passes the options through, so FormSelection now renders its real options. No case reads them.
- **Mount and pinia.** `mountTarget(quota?)` used to serve the quota only when one was passed. It is now `mountQuotaForm(quotaId?)` plus `mountEditForm(quota)`, which serves `GET /api/quotas/{id}` and then mounts. The failed-load case had a copy of the mount options. It now serves its 404 and calls `mountQuotaForm("q1")`. `getLocalVue()` is called per mount and uses `global`/`props`. Before, it ran once per file with `localVue`/`propsData`. Each mount therefore gets a fresh active pinia, so the `beforeEach` `setActivePinia(createPinia())` is gone. The `QuotaForm as object` cast and the `FontAwesomeIcon` stub are also dropped, with no type errors or warnings.
- **Groups handler.** It is served in the top-level `beforeEach`, since every mount loaded groups. `useGroups` was a misleading composable-style name.
- **Typed fixture.** `quotaDetails` is typed as `components["schemas"]["QuotaDetails"]`, with `Partial<QuotaDetails>` overrides. This removes the six `as const` casts and the `Record<string, unknown>` overrides. All fixture values are unchanged.
- **Assertions and helpers.** Field values use jest-dom `toHaveValue` instead of `toHaveProperty("value", ...)`. A `SELECTORS` constant holds the repeated ids. `choose` throws a named error when no FormSelection matches, replacing a `!` non-null assertion. Each test has blank lines between arrange, act and assert.

Preserved: every request body (`toEqual` and `toMatchObject` alike), each router push, the hidden users/groups/source-label sections, both validation messages with empty request lists, and the failed-load message with no submit button. These cover all 9 edit and 4 create scenarios.

The title case also asserts that the edited name is not in the title. That is clarity, not a strengthening: it can't fail unless the `Quota 'Existing Quota'` check also fails.

Reuse: `@/composables/__mocks__/filter`, `@/composables/__mocks__/config` (`setMockConfig`/`resetMockConfig`), `useServerMock`, `getLocalVue`, the schema `components` type. No new shared helper. RoleForm had the identical local filter mock and adopts the shared one in its own commit ([RoleForm](RoleForm.md)).

Validation: 14 tests pass shuffled (seed `330101`, `NODE_OPTIONS=--no-webstorage`). ESLint (`--max-warnings 0`), Prettier and `vue-tsc --noEmit` pass.

Not shared: `choose` (FormSelection by id) and `captureRequests` look alike in RoleForm, but the request shapes differ and there are only two consumers. They stay local.
