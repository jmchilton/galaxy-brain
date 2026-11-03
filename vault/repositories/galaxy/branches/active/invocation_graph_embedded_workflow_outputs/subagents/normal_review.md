Run via claude-opus-5-5 at high effort.

# Normal review debrief

I acted on all twelve findings except the stale spike commit messages, which are left for polish to squash or reword. The blocker was real: the layout's push loop could chase a step until it hit the iteration limit, ending around x=205000.

I didn't patch the rule. I replaced the fixed-point loop with a single pass. Steps never change rows, so every rule is a fixed lower bound on a step's x relative to a step settled before it, and settling steps once in authored order satisfies all of them. It terminates by construction. A scratch fuzz of 20,000 random layouts (up to 44 steps and 10 cards, 20% with mixed widths, random edges) found no overlaps and no step moving left or changing rows. On the test workflow and four IWC layouts it matches the earlier variant step for step at 260×170, and both of the reviewer's counterexamples are now regression tests. Reviewed head `097a8ebbb7c`; fixes in `f95b8e7b081` and `bacea92a7e4`.

## Acted on

- **Blocker 1 (runaway loop):** one-pass constraint solver, as above. Sources are ordered by their right edge, so a step directly below a source, starting further left, keeps its place and the source's cards clear it. A strict x-order would have pushed `cat_table` past `head_table`'s card.
- **2 (no convergence guard):** moot: there is no loop any more.
- **3 (focusable controls in a pointer-events:none layer):** the cards' root is `inert`, with a unit test.
- **4 (toggle always shown):** the button is disabled, with "No workflow outputs to show yet", until a labeled output has produced something (`hasEmbeddableOutputs`).
- **5 (repeat restores, full rewrites):** `restore()` clears `originalPositions`, and unchanged positions aren't rewritten.
- **6 (no re-check after the await):** `apply()` re-checks `enabled` after `nextTick`, with a test.
- **7 (dead displacement values):** dropped from the composable and from the layout result; the tests compute moved steps themselves.
- **8 (duplicate rectangle type):** `LayoutRect` is gone, replaced by `Rectangle` from `@/utils/geometry`.
- **9 (down-mode wrapper):** the wrapper div is gone; the button carries the positioning class.
- **10 (brittle E2E):** the Selenium test checks only that the inputs and the first tool column stay put and that every step moves right only. The exact moved set stays in the unit test.
- **11 (effect scope):** stopped in `afterEach`.

## Not acted on

- **12 (stale messages on spike commits `817479c5bbc` and `c2e370cad4d`):** both describe the down toggle, which a later commit removes. History rewriting is left to the polish step.

<details><summary>Full review</summary>

Review of `invocation_graph_embedded_workflow_outputs` (`git diff invocation_graph_output_previews..HEAD`, 8 commits). No security issues found. The worktree is clean: scratch tests were copied in temporarily and removed afterwards. The branch's own unit tests pass (7 files, 38 tests).

### Blocker

**1. The push loop runs away to `maxIterations`: `embeddedOutputLayout.ts:146-147`.**
The case: step S is downstream of source P (a flowing edge P→S), sits in another row, and starts inside the 20px gap between P's right edge and P's card.
- S starts left of the card, so the "another row" rule nudges P right.
- The flowing edge then pushes S right by the same amount.
- S still starts left of the card, so the rule fires again, every iteration until the limit.

Repro: `nodes=[node(0,0,0), node(1,205,150)]`, `card(0)` (400x300), `edges=[{from:0,to:1}]`. Result: both steps end at x=205000.

Fuzzing (5000 random non-overlapping layouts, 144px-wide steps, random edges, 1-5 cards): 35 did not converge, and 34 of those were this pattern. Suggested fix: apply the nudge-the-source rule only to steps that start beneath the source (`step.x < card.source.x + card.source.width`). That leaves one non-converging case in 5000.

### Should-fix

**2. No convergence guard: `embeddedOutputLayout.ts:128-170`.** Even with fix 1, one fuzz case in 5000 still loops. Author overlaps can also loop: a step enclosing its row-mate gives negative row-pair spacing. A result that hits `maxIterations` is used as is, with broken invariants. Suggested: detect it and return a safe result, and lower the bound.

**3. A pointer-events:none layer that still takes keyboard focus: `InvocationEmbeddedOutputs.vue`.** `CollectionDisplay`'s Download and Import buttons and tree toggles are reachable by Tab, but not clickable by mouse and mostly clipped from view. Suggested: `inert` on the root.

**4. The toggle is always shown: `InvocationGraph.vue:273-286`.** With no labeled outputs, clicking it shrinks every node and refits, and nothing gets embedded. Suggested: expose `hasEmbeddableOutputs` and disable or hide the button.

### Nits

5. **`useEmbeddedOutputs.ts`:** `originalPositions` is never cleared, so size changes while disabled re-run `restore()`. Both `restore()` and `apply()` rewrite every step's position.
6. **`useEmbeddedOutputs.ts:104`:** no `enabled` re-check after the await. A toggle-off during `nextTick` is overwritten.
7. **Dead `maxDisplacement`:** in the composable, and in the layout result it serves tests only, with a spike-era comment.
8. **`LayoutRect` duplicates `Rectangle`** from `@/utils/geometry`.
9. **Leftover wrapper from the down mode:** `.embed-outputs-controls` now holds one button.
10. **Brittle Selenium assertion:** `moved == {"head_cat", "numbers", "final"}` repeats the unit test.
11. **`useEmbeddedOutputs.test.ts`:** the `effectScope` is never stopped.
12. **Stale commit messages** on 817479c and c2e370c (down mode).

### Checked and fine

- **Polling doesn't undo the layout.** `updateSteps` mutates `GraphStep`s in place, and `fromSimple` runs once. A new output reruns the layout via `requestKeys`.
- **No measure/layout feedback loop.** `stepSizes` keys only on rounded sizes.
- **Layout is idempotent from `originalPositions`.** Toggling off restores the authored positions exactly.
- **Converged results are sound.** In 8000 fuzzed layouts, no new overlaps and no card away from its source.
- **The cached workflow isn't mutated.**
- **Refit only after a toggle.** It is gated by `fitPending` and debounced. `fitWorkflow(extraRectangles = [])` and the empty slot leave the editor and the published view unchanged.
- **Connector geometry, the expand-step modal, fit-to-page and scroll-to-step** are fine.
- **Unit and Selenium tests** check behavior.

</details>
