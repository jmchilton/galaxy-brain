# Invocation table provider

Originator: `client/src/components/providers/InvocationsProvider.test.js`. Cases: **1 → 1**.

Flatten two redundant describe blocks into one behavior-named scenario. Replace the callback boolean with a spy, await the provider promise directly, and assert the fetched items and callback response. The request handler now checks the complete query instead of silently returning an empty array on a wrong query.

Preserved the `/prefix/` root, first page, page size 50, `include_terminal: false`, existing invocation JSON fixture, and `total_matches: 1` response header. The test now proves exact `limit=50`, `offset=0`, and `include_terminal=false`, returned invocation data, callback called once with that data, and the header. A wrong request can no longer pass merely because some callback fired.

Reuse: retain the existing invocation JSON fixture and MSW helper. The prefixed route is deliberately untyped; OpenAPI's unprefixed path cannot express this configured root. Other paginated providers use different routes/contracts; this single short arrangement does not warrant a helper. Existing scenario and direct-promise guidance covers the improvement; no new guidance or marginal advice proposed.

Validation: all four owned suites pass **27/27**, with zero skips under shuffled seed `140041` (`/private/tmp/batch14_graph_tests.json`). Scoped ESLint, Prettier, and whitespace checks pass. The driver performs full-client typechecking and combined batch validation.
