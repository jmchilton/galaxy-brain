# Upload submission

Originator: `client/src/composables/upload/useUploadSubmission.test.ts`. Cases: **14 → 15**.

Kept a minimal mounted component because `useConfig()` loads configuration in `onMounted`. Removed the artificial button/result/error interface and await the returned submission promise directly. Dataset assertions now inspect returned objects instead of JSON substrings, and failed requests assert the rejected error directly. Use Vue's global plugin configuration, auto-unmount harnesses, restore spies after every scenario, and reuse `setupTestPinia`.

Split standalone and direct-collection AbortSignal contracts into independent cases. Both original configurations and assertions remain; standalone signals additionally prove that both entries are AbortSignals, and mocked upload calls are checked exactly once.

Cancellation now holds the actual fetch response behind a named gate and waits until the request starts before cancelling. It asserts that the public submission promise resolves with no datasets while that response remains pending, that state is cancelled, and that no dataset IDs appear. The response gate is always released in `finally`. This preserves the cancelled-item and absence-of-success/error contract while proving the original test title's promise behavior rather than waiting 200ms and checking empty harness text.

Preserved mixed nested output IDs and duplicate input, copied library request body, statuses/progress/dataset IDs, both standalone URL outputs and state, a concurrent successful library copy beside a failing fetch, all remaining library copies marked error, metadata-name fallback, direct collection request/body/grouping and all batch fields, selected object store forwarding, library-only and mixed two-step collection request contents/results, library-copy and collection-creation errors, default chunk size when configuration is zero, and individual/shared cancellation signals. No production code or new input modes changed.

Reuse: existing URL/library/collection configuration factories already cover domain setup. Collection-specific naming overrides remain a short local helper. Existing local deferred helpers in workflow/AI tests are generic promise gates rather than shared domain setup; the two scenario-specific gates here stay inline. No supporting files or new helper needed. Existing lifecycle, async-await, fixture, cleanup, and independent-case guidance covers the changes; no new advice proposed.

Validation: the five owned suites passed 33/33 cases with no skips under shuffled Vitest seed `130031` (`/private/tmp/jest_readability_batch13_upload_final.json`). Scoped ESLint passed with zero warnings, Prettier passed, and `git diff --check` passed. The root runs authoritative full-client typechecking and final whole-batch validation.
