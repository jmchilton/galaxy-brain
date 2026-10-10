# Readability batch 19

Single-test iteration, drawn with seed `2610919` from 227 eligible entries. [Manifest](readability_batch_19.yml).

## Originator

| Selected test | Result | Cases |
| --- | --- | ---: |
| ExportForm | Typed mount factory replaces `let wrapper: any` and `beforeEach`; the three disabled cases become one `it.each` table with a local `fillInputs`; exact `aria-disabled` and emit assertions; the clear-after-export case now also checks the emit and that both inputs reset. [Review](reviews/batch19/ExportForm.md). | 7 → 7 |

## Reuse and follow-through

[Custom matcher types](reviews/batch19/customMatcherTypes.md) fix the `toBeLocalized`/`toBeLocalizationOf` declarations, which forced `(expect(x) as any)` casts. Both `client/types/vitest-setup.d.ts` and `client/tests/vitest/matchers.d.ts` were script files declaring an ambient `vitest` module. That shadowed the real package, so `expect` and `describe` were effectively untyped in every client test: the reviewer's scratch check found a canary full of type errors passed with zero errors at the old HEAD. `vitest-setup.d.ts` is now a real module augmentation and `matchers.d.ts` is deleted. A canary confirms wrong matcher arguments, unknown matchers and `expect` misuse now fail vue-tsc. Supporting ResetPassword and RegisterForm drop their casts; they are the only other TypeScript users of the matchers. Their counters are unchanged.

Upstream commits `2fbe96cad7b` and `230b7448978` had settled on the casts. Changing only one of the two declaration files is unsafe: it silently leaves `expect` as `any` with vue-tsc still green.

Guidance: none.

## Validation and review

14 cases across 3 suites pass, shuffled with seed `190101`: 7 selected, 7 supporting. Full client vue-tsc, ESLint, Prettier and source commit hooks pass. [Independent review](reviews/batch19/review_ExportForm.md) approved, including the declarations change. Commits `fa7fb88e5f2` (matcher types plus supporting suites) and `4ffeac0f766` (ExportForm).
