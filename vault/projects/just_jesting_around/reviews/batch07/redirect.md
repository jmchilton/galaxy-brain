# Redirect review — iteration 07

Selected originator: `client/src/utils/redirect.test.ts`. Baseline: five tests containing 26 checks. Final: 26 independently named cases with the same checks.

`withPrefix` scenarios use a local mocked `/prefix` root and four descriptive table rows. The double-prefix case remains separate and explicitly documents the existing repeated-call behavior, replacing a misleading comment about only calling once. Query-string protocols remain intact.

The redirect guard's accepted paths, external targets, control characters/whitespace, and non-path values are table rows with descriptive names. Every original security input remains in the same group: HTTP/HTTPS, protocol-relative and backslash forms, tab/newline between slashes, ordinary control characters, leading/trailing whitespace, undefined, null, empty string, missing leading slash, and the array produced by repeated router parameters. All expected accepted values and undefined rejections remain unchanged. The concise comment explains why browser normalization matters rather than narrating assertions.

A TypeScript AST audit compared the original call arguments with the new table values, including decoded control characters and the array input: all 21 guard inputs are identical (`/private/tmp/batch07_redirect_input_audit.json`). The other five checks preserve prefix behavior. This scenario table belongs beside its guard; no concrete consumer justifies a shared abstraction or security-fixture module. Current README `it.each` guidance is sufficient, and no new advice is proposed.

Validation: all 26 cases pass in the combined shuffled 71-case client run, seed 70117 (`/private/tmp/batch07_entity_queue_redirect_results.json`). Scoped current-config ESLint and Prettier pass. No production changes.
