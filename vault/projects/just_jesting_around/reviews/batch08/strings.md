# strings

Selected originator: `client/src/utils/strings.test.ts`.

Read `PROBLEM_AND_GOAL.md`, `LOOP_ITERATION.md`, and all of the client README's unit-testing section. Call the pure string utility directly.

The four typed variations now appear in a named table with input and expected output adjacent. Keep the null runtime boundary as its own test and replace the misleading double cast with an explicit `@ts-expect-error` documenting the untyped caller. This preserves runtime coverage while ensuring the annotation becomes invalid if the public signature starts accepting null.

Coverage audit: **5→5**, all passing. Preserve exact `google`→`Google`, surrounding whitespace→`Google`, undefined→empty, empty→empty and null→empty cases. No new scenario, assertion weakening, setup helper or production change.

Reuse: this utility has no domain setup to share, and the named table is the complete scenario. No abstraction or supporting suite is needed.

Guidance: existing README advice on direct pure-function calls and named input/output tables suffices. No new guidance or marginal advice proposed.

Validation: final scoped shuffled run uses seed **80107** and passes **95/95** cases across upload and strings, including **5** strings cases. JSON evidence: `/private/tmp/jest_readability_batch08_upload_final.json`. Scoped ESLint reports zero warnings/errors; Prettier checks pass. Full client typechecking is performed by the driver.
