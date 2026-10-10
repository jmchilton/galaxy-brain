# withUploadState

Helper: `client/src/composables/upload/testHelpers/uploadFixtures.ts`, extended. `withUploadState(item, overrides = {})` adds queue tracking to a `NewUploadItem` and returns `T & UploadState`: `id: "upload-1"`, `status: "queued"`, `progress: 0`, `createdAt: 0`, `datasetIds: []`, then any overrides. It sits beside the existing `make*Item` factories, which only build pre-queue items.

Consumers:
- `client/src/components/Panels/Upload/uploadProgressUi.test.ts` (originator) replaces its local `withState`, which had the same defaults.
- `client/src/components/Panels/Upload/UploadFileRow.test.ts` (supporting, 1 → 1) replaces its local `urlRowItem`. That copy left out the required `datasetIds`; the shared helper adds `[]`. `UploadFileRow` renders the source URL from display info and never reads `datasetIds`, and its case and assertions are unchanged.

The other fixture consumers (`uploadState`, `uploadItemTypes`, `useUploadBatchOperations`, `useUploadSubmission`, `UploadMethodView`) go through `useUploadState().addUploadItem` or validate pre-queue items, so they need no queued item.

Validation: the 7 suites importing `uploadFixtures.ts`, 84 tests, pass shuffled (seed `350101`, `NODE_OPTIONS=--no-webstorage`). ESLint (`--max-warnings 0`), Prettier and full `vue-tsc --noEmit` pass.
