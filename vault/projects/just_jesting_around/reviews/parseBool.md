# parseBool readability review

Reviewed `client/src/utils/parseBool.test.ts` in Galaxy branch `jest_readability_batch_01`, along with `parseBool.ts` and the entire client unit-testing guidance in `client/README.md`.

## Applied changes

- Replaced seven test blocks with three compact `it.each` groups: boolean passthrough, string parsing, and non-boolean/non-string fallback.
- Preserved all thirteen original input/result pairs and strict `toBe` assertions. The suite now reports thirteen independently named cases; the increased test count reflects splitting existing assertions, not additional coverage.
- Used `%j` for string inputs so test output quotes strings, exposes the empty string, and distinguishes string `"1"` from numeric `1`.
- Kept the function call and assertion directly in each table callback. No fixtures, mounts, mocks, or production edits were needed for this pure function.

Original expectations retained: `true → true`, `false → false`; `"true"`, `"True"`, and `"TRUE" → true`; `"false"`, `"yes"`, `"1"`, and `"" → false`; `null`, `undefined`, `0`, and `1 → false`.

## Reuse investigation

`client/src/utils/strings.test.ts` already demonstrates direct calls to a pure utility with named input scenarios. `client/src/utils/slug.test.ts` groups two independent input/output assertions into one test; a small table could give those cases separate failure names in a future review. No other test file calls `parseBool`, so there is no repeated domain setup to extract.

Existing `it.each` usage in `client/src/composables/upload/uploadItemTypes.test.ts` and `client/src/components/Panels/Upload/uploadProgressUi.test.ts` shows a useful distinction: those tests share real upload fixtures from `upload/testHelpers/uploadFixtures` because they construct domain objects. The scalar literals here need no equivalent factory. `client/tests/test-data/index.ts` supplies registered-user/history fixtures, and `client/tests/vitest/helpers.js` supplies Vue setup and event/request helpers; none applies to boolean parsing. A shared wrapper around `expect(parseBool(input)).toBe(expected)` would hide a readable one-line assertion without removing meaningful setup.

## Guidance emerging from this file

The README's new readable-scenarios guidance already covers descriptive names and `it.each`, so this review does not require another broad rule. A useful refinement for other conversion utilities is to preserve input types in case names: quoted string formatting avoids ambiguous failures for `"1"` versus `1`, and explicitly shows empty strings. Keep short tables grouped by behavior when a single mixed table would obscure the contract.

## Validation

- `pnpm exec vitest run src/utils/parseBool.test.ts --reporter=verbose`: thirteen tests passed; output confirms every input has a distinct name.
- `pnpm exec prettier --check src/utils/parseBool.test.ts`: passed.
- `pnpm exec eslint -c .eslintrc.js src/utils/parseBool.test.ts`: passed, with the existing advisory about outdated Browserslist data.
- Diff reviewed against the original input set: no removed expectations or weakened assertions.

No commit or push was made.
