Proceed with the implemented scope: ten selected originators plus the two concrete supporting consumers and their test helpers. This follows the authorized readability loop and its requirement to implement useful reuse across files; no scope decision requires user input.

## As implemented: ten originators and concrete reuse

Review the ten selected suites, preserve their original behavior and inputs, and split existing combinations into independently named cases. Add a typed chat-history fixture used by both the selected chat store and supporting ChatModeSelector suite; extract visibility-listener cleanup used by the selected notification store and supporting history store. Only the ten selected originators advance inventory counters; supporting suites remain eligible for full review later.

| Pros | Cons |
| --- | --- |
| <ul><li>Completes the requested ten-test iteration.</li><li>Applies both abstractions to real consumers immediately.</li><li>Keeps changes in tests, fixtures, and test helpers.</li></ul> | <ul><li>Requires validation of two supporting suites in addition to the ten selected suites.</li><li>Full mounting remains appropriate for the existing menu and tooltip contracts.</li></ul> |

## Contract to the ten selected files

Apply only local readability changes and defer the chat fixture and shared listener cleanup. This would reduce the changed-file count, but leave the same sparse chat-history casts and duplicate cleanup in their identified consumers, contrary to the explicit cross-file follow-through requested in LOOP_ITERATION.md.

| Pros | Cons |
| --- | --- |
| <ul><li>Smaller review surface.</li><li>Fewer supporting test runs.</li></ul> | <ul><li>Leaves concrete reuse incomplete.</li><li>Preserves avoidable duplication and casts.</li></ul> |

## Expand to additional full reviews or production changes

Review more chat/upload/tooltip consumers, add generalized factories, or alter production watcher/component behavior while improving the selected suites. The reviewed evidence supports the two implemented shared abstractions; broader domain defaults, new behavior, and additional originator reviews have no demonstrated need in this iteration.

| Pros | Cons |
| --- | --- |
| <ul><li>Could discover additional future reuse.</li></ul> | <ul><li>Expands beyond the requested ten-originator batch.</li><li>Adds design and validation work without a concrete current contract to improve.</li></ul> |

## Expand documentation or browser validation

Add new README rules or extend E2E screenshot scenarios for the covered components. Existing guidance already addresses the observed scenario naming, typed fixtures, selective mounting, API response handling, and cleanup patterns; this iteration changes no production rendering, styles, or E2E tests, so neither expansion is justified.

| Pros | Cons |
| --- | --- |
| <ul><li>Could provide additional examples if a future gap emerges.</li></ul> | <ul><li>Generic advice would repeat established guidance.</li><li>Browser captures would not demonstrate any new visual behavior.</li></ul> |

The evaluation uses the iteration's reviewed baseline `7c2738f4644b7b0f6923d9a2e6654349210e81b8`. It covers ten selected suites, two supporting suites, and two test-helper files; correctness and assertion-preservation review belongs to the separate normal review. Per-originator reviews identify no worthwhile deferred scope expansion or marginal advice.
