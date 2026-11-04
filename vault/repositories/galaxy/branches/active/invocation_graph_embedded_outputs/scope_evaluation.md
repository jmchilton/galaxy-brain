Run via claude-opus-5-5 at high effort.

**Recommendation: keep scope as implemented.** Stage 3 delivers the brief's three needs: storage that round-trips through the editor dict and `.ga` export and import, an editor star, and the graph rendering with dedup. Every stage 2 decision still holds. Five harden passes found nothing that leaves the feature broken or misleading, and each open item was either decided or is cheaper outside this PR:
- gxformat2 is a separate repository and stays a follow-up.
- Subworkflow steps would need a second preview path.
- Validating names against tool outputs breaks on missing or upgraded tools.
- Easing the dense-column push would mean changing stage 2's push rule.

The process default leans toward a modest expansion. The nearest candidate is an editor lint warning for a stale `preferred_output`, and a stale name is harmless: the graph shows the step as usual. Two scope questions are worth John's attention, but they are about how to ship, not about what to include:
- whether the metadata half (backend and star) should land as its own PR on `dev`. Both commits apply cleanly there.
- where the four baseline and refactor commits go.

The PR description should list the gxformat2 gaps, including the model-store invocation round trip and gxformat2's strict native schema.

## Possible Decompositions

The branch is 8 commits on stage 2 (`3b546b24e6f`), +939/−90 in 24 files. About 371 lines are production code and selectors, and about 568 are tests. By area:

| Area | Commits | Production | Tests |
|---|---|---|---|
| Baseline and refactors | `ab4332db82a`, `33f4b6f7917`, `ceb1944f5a8`, `4e79b66543c` | ~82 (snapshot component, step output item helpers) | ~48 (no-overlap check, `_assert_static`, snapshot test) |
| Backend | `58efa4d7b70` | 30 (model property, editor dict, `.ga` export/import, validation) | 72 (API round trip, invalid values, versions; model unit test) |
| Editor star | `ec94746e8cb` | 48 (`NodeOutput.vue`, `NewStep` type, 1 selector) | 66 (NodeOutput vitest, `test_star_preferred_output`) |
| Graph rendering | `8203d9bf95b` | ~202 (`usePreferredOutputItems`, `useEmbeddedOutputs` dedup and base sizes, `grewFrom` layout, `Node.vue`, `InvocationGraph.vue` widths) | ~312 (vitest) |
| Graph E2E | `b11aff0ee88` | 9 selectors | 71 |

These options are for John to choose from later, not recommendations.

**Option 1: one PR on stage 2, as it stands.** Land the 8 commits in their current order. The baseline and refactor commits go first, then backend, star, graph and E2E. The history is already logical, so no squashing is needed. This is the stage-sized PR the standing-branch plan pictures.

**Option 2: metadata PR on `dev`, then a rendering PR on stage 2.**
- **PR A** (on `dev`, independent of stages 1 and 2): `58efa4d7b70` and `ec94746e8cb`. That is the model property, managers, validation, API and model tests, the star, and its editor E2E, about 216 lines. Both commits apply to `dev`'s merge base without conflicts (checked with `git merge-tree`).
- **PR B** (on stage 2, after A merges): the baseline and refactor commits, the graph commit and the graph E2E.
- **Tradeoffs:**
  - A can be reviewed by backend and editor reviewers while stages 1 and 2 wait. It also unblocks the gxformat2 follow-up sooner.
  - But A adds metadata and a visible star with no effect until stages 2 and 3 land. The star's tooltip names a feature that doesn't exist yet, and Galaxy reviewers tend to push back on unused fields.
  - A variant is A without the star, so nothing user-visible ships early. Then A is 30 production lines with no consumer.

**Option 3: move the baseline and refactors down into stage 2's PR.** Fold `33f4b6f7917` (snapshot component), `ceb1944f5a8` (step output item helpers) and the two Selenium commits into stage 2. Stage 3 then starts at the backend commit.
- **Benefits:**
  - The snapshot component names stage 2's own "static snapshot" decision.
  - The item-identity fix improves stage 1's popover.
  - Stage 3's diff shrinks by about 130 lines.
- **Costs:**
  - Stage 2 is polished and waiting for John's read-through at `3b546b24e6f`. Folding these in moves its head, so its polish and differential-review snapshot would need refreshing.
  - On stage 2 the snapshot component has one consumer, and the exported helpers have no caller outside their file.
  - It is cheap to do if stage 2's review asks for changes anyway.
- **Variant:** move only `ceb1944f5a8` further down, into stage 1. It refactors stage 1 code and changes the hover popover's item identity.

**Option 4: split the graph commit.** One commit for the pure layout change (`grewFrom` in `embeddedOutputLayout.ts` and its 6 tests), then one for the rendering and composables. This is a split within PR B or Option 1, not a separate PR: a layout change with no caller wouldn't stand alone, as stage 2's evaluation also noted.

**Option 5: fold stages 2 and 3 into one "embedded outputs" PR on stage 1.** It gives one review of the embed toggle, the cards, the dedup and the growth together, at roughly 2,400 lines. It costs stage 2's finished polish, and the standing-branch plan pictures stage-sized PRs.

## As implemented (recommended)

A tool step can name one of its outputs as its `preferred_output`, stored in `WorkflowStep.config` without a migration and type-checked on import. The editor's star toggles it as an undoable update. With Embed Outputs on, the invocation graph draws the step as that output: a static 260-wide snapshot, deduped against its workflow output card, with stage 2's one-pass layout pushing right using the step's pre-growth size.

| Pros | Cons |
|---|---|
| - Covers the brief's storage, editor and rendering needs, and its dedup rule<br>- Keeps every stage 2 decision: nudge only, push right only, static content, constant sizes, one pass<br>- On real IWC layouts it is neutral or better than stage 2, because a grown step replaces its card: ChIP-seq PE goes from 4-5 steps moved 49px to 1 step moved 34px<br>- 0 overlaps in every measured scenario and in the fuzz runs<br>- Small backend footprint: 30 production lines, no migration, no extra SQL (measured)<br>- Mutation-tested on both sides, with all backend mutations caught and 23 of 24 client mutations | - Format 2 drops the field: YAML workflows can't set it, model-store invocation export and import loses it, and gxformat2's strict native schema rejects it in `.ga` files<br>- Only tool steps can name one<br>- Invocations of older workflow versions show nothing<br>- Dense single columns can push far (cat_table +444px on the test workflow)<br>- A step drawn as its output loses its job-state counts line<br>- A stale name, for example after a tool upgrade, is kept invisibly: no star shows, and the editor re-saves it |

## Expansion: subworkflow steps can name a preferred output

This was review S4: the workflow-output checkbox already shows for subworkflow steps. Allow the star on subworkflow steps, drop the backend's tool-only check, and resolve the output through the subworkflow's invocation.

| Pros | Cons |
|---|---|
| - A subworkflow step is the step most worth collapsing into one output<br>- It matches the workflow-output checkbox's step types | - Subworkflow outputs come through a different preview path (stage 1's `notReady` special case), so this is new resolution code and new tests, not a condition change<br>- No measured scenario has a subworkflow candidate<br>- It can follow as a loosening: tool-only is enforced in three places and documented, and lifting it later breaks nothing |

## Expansion: lint warning for a stale preferred output

The review's Q1 lean. In the editor's best-practices panel (`modules/linting.ts`, which already has workflow-output checks), warn when `preferred_output` names no output of the step, with a fix action that clears it.

| Pros | Cons |
|---|---|
| - Makes the invisible stale value visible and clearable<br>- Small and client-only, beside existing workflow-output lint checks | - A stale name is harmless: the graph shows the step as usual, and the toggle doesn't count it<br>- It needs a tool upgrade that removes an output, which is rare<br>- Workflow outputs with stale `output_name` get no such lint either, so this would be a lint for one field only |

## Expansion: validate the name against the tool's outputs

This was review Q1's hard-error form: reject a `preferred_output` that isn't one of the module's outputs on import or update.

| Pros | Cons |
|---|---|
| - It rejects input that can never work | - Missing tools have no known outputs, and tool upgrades can remove one later, so the check would have to skip cases and still allow stale values<br>- Workflow outputs, the sibling field, don't validate `output_name`<br>- Recorded as a decision (type check only) |

## Expansion: gxformat2 support

Add the field to gxformat2's native schema and to its format 2 converter.

| Pros | Cons |
|---|---|
| - Closes all three format 2 gaps, including the model-store round trip and strict `.ga` validation used by planemo and IWC-style linting | - It lives in a separate repository with its own release, and the brief rules it out<br>- Until it lands, a `.ga` carrying the field fails strict native validation. Curated (IWC) workflows shouldn't adopt the star until then; that belongs in the PR's known gaps |

## Expansion: ease the dense-column push

Cap growth, shorten the preview, or relax stage 2's "grew into a row, so the full gap" rule so that a grown step reaching a few pixels into another row costs less than a full card width.

| Pros | Cons |
|---|---|
| - The test workflow's 444px push and CUT&RUN's +164 would shrink | - Measured: 4.5rem previews empty tables down to their header, and 6rem helps only CUT&RUN<br>- The real lever is the push rule, which is stage 2's constraint layout; changing it there reopens a polished PR's measurements<br>- No real IWC layout shows a large stage 3 push beyond stage 2's |

## Expansion: show preferred outputs outside Embed Outputs, or on the latest version

These are decisions 1 and 2 reopened: draw steps as their preferred output in the default view, or resolve the field against the workflow's latest version rather than the invoked one.

| Pros | Cons |
|---|---|
| - Older invocations would show it, and the feature wouldn't hide behind a toggle | - Growth needs the nudge layout, which runs only in embed mode; in the default view grown steps would overlap. Stage 2 made the default view the author's untouched layout<br>- The latest version can name outputs that didn't exist when the workflow ran, and would need mapping steps across versions<br>- Both are recorded decisions with measured reasons |

## Expansion: list preferred outputs in the invocation response

This is performance follow-up A. Unlisted preferred outputs each fetch their step details, which are O(jobs) for mapped-over steps. Listing them in the invocation, or adding a jobs-free step endpoint, removes that fetch.

| Pros | Cons |
|---|---|
| - Removes about 2.5 MB of extrapolated transfer for a 10,000-element map-over | - It is an API change for a cost the stage 1 popover and step details panel already pay through the same cache<br>- It is paid once per page, only for starred steps whose output isn't a workflow output<br>- None of the measured workflows comes close |

## Contraction: backend and editor only (no graph rendering)

Ship the metadata and the star, and leave the rendering for later. As a sequencing choice this is Option 2 above. As a scope contraction, it would leave the star with nothing to show.

| Pros | Cons |
|---|---|
| - A smaller PR with no layout risk | - The field and star would do nothing; the brief's point is the node rendering as its output<br>- Stage 2's growth hooks would wait on nothing |

## Contraction: render without growth

The spike's open question was "cosmetic, no growth". Draw the preview at the shrunk step's size (9rem), so the layout ignores grown steps.

| Pros | Cons |
|---|---|
| - Drops `grewFrom` and the base-size reasoning from the layout | - A 144-wide preview is unreadable: tables show their header only<br>- The layout cost was measured as neutral or better on IWC layouts, so there is nothing to save |

<details>
<summary>The baseline and refactor commits, and other items considered</summary>

- **Where the four leading commits ship.** The no-overlap check (`ab4332db82a`) is meaningful on stage 2 too, and the "Baseline tests" prefix keeps it first. The other three are refactors motivated by stage 3. Each was checked on stage 2's tree: 465 vitest, and stage 2's E2E pass at the baseline tip. Keeping them in stage 3 leaves stage 2's polished head alone. Moving them down is Option 3. Either is defensible, and neither changes the feature.
- **Backend and client in one PR.** The backend is 30 production lines, all in the canonical places: one model property and one line each in the editor dict, export and import. The client is the only consumer. Galaxy usually reviews a field together with its first user, which favours one PR. Option 2 is the alternative if John wants the metadata reviewed or released sooner.
- **Job-state counts hidden on a grown step (review Q2).** Accepted as a decision. The node's state colouring and the step details still show the state, and keeping the line would make grown steps taller.
- **Backward edges from grown steps.** A known limitation, the same as stage 2's cards. It shows only in stress cases and at non-shipped preview heights.
- **Setting the field from the step's form panel as well as the node star.** One control is enough for v1, and the star sits beside the sibling output toggles.
- **The pydantic `WorkflowStepToExport*` models.** The review found them unused outside `schema.py`, and they already lack `when`. No change is needed.
- **Consistency with stage 2.** Every pass (normal review, performance, thermo-nuclear, Codex) checked the five recorded decisions, and none reversed one. This evaluation found no reason to either.

</details>
