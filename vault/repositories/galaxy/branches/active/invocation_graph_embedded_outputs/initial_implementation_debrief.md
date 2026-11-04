Run via claude-opus-5-5 at high effort.

# Initial implementation debrief: invocation_graph_embedded_outputs (stage 3)

Stage 3 of [invocation_graph_embedded_outputs](../../../../../agents/gx_standing/standing_branches/invocation_graph_embedded_outputs/index.md). The implementation is the spike's stage 3, rebased onto stage 2 ([rebase debrief](rebase_on_stage2_debrief.md)) and then reworked after a [normal review](subagents/normal_review.md). The head is `0c2458ec608` on `jmchilton`: four commits on stage 2 (`3b546b24e6f`), 18 files, +847/−40.

```
created /home/ubuntu/projects/repositories/galaxy-brain/vault/repositories/galaxy/branches/active/invocation_graph_embedded_outputs/differential-review/snapshots/20261103T232839Z-implementation-0c2458ec6082.json
  implementation @ 0c2458ec6082 vs invocation_graph_embedded_workflow_outputs (merge-base 3b546b24e6f3)
  first snapshot: 4 commits, 18 files, 54 hunks
```

## What it does

- **Model.** A tool step can name a `preferred_output`, one of its own outputs.
  - It is stored in the existing `WorkflowStep.config` JSON column, with no migration.
  - It round-trips through the editor dict, `.ga` export and `.ga` import.
  - Import and update reject a value that isn't a string, and any name on a non-tool step.
- **Editor.** A star beside each tool output toggles the step's preferred output as an undoable step update.
- **Invocation graph.** With Embed Outputs on, a step that names an output it has, and that output exists, is drawn as that output.
  - The preview is a static, inert snapshot, like stage 2's cards. The step grows to 16.25rem wide (260×165 measured).
  - That workflow output gets no card of its own.
  - Stage 2's one-pass layout pushes the steps right of a grown step, using the size the step grew from.

## Commits

| Commit | What |
|---|---|
| `4063e38efd1` | Backend: `WorkflowStep.preferred_output` in `config` (with the `config` typing fix), the editor dict, `.ga` export and import, and validation. Model unit test; API round-trip and invalid-value tests. |
| `7bb2a23fd30` | Editor star toggle (`aria-pressed`, computed title, `UpdateStepAction`) and the `NewStep.preferred_output` type. NodeOutput vitest. |
| `a03656c3470` | Invocation graph: `usePreferredOutputItems` decides which steps are shown, and as what. Node.vue renders the inert preview. Stage 2's composable dedups those outputs and gives the layout their base size; `embeddedOutputLayout` tells growth from the author's spacing. Vitest for all of it. |
| `0c2458ec608` | E2E `test_embed_shows_steps_as_their_preferred_output`, shared static/beside-their-steps helpers, selectors. |

## Decisions (for John)

1. **Embed mode only.** Steps are drawn as their preferred output only while Embed Outputs is on.
   - Growth needs the nudge layout, which runs only in embed mode.
   - Stage 2 made the default view the author's untouched layout. A grown step in the default view would overlap its neighbours.
2. **The invoked version.** The preferred output is resolved against the workflow version that was invoked, not the latest.
   - The graph draws the invoked version's steps and positions, and each version has its own `WorkflowStep` rows.
   - Latest-version metadata would have to be mapped across versions, and could name outputs that didn't exist when the workflow ran.
   - The cost: invocations of older versions show nothing.
3. **Stored in `config`, no new column.** The column already exists, and nothing else reads or writes it except `copy_to`, so workflow copies and new versions keep the field. A migration buys nothing until a second display field appears. A dedicated column remains cheap later, since the branch targets dev.
4. **Tool steps only.** Enforced in three places:
   - the editor star;
   - the backend, which rejects a name on other step types;
   - the graph, which ignores it on other step types.

   Subworkflow steps could follow later; their outputs come through a different preview path.
5. **Type check only.** The name isn't validated against the tool's outputs, because tools can be missing or upgraded, and workflow output names aren't checked either. A stale name means the graph shows the step as usual, and the toggle doesn't count it.
6. **Static snapshot.** The preview follows stage 2's card rules: inert, pointer-transparent, no pagination. Clicking selects the step, whose details hold the interactive output.
7. **The preview replaces the step's state text.** The job-state counts aren't shown while the step is drawn as its output; the node's state colouring and the step details remain.
8. **Sizes match stage 2's card bodies.** The preview is 8.5rem tall, and 5.25rem for collections. A cap or a shorter preview was measured and rejected (below).
9. **The base size is a deliberate underestimate.** A grown step's pre-growth size is taken as 144×55 (9rem by one title line).
   - An overestimate can overlap a step placed just below a grown one (review S1). An underestimate can only add pushes.
   - Real title-wrapped heights (up to 109) make no measurable difference on these workflows.
10. **Backward edges from grown steps are a known limitation**, as for stage 2's cards.

## Layout measurements

Full tables are in [layout_measurements.md](layout_measurements.md). Offline numbers use the branch's layout function on real positions and edges; live numbers come from 1280×1000 with the tool panel closed.

The scenarios:
- **Test workflow ("Output previews"):** (a) the E2E pair head_table and cat_table; (b) the spike's pair cat_table and copy_image.
- **IWC replicas, typical:** 2-3 report, table or image steps per workflow (MACS2 report, MultiQC, mapping stats, fragment histogram).

| Workflow | Stage 2: moved / largest / fit | Stage 3: moved / largest / fit | Overlaps |
|---|---|---|---|
| Output previews, a (live = offline) | 3 / 368 / 84%→53% | 4 / 648 / 84%→45% | 0 |
| Output previews, b (live = offline) | 3 / 368 / 84%→53% | 5 / 484 / 84%→50% | 0 |
| IWC ChIP-seq PE (live) | 4 / 49 / 36%→33% | 1 / 34 / 36%→32% | 0 |
| IWC CUT&RUN (offline) | 5 / 603 / 41%→29% | 5 / 767 / 41%→29% | 0 |
| IWC dada2 paired (offline) | 0 / 0 / 31%→28% | 0 / 0 / 31%→30% | 0 |
| IWC ATAC-seq (live) | 21 / 527 / 25% | 21 / 527 / 25% | 0 |

**Read:**
- On real IWC layouts, stage 3 is neutral or better than stage 2, because a grown step replaces the card beside it.
- The long pushes are a property of the dense test workflow. Its steps sit 110-120px apart in one column, so a 165px step must grow into the next row, and the push is all-or-nothing: the full width plus the gap.
- Preview heights:
  - 6rem helps only CUT&RUN, and costs a table row.
  - 4.5rem helps the test workflow (648→320), but tables show their header only.
  - The lever for dense columns would be stage 2's "grew into a row" rule, not the preview height.
- Backward edges: none in any named scenario, except ATAC-seq's 7, which the authored layout already has.

## Verification (after the review fixes)

- **Vitest** on `Workflow/Editor`, `Workflow/Invocation`, `WorkflowInvocationState` and `useInvocationGraph.test.ts`: 58 files, 546 tests pass.
- **Client checks:** vue-tsc is clean. eslint shows no new errors, and prettier is clean.
- **Python:** ruff, black and isort are clean. `test_model.py -k preferred` passes.
- **API:** `test_preferred_output_round_trip`, `test_preferred_output_invalid` (10 cases) and `test_export_editor` pass (12).
- **E2E (Playwright):** `test_embed_shows_steps_as_their_preferred_output`, `test_embed_workflow_outputs` and `test_hover_previews_step_outputs` pass.

## Open questions

- **gxformat2 follow-up (separate repo).** Format 2 drops the field, with three effects:
  - YAML workflows can't set it.
  - Model-store invocation export, then import, loses it, because the import reads the `.gxwf.yml`.
  - gxformat2's strict native schema rejects the key in `.ga` files.
- **Dense columns.** Is the 444px push of cat_table on the test workflow acceptable? Real workflows don't show it.
- **Subworkflow steps.** Should they be able to name a preferred output later?
