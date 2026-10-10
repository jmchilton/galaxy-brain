# JobElements

Selected originator: `client/src/components/Markdown/Sections/Elements/JobElements.test.ts`. Baseline and final: **6 tests** (3 cases × JobMetrics/JobParameters).

`enableAutoUnmount(afterEach)` replaces the module-level `let wrapper` and the manual unmount. `mountElement` now just returns its wrapper. The `afterEach` that clears `translations` stays. A `toolDetailsButton(label)` selector builder replaces the three hand-written `button[aria-label='…']` strings, so the localized case reads as the same button under a translated name. The `component as object` cast is dropped: vue-tsc accepts the `describe.each` component union with the typed `props`.

All three scenarios per component and every assertion are kept with the same values: the button exists and is the popover's resolved target, the popover is interactive, the "Werkzeugdetails" accessible name appears, and there is no button without a tool. The testing-store `getJob` override and its `as ShowFullJobResponse` stand-in are unchanged. No job factory exists in `tests/test-data` (`JobState.test.ts` and `JobStepJobs.test.ts` cast their own literals). Only `tool_id` matters here, so adding one isn't justified by this test.

Reuse: `withPlugins`, `getLocalVue`, `useServerMock`. No new helper.

Validation: 6 tests pass shuffled (seed `280101`, `NODE_OPTIONS=--no-webstorage`). Scoped ESLint and Prettier pass; full `vue-tsc --noEmit` passes.

Guidance: none.
