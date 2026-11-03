Run via claude-opus-5-5 at high effort.

# Test challenges debrief: invocation_graph_embedded_workflow_outputs

I acted on every challenge except two layout tie-break details and two hygiene paths in the composable, which no test can tell apart. The branch is **not blocked**: every test change needed was made and runs.

Mutation testing found 12 surviving layout mutations out of 30. After this pass only 2 survive, both explained below, and every distinct layout rule is now pinned. Four tests that faked browser layout or asserted implementation details were dropped or moved to Selenium. Each of the new Selenium assertions was run against a mutation and failed as expected.

Head moves from `bacea92a7e4` to `ee28a92edd9`:

| Commit | What |
|---|---|
| `6ece9d2bf21` | was `f95b8e7b081`. The layout's test-only `gap` option became an exported `EMBEDDED_LAYOUT_GAP` constant. Tests that pin row order, max stack width, the sources-first tie-break, vertical card spacing and non-flowing edges were added. The weak editor-layout test was dropped. |
| `64a7876011b` | was `bacea92a7e4`. Composable tests: one test that pinned nothing was dropped. The size-change test now models the real shrink. Edge wiring, including single connections, is pinned. |
| `ee28a92edd9` | new. Selenium checks connectors and static cards. The card unit tests' pixel, path and `inert` assertions were dropped. Connector hooks and three `navigation.yml` selectors were added. |

## Not acted on

- **Layout y tie-break (`a.y - b.y` in the sort):** not pinned. It only orders two sources with equal right edges. Both orders give valid layouts, and the next tie-break (id) is deterministic too. A test would freeze an arbitrary choice.
- **Layout `else if` on the "a source's cards clear a step to their left" rule:** not pinned, because both variants break an invariant on the one input where they differ. That input is a row-mate the author overlapped onto a source, extending past its right edge (for example, source at x=0 and a step at x=150, both 200 wide, same row). With `else if`, the source's card overlaps that step. Without it, the source is pushed on top of the step, which flips the row order. This only happens with author-overlapped steps, and the scratch fuzz didn't generate those. **John may want this on the list for later.** A fix would need the step, not the source, to settle after the card. I didn't change layout behavior in a test pass.
- **Composable `enabled` re-check after `nextTick`** (review nit 6): kept the guard but dropped its test. Under every timing I tried (sync, one or two microtasks, `nextTick`), the end state is the same without the guard, because the toggle-off watcher's `restore()` always runs after the stale `apply()`. The guard only skips a layout that would be thrown away straight after.
- **`restore()` clearing `originalPositions`, and copying position objects:** not observable at the end state; this is efficiency and hygiene only. Not pinned.
- **`pointer-events: none` on the cards:** in Chromium, `inert` already takes the cards out of hit-testing, so the new pointer assertion only fails when both are removed (checked). I kept both, since the CSS documents the intent and covers browsers where inert hit-testing differs.
- **Composable tests set measured sizes in the state store.** The process says to drop tests with hand-set sizes. I kept these, because the store's `stepPosition` is the composable's input, not a mocked browser API. What they pin (layout reruns from the author's positions, edges, filters, step-store writes, restore) isn't visible in Selenium.

<details><summary>details</summary>

I read `doc/source/dev/writing_tests.md`, `client/README.md#client-side-unit-testing`, and the vault notes "Component - E2E Tests - Writing" and "Component - E2E Tests Smart Components". The branch has no "Baseline tests" commit, and none is needed: every test covers new code. For new modules, "fails without the change at its own assertion" means mutation testing, so I ran that for the layout and the composable. The mutation harness is `scratchpad/challenge/mutate.py`, with mutation lists in `layout_mutations.py` and `composable_mutations.py` and results in `*_before.txt` and `*_after.txt`.

## `embeddedOutputLayout.test.ts`

This is a pure function on rectangles, tested with no mocks and through invariant helpers: no new overlaps, cards beside their sources, right-only moves with row order kept. That is the right shape, so the work was filling gaps.

**Design change:** `layoutEmbeddedOutputs` took an `options.gap` that only tests set, always to the default. The option is gone. The module exports `EMBEDDED_LAYOUT_GAP = 20`, and both test files import it.

**Mutations of the layout's rules (30):**

| Rule mutated | Before | After | Pinned by |
|---|---|---|---|
| gap value | survived (tests passed it explicitly) | killed | literal offsets across tests |
| skip outputs of missing steps | killed | killed | "ignores outputs whose source step is missing" |
| stacking offset / stack height gap | killed | killed | stacking, adjacent rows, CUT&RUN |
| stack width = max of its cards | **survived** | killed | "stacks several outputs ..., clearing the widest" (second card now narrower) |
| row margins (`rowsOverlap`, `inStackRows`, trailing gap) | killed | killed | adjacent rows, test workflow |
| two-stack vertical margin | **survived** | killed | new "keeps two sources' embedded nodes the gap apart vertically too" |
| `settleAt` (left edge / right edge for all) | killed | killed | nudge-the-source, test workflow |
| sources-first tie-break (removed / reversed) | **survived** | killed | new "pushes a step that starts right at its source's edge past the embedded node" |
| y tie-break | survived | survived | not pinned, see above |
| row rule removed / full gap / author spacing / zero gap | **3 of 4 survived** | killed | new "keeps a row's steps in order and the gap apart when pushing them, without edges" |
| source-clears-left-step rule removed | killed | killed | nudge-the-source |
| that rule as `if`, not `else if` | survived | survived | not pinned, see above |
| step-clears-cards rule (removed / gaps / height for width) | killed | killed | most tests |
| two-stacks rule (removed / no gap) | killed | killed | collide test, CUT&RUN |
| edge rule removed / "just clears" | killed | killed | chain test |
| edge rule applied to edges that don't flow right | **survived** | killed | new "doesn't carry along a step whose input doesn't end left of it" |
| card x gap / card y offset | killed | killed | invariant helper |

**Dropped "nudges a real editor layout locally".** It reused the editor's `parameter_steps.json` with invented 180×90 sizes and sources, and asserted only "fewer than half moved". Every mutation it killed is killed by more specific tests. The test-workflow and CUT&RUN tests cover real layouts with real shrunk sizes and exact expectations.

**Kept everything else.** The test-workflow test is the only place that pins the exact moved set (`[3, 8, 9]`); Selenium deliberately doesn't, after the review.

## `useEmbeddedOutputs.test.ts`

The composable is driven through real testing pinia stores, with no module mocks. That follows the README.

**Mutations (16):** before this pass, 6 survived. Now 3 survive, all intentionally (see "Not acted on").

- **Edges unpinned:** the "no edges" and "single (non-array) connections dropped" mutations survived. The fixture gains step 4, fed by step 3 through a single, non-array `input_connections` entry and outside every card's rows. "pushes steps ..." now asserts that step 4 follows step 3 at its authored distance.
- **"lays out again from the author's positions when a step's measured size changes" didn't check that it lays out from the author's positions.** It grew the source after the first layout. Laying out from the current positions gives the same answer, because steps only move right. It now models the real sequence: the first layout runs with the pre-shrink width, then the source is measured narrower and the pushed step must come back. Both the "from current positions" and "no rerun on size change" mutations now fail it.
- **Dropped "doesn't lay out when disabled again before the layout ran".** It passes with the guard removed, and a scratch probe of four timings showed the end state never depends on it (see "Not acted on").
- **Kept:** "until enabled", `hasEmbeddableOutputs`, the label, produced and collection filters, the step-store write (the store feeds the fit bounding box and the minimap, which Selenium doesn't check), restore, and "once its step produces it" (Selenium opens a finished invocation).

## `InvocationEmbeddedOutputs.test.ts`

- **Dropped the pixel-style assertion** (`left: 264px; top: 50px; ...`). This is the "asserted pixel styles" case; Selenium checks where cards are.
- **Dropped "connects each card to the right edge of its step"**, which compared an SVG path built from hand-set step sizes. The state store setup it needed went with it. Moved to Selenium.
- **Dropped "keeps the static cards out of keyboard focus"**, which checked that an `inert` attribute exists, not that focus is blocked. Moved to Selenium.
- **Kept one test:** a card per output whose step is on the graph, with its label, previewing its item under its step. The step pass-through, which drives stage 1's state-based reload, isn't visible in a finished invocation.

## Selenium `test_embed_workflow_outputs`

**Added assertions:**
- `_assert_cards_beside_their_steps` checks that each connector starts at its step's right edge, within the step's rows, and ends at its card's left edge.
- New `_assert_embedded_outputs_static` runs after the refit:
  - `elementFromPoint` at each card's center is outside the card, so pointer events go through to the graph.
  - At least one control renders inside the cards, and calling `focus()` on each leaves it unfocused.

**Selectors and hooks:**
- Connector paths carry `data-description="invocation embedded output connector"` and `data-output-label`.
- `navigation.yml` gains `graph_embedded_output_connector(label)`, `graph_embedded_output_controls` and `graph_node_area`.

**Cleanups:**
- `_graph_transform` used `document.querySelector('.invocation-graph .node-area')` inline. It now uses `graph_node_area` and `value_of_css_property("transform")`.
- `_node_positions` reads `value_of_css_property("left"/"top")`, matching `test_workflow_editor.py`'s `get_node_position`, instead of inline JS.

**Each new assertion was checked against a mutation** (E2E runs against the worktree's servers, each change restored afterwards):

| Mutation | Result |
|---|---|
| no `inert` | fails: "'0' in an embedded output takes focus" |
| connector ending 15px short of the card | fails: "top_rows's connector doesn't join head_table" |
| layout not rerun when step sizes settle | fails: "top_rows is not just right of head_table" (346.7 vs 310.1 + 30). This confirms that Selenium covers the size-driven rerun. |
| no `pointer-events: none` | passes: `inert` already blocks hit-testing |
| neither `inert` nor `pointer-events: none` | fails: "numbers_b takes the pointer" |

## Verification

- Vitest (node 22.20.0) on `Workflow/Editor`, `Workflow/Invocation`, `WorkflowInvocationState` and `useInvocationGraph.test.ts`: 56 files, 508 tests pass. The total is unchanged: there are now 17 layout, 7 composable and 1 card test (from 14, 8 and 3).
- `vue-tsc --noEmit` is clean. eslint and prettier are clean on the changed client files, and black and ruff on the Selenium file.
- Selenium `test_embed_workflow_outputs` (Playwright backend) passes in 82s.

</details>
