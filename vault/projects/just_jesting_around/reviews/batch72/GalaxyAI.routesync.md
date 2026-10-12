# GalaxyAI route sync — batch72

Originator `f67ea0d37591d755a5be7e94a2365efa20771fdd`, pinned base `27e6eaab10040eec5866dd9614ba44b7547c110d`.

All three cases/12 original checks remain: saved exchange route synchronization, seeded question without automatic submission and dropping only q, and suppression of stale exchange routing after starting a new conversation. Literal routes/questions/responses/query values, helper defaults, real store behavior, controlled child/API boundaries and original event/promise ordering remain. Required input-stub observations use getComponent; no checks are replaced.

A local public-props adapter calls existing mountChat unchanged. That async helper creates Pinia synchronously before its first await, so the adapter captures exactly that active instance and registers disposal before awaiting initial loads. Automatic unmount covers failed checks. The delayed history request retains its original resolution before final assertions and additionally settles/flushed on completion before store disposal; no request or prior store fallback is fabricated. Driver approved local ownership without support changes.

Pristine/final Node22.20 single-worker shuffled720101 pass3cases. Native V8 retains153files664→672 covered statement/function/branch-arm locations with zero loss; canonical helper setup contributes added locations. Actual canonical UI43files/35locations matches exactly, including imported setup and selected rendered boundaries rather than a claim every shared UI module renders. Native ESLint/Prettier and absolute sample hooks pass; driver owns integrated full types. Evidence /private/tmp/readability72-routesync-{before,after}, corresponding -ui JSON/logs and -eslint/-prettier/-hooks logs.

Only originator changes. Existing ownership/deferred/native inference guidance suffices; no new evidenced gap or shared/later-lane edits.
