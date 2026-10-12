# HistoryDatasetDetails — readability batch 55

Migrated the mount factory to native Vue Test Utils `props` and `global: withPlugins(...)`, retaining the existing API handler, real dataset-store behavior, datatypes fixture, and rendered sanitizer directive. Each mount explicitly seeds its own Pinia and registers disposal after component unmount. Automatic unmount runs before clearing the shared sanitizer spy's history; its implementation remains intact.

Renamed the dataset fixture and mount factory for their domain role, described the first case's complete attribute transition, and used required-element `get()` for text reads. The absence assertion still uses `find().exists()`.

## Preserved behavior

Both original cases and all nine assertions remain. The first mounted instance still changes from peek to name to information to datatype, asserting each exact text. The second still displays markup in the name as literal text, finds no rendered bold element, verifies the sanitizer has not run, changes the same mounted instance to peek, verifies the exact sanitizer input and default policy, and reads the resulting table cell.

## Validation

- Original and rewritten suite: 2 cases passing, shuffled with seed 550101 and one worker.
- V8 coverage's Istanbul-format JSON: 35 source files and 288 covered statement/function/branch-arm locations before and after; zero locations added or lost.
- `HistoryDatasetDetails.vue`: 16 covered statements, 4 functions, and 9 branch arms, unchanged.
- ESLint, Prettier, explicit canonical Galaxy pre-commit hooks, and full client type checking all passed (exit 0).
- No production, dependency, shared-helper, supporting-test, or README changes.

Baseline/final coverage evidence: `/private/tmp/readability55-historydetails-{before,after}/coverage-final.json`, compared with `/private/tmp/readability53-compare.py`. Test logs, type-check log, and hook log use the `/private/tmp/readability55-historydetails-` prefix.

## Guidance and reuse

Existing `withPlugins`, `enableAutoUnmount`, and Pinia disposal cover the setup and lifetime needs directly. The README already explains native global plugins, async mounted requests, and teardown dependencies; no new guidance or shared abstraction is warranted for this small originator. The datatypes seeding is retained to preserve the original setup and coverage; extracting a second helper shared with `HistoryDatasetDisplay` would add ownership coupling without improving either short arrangement.
