# useKeyedObjects readability review

Selected originator: `client/src/composables/keyedObjects.test.ts`.

The mutation scenario now uses an explicit object annotation instead of a cast, and names its object and original key. Its repeat read, numeric property update, optional property addition, and stable key assertions remain together. The independent different-shape, structured-clone, and empty-object comparisons are separate cases; the clone still comes from the exact object it is compared with.

The original two tests become four named cases, preserving all inputs and comparisons. These tiny object literals need neither fixtures nor a shared helper. Inspected `useKeyedObjects` and the existing UID composable; testing the real composable remains the clearest boundary.

Validation: four-suite baseline passed 37 cases, including this suite's 2. Final shuffled run with seed `100033` passed 63 cases, including this suite's 4. Scoped current ESLint and Prettier checks passed. Evidence: `/private/tmp/jest_readability_batch10_composables_utils_{baseline,final}.json`, `_lint.log`, and `_prettier.log`.

No best-practice addition proposed. Existing guidance already covers explicit inputs, behavior names, and independent variations.
