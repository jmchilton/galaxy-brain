Run via claude-opus-5-5 at high effort.

## General

- [x] What does the user see when it fails? Dragging an incompatible collection (e.g. `paired`) onto a subworkflow's `list` input now shows an orange terminal with "Incompatible collection type(s) for attachment." and the connection isn't made. Existing saved connections of that kind are marked invalid in the editor.
  <details>

  `terminalFactory` now passes the subworkflow input's singular `collection_type` to `InputCollectionTerminal`. Refusal goes through the existing `canAccept` reason, and connections that are already saved go through `getInvalidConnectedTerminals` → `markInvalidConnection`. If an inner input step declares no `collection_type`, `declaredCollectionTypes` returns `null` and the terminal accepts any collection, as before.

  </details>
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. They assert through `canAccept`, `getInvalidConnectedTerminals` and a downstream step's `mapOver`, all of which the editor uses. The fixture step is in the server's real payload shape (singular `collection_type`, as `SubWorkflowModule.get_all_inputs` emits at `modules.py:917`).
- [x] Are baseline tests in their own leading commits (if applicable)? Yes. `aa47be35ea6` (fixture step 37 plus the map-over tests) comes first and changes no source. With `terminals.ts` and `workflowStepStore.ts` reverted to `origin/release_26.2`, 96 of 98 tests pass and only the fix commit's two tests fail.
  <details>

  - The fix commit `2885dc64873` adds the rejection and `list:list` map-over tests. Both fail without the fallback: `expected true to be false` (paired accepted) and an unmapped `mapOver` for the `list:list` case.
  - The Selenium test `a92b870744e` comes last because it is a regression test for the fix, not a baseline. `screenshot_debrief.md` says it fails at its first assertion without the fix. I didn't rerun it, since that needs a running Galaxy.
  - The worktree was restored and is clean.

  </details>
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A.

## Workflow-related

- [x] Which existing workflows change behavior (if any)? Only in the editor. Scheduling and runtime are unchanged because no server code is touched. A saved workflow that connects a mismatched collection to a subworkflow collection input now shows that connection as invalid. One that connects a deeper collection (e.g. `list:list` to `list`) now shows the subworkflow step as mapped over, which changes its outputs' displayed types downstream.
- [x] Who hits this in practice and what is the evidence? Anyone building in the editor with a subworkflow that has a typed collection input, on `release_26.2` (and `26.1`). The evidence is a reproduction against the real server payload, not a user report.
  <details>

  - The before/after Selenium screenshots in `screenshots/` show `paired` accepted on a `list` input, and a `list:list` connected without map-over, on `origin/release_26.2`.
  - The bug was found by the Codex review of the fixture (`codex_review.md`), not reported by a user.

  </details>
- [x] Were simpler or existing approaches considered? If yes, describe which and why they weren't pursued. If no, why not? Yes. The main alternative was having the server also emit `collection_types` for subworkflow inputs, with no client change. It was rejected because `map_over.py:_declared_collection_input_types` prefers that field and would change scheduling of mapped-over subworkflows.
  <details>

  - Normalizing in `workflowStepStore` would rewrite server data in the store.
  - A tool/subworkflow union type has no discriminant in the payload.
  - A generated `InputDescription` contract is far larger than this fix.
  - The single `terminalFactory` fallback covers every editor consumer. See `scope_evaluation.md` and `thermo_nuclear_review.md`.

  </details>
