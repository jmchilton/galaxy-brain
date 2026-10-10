# GalaxyAI/test-utils

New shared harness `client/src/components/GalaxyAI/test-utils.ts` for the two suites that mount the real GalaxyAI chat against mocked `GalaxyApi` spies: `GalaxyAI.newchat.test.ts` (originator) and `GalaxyAI.routesync.test.ts` (supporting). Both carried an identical ~100-line block: hoisted API spies and message/input stubs, eleven `vi.mock` registrations, `mountChat`, `messageTexts`, `sendMessage` and an untyped deferred promise. routesync's prefill case also repeated the whole mount with different props.

The harness owns the hoisted stubs and the module mocks shared by both suites (`@/api`, `@/api/client`, the two child-component modules, active context, agent actions, confirm dialog, markdown, toast, entity mentions, user local storage), following `tests/vitest/mockHelpPopovers.js`. It exports `mockGet`/`mockPost`, `ChatInputStub`, `mountChat(props)` (panel by default, real Pinia, initial loads flushed), `messageTexts`, `sendMessage`, `chatReply(response, exchangeId)` and a typed `deferredResponse<T>()`. Each suite keeps its own `vue-router` mock (routesync's route is mutable scenario state) and its own `beforeEach`. Consumers must reach GalaxyAI through `mountChat` rather than importing `GalaxyAI.vue`, so the harness's mocks are registered before the component loads; the `.chat-message-stub` assertions fail if they are not.

Two shared mocks were dropped as dead setup: the `Element.scrollTo` patch (happy-dom implements it; its comment named jsdom) and `@/app` (only reached from a ChatActions click handler no scenario exercises). Both suites pass without them.

`GalaxyAI.test.ts` is not a consumer: it uses MSW, `shallowMount` and different composable mocks. The deferred promise stays GalaxyAI-local rather than going to `tests/vitest/helpers`; the batch10 review rejected a generic deferred helper, and `Promise.withResolvers` is unavailable at the client's ES2022 target.

Supporting routesync change: 3 → 3 cases. It adopts `mountChat` (including the prefill mount, whose explicit `panel: true` is now the default), `chatReply` and `deferredResponse`. Every assertion and route/query value is unchanged.

Validation: both suites pass shuffled (seed `240101`), 9 tests; scoped ESLint and Prettier pass; full `vue-tsc --noEmit` passes.
