# Batch 53: independent OIDC profile review

Reviewed `c0f2658a7a5c2db89878ac13ac047a59c933ad94` in `/private/tmp/galaxy-readability53-oidc` against pinned base `f3ffc6aaa4572195229049ce2b3e7ac7a203c191`, using shared normal review, test challenge, client README, Galaxy test-layer, and strict maintainability guidance.

Verdict: approve. No material fixes requested.

## Normal review

Both original cases and all four assertions remain: profile button presence, exact configured profile URL, email in the first definition-list value, and username in the second. `nth` preserves indexed assertions while failing clearly on a missing element; it does not replace ordered values with broad text matching. `getComponent` for the required href assertion preserves the earlier presence check separately.

Full `mount` remains, with the real GButton child and only the original FontAwesomeIcon stub. `withPlugins` replaces default Pinia/router instances with the owned instances while preserving shared plugins and stubs, preventing duplicate plugin state. Typed user overrides derive from the existing registered-user fixture factory. The shared configuration mock still supplies Vue refs and loaded=true; reset/set before each test yields the same single-provider fixture as the removed local mock factory.

Teardown order is sound: in the same top-level scope, reset is registered before `enableAutoUnmount`, so stacked `afterEach` unmounts components before resetting their configuration. `onTestFinished` then disposes the owned Pinia after hooks. `nextTick` awaits the same reactive render boundary as the old wrapper method.

## Test challenge debrief

These checks cover visible user-profile values and the child link contract, without reaching component internals or reimplementing its computeds. A mounted real GButton is warranted for the original parent/child boundary and remains intact. There is no new production behavior or server requirement; API or browser tests would add infrastructure without improving this fixture/render contract. No tests or original checks should be removed. Existing factory, config mock, plugin replacement, guarded indexing, and auto-unmount abstractions already cover the setup, so no new generic helper is justified.

## Strict maintainability

The rewrite replaces an ad hoc mock factory and legacy mounting options with established shared infrastructure. No new conditionals, casts, optionality, state modes, architecture leakage, or decomposition concern. The small mount helper now consistently owns render readiness and lifetime; it earns its abstraction by serving both cases. No evidenced guidance gap warrants a README addition.

## Coverage evidence

Independently compared normalized covered statement, function, and individual branch-arm source locations in `/private/tmp/readability53-oidc-before/coverage-final.json` and `/private/tmp/readability53-oidc-after/coverage-final.json`: all 426 covered locations across 144 files are identical, with zero losses or additions. Final shuffled log reports two cases passing. Default coverage excludes workspace-symlink shared UI code; root is checking actual external GButton coverage separately. This review confirms the real child remains rendered but does not claim the default report measures its shared package implementation.

Root owns final integrated validation and publication. No draft edits were made during this review.
