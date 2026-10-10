# JobInformation

Selected originator: `client/src/components/JobInformation/JobInformation.test.js`. Baseline **6 tests** (two describes) → final **7 tests** (one describe).

Two `beforeEach` blocks (handlers, then a mount into shared `wrapper`/`jobInfoTable` variables) become a `beforeEach` for the base handlers plus `serveJob(job)` and an async `mountJobInformation()` that each case calls. The stream-read case no longer unmounts the shared wrapper and remounts with legacy `propsData`/`localVue`/`pinia` options; it calls `serveJob` with its error job and mounts once. The separate "invocation lookup" describe, which repeated all four handlers to change one, joins the main describe and overrides only `/api/invocations`. All mounts now use `withPlugins(localVue, createTestingPinia({ stubActions: false }))`; the two legacy mounts had `stubActions: true`, so nothing that ran for real before is stubbed now. `enableAutoUnmount(afterEach)` unmounts every wrapper, which stops the providers' 3 s auto-refresh timers between tests and keeps the coverage the old explicit `wrapper.unmount()` gave `SingleQueryProvider`'s `unmounted` hook (without it that file dropped 2 statements). `verifyValues` and its unused `wrapped_in_brackets` option become a field-id → fixture-value map checked with `toContain`. Selectors live in `SELECTORS`.

Removed dead mock: `vi.mock("app")`. No `app` alias exists in `vitest.config.mts`, there's no `node_modules/app` or `__mocks__/app`, and nothing imports `app`. Replacing it with a factory that throws leaves the original suite green, so it never ran. Nothing in the test depended on it.

Vacuous assertions replaced:
- `expect(jobInfoTable).toBeTruthy()` can't fail because `find()` always returns a wrapper. It's now `exists() === true`.
- In "job messages", `expect(jobResponse.job_messages.includes(msg))` has no matcher. Its intent was that each rendered message matches its fixture entry, and that can't be expressed against this fixture. `jobInformationResponse.json` has bare-string `job_messages` (`"test-msg1"`…), but `JobMessage` is an object. `filterMetadata` runs `Object.entries` over each string, so the page renders `Job Message 1:0: t1: e2: s…`.
- The fixture case now checks the count and that each message starts with its `Job Message N:` header. Shifting the expected index makes it fail.
- A new case, "lists the fields of each structured job message", serves two object-shaped messages inline and asserts each one's header and `desc: …` line. Changing an expected `desc` makes it fail. The fixture itself is unchanged; `Tool/ToolSuccessMessage.test.ts` shares it.

Every other original assertion survives: 10 rows; stdout/stderr code text; message count; the stream-read message's desc, type, stream and errno; tool id, version, job id and copied-from id (plus decoded id, via `toContain`); job-state cell; the table and invocation-lookup error text on a failed lookup.

Reuse: `getLocalVue`, `nth`, `withPlugins` from `@tests/vitest/helpers`, `useServerMock`, and VTU's `enableAutoUnmount`. No new shared helper.

Validation: 7 tests pass shuffled (seed `430101`, `NODE_OPTIONS=--no-webstorage`). Per-file coverage across `src/**` is identical at base and tip (`JobInformation.vue` 64/69 statements, 92/120 branches; `SingleQueryProvider.js` 19/35). ESLint, Prettier and full client vue-tsc pass.

Guidance: when a test drops an explicit `unmount()` while restructuring, check the coverage of provider and lifecycle hooks. `enableAutoUnmount(afterEach)` keeps it and stops the auto-refresh timers too.
