# Implementation debrief: workflow_editor_connection_helpers

> **Update 2026-10-22: READY.** John chose "B now, A as follow-up".
> - **B:** `9699ec45644` "Fix workflow_editor_set_tool_version typo" renames the method and its two callers. `test_editor_tool_upgrade` passes on Playwright. It's pushed.
> - **A:** CSS-safe selectors are a follow-up, recorded in `index.md`.
> - **`galaxy_ui_driver`:** restacked onto `9699ec45644`. Tip `b271e13696c`, clean rebase, gxui unit tests pass (101). Backup: `jmchilton/galaxy_ui_driver_backup_20261022`.
>
> The BLOCKED text below is kept as the record of the decision.

STATUS: BLOCKED. It needs your scope decision; the work itself is sound.
- Head `04ce1a3f088` on `release_26.2` `7febcc1d683`, pushed to `jmchilton`. That's 8 commits, +266/−152 across 5 files.
- The first scope evaluation asked for an expansion, which was implemented.
- The second evaluation asks for another. Per process I parked instead of re-scoping twice.

## The decision you need to make

Per [scope_evaluation.md](scope_evaluation.md), there are two more small pieces:
- **A, CSS-safe terminal and connector selectors.**
  - Subworkflow terminal names are free-text labels, so they can hold spaces, `'` or `\`.
  - The `connector_for` / `connector_invalid_for` targets escape only `|`, and the `[input-name='…']` targets break on `'`.
  - So the published `workflow_editor_assert_*` helpers and `destroy_connection` fail on those steps.
  - The fix: `[id='…']` connector targets, one attribute-value escape, and an E2E test on a subworkflow input whose label has a space and an apostrophe.
  - This was found by reading the code, not reproduced live.
- **B, rename the misspelled `workflow_editor_set_tool_vesrion`** to `workflow_editor_set_tool_version`. Its only callers are two lines in `test_workflow_editor.py`; gxui doesn't call it.

Options:
- **Accept A+B**, then re-harden. All the current reviews and tests stand for the code they cover.
- **Ship as is** and take A/B as a follow-up.

### Remaining validation

- **If you accept A+B:**
  - add the subworkflow-label E2E test and run it on both backends;
  - re-run the connection tests the selector change touches;
  - run a round 3 of hardening, archiving the current debriefs to `earlier_drafts/2/`;
  - restack `galaxy_ui_driver`;
  - CI.
- **If you ship as is:** move the branch to `branches_implemented_needs_ci`, restack `galaxy_ui_driver`, then CI.

My lean: B is trivial. A is real but confined to subworkflow steps whose labels need escaping, so it's fine as a follow-up unless you want the helpers bulletproof before gxui leans on them.

## Final branch

1. `262bca43375` moves the connection helpers onto `NavigatesGalaxy`, renamed `workflow_editor_assert_*`.
2. `1e780f1eece` adds `workflow_editor_node_and_terminal`, which resolves terminal refs.
3. `204bc521781` adds `workflow_editor_source_sink_terminal_elements`. It finds terminals through the node component, which helps the existing `connect` too.
4. `cbc20fd9ebe` lets the helpers address a step by order index:
   - `EditorTerminalReference = str | tuple[EditorNodeReference, str]` and `workflow_editor_node`;
   - `workflow_editor.node._` becomes a label/id selector list.
5. `863574bbed9` fixes the Playwright synthetic drag: `dragenter` now comes a task after `dragstart`.
6. `e42cf5f49b5` adds `workflow_editor_try_connect` and `workflow_editor_remove_node`, the navigation.yml targets, the refusal screenshot, and `test_refused_connection_and_removed_step`.
7. `9787ba72208` makes existing editor tests use `remove_node` and `destroy_connection`.
8. `04ce1a3f088` adds `test_connect_unlabelled_steps_by_order_index`.

## Choices

- **The re-scope** ([implementation_rescope_debrief.md](implementation_rescope_debrief.md)):
  - Unlabelled steps of one tool share a `node-label`, so the label-only helpers acted on the first matching node. Steps can now be addressed by order index.
  - The original scope is kept as an [alt](alts/original_scope.md) at `b5c2a4506fd`.
- **It supersedes `77b5ea69434`.** Another session built that on `jmchilton/galaxy_ui_driver_editor_refs`, to be folded in here. It reached nearly the same design and names.
  - Its one extra was looking up terminals through the component, which is now in commit 3.
  - Its gxui fixup, `df78f64ec31`, only uses `workflow_editor_node`, `try_connect`, `destroy_connection` and `remove_node`, all with the same shapes here.
- **Order indices change on save.** The server reorders steps and the editor reloads, so an index is only good until the next save. The `EditorNodeReference` comment says so, and the test re-reads indices from the API after each save. gxui needs to know this too.
- **String `"label#terminal"` refs are unchanged.**
- **Not done** (scope-excluded both rounds): an editor-helpers mixin, backend-agnostic waits, and rebuilding `connect` on `drag_over`.

## Hardening

Round 2 ran after the re-scope. Round 1's debriefs are in `earlier_drafts/1/`.

| Step | Result |
|---|---|
| [Test challenges](test_challenges_debrief.md) | The order-index test now drives `try_connect` with a tuple ref. No unit tests are warranted; the drag fix's one-off repro is in round 1's debrief. |
| [E2E polish](polish_e2e_tests_debrief.md) | Terminals are found through the node component, so names that need CSS escapes now drag. |
| [Codex](codex_review.md) | No findings in either round. |
| [Thermo-nuclear](thermo_nuclear_review.md) | No structural problems. It reused the new helpers in four existing tests. |
| [Baseline refactor](baseline_refactor.md) | The refactors come first, then the fix and the feature, folded into 8 commits. The final tree is identical. |
| [Scope evaluation](scope_evaluation.md) | Expand (A+B), so the branch is parked. |
| Screenshots | Skipped: the branch has no client or UI changes. The refusal screenshot comes from the test itself. |
| [Re-scope review](subagents/rescope_review.md) | No bugs; it made two cleanups. |

## Tests

- **Both new tests:**
  - Both pass on Playwright and Selenium.
  - The order-index test fails when steps are addressed by their shared label.
  - Without the drag fix, the refused-connection test fails on Playwright.
- **Playwright, passing:** `test_reconnecting_nodes`, `test_existing_connections`, `test_simple_mapping_connections`, `test_non_data_connections`, `test_map_over_output_indicator`, `test_editor_create_conditional_step`, `test_editor_tool_upgrade_all_tools`, `test_editor_duplicate_node`, `test_data_input`, `test_collection_input`, `test_integer_input` and `test_change_datatype`.
  - `test_existing_connections`, `test_data_input` and `test_non_data_connections` also pass on Selenium.
- **Unit:** `test_has_driver.py -k drag` (12) and `test_smart_components.py` (54) pass.
- **Not run:** the full editor suite; CI covers it.
- **Environment:** this worktree's Galaxy on 8095 and Vite on 5195.

## Downstream

**`galaxy_ui_driver` was not restacked.**
- It was rewritten 35 minutes before handoff by another session; its tip is now `7c448d5a4ee`.
- This branch may change again after your decision.
- So restack once after the decision, onto the then-current head.
- The pending `galaxy_ui_driver_editor_refs` fold-in should drop `77b5ea69434`, which is superseded, and keep its gxui fixup. Removing gxui's id-based fallback becomes possible then.

**Local backups** (not pushed): `workflow_editor_connection_helpers_pre_rewrite_20261021` (`706392e089a`) and `_pre_rewrite_2_20261022` (`acbf1944883`).
