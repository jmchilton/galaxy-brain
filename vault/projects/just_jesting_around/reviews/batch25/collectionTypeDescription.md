# collectionTypeDescription

Selected originator: `client/src/components/Workflow/Editor/modules/collectionTypeDescription.test.ts`. Baseline **9 tests** → final **18 tests**.

The multi-assertion cases become `it.each` tables, so a failing pair is named in the test title. For `accepts`, the self-acceptance list is one row per type. The `paired_or_unpaired` and `sample_sheet` "not vice versa" groups merge into one table of required/candidate pairs, and each row asserts both directions. For `compatible`, the symmetric subtype pairs, self-compatibility and disjoint pairs are tables, and each pair row checks both orders. The disjoint `accepts` case and the ANY/NULL constant cases stay as plain tests: they are already one scenario each and read clearly.

Preserved: all 31 original `toBe` assertions (17 `accepts`, 14 `compatible`) with the same types and expected values. Only how they are grouped into cases changed. The `ct` shorthand stays local. The only other suite that constructs descriptions (`terminals.test.ts`) does so inside terminal setup and gets nothing from a shared factory.

Validation: 18 tests pass shuffled (seed 250101). ESLint, Prettier and full `vue-tsc --noEmit` are clean.

Guidance: none.
