# Readability batch 20

Single-test iteration, drawn with seed `2610920` from 226 eligible entries. [Manifest](readability_batch_20.yml).

## Originator

| Selected test | Result | Cases |
| --- | --- | ---: |
| ObjectStoreBadges | Typed mount factory replaces the shared `let wrapper`; casts, an unused import and needless `async` go. The count-plus-first-badge checks become one `toEqual` over every rendered badge's prop and size, which adds order and every-badge size coverage. Badge fixtures are typed and gain the required `source`, matching ObjectStoreBadge.test.ts. [Review](reviews/batch20/ObjectStoreBadges.md). | 2 → 2 |

## Reuse and follow-through

No existing badge factory; the only other badge literals are three in ObjectStoreBadge.test.ts, so no shared helper.

Guidance: none.

## Validation and review

2 cases pass, shuffled with seed `200101`. Mutating the component's `:size` and `:badge` bindings fails the tests. Full client vue-tsc, ESLint, Prettier and source commit hooks pass. [Independent review](reviews/batch20/review_ObjectStoreBadges.md) approved. Commit `87ff9d81cfc`.
