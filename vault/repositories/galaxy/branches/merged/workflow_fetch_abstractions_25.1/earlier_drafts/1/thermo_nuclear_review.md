# Thermo-nuclear review

Verdict: approve; small cleanups applied (below). The getter pair (`get_stored_accessible_workflow` / `get_stored_owned_workflow`) is the right abstraction: it lives in the manager, which is the canonical layer, and the branch's call sites now say what access level they need. I found no structural regression. I acted on the one place where the branch kept moving pieces it could have deleted (`set_workflow_menu`), plus two cheap legibility items. I deferred everything that would change pre-existing behavior on a stable branch.

Acted on (commits on `workflow_fetch_abstractions_25.1`):
- `c3bce4a3ea3` Baseline tests: `test_set_workflow_menu_drops_duplicate_ids` pins the dedupe of `PUT /api/workflows/menu` (`[a, b, a]` gives 2 entries). It passes on both the pre-refactor controller and the `release_25.1` implementation. Because it uses the `set_workflow_menu` populator, it can be squashed into `c7659a0bde3` together with `46b0774be8e` at rebase time.
- `543e93f84dd` `set_workflow_menu`: a single resolve step, `[getter(id) for id in dict.fromkeys(decoded)]`, replaces the decode loop, the id-keyed dict and the seen-id set with its `continue`/`else`. Ids still resolve before existing entries are cleared, and the up-front id decode is kept, so accepted id shapes don't change. The `get_stored_owned_workflow` docstring is now one line. A one-line comment on the `update` key gate says why `"workflow"` is subtracted.

Not acted on:
- **Self-referential merge in legacy `update`** (lead follow-up). `workflow_dict = payload.get("workflow", {})` aliases `payload["workflow"]`. The merge comprehension then copies the top-level `"workflow"` key into that same dict, so `workflow_dict["workflow"] is workflow_dict`. That is the only reason the gate needs `- {"workflow"}`. Skipping `"workflow"` in the merge would delete the special case, but it changes the dict passed to `__normalize_workflow` and to the editor-save path. That is too much risk for 25.1, so it belongs on dev.
- **`WorkflowsService.show_workflow` inline accessibility check.** It duplicates `get_stored_accessible_workflow`, but its error text ("neither importable, nor owned by or shared...") is asserted by `lib/galaxy_test/selenium/test_workflow_sharing.py:31` and a client test, and the getter's message is different. Switching it would change user-visible text on a stable branch. Follow-up on dev: switch the call and update those tests.
- **Menu-entry logic duplicated between `update` and `set_workflow_menu`**, and the key list repeated between `USER_MENU_UPDATE_KEYS` and the `"menu_entry" in ... or "show_in_tool_panel" in ...` block. Extracting a `__set_menu_entry(trans, stored_workflow, show)` helper would tidy both, but it is a refactor of pre-existing code. Follow-up.
- **The two private controller wrappers** (`__get_stored_accessible_workflow` / `__get_stored_owned_workflow`) both parse `instance`. The owned one has a single caller. They stay because they mirror each other and the manager pair, and inlining one would make them asymmetric.
- **Controller mixin `UsesStoredWorkflowMixin.get_stored_workflow`** and `__api_import_shared_workflow` still use the older getter, which has no `instance`/UUID support. Follow-up: make the mixin a thin wrapper over the manager getters.
- **File size:** `api/workflows.py` (~1800 lines) and `managers/workflows.py` (~2290 lines) were already over 1k lines. The branch adds about 20 lines across them, so it crosses no threshold.
- **Test nits:** `_shows_in_tool_panel` uses a bare `next(...)`, so a missing workflow fails with `StopIteration`. `test_shared_user_cannot_refactor_or_update_tags` checks two endpoints in one test. Both are cosmetic.

Tests: one pytest invocation covering `show_in_tool_panel`, `test_other_cannot`, `test_shared_user`, `test_set_workflow_menu`, `test_update`, `test_refactor` and `TestWorkflowSharingApi` passed 31/31 (all 9 sharing tests were confirmed selected). The new baseline test also passed against the pre-refactor controller and against the `release_25.1` implementation files. ruff, black, isort and mypy are clean on the changed files.

<details>

## Scope

`git diff origin/release_25.1...HEAD`. The changes are a new `WorkflowsManager.get_stored_owned_workflow`, a return annotation on `get_stored_accessible_workflow`, service `delete`/`undelete`/`refactor` moved onto the owned getter, legacy `PUT /api/workflows/{id}` picking a getter from its payload keys, `PUT /api/workflows/menu` resolving ids through the accessible getter, two populator helpers, and API tests.

## 1. Structural regressions

None. The branch deletes the get-then-check pairs in `delete`/`undelete` and puts the access level in the getter's name. That is the direction this module should move.

## 2. Code-judo opportunities

- **`set_workflow_menu` (acted on).** The branch added a dict comprehension that resolves ids alongside the existing decode loop and seen-id dedupe, which made three passes over the same list. An order-preserving `dict.fromkeys` over the decoded ids folds the dedupe into resolution. The entry loop then iterates the resolved workflows directly, and the seen-id set, the `continue`/`else` and the dict lookup are gone. The invariant that matters (every id resolves before existing entries are cleared, so a 403 leaves the menu intact) is kept and covered by `test_set_workflow_menu`.
- **`update` key gate (deferred).** `set(workflow_dict) - {"workflow"} <= USER_MENU_UPDATE_KEYS` reads as magic. The subtraction exists only because the pre-existing merge makes `workflow_dict` contain itself under `"workflow"` when the payload is wrapped. The real fix is in the merge, not the gate. Because that changes the normalization input, it is deferred to dev (see top). A named single-caller predicate would only rename the expression, so a cause comment was added instead.

## 3. Branching complexity

The gate adds one if/else to `update`, ahead of any mutation, so a mixed payload can't half-apply. It is the least invasive placement in a function that is already busy. A cleaner end state is a split of `update` into a per-user tool-panel path and an owner-level path, which belongs in a dev refactor of the legacy endpoint.

## 4. Boundary / type contracts

- Both getters return `StoredWorkflow`, so the pair is consistent.
- `get_stored_owned_workflow` passes `check_ownership=True` explicitly even though it is the default. Keep it: it states the contract at the call.
- `USER_MENU_UPDATE_KEYS` is a module-level `frozenset` in the controller that owns the payload interpretation. That is the right layer, because the manager doesn't see legacy payload keys.

## 5. File size

Both files were already well over 1k lines. The branch adds about 20 lines, so this is not a concern.

## 6. Modularity / reuse

- Remaining inline duplicates of the getters are the `show_workflow` accessibility check, the controller mixin getter and `__api_import_shared_workflow`. Each is deferred, with its reason given above.
- `get_owned_workflow` (a non-stored `Workflow`) sits next to the new getter with a misleading "accessible" docstring. This is pre-existing and cosmetic.
- Populators: `update_workflow_fields` (top-level keys) next to `update_workflow` (wrapped) is justified. The two shapes take different paths through the gate, and a mode flag would be worse.

## 7. Legibility

- The getter docstring was trimmed to one line.
- The duplicate tool-panel key names in the menu-entry block of `update` should eventually derive from one place (see the follow-up above).

</details>
