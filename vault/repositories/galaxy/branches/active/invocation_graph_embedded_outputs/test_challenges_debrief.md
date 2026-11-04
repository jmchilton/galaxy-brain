Run via claude-opus-5-5 at high effort.

# Test challenges debrief: invocation_graph_embedded_outputs (stage 3)

The process is [GX_PROCESS_CHALLENGE_TESTS.md](../../../../../agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md). The base was `0c2458ec608`, after the normal review fixes. The changes are folded into the four stage 3 commits, with no new commits:

| Commit | What |
|---|---|
| `83d9c442144` | Backend (message rewritten to mention copies, refactors and versions) |
| `fae83c40f54` | Editor star (message rewritten to mention aria-pressed and the new E2E test) |
| `b55ea312e50` | Invocation graph |
| `c9982ae30a3` | Invocation graph E2E (unchanged) |

The tree is clean, nothing is pushed, and the servers are running on the final code.

## Backend: what was missing, and what was added

The API round trip covered the editor dict, the `.ga` export, the `.ga` import and clearing the field. No test covered the other paths that make a new version, and the invocation graph depends on those paths:

- **A rename** (a name-only `PUT`) copies the latest version through `WorkflowStep.copy_to`.
- **A refactor** rebuilds the workflow from its `.ga` export.
- **Older versions** must keep their own value. The graph reads the version that was invoked (`getFullWorkflowCached(id, version)`).

**New API test `test_preferred_output_kept_by_new_versions`.** It sets the field through the editor, renames the workflow, refactors a label and then clears the field. It then checks the editor dict of each of the five versions: `[None, out_file1, out_file1, out_file1, None]`.

**Helpers.** The editor-dict download, set and update sequence was repeated several times. Two local helpers replace it: `_tool_step_preferred_outputs(workflow_id, version=None)` and `_set_tool_step_preferred_output(workflow_id, value)`. `test_preferred_output_round_trip` now uses them. Its assertions are unchanged, apart from an `"absent"` sentinel that folds the "key only when set" check into the export assertion.

**The invalid-value test was kept as it was.** Its raw `_post("workflows", data={"workflow": json.dumps(...)})` matches the ten sibling validation tests in the file (for example `test_annotation_size_limit`). `create_workflow_response` posts to `workflows/upload`, which is a different endpoint.

**Model unit test, rewritten.** `test_workflow_step_preferred_output` tested the property directly, and the API tests cover everything it checked that can be observed. The one exception was `config or None`, and nothing reads `config`, so that check went too. The replacement is `test_workflow_step_preferred_output_with_legacy_config`. Steps saved before November 2016 with a missing tool hold a JSON string in `config`, and the getter must return `None` for them. Without the guard, exporting such a workflow raises an error. The API can't reach these rows, so a unit test is the right layer.

**Not added:**
- **Model-store round trip.** A model-store (invocation) round trip loses the field through gxformat2, which is the known gap recorded for the follow-up. A test would have to be an xfail, so none was added.
- **Shared-workflow import** (`copy_workflow_for_user`). It goes through the same `copy_to` that the rename test now covers.

## Editor: an implementation fix and a new E2E test

**Bug.** The star reused the workflow-output checkbox's `mark-terminal-active` class. No CSS uses that class. Its only reader is the Selenium selector `workflow_editor.node.workflow_output_toggle_active`, which therefore matched a starred output as an active workflow output.
- **Fix:** the star drops the class. It shows its state through `aria-pressed` and the solid or regular star icon.
- **Test:** the NodeOutput vitest no longer asserts the class.

**Gap.** Nothing proved the editor save path: that the star's change is sent on save, stored, and loaded back into the editor. The NodeOutput test only proves the store changes, and the invocation-graph E2E sets `preferred_output` directly on a native dict.

**New E2E test `test_workflow_editor.py::test_star_preferred_output`.** It uses `auto_layout=False`, so the save button is enabled only because of the star. With a new selector `workflow_editor.node.preferred_output_toggle`, it:
1. Stars `out_file2` of a `create_2` step.
2. Checks that the step's `workflow_output_toggle_active` is absent.
3. Saves.
4. Checks the `.ga` download: `preferred_output == "out_file2"` and no workflow outputs.
5. Reopens the editor and checks that `out_file2` is pressed and `out_file1` is not.

Putting `mark-terminal-active` back on the star makes this test fail at the `assert_absent` check.

## Client unit tests

| Test | Action | Why |
|---|---|---|
| Node: "is shown as that output, as a static snapshot" | **Rewritten** as "in place of its state" with an `hdca` item | The `inert` and host-class assertions only prove that an attribute or class exists. The E2E `_assert_static` proves the real effect (pointer pass-through, no focus) and that the step grew. The test keeps the preview's item, `summarizeCollection` and the hidden state text. |
| Node: "is shorter for a collection" | **Dropped** | It asserts a CSS class that maps to a height. jsdom has no layout, so the height can only be checked visually. |
| Node: shown as usual when not in the map, or as an editor node | Kept | This is Node's contract with the injected map. Mutation-checked. |
| NodeOutput: star undoably, read-only | Kept, with the class assertions removed | `aria-pressed`, title, undo and read-only aren't covered by an E2E test. |
| useEmbeddedOutputs: "shows a step as its preferred output while enabled" | **Dropped** | It only checks that the result of `usePreferredOutputItems` is passed through. That composable's own tests and the E2E toggle cover it. |
| useEmbeddedOutputs: the dedup pair (tool, subworkflow) | **Merged** into one `it.each` | The positive half duplicates the E2E (`top_rows` gets no card). The pair is kept together because only together does it pin "shown", not merely "named". Each half catches a different mutation. |
| useEmbeddedOutputs: "pushes ... by its measured size" and "gives a step not (yet) shown ... no base size" | **Merged** into "gives the layout the size a step grew from, only while it's shown as its preferred output" | The position assertions relied on hand-set sizes and duplicated the layout unit tests and the E2E. The merged test asserts the base size (144×55, the S1 underestimate) for a shown step and no base size for a step that names an output that doesn't exist yet. The test's `setup` is back to stage 2's shape. |
| useEmbeddedOutputs: toggle enabled once scheduled, not for a stale name | Kept | Not covered by an E2E test. |
| usePreferredOutputItems: "stops showing steps when disabled" | **Dropped** | The E2E toggles off and asserts that the step's preview is absent. The `it.each` "while disabled" case covers the composable. |
| usePreferredOutputItems: fetch rules, exclusions | Kept | They use the MSW server mock and count requests: no fetch for listed outputs, a refetch on state change only while the output is missing, and the detailed-view step excluded. None of this can be seen in an E2E test. |
| embeddedOutputLayout: "a step that grew" (6 tests, 5 overlap cases) | Kept | A pure function with exact geometry, so a unit test is the right layer, and the E2E covers only one workflow. All four rule mutations are caught. |

The composable tests use `effectScope`, not the README's mount-a-component pattern. They match stage 2's sibling tests in the same directory.

## Mutation results

Each mutation was applied on its own, the relevant tests run, and the code restored. The scripts are in `SCRATCH/challenge3/` (`mutate.py`, `client_muts.json`, `client_muts.log`).

**Client: 23 of 24 mutations caught.**

| Area | Mutations | Result |
|---|---|---|
| Layout | grown rows keep the author's spacing; base rows ignore `baseHeight`; base width ignored; upstream edges use the grown width | All caught (6, 6, 3 and 1 failing tests) |
| useEmbeddedOutputs | no dedup; dedup on named rather than shown; base size for named steps; base height overestimated (60); toggle enabled before scheduling; toggle enabled for a stale name | All caught |
| useEmbeddedOutputs | `shownAsPreferredKeys` removed from the relayout watch | **Not caught.** In the browser the step's measured size changes when it grows, and the dedup changes `requestKeys`, so the other watch sources already trigger the relayout. Only a hand-set size could test this. Left as a defensive source; the coordinator may drop it. |
| usePreferredOutputItems | never fetch; fetch listed outputs too; fetch once regardless of state; any step type; stale names; detailed step included; disabled ignored | All caught |
| Node | editor nodes shown as their output; state text kept; collections not summarized | All caught |
| NodeOutput | read-only edits; undo loses the previous value; `aria-pressed` stuck | All caught |
| E2E | the star's `mark-terminal-active` class put back | Caught by `test_star_preferred_output` |

**Backend: all caught.** These ran against a restarted server.

| Mutation | Caught by |
|---|---|
| `copy_to` no longer copies `config` | `test_preferred_output_kept_by_new_versions`, at the post-rename assertion |
| Type validation removed | All 8 non-string cases (import and update) |
| Tool-only check removed | Both `data_input` cases |
| `.ga` export of the key removed | The round trip, and the versions test at the refactor, which shows that refactors go through the export |
| Legacy-string guard in the getter removed | The model unit test, with an `AttributeError` |

The editor-dict key and the `.ga` import weren't mutated. Both feed the round trip's first assertions, so removing either would fail it there.

## Test runs on the final head

- **Vitest:** 58 files and 542 tests on `Workflow/Editor`, `Workflow/Invocation`, `WorkflowInvocationState` and `useInvocationGraph.test.ts`. That is 4 fewer than before; the 4 were dropped or merged.
- **vue-tsc:** clean.
- **Lint and format:** prettier is clean. eslint shows no errors, only existing `any` warnings. ruff, black and isort are clean.
- **Python:** `test_model.py` has 16 passing tests.
- **API:** 33 pass: every preferred-output test, plus `test_update_name*`, `test_export_editor` and the `test_refactor*` tests. Three dynamic-tool refactor tests fail on this server, which doesn't set `enable_beta_tool_formats`; they don't touch this branch.
- **E2E (Playwright):** `test_embed_shows_steps_as_their_preferred_output`, `test_embed_workflow_outputs`, `test_star_preferred_output` and `test_workflow_output_handling` pass (4 tests, 3m50s).

## For the coordinator

- **The selector bug from the class reuse is fixed in `fae83c40f54`.** It is a visible behaviour change only for selectors; the star looks the same.
- **`shownAsPreferredKeys` in the relayout watch survives mutation.** Keep it as defensive, or drop it.
- **N7 to N10 (the Selenium style) were left to the E2E polish step**, as the review planned.
