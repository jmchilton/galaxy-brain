# Readability batch 44

Four originators, one test per commit, then one range review. ZoomControl is follow-through from batch 43 (the last eligible `vi.mock("app")` holder); the other three were drawn with seed `2610944`. [Manifest](readability_batch_44.yml).

## Originators

| Selected test | Result | Cases |
| --- | --- | ---: |
| Workflow Editor ZoomControl | `vi.mock("app")` removed (a throwing factory under `"app"` left the suite green). One walk clicking three buttons on one wrapper became fresh-mount `it.each` cases; nothing fed an emission back into `zoomLevel`, so each click already started from level 1. Buttons are found by `aria-label`, and each click checks the full emission list. New: reset label and reset from zoom 2, and no emission from a button disabled at the zoom limit. [Review](reviews/batch44/ZoomControl.md). | 1 → 7 |
| ui `hoverBridge` | Rect literals repeated across tables now live once in a `LAYOUTS` map checked with `satisfies`, so a misspelt placement is a type error. Two `computeHoverGap` cases that held two scenarios each are split. Inputs and expected values unchanged. [Review](reviews/batch44/hoverBridge.md). | 18 → 20 |
| `vSanitizeHtml` | `mountWith(value, profile?)` builds the directive string, `targetOf` names the element. null/undefined and non-string values are `test.each` rows. A vacuous `mock.calls.every(...)` (passes with zero calls) is now the exact call list, and each warning case checks its arguments. The console spy is restored in `afterEach`. After review, the reuse case moved onto `mountWith`, so the file needs no `eslint-disable`. [Review](reviews/batch44/vSanitizeHtml.md). | 8 → 11 |
| WorkflowRunForm | Named ids (`RUN1_WORKFLOW_ID`, as in `WorkflowRun.test.js`), `mountForm({ canMutateCurrentHistory })`, `withPlugins` instead of a hand-built plugin list and `setActivePinia`. `findCardForm(wrapper, title)` finds child forms by their card title, not position. The no-history case now checks the form rendered before the store is cleared, and is renamed to say so. Seeding timing unchanged. [Review](reviews/batch44/WorkflowRunForm.md). | 9 → 9 |

## Reuse and follow-through

Closes the eligible `vi.mock("app")` follow-ups. Follow-ups:
- `client/src/directives/vNoSanitizeHtml.test.ts` fails `--max-warnings 0` at base with the same two-host `one-component-per-file` warnings; the same merge would fix it.
- 9 files still contain `vi.mock("app")`. 5 were already iterated, and 4 belong to later lanes.

Guidance: none. A GButton with a `tooltip` puts its title into `.text()`, which breaks exact-text checks on tooltip buttons. Noted, but too narrow for the README.

## Validation and review

47 cases across 4 suites pass; the baseline was 36. Each commit's test passes at that commit, shuffled with seed `440101`; full client vue-tsc and the `packages/ui` vue-tsc pass at the tip; ESLint, Prettier and hooks pass. Per-test coverage at the batch base and the tip: no source file lost covered lines or branches (175 compared). The [independent review](reviews/batch44/review.md) approved three commits and asked vSanitizeHtml to merge its two hosts so the added `eslint-disable` wasn't needed; that fix was folded into its commit.

Commits: `b62f7affec2` (ZoomControl), `fffc4ff6b83` (hoverBridge), `3a2d713c3ca` (vSanitizeHtml), `3c6afc65dd2` (WorkflowRunForm).
