Implement preferred step outputs in the invocation graph: a tool step can star one output, and with Embed Outputs on the step is drawn as that output.

Stage 2's Embed Outputs puts each labeled workflow output on the graph as a card beside its step. For a step whose whole point is one table or plot (a MultiQC report, a MACS2 summary, mapping stats), that's two boxes for one thing, and the plain step box beside the card tells you nothing the card doesn't. With this PR, a workflow author stars that output in the editor, and the step itself becomes a preview of it: one 260-wide box, where the card was, with the separate card gone. On the real IWC layouts measured it pushes no more than stage 2, and less where a grown step takes the place of a card beside it (ChIP-seq PE: one step moved 34 pixels instead of four moved 49).

![The workflow editor: head_table's top_rows and cat_table's out_file1 starred, every other tool output with an outline star](screenshots/02_editor_star_output_previews_a.png)

| Stage 2: step plus card | This PR: the step drawn as its preferred output |
|---|---|
| ![Stage 2 at 100%: head_table and cat_table as plain steps, top_rows as a card beside head_table](screenshots/18_stage2_output_previews_embedded_closeup_live.png) | ![The same view: head_table shows the top_rows table inside the step, labelled top_rows; cat_table shows its table, labelled out_file1, and is pushed right](screenshots/06_output_previews_a_embedded_closeup.png) |
| ![Stage 2, ChIP-seq PE at 50%: Bowtie2 with a mapping stats card beside it](screenshots/stage2_07_chipseq_embedded_50pct.png) | ![The same view: Bowtie2 drawn as its mapping stats table, and filter MAPQ30 sits further left](screenshots/11_chipseq_typical_embedded_50pct.png) |
| ![Stage 2, ATAC-seq at 50%: a fragment length histogram card beside its step](screenshots/stage2_10_atacseq_embedded_50pct.png) | ![The same view: the histogram step drawn as its output, and remove comments lines moves 164 pixels left of where stage 2 put it](screenshots/13_atacseq_typical_embedded_50pct.png) |

Each pair is one invocation, seen through stage 2's client and this PR's, at the same zoom and pan, so the frames can be flipped in place. The ChIP-seq and ATAC-seq rows are the same layout replicas as stage 2: real IWC positions, labels, edges and workflow outputs, where each step writes a prepared demo file shaped like the real output, not a tool result.

***This is a maintainer-proposed feature and the third stage of the invocation graph outputs effort. It stacks on stage 2's Embed Outputs (🌿[invocation_graph_embedded_workflow_outputs](https://github.com/jmchilton/galaxy/tree/invocation_graph_embedded_workflow_outputs)), and this description covers only what stage 3 adds.***

***Unlike stages 1 and 2, this adds workflow metadata: a `preferred_output` field on tool steps, stored in the existing `WorkflowStep.config` JSON column (no migration) and carried by the editor dict and `.ga` export and import. There are no pydantic model or OpenAPI type changes, and existing workflows' `.ga` exports are unchanged, because the key is written only when a step names a preferred output. gxformat2 doesn't know the field yet, so Format 2 workflows can't set it and drop it on conversion, and curated (IWC) workflows shouldn't use it until gxformat2 adds it.***

***The editor gains a star beside each tool output. The invocation graph changes only when an author has starred an output and a viewer turns Embed Outputs on. The default graph view is untouched, and growth is still a nudge, never a re-layout: steps only move right, by as little as the grown steps need.***

<details><summary>More frames: the second test scenario, the MACS2 stack, the plot step, and a running invocation</summary>

| | |
|---|---|
| ![Scenario b at 100%: cat_table shows its table, copy_image shows its reads-per-sample plot pushed right of it](screenshots/07_output_previews_b_embedded_closeup.png) | ![copy_image drawn as its plot at 150%: the title and axes are readable](screenshots/09_output_previews_b_copy_image_150pct.png) |
| ![Stage 2, ChIP-seq at 80%: summary of MACS2 with its report card](screenshots/stage2_08_chipseq_embedded_macs2_stack_80pct.png) | ![The same view: summary of MACS2 drawn as its report, and the MACS2 steps sit about 40 pixels left of stage 2's positions](screenshots/12_chipseq_typical_embedded_80pct.png) |
| ![A running invocation at 90%: the final step grown, showing the not-ready message](screenshots/16_running_embedded_closeup_90pct.png) | ![The same page after final finished: its table filled in in place, nothing moved](screenshots/17_running_finished_closeup_90pct.png) |
| ![The editor star's tooltip: Display this step as this output in invocation graphs with embedded outputs](screenshots/03_editor_star_tooltip_hovered.png) | ![Scenario a refit: head_table and cat_table grown, top_rows has no card of its own](screenshots/04_output_previews_a_embedded.png) |
| ![ChIP-seq PE embedded and refit: Bowtie2, summary of MACS2 and MultiQC drawn as their outputs](screenshots/10_chipseq_typical_embedded.png) | ![head_table clicked: still drawn as its table, with the step details below listing its dataset](screenshots/19_preferred_step_clicked.png) |

</details>

<details><summary>How it behaves</summary>

- **Editor:** each tool output gets a star beside its workflow-output checkbox and visibility toggle. Clicking it sets or clears the step's preferred output (one per step), as an undoable step update saved with the workflow. It has `aria-pressed` and a tooltip naming what it does. In read-only editors it shows the value but doesn't toggle.
- **Graph:** with Embed Outputs on, a step whose preferred output exists is drawn 260 pixels wide, a card's width, with a static snapshot of the output in place of its job-state text. Above the snapshot, a one-line label names the output as its card would have: the workflow output's label, or else the output's name. Label and snapshot are 8.5rem tall together (5.25rem for collections). The snapshot follows stage 2's card rules through one shared component: inert, pointer-transparent, collections summarized, compact tables without sort icons or pagination, images sized to the box. The step keeps its state colouring, and clicking it opens the step details, which hold the interactive output.
- **Dedup:** when the preferred output is also a labeled workflow output, it gets no separate card; the step stands in for it.
- **Not a workflow output:** the invocation lists only workflow outputs, so for any other preferred output the step's details are fetched once, and again only if its state changes while the output is still missing. Stage 1's hover popover already pays the same request.
- **Layout:** stage 2's one left-to-right pass, told what size each grown step grew from, so it can separate the spacing the author left from the room the growth needs. A step that grows into a row it wasn't in keeps the full gap. Steps still never move up, down or left.
- **Running invocations:** a step grows, with one nudge, once it's scheduled and its output exists. Until its job finishes it shows stage 1's not-ready message, then fills in place; its size doesn't change, so nothing moves (tested).
- **Toggle:** Embed Outputs is enabled once any workflow output exists or a step with a preferred output has been scheduled.

</details>

<details><summary>The field: storage, serialization and versions</summary>

- **Model:** `WorkflowStep.preferred_output` is a property over `WorkflowStep.config`, a JSON column that already existed and that nothing else reads, so there's no migration, and the value loads with the step row (measured: no extra SQL statements). Steps saved before November 2016 with a missing tool hold a JSON string there; the getter returns `None` for them. The column's annotation is corrected from `bytes` to `dict`.
- **Serialization:** the editor dict always carries `preferred_output` (`null` when unset). The `.ga` export writes it only when set, so existing exports are byte-for-byte unchanged. The `.ga` import and editor update read it.
- **Validation:** import and update reject a non-string value, and any value on a non-tool step (`ObjectAttributeInvalidException`). The name isn't checked against the tool's outputs, because a tool can be missing or upgraded. A stale name is harmless: the graph draws the step as usual, and the editor shows no star.
- **Versions:** each workflow version keeps its own value. Saves, renames (`copy_to`) and refactors carry it to the new version; an API test checks five versions in a row. The graph draws the invoked version's steps, so an invocation of a version saved before the star shows the step as usual.
- **Not in the API schema:** no pydantic model or OpenAPI type changes. The editor dict and `.ga` paths are untyped dicts.

</details>

<details><summary>What it doesn't do (known gaps)</summary>

- **gxformat2:** Format 2 has no `preferred_output` yet, so YAML workflows can't set it, converting a workflow to Format 2 drops it, and a model-store invocation export and import (which goes through Format 2) loses it. gxformat2's strict native-format schema rejects a `.ga` that carries it, so curated workflows (IWC) shouldn't use the star until gxformat2 adds the field. That's a follow-up in gxformat2, not this PR.
- Only tool steps can name a preferred output. A subworkflow step would need a second preview path.
- Steps are shown as their output only in Embed Outputs mode; the growth needs its nudge layout.
- A grown step loses its job-state counts line. Its state colouring and the step details remain.
- On dense single columns a grown step can push far: on the test workflow `cat_table` moves 444 pixels further than in stage 2. That's stage 2's rule that a step growing into another row keeps the full gap.
- As with stage 2's cards, an edge from a grown step can end up running backwards when the author drew steps close together. Nothing overlaps.

</details>

<details><summary>How the branch is organised</summary>

Nine commits, about 440 production lines (30 of them backend) and 670 lines of tests and selectors:

1. Baseline test: stage 2's E2E also checks that embedding leaves no two steps overlapping.
2. Refactor: `InvocationOutputSnapshot.vue` holds stage 2's static-snapshot rules for the cards.
3. Refactor: `stepOutputItem` and `useStepDetailsRefetch` in `useStepOutputItems.ts`; stage 1's popover now gets the stored item objects instead of copies.
4. Refactor: a shared Selenium `_assert_static` check with readable failure labels.
5. Backend: `WorkflowStep.preferred_output`, the editor dict, `.ga` export and import, validation, model and API tests.
6. The editor star, with Vitest and the Selenium test `test_star_preferred_output` for the save path.
7. The graph: `usePreferredOutputItems`, `Node.vue` rendering the snapshot, the layout's `grewFrom`, and the CSS widths bound to the layout's TS constants.
8. The E2E test `test_embed_shows_steps_as_their_preferred_output`.
9. The label on a grown step, in `InvocationStepPreferredOutput.vue`, which `Node.vue` now renders; Vitest and an E2E check.

The first four touch only stage 1 and stage 2 code and pass stage 2's tests on their own, so they could move down into stage 2's PR instead.

</details>

## Risks

The one-way door is the new `preferred_output` key on workflow steps: once workflows are saved with it, Galaxy has to keep reading it from `.ga` files and the editor dict, and gxformat2 will need to match its name and meaning.

<details><summary>Risk Details</summary>

- The field's name and semantics (one output name per tool step, shown in place of the step) become part of the `.ga` format. Renaming it or widening it to a list later means a compatibility path.
- It lives in `WorkflowStep.config` rather than its own column. That avoids a migration, but a later move to a column needs a data migration, and anything else that starts using `config` has to share it.
- A `.ga` that carries the field fails gxformat2's strict native-format validation until gxformat2 adds it, which planemo-style linting relies on.
- A stale name after a tool upgrade is kept silently: no star shows, and the editor re-saves it.
- The graph side is opt-in and client-only, and the layout changes only for workflows whose author starred an output.

</details>

<details><summary>Risk Review Advice</summary>

The serialization contract is the part to review: the four lines in `workflows.py` (editor dict, `.ga` export only when set, import and update with validation) and the `WorkflowStep` property, and whether `preferred_output` in `config` is the shape Galaxy wants to keep. The API tests in `test_workflows.py` pin the round trip, invalid values and the version behaviour.

On the client, `grewFrom` in `embeddedOutputLayout.ts` is the one change to stage 2's layout rules: author spacing is now judged from the size a step had before it grew. The base size is a deliberate underestimate (a one-line title), because an underestimate can only add pushes while an overestimate could overlap a step placed just below a grown one.

</details>

## Context

Third stage of 🌿[invocation_graph_embedded_outputs](https://github.com/jmchilton/galaxy/tree/invocation_graph_embedded_outputs), the standing branch for showing outputs inside the invocation graph. Stacks on stage 2, 🌿[invocation_graph_embedded_workflow_outputs](https://github.com/jmchilton/galaxy/tree/invocation_graph_embedded_workflow_outputs), whose Embed Outputs layout and cards it extends, which in turn stacks on the stage 1 hover previews, 🌿[invocation_graph_output_previews](https://github.com/jmchilton/galaxy/tree/invocation_graph_output_previews). Developed with [John's Galaxy Brain Branch Factory](https://galaxy-brain.jmchilton.net/factory/galaxy-branches/).

## Human Review

(PUBLISHING_AGENT: Please include the contents of BRANCH_DIRECTORY/human_review.md before publishing this. If that file doesn't exist please double check that this PR should be published - if user confirms yes publish without this section.)

## Agentic Checks

### ✅ [John's Agentic Checklist](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/gx_pr_checklists/GENERAL.md)

<details><summary>All general and workflow-related items pass.</summary>

- [x] What does the user see when it fails? A grown step shows the same states as stage 2's cards: the not-ready placeholder, the dataset display's own error, or the collection summary's error. A step whose output can't be resolved is drawn as usual. Bad values sent to the API get a 400 that names "preferred output".
  <details>

  - `Node.vue` renders `InvocationOutputSnapshot` only while `preferredItem` is set. Otherwise it falls back to `NodeInvocationText`, so a stale name, a missing tool output, a failed step-details fetch or a not-yet-produced output leaves the step looking as it does today.
  - The snapshot wraps stage 1's `InvocationOutputPreview`, which shows "This output isn't ready yet: the step is <state>." for non-terminal states. Errored datasets go through `HistoryDatasetDisplay`, and collections through `InvocationEmbeddedCollection`'s error message.
  - Backend (`lib/galaxy/managers/workflows.py`, `__module_from_dict`): a non-string value raises `ObjectAttributeInvalidException` "Invalid preferred output [...]". A name on a non-tool step raises "Only tool steps can name a preferred output...". `test_preferred_output_invalid` covers both cases for import and update.
  - Editor: the star appears only on tool steps (`showCalloutPreferred`). It is undoable, and when read-only its title explains the feature instead of offering the action.
  - Legacy steps whose `config` is a JSON string (from the 2013 to 2016 missing-tool path) return `None` instead of failing export. `test_workflow_step_preferred_output_with_legacy_config` covers this.
  - Gap: `hasEmbeddableOutputs` counts any scheduled step with a valid preferred-output name. If that output is never produced (filtered, or the job failed before creating it), the toggle is enabled but the step stays as usual. The only visible change is the 9rem shrink. Cards are `inert`, so errors inside a snapshot can't be acted on there. The step details remain the interactive route.
  </details>
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. The layout, composable and API tests assert on geometry, fetch counts and round-trip results. The component tests check props and visibility where those are the contract.
  <details>

  - `embeddedOutputLayout.test.ts` (`57ac7960594`, "a step that grew") asserts the resulting positions. It covers pushes within grown rows, the author's tighter spacing, growth into another row, edge carry-along, and five base-height cases, including the underestimate that guards against the overlap bug.
  - `usePreferredOutputItems.test.ts` uses the MSW server mock. It counts requests: none for listed outputs, one for unlisted ones, a refetch only on a state change while the output is still missing, and none for excluded steps. It also checks item identity (`toBe`), which is the re-render behaviour.
  - `useEmbeddedOutputs.test.ts` checks dedup through rendered card labels and toggle enablement. It checks the `grewFrom` passed to the mocked layout, which is the composable's actual contract with the layout.
  - API (`test_workflows.py`): `test_preferred_output_round_trip` covers the editor dict, `.ga` export and import, and clearing. `test_preferred_output_kept_by_new_versions` covers rename, refactor and clear across five versions. `test_preferred_output_invalid` has 10 parametrized cases.
  - `test_model.py`'s legacy-config test pins a real failure mode that the API can't reach.
  - The most literal tests are `InvocationOutputSnapshot.test.ts`, which checks the props passed to `InvocationOutputPreview` (`summarizeCollection: true`), and `Node.test.ts`, which checks that the snapshot renders and receives the item. Both are small. The Selenium `_assert_static` check proves the real effects: pointer pass-through and no focusable controls.
  - Selenium: `test_star_preferred_output` covers save, `.ga` download and reopening, and that starring doesn't make the output a workflow output. `test_embed_shows_steps_as_their_preferred_output` covers real table rows (5 for `head -n 5`), the fetched non-workflow output, dedup of `top_rows`, no overlaps, no vertical moves, and restoration on toggle-off.
  </details>
- [x] Are baseline tests in their own leading commits (if applicable)? Yes. `ab4332db82a` ("Baseline tests: ...") is first and changes only `test_workflow_invocation_graph.py`. It adds the no-overlap check and the `EDGE_TOLERANCE` in `clear_of`, both meaningful on stage 2. Three behaviour-preserving refactors follow (`33f4b6f7917`, `ceb1944f5a8`, `4e79b66543c`), then the feature commits, each with its own tests.
- [x] Are the comments free of excess archeology? Yes. The comments explain current constraints: why the base size underestimates (`useEmbeddedOutputs.ts`), why grown rows keep the full gap (`embeddedOutputLayout.ts`), why the snapshot is inert, and why the E2E sets the field on a converted native dict (format 2 can't carry it yet). The one historical reference is the model getter's "steps saved before Nov 2016 with a missing tool hold the step's JSON as a string", which explains the `isinstance` guard on rows that still exist.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A. The legacy-`config` note in `WorkflowStep.preferred_output` describes data that still exists, not a previous implementation.
- [x] Which existing workflows change behavior (if any)? None. No existing step names a preferred output, so graphs, cards and exports are unchanged until an author stars one. The visible change is a new star on every tool output in the editor. The editor dict also gains a `preferred_output: null` key per step.
  <details>

  - Model: the field is stored in `WorkflowStep.config`, with no migration and no new column. Before this branch only `copy_to` touched `config`. The column's type annotation changes from `bytes` to `dict[str, Any]`; the getter's guard handles legacy string rows. The setter drops the key and stores `None` when the field is cleared, so unstarred steps keep `config` NULL.
  - Serialization:
    - The editor dict always carries the key.
    - `.ga` export carries it only when set (`if step.preferred_output:`), so existing `.ga` exports are byte-for-byte unchanged.
    - `.ga` import and update read it only when the key is present.
    - gxformat2 drops it: format 2 can't set it, format 2 export loses it, and model-store invocation round trips (via gxformat2) lose it. gxformat2's strict native schema rejects a `.ga` that carries it, so curated (IWC) workflows shouldn't star outputs until the gxformat2 follow-up lands. This is a known gap and a recorded follow-up.
  - Versioning: each version keeps its own value. `copy_to` copies `config` on rename, refactors rebuild from the `.ga` export, and clearing it makes a new version (all tested). The invocation graph loads the invoked version (`getFullWorkflowCached(workflowId, workflowVersion)` in `useInvocationGraph.ts`), so invocations of versions saved before a star show nothing.
  - Invocation graph: growth happens only with "Embed Outputs" on, which starts off. The default view is the author's layout, untouched. Stage 2's cards now render through `InvocationOutputSnapshot`, with the same rules. Stage 1's hover popover now receives the stored item objects, and its `items` covers only the step's own outputs, which is all it reads. No visible change.
  </details>
- [x] Who hits this in practice and what is the evidence? Users who read a run's results off the invocation graph and want a step's main table or image in the step itself, without hovering or opening details. Evidence: John's maintainer requirements draft (`issues_incubator/incubating/invocation_graph_embedded_outputs/raw.md`, stage 3, from user input) and the spike screenshots, which John accepted with no separate issue (John, 2026-11-03).
- [x] Were simpler or existing approaches considered? Yes. The step reuses stage 2's snapshot and nudge layout. Simpler storage, rendering and validation options were measured or weighed, and their rejections are recorded (`scope_evaluation.md`, `layout_measurements.md`).
  <details>

  - Storage: the existing, unused `WorkflowStep.config` JSON instead of a new column and migration.
  - Rendering without growth (the spike's "cosmetic" option): rejected, because a 144px-wide preview shows a table's header only.
  - Full re-layout or mixed-axis placement for grown steps: ruled out. John's rule is nudge only, never a full re-layout. Stage 2's right-only constraint layout absorbs growth through `grewFrom`. On the IWC layouts this is neutral or better than stage 2, because a grown step replaces its card.
  - Shorter or capped previews (6rem, 4.5rem): measured. 6rem helps only CUT&RUN and costs a table row. 4.5rem empties tables.
  - Measuring each step's true pre-growth size: measured as making no difference. A constant underestimate (144x55) is used instead, because an overestimate reproduced an overlap.
  - Validating the name against the tool's outputs: rejected, because missing or upgraded tools have no reliable output list. A stale name is harmless: the step is drawn as usual.
  - Showing it outside embed mode, or resolving it against the latest version: rejected. Growth needs the nudge layout, and the latest version can name outputs that didn't exist at run time.
  - Subworkflow steps, an editor lint for stale names, gxformat2 support and listing preferred outputs in the invocation response were left as follow-ups.
  </details>

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/invocation_graph_embedded_outputs/pr_checklist/). Run via claude-opus-5-5 at medium effort.

</details>

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>Keep scope: storage, the editor star and the graph rendering cover the brief, and every stage 2 decision still holds.</summary>

gxformat2 (a separate repository), subworkflow steps, validating names against tool outputs, a lint for stale names, and easing the dense-column push were weighed and left out; each would widen scope or reopen a stage 2 decision. The open questions are about how to ship, not what to include: whether the backend and star could land on `dev` first, and where the four leading baseline and refactor commits go.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/invocation_graph_embedded_outputs/scope_evaluation/). Run via claude-opus-5-5 at high effort.

</details>

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>No blockers; four duplications removed.</summary>

No file crosses 1,000 lines, and stage 3 adds no feature checks to shared paths beyond the hooks it needs in `Node.vue` and `NodeOutput.vue`. Fixed: one static snapshot component for cards and grown steps, `grewFrom` replacing a loose pair of optional sizes, CSS widths bound to the layout's TS constants, and a star condition of its own.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/invocation_graph_embedded_outputs/thermo_nuclear_review/). Run via claude-opus-5-5 at high effort.

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>Mutations caught: 23 of 24 client and 5 of 5 backend; one selector bug fixed.</summary>

- The star had borrowed the workflow-output toggle's class, so a Selenium selector read a starred output as a workflow output. It now uses `aria-pressed`, and the new `test_star_preferred_output` covers save, `.ga` download and reopening.
- A new API test checks that renames, refactors and clears each keep the right value across five versions.
- Tests that only asserted classes or pass-through were dropped or merged; layout and fetch-rule tests stay as unit tests.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/invocation_graph_embedded_outputs/test_challenges_debrief/). Run via claude-opus-5-5 at high effort.

</details>

### ✅ [N.O.T. M.A.R.I.U.S. Performance Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_PERFORMANCE.md)

<details><summary>Measured; preview re-renders went from 69 watch fires to 24, and the backend adds no SQL.</summary>

- Fixed: previews re-rendered because the item object was copied; the stored step-details object is now passed through.
- Reading and writing `preferred_output` adds 0 SQL statements.
- Toggle requests match stage 2's cards, the layout runs at most once per frame, and polling causes no re-layouts.
- Left for later: a starred step whose output isn't a workflow output fetches its step details once (about 248 B per job), as stage 1's popover does.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/invocation_graph_embedded_outputs/performance_challenges_debrief/). Run via claude-opus-5-5 at high effort.

</details>

### ✅ Second Frontier Model Review

<details><summary>No defects; one reuse finding confirmed and fixed.</summary>

Preferred-output resolution duplicated stage 1's step-output helpers. Both composables now share `stepOutputItem` and `useStepDetailsRefetch`.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/invocation_graph_embedded_outputs/codex_review/). Run via gpt-6.1-sol (codex-cli 0.165.0).

</details>

### ✅ [Refactoring of base branch](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_REFACTOR_BASELINE.md)

<details><summary>One baseline test and three refactors lead the feature commits, with the final tree unchanged.</summary>

The baseline test checks that embedding leaves no two steps overlapping. The refactors extract the static snapshot component, the per-output step item helpers and a shared Selenium static check. Each passes stage 2's tests on its own, so the four could move down into stage 2.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/invocation_graph_embedded_outputs/baseline_refactor/). Run via claude-opus-5-5 at high effort.

</details>

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
