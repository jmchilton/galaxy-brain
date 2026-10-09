# ZIP explorer URL validation review — iteration 04

Selected originator: `client/src/composables/zipExplorer.test.ts`.

Read the loop instructions and client README guidance, then inspected `zipExplorer.isValidUrl()` and the prior iteration’s `client/src/utils/url.test.js` to compare actual contracts.

The original five grouped cases contained nine independent input/output assertions. They are now nine independently named `it.each` cases, grouped by HTTP/HTTPS acceptance, malformed input or unsupported scheme, missing input, and multiple URLs. `%j` shows exact empty, null, undefined, and newline-bearing inputs in failures. The suite names the function actually exercised rather than suggesting it tests the full composable.

Every original input and strict boolean expectation remains: HTTP and HTTPS accepted; `invalid-url`, `htp://example.com`, empty string, null, undefined, newline-separated URLs, and space-separated URLs rejected. No examples were added or removed. Assertion execution remains nine checks; four table-body assertion statements replace nine repeated source statements.

Reuse search: the utility suite’s identically named validator accepts custom file-source schemes and FTP and trims surrounding whitespace. The ZIP validator permits HTTP/HTTPS and rejects multiline input before URL parsing. Sharing a case table would blur those different contracts and save little setup. This short suite needs no factory or supporting migration.

Validation: the selected ZIP suite passed all nine final cases, together with the toolbar suite (10 cases across two suites). Scoped ESLint and Prettier pass. Root handles full type-check and combined iteration checks.

Guidance: no addition. Existing `it.each` and descriptive-scenario guidance directly addresses the repetition here. The different validator contracts are a concrete reason not to force a shared abstraction, already reflected in the README’s readability-based reuse rule.
