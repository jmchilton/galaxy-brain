# Readability batch 22

Single-test iteration, drawn with seed `2610922` from 224 eligible entries. [Manifest](readability_batch_22.yml).

## Originator

| Selected test | Result | Cases |
| --- | --- | ---: |
| Markdown `requirements` | Multi-`expect` cases become `it.each` tables, one row per input, with behavior-describing names. Workflow labels become a module constant, and a leftover Jest `{ virtual: true }` mock option goes. `getRequiredLabels` cases take object types directly, while the composed tool → object → labels path stays covered through `getRequiredObject` and `hasValidLabel`. New cases: both input and output labels matching is rejected, and a type with no label requirements returns `[]`. [Review](reviews/batch22/requirements.md). | 16 → 28 |

## Reuse and follow-through

Pure module test; no shared helper applies.

Guidance: none.

## Validation and review

28 cases pass, shuffled with seed `220101`. Full client vue-tsc, ESLint, Prettier and source commit hooks pass. [Independent review](reviews/batch22/review_requirements.md) approved and confirmed each original composed path is still asserted. Commit `fc4b3dc90e2`.
