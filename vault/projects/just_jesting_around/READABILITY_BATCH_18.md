# Readability batch 18

Single-test follow-through from [iteration 17](READABILITY_BATCH_17.md): no draw. [Manifest](readability_batch_18.yml).

## Originator

| Selected test | Result | Cases |
| --- | --- | ---: |
| ToolSelectPreferredObjectStore | Same rewrite as its Workflow twin: listing case plus an `it.each` over selection outcomes, async mount helper taking the preference, named selectors, auto-unmount. The vacuous `emitted(...)?.[0]?.[1]` falsy check becomes an exact emit assertion. [Review](reviews/batch18/ToolSelectPreferredObjectStore.md). | 1 → 3 |

## Reuse and follow-through

The two suites now differ only in the component, prop name and describe label. No shared factory: it would hide scenario names to save about 40 lines, and the duplication mirrors two near-identical production wrappers.

Guidance: none.

## Validation and review

3 cases pass, shuffled with seed `180101`. Full client vue-tsc, ESLint, Prettier and source commit hooks pass. [Independent review](reviews/batch18/review_ToolSelectPreferredObjectStore.md) approved. Commit `36644f2c37d`.
