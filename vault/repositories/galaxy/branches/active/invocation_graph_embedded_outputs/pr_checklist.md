Run via claude-opus-5-5 at medium effort.

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
