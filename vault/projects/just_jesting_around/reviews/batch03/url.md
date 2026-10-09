# URL utilities review — iteration 03

Selected originator: `client/src/utils/url.test.js`.

## Changes

- Grouped scenarios under the four functions they exercise, replacing the generic suite name and mixed `it`/`test` spelling.
- Turned straightforward URL lists into independent `it.each` cases. Each name includes the input with `%j`, so failures distinguish whitespace, empty strings, schemes, and hostname forms.
- Kept the three query-parameter scenarios as short individual tests: no supplied parameters, creating a query string, and extending one. The omitted second argument remains omitted.
- Separated acceptance and rejection for surrounding whitespace. Preserved every original input, expected value, and matcher, including `isUrl`'s truthy/falsy checks.
- Removed the unnecessary `async` marker from synchronous query-parameter checks.

## Reuse and guidance

Searched other unit tests for all four functions. Their fixtures have no concrete second consumer. `composables/zipExplorer.test.ts` tests a separate `isValidUrl` implementation, with different inputs and behavior; the shared function name does not justify combining its cases with these tests. No shared helper or supporting migration is warranted.

No new README guidance is needed. The existing advice on descriptive table cases and visible inputs covers the changes. `%j` is useful here because otherwise tabs, newlines, and whitespace-only inputs make failure names hard to distinguish; this is an application of that advice.

## Validation

- Baseline: 10 cases pass. Final: all 37 independent cases pass with `NODE_OPTIONS=--no-webstorage pnpm exec vitest run src/utils/url.test.js --maxWorkers=1`.
- A temporary VM audit executed the baseline and final test callbacks with recording stubs, expanded table rows, and compared the exact ordered function/argument/matcher/expected-value records. All 37 original assertion combinations match, including omitted arguments and exact whitespace.
- Scoped ESLint and Prettier checks pass.
- No supporting tests or production files changed.
