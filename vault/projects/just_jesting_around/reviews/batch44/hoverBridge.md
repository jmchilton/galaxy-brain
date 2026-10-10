# hoverBridge

Selected originator: `client/packages/ui/src/utils/hoverBridge.test.ts`. Baseline **18 tests** → final **20 tests**.

The suite was already readable: well-named cases, small local geometry helpers (`within`, `spread`, `exitPoints`, `findDeadSpot`) and a named trigger/popover pair. The weak spot was repetition. Three placements (top-start, right, left-end) were spelled out as identical rect literals in two `it.each` tables, the bottom-start pair a third time as `icon`/`wide` in the slow-diagonal case, and the right pair again in `computeHoverGap`. They now live once in a `LAYOUTS` map keyed by placement, checked with `satisfies Record<string, { from: Rect; to: Rect }>`. The far-edge table lists only placement and exit point; the dead-spot table runs over every layout. Rows are typed as `Placement`, so a misspelt placement is a type error (`"left-ends"` fails `vue-tsc -p packages/ui/tsconfig.json`).

The two `computeHoverGap` cases each held two independent scenarios. They are split: gap below, gap beside, empty when touching, empty when meeting only diagonally. That is the +2.

Every original assertion survives with the same inputs and expected values: the nine bridge point checks, the three far-side drops, the near-half keep, three far-edge placement drops, the 20-step slow-diagonal walk, five dead-spot placements, and the four gap results. No rect, point or expected polygon changed; the literals only moved into `LAYOUTS`.

Reuse: none applicable. These are pure geometry tests with no Galaxy test infrastructure, and the helpers are specific to this file.

Validation: 20 tests pass shuffled (seed `440101`, `NODE_OPTIONS=--no-webstorage`, run from `client/`). Per-file coverage is identical at base and tip (`hoverBridge.ts` 46/47 statements, 27/28 branches). ESLint, Prettier, `vue-tsc -p packages/ui/tsconfig.json` and full client vue-tsc pass.

Guidance: none.
