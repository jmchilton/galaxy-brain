# GalaxyAI route synchronization stories review — 4af958b28a5

Independent read-only review approved original assertions and story design against 95ff31b2782. One cleanup recommendation was applied and no recommendations remain unaddressed.

## Assertion mapping

All three original cases and 12 assertions survive. Saved exchange: exact route (1), with existing realistic NEW_EXCHANGE_ID replacing the placeholder. Seeded question: exact input value, no POST, one replacement, exact query replacement dropping q and retaining compact, input preserved after clearing the prop on the same instance (5). Held history: no route before settlement, new-chat route, one immediate message, no stale exchange route after settlement, one remaining message and new-conversation notice (6).

The positive historyStarted wait proves the request is held. Matching GET settlement plus flushPromises prevents final negatives passing early. NewConversation makes no initial history GET, so the matching lookup selects the intended request. Real children, pass-through API spies, typed MSW and existing realistic response fixtures replace shared test-utils module mocks. Live prop clearing uses a plain mount, avoiding composed-story remounts.

The reviewer noticed only the plain mount explicitly disposed its Pinia. The driver restored synchronous active-Pinia capture and onTestFinished disposal for both branches, preserving original ownership. Targeted unit tests, type-check and hooks passed again. No assertion changed.

## Story compatibility and validation

Only PrefilledCompactConversation was added; existing meta and scenarios remain unchanged. Downstream NewConversation play and answer/error plays must survive the next play rebase. Coordinator approved this additive integration.

Targeted unit 3/3 and Chromium probe run 4/4 passed. New-state probe checked exact prefill, enabled input, visible welcome and absence of submitted question. Probes removed. Complete unit gate passed 699 tests in all 88 selected files; browser passed 337 tests in 87 files. Types, formatting, lint and normal hooks passed. Push completed fast-forward.
