# rateLimiter review — iteration 05

Selected originator: `client/src/api/client/rateLimiter.test.ts`.

Baseline and final: 4 cases, 13 assertion statements in source (the warning loop and shared non-retry checker execute additional runtime assertions), unchanged. GET still sends a real GalaxyApi request through MSW, observes status 429/error/err_code, checks the initial configured-delay warning, each retry warning, max-retry URL error and exactly maxRetries+1 requests. POST chat body/query, DELETE dataset/purge query and PUT dataset remain distinct real API requests, each checked for 429/error/code, no warnings/errors and exactly one request.

Removed comments restating setup/assertions, renamed scenarios and the request spy/checker around observable rate-limited behavior, and made the retry-loop variable descriptive. Request counts are cleared before each case; warning/error spies are individually restored after each case. Keeps real timers for the retry wait: an artificial timer orchestration would add complexity around MSW without improving these four small API-boundary tests. No middleware-only substitution, endpoint flattening, or weakened non-idempotent request checks.

Reuse search: endpoint-specific request shapes and typed response handlers are clearer inline; only the six-assertion non-retry checker repeats and already remains local. Existing README has enough guidance. No new abstraction, supporting migration or marginal advice.

Validation: all 4 cases pass in the affected 11-suite/63-case run; scoped ESLint passes. Root performs final combined checks and type checking.
