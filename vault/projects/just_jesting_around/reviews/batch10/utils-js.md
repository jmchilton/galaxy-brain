# Legacy utils suite readability review

Selected originator: `client/src/utils/utils.test.js` (distinct from the previously reviewed `.test.ts` suite).

Replaced commented remnants of assertion messages with named case rows for `isEmpty`, `isJSON`, and `linkify`. All eleven original emptiness inputs, five JSON inputs, and four link strings retain their exact expected booleans or full HTML strings. This includes the intentionally accepted empty JSON string, zero being nonempty, null-like strings inside arrays, and the bare domain staying unlinked. Removed unnecessary async declarations from synchronous tests.

The UID case keeps its nonempty value, prefix, and two-generated-values uniqueness assertions. Merge scenarios name old and new entries instead of numbered lists and retain the complete expected object arrays. Replacement-by-id, ascending name, and ascending update-time checks retain every original name, id, timestamp, and order.

Reuse: inspected the adjacent TypeScript suite and implementation. The TypeScript file tests recursive traversal and needs different fixtures; sharing short heterogeneous values or the small merge lists would hide the relevant inputs. Kept those inputs inline and introduced no generic factory or supporting migration.

Validation: 7 baseline cases become 24 final cases solely by splitting existing variations. Final assigned-suite shuffled seed `100033` passed 63/63 cases across four files. Scoped current ESLint and Prettier passed. Evidence: `/private/tmp/jest_readability_batch10_composables_utils_{baseline,final}.json`, `_lint.log`, and `_prettier.log`.

No best-practice addition proposed; named-case and visible-input guidance already explains the changes.
