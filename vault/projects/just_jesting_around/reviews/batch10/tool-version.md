# Tool version utilities readability review

Selected originator: `client/src/utils/tool-version.test.ts`.

Base-ID extraction and requested-parts parsing now use named input/output rows. All ten original extraction inputs and seven original parsing inputs retain their exact expected values, including absent version fields and the build suffix containing a dot. Independent rows give each failure its own input name rather than aborting the remaining assertions in a compound scenario.

Removed the file's complete duplicate Tool factory in favor of the existing `@tests/test-data/tools` `getFakeTool`. Every tool's id, version, and name is explicit at its call site; `model_class: "InteractiveTool"` preserves the original fixture type. The shared defaults already match every other field of the removed local factory. This applies the abstraction introduced by the earlier Tool-factory follow-up without adding another wrapper or changing other consumers.

The four filtering scenarios keep every original length and selected-version assertion, every tool input, empty-list behavior, and numeric-locale suffix ordering. Titles state these concrete behaviors.

Validation: 14 baseline cases become 21 final cases solely by separating the original extraction and parsing variations. Assigned-suite final shuffled seed `100033` passed 63 cases across four files. Scoped current ESLint and Prettier passed. Evidence: `/private/tmp/jest_readability_batch10_composables_utils_{baseline,final}.json`, `_lint.log`, and `_prettier.log`.

No new best practice proposed. Existing factory-reuse and named-case guidance covers the observed opportunities. No supporting suite or shared factory modification was needed.
