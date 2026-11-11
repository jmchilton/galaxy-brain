Run via Claude Opus 5.5 at high effort.

Reviewed `709e1b7c` against `7370df1b` with the thermo-nuclear rubric, and against gxformat2 `diff.py` (`issue_295_workflow_diff`). Two commits on top; new head `a8c6ea89`, not pushed. Gate green: `make check`, `pnpm lint:unused:ci`, `pnpm build`, `pnpm test`.

## Verdict

Approve after the fixes below. `workflow-diff.ts` is a close function-by-function mirror of `diff.py`, which is worth keeping for parity maintenance, so no large reshaping is warranted. It is 743 lines, a new file under the 1k bar, and Python keeps the renderer in the same module. The shared-code changes are small and go in the right layer: `inferredStepType` is now a single shared helper, `presentPlanFields` and `iterateSteps` are exported, list-form alias resolution lives in the normalizer, and `readWorkflowFile` handles read failures. None of them adds a branch to an unrelated flow.

## Changed

- `e796e9d7`: `StateChange` keys are now ordered `before, after, kind`, Python's dump order. Before, TS emitted `kind` first.
  - Found by a strict key-order parity sweep over all 23 `diff.yml` pairs. Deep-equal had passed, but 3 cases differed in key order.
  - Red-to-green: `workflow-diff.test.ts` "orders state change keys as Python dumps them".
- `a8c6ea89`: refactor with no behavior change.
  - `StepView.fields` is now a typed `StepFields` object instead of a `Map<string, unknown>`. This removes five `as string | null` casts in `summary` and `stepChange`. It converts to a Map only for `valueChanges`.
  - An `AlignedStep {key, rawStep, step}` list pairs each raw step with its normalized step once, in `alignSteps`. Before, `buildSide` and `sourceResolver` each walked two arrays in parallel by index.
  - `OUTPUT_ACTIONS` is typed as `OutputAction` keys, which removes the `out as Record` cast.
  - `isTruthy` duplicated `toNative._isTruthy`. Both are now one `isPythonTruthy` in `coercions.ts`, the shared pure-coercion module.
- After both commits, the parity sweep on a fresh build matches Python on all 23 pairs, for both the JSON (deep-equal and key order) and the text.
- An extra probe set all seven `out` actions on one entry. The `out_actions` key order matches Python.

## Not acted on

- **The type-default fill widened a divergence on this branch.** For `validators` on an `int` input, or `fields` on a `data` input (both invalid Format2), Python compares the raw lists. So `{expression}` vs `{type: regex, expression}` counts as a change in Python.
  - TS reported the same change until `709e1b7c` (the type-default fill). Since then it reports none.
  - An unconditional `inputTypesDeclaring` gate would open new divergences. Python's smart union infers `text` for an untyped input that carries `restrictions`, while TS leaves its `type` null. That inference also means untyped vs `type: text` with restrictions is a change in TS and not in Python.
  - A narrower gate would avoid that: fill defaults unless the input has an explicit, known type that doesn't declare the field. It was declined because it adds a special case for invalid Format2 only.
  - I didn't edit `implementation_debrief.md`. The coordinator should add type defaults to its nested-model divergence bullet, next to explicit nulls.
- **Other items, all accepted:**
  - Splitting out the renderer: the file is under the size bar, and the split matches Python's.
  - `keyed()`: it carries the `__proto__` invariant.
  - The `readWorkflowFile` read/parse try blocks: they give distinct, tested messages.
  - The harness's `diff_workflows` wrapper: it matches its sibling entries.
  - The four `isRecord` copies: they predate this branch.
  - Typing the `presentPlanFields` callers' `as string`: small, and it keeps the Python name parity.
- Earlier reviews' accepted divergences were not reopened.

## For the Python side

- Nothing new is required. Optional: add a `diff.yml` assertion on the `StateChange` field order, or note in the contract that object key order isn't semantic.
