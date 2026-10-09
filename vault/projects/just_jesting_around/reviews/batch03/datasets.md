# Dataset copy API — iteration 03

Selected originator: `client/src/api/datasets.test.ts`.

Baseline and final: **3 passing cases**, with all **7 original assertions** preserved. The target-history assertion now checks both requests rather than only the last request. All input IDs, ordered successful results, failed seventh item, mixed dataset/collection paths and source/type expectations, and the concurrency peak of five are unchanged.

Removed three response casts (`any`/`never`) and three request-body casts. `request.json()` now retains OpenAPI inference; capture arrays use the generated `CreateHistoryContentPayload` type. Minimal `{ id }` responses use the README's `response.untyped(HttpResponse.json(...))` mechanism. Schema inspection confirmed that this endpoint's successful response union consists of full HDA/HDCA views with required fields; these aggregation tests deliberately inspect only copied IDs. The failure response remains schema-typed.

The mixed-content handler now responds from its own parsed request body instead of looking up the last entry in a mutable request log. A short comment explains why the concurrency handler delays completion: it makes simultaneous requests observable. The seven-item batching scenario remains one test because order, second-batch failure, and the in-flight limit are checked for the same invocation.

Reuse: investigated `components/Dataset/DatasetCopy.test.js` and existing test-data factories. The component uses a different bulk-copy endpoint and request/response contract; neither it nor another unit suite consumes this typed-copy handler. Keeping the three scenario handlers inline preserves their request capture, failure injection, and concurrency behavior without a generic helper's callbacks. No supporting file edits or new shared abstraction warranted.

Guidance: existing inferred-MSW response escape hatch and readable-scenario guidance suffices. No new README rule recommended.

Validation: baseline and final `NODE_OPTIONS=--no-webstorage pnpm exec vitest run src/api/datasets.test.ts --maxWorkers=1` passed. Scoped ESLint and Prettier checks passed. No production changes, assertion removals, README changes, or new dependencies.
