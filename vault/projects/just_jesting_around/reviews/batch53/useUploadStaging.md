# Batch 53: useUploadStaging

Originator: `client/src/composables/upload/useUploadStaging.test.ts`.

All three original cases and all five assertions remain. The same computed instance still observes pasted-link staging followed by clearing (`true` → `false`) and whitespace replacement with content (`false` → `true`), so sequence-sensitive regressions remain visible. Test names now describe the concrete inputs instead of claiming to cover every upload method.

The test owns and disposes its Pinia, accesses the store with the owned instance, and invokes the computed-producing composable through existing `runInTestScope`. Complete typed upload fixtures replace incomplete type assertions. A single-use URL fixture stays inline; the twice-used content maker shares six incidental upload defaults while leaving whitespace and meaningful content visible at each action.

Concrete reuse audit: `runInTestScope` is already shared and adopted here. Searching existing test and utility files for `PasteUrlItem`/`PasteContentItem` found only this originator. There is no evidenced multi-file consumer for a new upload fixture abstraction, so fixtures remain local and there are no supporting changes. Existing README guidance covers the changes; no guidance addition or deferred advice is proposed.

Validation passed:

- Baseline and final shuffled Vitest runs, seed `530101`, one worker: 3 cases passing.
- Coverage comparison normalizes `/client/` source paths and compares covered statement locations, function locations, and individual branch-arm locations. All 46 covered locations across 5 source files are identical; zero losses or additions. `useUploadStaging.ts`: 16 covered statements, 8 functions, 6 branch arms; `uploadStagingStore.ts`: 8 statements, 3 functions, 3 branch arms.
- Full client `vue-tsc --noEmit`, targeted ESLint and Prettier, and repository explicit-config pre-commit checks passed.

Evidence: `/private/tmp/readability53-upload-before.log`, `/private/tmp/readability53-upload-after.log`, `/private/tmp/readability53-upload-before/coverage-final.json`, `/private/tmp/readability53-upload-after/coverage-final.json`, `/private/tmp/readability53-upload-types.log`, `/private/tmp/readability53-upload-hooks.log`.

No production, helper, dependency, or other test files changed. Root owns final integration, independent review, and publication.
