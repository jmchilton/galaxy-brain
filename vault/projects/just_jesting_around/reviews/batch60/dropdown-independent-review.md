# Object store InstanceDropdown — independent normal review

Driver action: approve; no review changes needed. Required child lookup, native mount options, cleanup, and whole-request-body capture preserve the success/failure contracts.

## Details

Reviewed final worker commit b747841a19f against pinned base bc3b5f773a059d2a19aa2be333d06ba53eaf246e, current README, REVIEW_FOCUS, and actual InstanceDropdown removal flow. The author completed full client types, file lint/format and explicit commit gates before committing; no reviewer changes were made.

Both original scenarios and five checks remain: successful hide PUT body, entryRemoved emission, no error toast, exact error toast on failure, and absent entryRemoved on failure. The new requestBodies array requires exactly one intercepted request containing the original exact `{ hidden: true }` body; it retains the body contract and eliminates an unsafe JSON-result cast. Storing the unvalidated boundary as unknown is appropriate because the assertion validates its complete shape.

Native inferred shallowMount props/global remove casts and deprecated options. Automatic unmount owns both wrappers. Triggering the required stubbed child remove event remains the correct boundary for this shallow parent test; it does not pretend to click a rendered dropdown. The existing canonical object-store factory, localized mount globals, toast module mock, and template-store canUpgrade stub remain. Shared useServerMock already resets handlers after each case, so deleting the redundant beforeEach reset is safe. Toast call history remains cleared per scenario without changing the mock implementation.

Independent shuffled seed 600201 passes both cases: `/private/tmp/readability60-dropdown-independent.log`. Recomputed V8 comparison preserves all 152 covered statement/function/branch-arm locations across 25 files, zero lost or added. No assertion weakening, API boundary drift, unjustified helper abstraction, production edit, or evidenced README gap identified. These request/event/error contracts do not require migration to a live backend/E2E case.
