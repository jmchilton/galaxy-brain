# Upload queue readability review

Selected originator: `client/src/utils/upload-queue.test.js`.

All sixteen scenarios and meaningful original assertions remain. They cover supplied/default options, reset, option merging, start/running behavior and avoiding a restart, processing both local files, pause, queue size and index increments, duplicate suppression and the `new` exception, announcement index and original file identity, removal/count/out-of-sequence identities, removing an already submitted file and re-adding it, FIFO progression, and the complete three-URL batch payload.

Descriptive queue/file/helper names and behavior names replace single-letter queues, a constructor-like `StubFile` function, and several vague titles. An error mock replaces the misspelled synthetic `encountedErrors` flag. The same absence-of-errors checks now assert that the real error callback was never called. Mock call matchers replace manual call counts while retaining the announcement's strict identity check.

A local queue helper removes the repeated local-file model arrangement from two cases. Both now use the existing mocked `submitUpload` success callback through the real queue submission method, rather than overriding `_processSubmit` to recurse manually. The original three `_process` calls and empty queue remain checked, with two submission calls additionally required. Remote batching retains the complete original payload fields and adds exactly one fetch call and callback-presence checks. Mocks are cleared before each case and spies restored afterward, making the first-call payload assertion independent of execution order.

Reuse: inspected the adjacent `upload.test.ts`, its `LegacyUploadItem` arrangements, production upload builders, and existing test-data factories. Local queue announcement models add queue-specific target-history and callback setup; payload-builder tests deliberately use partial models to exercise validation and different modes. A shared complete legacy-upload factory would fill irrelevant fields in those cases. The useful repeated queue arrangement is local to this suite, so no shared helper or supporting migration was added.

Validation: baseline 16/16; final 16/16. Assigned-suite shuffled seed `110071` passes all 33 cases across four files. Scoped current ESLint, Prettier, and diff whitespace checks pass. Evidence: `/private/tmp/jest_readability_batch11_async_{baseline,final}.json`, `_lint.log`, and `_prettier.log`.

No best-practice addition proposed. Existing factory, readable-scenario, and mock-isolation principles suffice; no obvious advice was saved.
