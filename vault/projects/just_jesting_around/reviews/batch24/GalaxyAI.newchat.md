# GalaxyAI.newchat

Selected originator: `client/src/components/GalaxyAI.newchat.test.ts`. Baseline and final: **6 tests**.

The file now holds only its `vue-router` mock and the scenarios; the stubs, shared module mocks and mount come from the new `GalaxyAI/test-utils.ts` ([GalaxyAI-test-utils](GalaxyAI-test-utils.md)). `mountChat` flushes the initial history load itself, so the per-test `mountChat(); await flushPromises()` pair is gone. Response objects are built by the shared `chatReply` and a local `chatFailure(status, error)`, which keeps each failure's status and raw error visible on one line. A local `isAwaitingReply` names the `.loading-entry` check. Deferred replies are typed. The legacy `localVue`/`propsData` mount and its `as object` cast are replaced by the harness's `global: withPlugins(...)` mount.

Assertions are strengthened, not reduced. Every "length, then index" pair becomes one `toEqual` on the whole conversation using the original strings, so the message order and the opening message are checked too. The opening message is "New conversation started. How can I help?" in every case (the panel starts with a fresh chat), matched by `stringContaining` as the original reset assertion did. The three failure cases assert the full conversation instead of only the last message. Exact-match vs `toContain` semantics are preserved per case.

Preserved: the exchange-id recording, the mid-flight reset (loading indicator on/off, null `activeChatId` before and after the late reply, late reply not appended), the stale-first/fresh-second ordering with all intermediate checks, the 504 rewording, the API error message, and the unparsed-HTML guard with its explanatory comment.

Reuse: adopts the new GalaxyAI harness; no other helper needed. Not migrated to MSW: the unparsed-body case deliberately bypasses the API client's normalization.

Validation: 6 tests pass shuffled (seed `240101`), alongside routesync's 3; scoped ESLint and Prettier pass; full `vue-tsc --noEmit` passes.

Guidance: none. Module-mock harnesses that consumers must import before the component are already precedented (`mockHelpPopovers.js`).
