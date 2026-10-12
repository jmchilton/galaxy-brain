# Configuration testing composables — batch 56

Reused `getFakeObjectStoreInstance` with the six scenario overrides; its defaults reproduce all other fields from the original complete instance. The template and failed connection status still use the existing configuration fixtures. Replaced the routing factory's `as never` cast with a spy whose signature matches the asynchronous message-routing contract.

Each composable now runs through the existing `runInTestScope` helper so its computed effects stop even when an assertion fails. Kept the API handler helper and all three explicit scenarios: edit with a failed connection, edit with a failed test request, and upgrade with a failed connection. All nine original checks remain: exact error, force-action visibility, and no update request for each case. The tests still await the actual submission promise and retain the original request/status bodies and instance values.

Baseline and final: 3 cases passed with shuffled seed 560101 and one worker. V8 coverage JSON retains all 791 covered statement/function/branch-arm locations across 362 files; none added or lost. The target composable retains 55 covered statements, 5 functions and 13 branch arms. ESLint, Prettier, full client type checking, and explicit canonical pre-commit hooks passed (exit 0).

Evidence: `/private/tmp/readability56-config-{before,after}/coverage-final.json`, compared with `/private/tmp/readability53-compare.py`; suite, type-check and hook logs use the `/private/tmp/readability56-config-` prefix.

No production, dependency, supporting-test, shared-helper or README changes. Current README guidance already covers reusable fixtures, owned composable scopes and awaited operations. The typed routing mock replaces an unnecessary cast directly; no new shared abstraction or marginal advice is warranted.
