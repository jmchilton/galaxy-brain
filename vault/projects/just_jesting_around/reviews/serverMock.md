# API server mock readability review

Reviewed `client/src/api/client/serverMock.test.ts` in the Galaxy worktree `jest_readability_batch_01` against the full client-side unit-testing guidance in `client/README.md`.

Changed the single test containing four requests into four named scenarios: summary query, detailed query, path-selected HTTP 500, and unhandled-request guidance. Every original data/error assertion is preserved. Common handlers now register in `beforeEach`, matching the reset performed by `useServerMock` after every test. OpenAPI handler arguments and responses retain inferred types. The missing-handler assertion no longer interpolates an already stringified JSON value.

Reused `getFakeHistorySummary` from `client/tests/test-data/index.ts`, overriding the original ID, name, annotation, update time, and URL so fixture values remain identical. Existing consumers include `HistoryOptions.test.ts` and `History/Modals/CopyModal.test.ts`. The detailed history fixture remains local: searches of API tests, test helpers, and mock files found no existing detailed factory or second consumer needing this complete arrangement. Nearby error/retry middleware tests need different response shapes and behavior, so a general route helper would obscure this file's query/path examples.

The useful practice reinforced here is that splitting a test requires reviewing fixture and handler lifetimes. File-level `server.use` only survives the first test when teardown resets handlers. Reinstall common handlers in `beforeEach`; keep unusual responses within their scenario. This is now documented in the shared README guidance. Reusing a domain factory can eliminate required-field boilerplate while retaining scenario-specific fields visibly in the override.

Validation from the Galaxy `client/` directory:

- `pnpm exec vitest run src/api/client/serverMock.test.ts`: passed, four tests.
- `pnpm exec prettier --check src/api/client/serverMock.test.ts`: passed.
- `pnpm exec eslint -c .eslintrc.js src/api/client/serverMock.test.ts`: passed; only the existing outdated Browserslist data notice.

No production code or additional shared helpers changed in this review.
