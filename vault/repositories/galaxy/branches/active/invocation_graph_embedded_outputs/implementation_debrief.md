Run via claude-opus-5-5 at high effort.

# Implementation debrief: invocation_graph_embedded_outputs (stage 3)

**STATUS: READY.** Stage 3 of [invocation_graph_embedded_outputs](../../../../../agents/gx_standing/standing_branches/invocation_graph_embedded_outputs/index.md) is hardened. A tool step can name a preferred output. In the editor, a star on each tool output sets or clears it. While Embed Outputs is on, the invocation graph draws that step as its output: a static snapshot as wide as a card. That workflow output gets no separate card, and stage 2's nudge layout makes room for the step's growth. Scope evaluation: **keep scope**.

The head is `a8728b098c1` on `jmchilton`. It is eight commits on stage 2 (`3b546b24e6f`), 24 files changed, +958/−90 lines. The backend, client and Selenium tests are all touched.

```
created /home/ubuntu/projects/repositories/galaxy-brain/vault/repositories/galaxy/branches/active/invocation_graph_embedded_outputs/differential-review/snapshots/20261104T022910Z-hardening-a8728b098c17.json
  hardening @ a8728b098c17 vs invocation_graph_embedded_workflow_outputs (merge-base 3b546b24e6f3)
  since 20261103T232839Z-implementation-0c2458ec6082:
    commits: 0 same, 0 rebased, 4 changed, 4 new, 0 dropped
    hunks:   27 carried, 21 changed, 19 new, 6 dropped
    new     ab4332db82a8 Baseline tests: invocation graph Selenium tests check that embedding outputs leaves no two steps overlapping
    new     33f4b6f79177 Invocation graph: a static output snapshot component for the embedded output cards
    new     ceb1944f5a8d Invocation graph: resolve a step's output items one output at a time
    new     4e79b66543c9 Invocation graph Selenium tests: a shared check that previews are static
    changed 58efa4d7b70c Workflow steps can name a preferred output (4 differing hunks)
    changed 58ffc620081e Workflow editor: star an output as its step's preferred output (5 differing hunks)
    changed 7e55164510f5 Invocation graph: with Embed Outputs on, show steps as their preferred output (16 differing hunks)
    changed a8728b098c17 E2E test for steps shown as their preferred output in the invocation graph (5 differing hunks)
```

## Commits

| Commit | What |
|---|---|
| `ab4332db82a` | Baseline tests: stage 2's E2E also checks that embedding leaves no two steps overlapping |
| `33f4b6f7917` | Refactor: `InvocationOutputSnapshot.vue` holds the static-snapshot rules (inert, pointer-transparent, summarized collections, no pagination) for stage 2's cards |
| `ceb1944f5a8` | Refactor: `stepOutputItem` and `useStepDetailsRefetch` in `useStepOutputItems.ts`; stage 1's popover now gets the stored item objects |
| `4e79b66543c` | Refactor: a shared Selenium check `_assert_static`, with readable failure labels |
| `58efa4d7b70` | Backend: `WorkflowStep.preferred_output` in `config` (with the `config` typing fix), in the editor dict, `.ga` export and import. Import and update reject a non-string value, or a name on a non-tool step. Tests: model, the API round trip, invalid values, and copies, refactors and versions |
| `58ffc620081` | Editor star: tool-only, undoable, `aria-pressed` and a computed title. NodeOutput vitest, and the Selenium test `test_star_preferred_output` for the save path |
| `7e55164510f` | Invocation graph: `usePreferredOutputItems` is the single source of which steps are shown and as what. Node.vue renders the snapshot, the layout gets `grewFrom`, and the CSS widths come from the TS constants |
| `a8728b098c1` | E2E `test_embed_shows_steps_as_their_preferred_output`, with fit and 100% screenshots |

The four leading commits can move into stage 2's PR (scope evaluation, option 3).

## Decisions (for John)

1. **Embed mode only.** The default graph view stays the author's untouched layout. Growth needs the nudge layout, and that runs only in embed mode.
2. **The invoked version.** The graph draws the invoked version's steps, and each version keeps its own value (tested), so invocations of older versions show nothing.
3. **Stored in `config`, with no new column or migration.** Nothing else reads the column, and `copy_to` carries it (tested).
4. **Tool steps only.** The editor star, the backend validation and the graph all enforce it. Subworkflow steps would need a second preview path.
5. **The value is type-checked, but the name isn't checked against the tool's outputs.** Tools can be missing or upgraded. A stale name means the step is drawn as usual, and the toggle doesn't count it.
6. **Static snapshot.** The step follows stage 2's card rules, through one shared component. Clicking selects the step, and its details hold the interactive output.
7. **The snapshot replaces the step's job-state text.** The node's state colouring and the step details remain.
8. **The preview is 8.5rem tall (5.25rem for collections), with no cap.** Shorter previews don't pay:
   - 6rem helps only CUT&RUN and costs a table row.
   - 4.5rem leaves only a table's header showing.
9. **A grown step is exactly a card's width, 260px.** The CSS reads `EMBEDDED_OUTPUT_WIDTH` and `EMBEDDED_STEP_WIDTH_REM` through `v-bind()`, so the layout's sizes can't drift from the styles. Nothing changes at a 16px root font. At other root sizes, grown steps stay 260px instead of scaling as 16.25rem would.
10. **The base size is a deliberate underestimate: 9rem by one title line (144×55).** An overestimate could overlap a step placed just below a grown one, the normal review's reproduced bug. An underestimate can only add pushes. Real wrapped heights, up to 109px, made no measurable difference.
11. **Backward edges from grown steps are a known limitation**, as for stage 2's cards. None appear in the named scenarios except edges the ATAC-seq author already drew backwards.

## Layout measurements

Full tables are in [layout_measurements.md](layout_measurements.md). Live runs used 1280×1000.

| Workflow | Stage 2: moved / largest / fit zoom | Stage 3: moved / largest / fit zoom | Overlaps |
|---|---|---|---|
| Output previews (a) head_table+cat_table, live | 3 / 368 / 84%→53% | 4 / 648 / 84%→45% | 0 |
| Output previews (b) cat_table+copy_image, live | 3 / 368 / 84%→53% | 5 / 484 / 84%→50% | 0 |
| IWC ChIP-seq PE, typical, live | 4 / 49 / 36%→33% | 1 / 34 / 36%→32% | 0 |
| IWC CUT&RUN, typical, offline | 5 / 603 / 41%→29% | 5 / 767 / 41%→29% | 0 |
| IWC dada2 paired, typical, offline | 0 / 0 / 31%→28% | 0 / 0 / 31%→30% | 0 |
| IWC ATAC-seq, typical, live | 21 / 527 / 25% | 21 / 527 / 25% | 0 |

On real IWC layouts, stage 3 is neutral or better than stage 2, because a grown step replaces the card beside it. The long pushes come from the dense test workflow, whose steps sit 110-120px apart in one column. The push there is all-or-nothing.

## Hardening

- **Brain research** ([brain_research.md](brain_research.md)): 18 documents. Two research requests were queued, on workflow serialization and on the editor step store and undo.
- **Normal review** ([subagents/normal_review.md](subagents/normal_review.md)): no blockers, and all six should-fix findings were fixed:
  - the base-size overlap bug;
  - one source of truth for which steps are shown;
  - validation;
  - tool-only scope;
  - fetches only for unlisted outputs.
- **Test challenges** ([test_challenges_debrief.md](test_challenges_debrief.md)):
  - Fixed a selector bug: the star's borrowed class made it read as a workflow-output toggle.
  - New `test_star_preferred_output`, and an API test for copies, refactors and versions.
  - Mutations caught: 23 of 24 client, 5 of 5 backend.
- **E2E polish** ([polish_e2e_tests_debrief.md](polish_e2e_tests_debrief.md)):
  - The tests load workflows the way the populators do.
  - Failure labels are readable, and the overlap check allows subpixel rounding.
  - 11 of 11 pass.
- **Performance** ([performance_challenges_debrief.md](performance_challenges_debrief.md)):
  - Fixed: previews re-rendered because the item object was copied (69 to 24 watch fires).
  - The backend adds 0 SQL statements.
  - Toggle requests match stage 2's cards.
  - The layout runs at most once per frame, and polling causes no re-layouts.
- **Codex** ([codex_review.md](codex_review.md)): one confirmed reuse finding, fixed by sharing the step-output helpers between both composables.
- **Thermo-nuclear** ([thermo_nuclear_review.md](thermo_nuclear_review.md)): no blockers. Four changes:
  - the shared snapshot component;
  - `grewFrom` replacing `baseWidth`/`baseHeight`;
  - CSS widths taken from the TS constants;
  - a star condition of its own.
- **Baseline refactor** ([baseline_refactor.md](baseline_refactor.md)): four leading commits, one baseline test and three refactors. The final tree is unchanged.
- **Scope** ([scope_evaluation.md](scope_evaluation.md)): keep scope. It lists five ways to split the work without recommending one.
- **Check branch:**
  - `make format` is clean.
  - mypy on the six changed Python files shows 1946 errors, against 1940 on stage 2. All six new ones are `no-untyped-def` on new test functions, which matches the files' existing tests.
  - vue-tsc is clean; eslint shows warnings only; prettier is clean.
- **Screenshots** ([screenshot_debrief.md](screenshot_debrief.md)): 18 frames at 1280×1000.
  - Editor star: 01-03.
  - Output previews, fit and 100% close-ups: 04-08. 06 and 07 flip with stage 2's 03.
  - The `copy_image` image close-up: 09.
  - ChIP-seq whole graph, 50% and 80%: 10-12, flipping with stage 2's 07 and 08.
  - ATAC-seq at 50%: 13, flipping with stage 2's 10.
  - Running and finished pairs with the not-ready message inside a grown step: 14-17.
  - Stage 2's 03 retaken live: 18.

**Final verification:**
- Vitest on `Workflow/Editor`, `Workflow/Invocation`, `WorkflowInvocationState` and `useInvocationGraph`: 59 files, 543 tests pass.
- API: the preferred-output tests and `test_export_editor` pass.
- Playwright:
  - The stage 3 E2E, the embed and hover tests, and `test_star_preferred_output` pass at the baseline-refactor head.
  - The two Selenium files the screenshot pass touched pass at `a8728b098c1`.
- The Selenium backend wasn't run locally, and there's no CI run yet.

## Open questions (for John)

- **gxformat2 follow-up** (a separate repo). Format 2 drops the field, so:
  - YAML workflows can't set it;
  - model-store invocation export, then import, loses it;
  - gxformat2's strict native schema rejects it.

  The PR should list these as known gaps, and curated (IWC) workflows shouldn't use the star until the follow-up lands.
- **PR shape** (see scope evaluation):
  - one PR on stage 2;
  - the backend and star as their own PR on `dev`;
  - or the four baseline and refactor commits folded into stage 2. That last option would mean refreshing stage 2's polish.
- **Dense columns.** Is the 444px push of `cat_table` on the test workflow acceptable? Easing it means changing stage 2's "grew into a row" rule.
- **Subworkflow steps.** Should they be able to name a preferred output later?
- **Large map-overs.** A starred step whose output isn't a workflow output fetches the step's details once on toggle, about 248 B per job. Stage 1's popover pays the same cost. A cheaper endpoint would be a backend follow-up.
