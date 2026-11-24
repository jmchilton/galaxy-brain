Fix the workflow editor ignoring a subworkflow input's declared collection type, so subworkflow steps connect as the inner workflow declares and map over the way scheduling runs them.

***Editor only: no API, payload or scheduling change, and tool steps are unaffected. Existing workflows run exactly as before. Opening one in the editor can now flag a saved connection that doesn't match the subworkflow's declared collection type, but it never removes the connection, and saving still works after the usual invalid-connections prompt.***

A subworkflow whose inner input is a `list` collection, connected in the editor:

| Connect to the subworkflow's `list` input | Before | After |
|---|---|---|
| a `paired` collection | ![Before: the list input lights up green and accepts the paired collection](screenshots/before_paired_accepted.png) | ![After: the input turns orange with "Incompatible collection type(s) for attachment."](screenshots/after_paired_refused.png) |
| a `list:list` collection | ![Before: a single connection; the output tooltip says "output is list"](screenshots/before_list_list_not_mapped.png) | ![After: map-over connection; the tooltip says "output is list and mapped-over to produce a list of lists dataset collection"](screenshots/after_list_list_mapped_over.png) |

Before, the editor accepted a `paired` collection for an input the inner workflow declares as `list`. It also showed the subworkflow's output as a plain `list`. Scheduling, though, maps the step over the outer list of a `list:list`, so that `list` output becomes a list of lists, and every step downstream was typed wrong. Scheduling already reads the subworkflow input's declared type (`map_over.py:_declared_collection_input_types`). `test_invocation_map_over_inner_collection_with_tool_collection_input` pins that mapping, so the fix brings the editor in line with how these workflows already run. ***Long-standing, not a 26.2 regression: since the server started sending this field for subworkflow inputs in 2019, the editor has never used it to check connections.***

<details><summary>Why the editor missed it, and why the fix is client-side</summary>

The editor payload describes a tool step's collection input with a `collection_types` list. It describes a subworkflow step's collection input with the inner input step's singular `collection_type`, from `SubWorkflowModule.get_all_inputs`. `terminalFactory` read only `collection_types`, so every subworkflow collection input became an "any collection" terminal. It now falls back to `collection_type` when `collection_types` is absent. Tool inputs always carry `collection_types`, so they don't change.

The server payload is left alone on purpose. Emitting `collection_types` from `get_all_inputs` would also change how mapped-over nested subworkflows schedule, because the scheduler prefers that field over its `subworkflow_structure` fallback. The server also doesn't check a subworkflow input's declared collection type at run time, so before this fix a `paired` connected to a `list` input was passed through unchecked. That run-time check is outside this PR. So is datatype filtering: subworkflow inputs always declare `extensions: ["data"]`, which only the server can fix.

</details>

<details><summary>Tests and commits</summary>

Three commits, 5 files. The production change is a three-line helper in `terminals.ts` and a type correction in `workflowStepStore.ts`.

1. **Baseline tests.** A subworkflow step is added to the editor's `parameter_steps.json` fixture, shaped like the payload the server sends. `terminals.test.ts` cases pin how a list fed to its dataset input maps every output over, and how a plain list on its collection input is consumed in either connection order. These pass on `release_26.2`.
2. **The fix.** `terminalFactory` falls back to `collection_type`. `DataCollectionStepInput` types both fields as optional and drops `fields` and `column_definitions`, which step input descriptions never carry. Two new vitest cases fail on `release_26.2` and pass here: a `paired` collection is refused, and a `list:list` maps every output over its outer list.
3. **Selenium test.** `test_subworkflow_collection_input_map_over` drives both cases in the editor and records the screenshots above. It fails on `release_26.2` at the refusal assertion. `assert_node_output_is` gains an optional `screenshot_name`.

</details>

## Risks

Risks are minimal. This is a client-only correction to which connections the editor offers for subworkflow steps; it changes no API, payload or scheduling (a two-way door). Saved workflows with a mismatched connection into a subworkflow collection input will now show it as invalid when opened in the editor, which is correct but newly visible.

## Context

Extracted from 🔀 #23676, which brings subworkflow mapping in the editor and the backend in line. These editor tests started there; the bug turned up while hardening them on their own. Developed with [John's Galaxy Brain Branch Factory](https://galaxy-brain.jmchilton.net/factory/galaxy-branches/).

## Human Review

(PUBLISHING_AGENT: Please include the contents of BRANCH_DIRECTORY/human_review.md before publishing this. If that file doesn't exist please double check that this PR should be published - if user confirms yes publish without this section.)

## Agentic Checks

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>Keep the client fix; target <code>release_26.2</code>, where the bug ships; finish the type correction.</summary>

`terminalFactory` is the only client code that reads a step input's `collection_types`, so the fallback covers every editor path: the connection menu, drag and drop, linting, `useTerminal` and the map-over walks.
- The rejected alternatives:
  - The server emitting `collection_types` (it changes scheduling).
  - A union type separating tool and subworkflow inputs (the payload carries nothing that tells them apart).
  - Shipping the tests alone.
  - Folding the fix back into #23676.
- A follow-up is noted: subworkflow inputs always declare `extensions: ["data"]`, so the editor doesn't filter datatypes there. Only the server can fix that.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/editor_subworkflow_map_over_tests/scope_evaluation/). Run via claude-opus-5-5 at high effort.

</details>

### ✅ [Refactoring of base branch](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_REFACTOR_BASELINE.md)

<details><summary>No refactor needed; the branch is already baseline tests, then the fix.</summary>

The fix is too small to leave a refactor worth splitting out. The shared test helpers were already moved into the baseline commit.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/editor_subworkflow_map_over_tests/baseline_refactor/). Run via claude-opus-5-5 at high effort.

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>The subworkflow tests were consolidated, and they assert what the editor does.</summary>

A test that only restated the fixture was dropped, and tests reading the same store value were merged. Every connection now goes through `canAccept` first, as the editor does, and both connection orders run as one parameterized test that also checks `getInvalidConnectedTerminals()`. Temporarily breaking `terminals.ts` in two ways made the tests fail both times.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/editor_subworkflow_map_over_tests/test_challenges_debrief/). Run via claude-opus-5-5 at high effort.

</details>

### ✅ Second Frontier Model Review

<details><summary>Found the bug: the test fixture's subworkflow input had a shape the server never sends, which hid it.</summary>

The fixture originally used `collection_types`, so the tests pinned behavior the real editor didn't have. With the server's singular field, the input became "any collection": it accepted `paired`, and a `list:list` connected without mapping over. This led to the fix commit. Two other findings were already addressed by the test challenges. Duplicated test setup was later removed by the thermo-nuclear review.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/editor_subworkflow_map_over_tests/codex_review/). Run via gpt-6.2-sol.

</details>

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>The fix is in the right layer; the only real finding, test duplication, was removed.</summary>

Every editor terminal is built through `terminalFactory`, so one translation there covers every path. The new tests are nested in the existing `canAccept` suite to reuse its setup, and repeated assertions became small helpers. No file crosses a size threshold because of this branch.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/editor_subworkflow_map_over_tests/thermo_nuclear_review/). Run via claude-opus-5-5 at high effort.

</details>

### ✅ [John's Agentic Checklist](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/gx_pr_checklists/GENERAL.md)

<details><summary>All 9 items pass (general + workflow-related).</summary>

- [x] What does the user see when it fails? An incompatible collection dropped on a subworkflow's collection input gets the existing orange "Incompatible collection type(s) for attachment." and no connection is made. Existing saved connections of that kind are marked invalid in the editor.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. They assert through `canAccept`, `getInvalidConnectedTerminals` and a downstream step's `mapOver`, all of which the editor uses, against a fixture in the server's real payload shape.
- [x] Are baseline tests in their own leading commits (if applicable)? Yes. `aa47be35ea6` changes no source and passes on `release_26.2`. With the fix reverted, only the fix commit's two vitest cases fail.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A.
- [x] Which existing workflows change behavior (if any)? None at runtime. In the editor, a saved workflow that connects a mismatched collection to a subworkflow collection input now shows that connection as invalid. One that connects a deeper collection (e.g. `list:list` to `list`) now shows the step as mapped over, with output types downstream matching the run.
- [x] Who hits this in practice and what is the evidence? Anyone who connects collections to a subworkflow with a typed collection input in the editor, on `release_26.2` and earlier. The evidence is the reproduction and the before/after screenshots; I found no issue reporting it.
- [x] Were simpler or existing approaches considered? Yes. The main alternative was the server also emitting `collection_types`, with no client change. It would change scheduling of mapped-over subworkflows; see Scope Evaluation above.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/editor_subworkflow_map_over_tests/pr_checklist/). Run via claude-opus-5-5 at high effort.

</details>

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
