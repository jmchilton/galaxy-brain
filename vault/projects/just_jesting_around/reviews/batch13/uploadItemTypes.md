# Upload item validation

Originator: `client/src/composables/upload/uploadItemTypes.test.ts`. Cases: **12 → 12**.

Reused `makeLocalFileItem` for the missing and empty local-file cases, replacing two complete repeated configurations with their relevant overrides. The valid-mode table now checks its union with `satisfies` instead of asserting the table type.

Preserved all five valid modes and all seven invalid cases: whitespace-only pasted content, empty pasted URL, whitespace-only remote URL, missing library dataset ID, absent file data, zero-byte File, and an invalid mode. The invalid discriminant's deliberate boundary cast remains because that case tests data outside the accepted type. All original error-message matches remain. No mutation occurs in these pure validations, so the existing valid table fixtures need no lifecycle harness.

Reuse: the existing upload factories already serve submission and tracking consumers; no new helper or supporting migration is needed. Existing guidance covers fixture reuse and named scenarios; no new guidance or marginal advice proposed.

Validation: the five owned suites passed 33/33 cases with no skips under shuffled Vitest seed `130031` (`/private/tmp/jest_readability_batch13_upload_final.json`). Scoped ESLint passed with zero warnings, Prettier passed, and `git diff --check` passed. The root runs authoritative full-client typechecking and final whole-batch validation.
