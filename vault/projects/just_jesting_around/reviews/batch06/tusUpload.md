# tusUpload

Selected originator: `client/src/utils/tusUpload.test.ts`.

Read the project goal, loop instructions, client testing guidance, upload implementation, installed TUS types, and neighboring upload tests. Retained all 12 cases. The suite shrinks from 361 to 234 lines while replacing the sparse constructor fake and repeated callback casts with a local `FakeUpload` that structurally implements `Upload`. Its methods use the library's signatures; constructor options and callbacks retain their inferred types. `ensureDefined` guards the callbacks and controlled promise resolver without non-null assertions.

The repeated endpoint/history/chunk arrangement stays in a local helper. Each case still supplies its file and performs its own progress, error, success, resume, or cancellation action. The helper waits for the upload to start; the cancellation race uses the synchronous arrangement so previous-upload discovery stays pending.

## Scenario preservation

| Original scenario | Final evidence |
| --- | --- |
| File fingerprint | Same exact name, MIME type, size, modification time, and history fingerprint. |
| Named Blob fingerprint | Same exact fingerprint with empty modification time; `Object.assign` replaces the Blob cast. |
| FileStream fingerprint | Same exact stream metadata fingerprint. |
| Missing optional fingerprint fields | Exact `tus-br-test--4--hist000` strengthens the two substring checks. |
| Successful upload | Exact session ID and file name, upload started once, no error callback. |
| Progress rounding | Same 50%, 33%, and rounded 67% observations; latest-call checks distinguish each update. The upload now completes and its result is awaited. |
| Authorization failure | Same 403 error passed to the caller, rejected result, and logged error. The rejection assertion is attached before firing the transport callback; the console spy is restored in teardown. |
| Non-403 error followed by success | Same suppressed caller error and eventual `session456`. Scoped fake timers additionally prove no restart at 9,999 ms and a second start at 10,000 ms. |
| Resume | Same previous-upload object passed to resume, start, and eventual `session789`; resume must happen before start. Library-required metadata is explicitly typed. |
| Abort during previous-upload discovery | Same constructor-before-abort ordering, controlled lookup resolution after abort, absence of start, abort call, rejected result, and caller `AbortError`. |
| FileStream input | The captured constructor input still has a `read` method; the original stream being locked additionally confirms reader extraction. Fixed modification time replaces `Date.now()`. The upload now completes and its result is awaited. |
| Missing session URL | Same rejection and caller error after the success callback with a null URL. The rejection assertion is attached before invoking the callback. |

The old non-403 scenario claimed TUS handled retry internally, although it only manually fired an error callback and then success. The implementation actually schedules its own ten-second restart. The updated scenario observes that wrapper behavior; it makes no claim about retry execution inside the mocked TUS library.

Reuse search found this file is the only direct `tus-js-client` constructor fake. `client/src/utils/upload.test.ts` mocks `createTusUpload` at a different boundary and would not benefit from this fake. No shared abstraction or supporting edit is justified. Existing guidance about accurate scenario names, visible inputs, typed mocks, and awaiting operation promises covers the findings; no README or marginal-advice addition is proposed.

Validation: all 12 cases pass; scoped ESLint with `--no-ignore --max-warnings 0` and Prettier pass. Evidence: `/private/tmp/batch06_tus_test.log`, `/private/tmp/batch06_tus_lint.log`. Root performs the full affected-suite/type checks and independent review.
