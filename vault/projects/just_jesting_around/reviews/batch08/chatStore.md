# Chat store review — iteration 08

Selected originator: `client/src/stores/chatStore.test.ts`. Baseline: 20 cases; final: 22.

Reuse `setupTestPinia()` and replace sparse `ChatHistoryItem[]` casts with a typed `getFakeChatHistoryItem()` factory in `client/tests/test-data/chat.ts`. The same factory replaces two sparse history arrangements in `client/src/components/GalaxyAI/ChatModeSelector.test.ts`, giving it two concrete consumers. Scenario IDs and order remain inline; defaults fill only the required query, response, agent type and timestamp fields absent from the old sparse fixtures. History filtering and dock selection inspect the same IDs, so those added fields cannot satisfy the existing expectations on their own.

Use the real Galaxy API client with a typed MSW PUT handler instead of mocking PUT and supplying unused GET/DELETE spies. The handler verifies the exact batch route and captures the actual JSON body. The original `{ids: ["a", "b"]}` contract becomes an exactly-once body assertion; retained history `["c"]`, clearing the deleted active chat, and sending no request for an empty set remain checked.

The three location transitions become separate named rows with the original inputs preserved: center→right, right→bottom, bottom→center. This expands one case into three, explaining the two-case increase. Preserve default center/hidden/null state; showing with an ID, omitted ID and null; hiding and both toggle directions; setting/clearing IDs; the 0→1→2 new-chat counter and clearing an existing active ID; deleting selected histories and preserving/deleting the active ID; both API deletion cases; and the original right/bottom/center computed-state sequences and expectations.

Supporting `ChatModeSelector.test.ts` keeps all 24 cases and every original assertion. Only its two history fixture assignments and imports change; no counter advances for that supporting suite.

Existing README guidance covers named input combinations, existing domain setup, shared factories with real consumers, API handlers and returned promises. No README addition or marginal advice is proposed.

Validation: the six affected suites pass 107 cases in `/private/tmp/jest_readability_batch08_stores_final.json`; current-config ESLint passes for all eight owned source files. Full client types passed after narrow invocation-schema corrections. The final six-file shuffled run passes all 107 cases with seed 80109 (`/private/tmp/jest_readability_batch08_stores_shuffled_final.json`).
