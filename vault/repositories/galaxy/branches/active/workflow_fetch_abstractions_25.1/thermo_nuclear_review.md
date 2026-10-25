# Thermo-nuclear review

Verdict: approve. Fresh pass over `origin/release_25.1...3d468a3a509` (re-harden after the show re-scope); branch head now `2610c4e6ed1`. The branch's central idea is sound: `WorkflowsManager` now has a getter pair (`get_stored_accessible_workflow` / `get_stored_owned_workflow`), each endpoint fetches with the getter matching the access level it needs, and the get-then-check pairs in the service are gone. No structural regression, no file crossing 1k lines (both big files were already far past it; net +~20 lines), no scattered special cases. Two small cleanups applied; larger consolidation of pre-existing code is listed as dev follow-ups.

Acted on (commits on `workflow_fetch_abstractions_25.1`):
- `2ee06f67158` legacy `update` menu block: drop the `decoded_id` local. It now comes from `stored_workflow.id`, not a decode, so the name was wrong; use `stored_workflow.id` directly.
- `2610c4e6ed1` test helpers: populator `update_workflow` delegates to `update_workflow_fields` (wrapped shape) instead of repeating the PUT. `_shows_in_tool_panel` asserts the workflow appears exactly once in the index instead of a bare `next()` (strengthened: a missing workflow failed with `StopIteration`, and a duplicate would have passed silently).

Not acted on:
- **Self-referencing `"workflow"` merge key in legacy `update`** - known and decided; the wrapped empty update relies on it. The gate's `- {"workflow"}` and its comment stay.
- **Menu-entry toggle logic** in `update` vs `set_workflow_menu` (and the model's `StoredWorkflow.show_in_tool_panel(user_id)` query). A `WorkflowsManager` helper (`set_menu_entry(user, stored_workflow, show)`) would serve both and pull per-user menu logic out of the owner-edit flow. Refactor of pre-existing code - dev follow-up.
- **Two ownership vocabularies for `StoredWorkflow`**: `WorkflowsManager.check_security` (used by the new owned getter, matching the old delete/undelete behaviour and error text) vs `SharableModelManager.is_owner` / `error_unless_owner` (used by the sharing service). Unifying them changes error text on several endpoints - dev follow-up.
- **`get_stored_accessible_workflow` repeats `check_security`'s share-count query** inline. Collapsing them needs `check_security` to carry the asserted message text (selenium + client tests), which it doesn't take today - dev follow-up.
- **`UsesStoredWorkflowMixin.get_stored_workflow` / `pages.py`** consolidation - known and decided, deferred to dev.
- **The two private controller wrappers** (`__get_stored_accessible_workflow` / `__get_stored_owned_workflow`) each parse `instance`. They mirror the manager pair one-to-one and the update gate reads cleanly with them; inlining one would make the pair asymmetric for a one-line saving.
- **Untyped `trans` / `by_stored_id` params** on the getter pair - pre-existing style across the manager; nit.

Tests: one invocation of `test_workflows.py -k "show_in_tool_panel or test_other_cannot or test_shared_user or test_set_workflow_menu or test_update or test_refactor or test_show or test_cannot_show or test_anon or test_admin or TestWorkflowSharingApi"` - 44 passed (all 9 `TestWorkflowSharingApi` tests selected). black, isort, ruff, mypy clean on the five touched files.

<details>

## Scope

`git diff origin/release_25.1...HEAD` at `3d468a3a509`: new `WorkflowsManager.get_stored_owned_workflow`; `get_stored_accessible_workflow` gets a return type, docstring fix and show's error text; service `delete`/`undelete`/`refactor` use the owned getter and `show_workflow` the accessible getter (inline check deleted); legacy `PUT /api/workflows/{id}` picks a getter from its payload keys via `USER_MENU_UPDATE_KEYS`; `PUT /api/workflows/menu` resolves ids through the accessible getter before clearing entries; `get_owned_workflow` docstring; two populator helpers; API tests.

## 1. Structural regressions

None. The branch deletes moving pieces: get-then-check pairs in `delete`/`undelete`, the duplicated inline accessible check in `show_workflow`, and the seen-set/decode loop in `set_workflow_menu`. Call sites now state the access level in the getter name.

## 2. Code-judo opportunities

- **`set_workflow_menu`** is already in its simple form: `[getter(id) for id in dict.fromkeys(decoded)]` dedupes in request order and resolves every id before existing entries are cleared, so a failed id leaves the menu intact (`test_set_workflow_menu`). Passing encoded ids straight to the getter would drop the decode list but would also start accepting UUIDs on this endpoint - not worth a contract change here.
- **`update` gate alternative considered**: always fetch accessible, then `check_security(check_ownership=True)` for non-menu keys. One fewer wrapper, but an extra share query on the owner path and no simpler to read. The current if/else, ahead of any mutation, is the least invasive form.
- **Gate vs normalization invariant (checked)**: the gate reads keys before `__normalize_workflow`. For a payload of only `menu_entry`/`show_in_tool_panel`, `normalize_workflow_format` returns the dict unchanged (no `src`, `class`, `yaml_content` or `$graph`, so no format2 conversion), so the gate's key set equals the key set the update branches act on. Any other key, including payload options like `from_tool_form`, routes to the owned getter, so the gate errs strict. The client's bookmark toggle (`useWorkflowCardActions.ts`) sends `{show_in_tool_panel}` alone, so it takes the accessible path.
- **Menu-entry helper (deferred)**: see top. The bigger move is splitting `update` into a per-user menu path and an owner-edit path; that's a dev refactor of the legacy endpoint.

## 3. Branching complexity

One if/else added to `update`, placed before any mutation so a mixed payload can't half-apply. `USER_MENU_UPDATE_KEYS` is reused by the menu block, so the key list lives in one place.

## 4. Boundary / type contracts

- Both getters return `StoredWorkflow`; consistent pair alongside `get_owned_workflow` (non-stored `Workflow`).
- `get_stored_owned_workflow` passes `check_ownership=True` explicitly though it's the default - keeps the contract visible at the call; fine.
- `USER_MENU_UPDATE_KEYS` lives in the controller, which owns legacy payload interpretation; the manager never sees those keys. Right layer.
- Getter error types: accessible -> `ItemAccessibilityException` with show's message (also asserted by `selenium/test_workflow_sharing.py` and `WorkflowInvocationOverview.test.js`); owned -> `ItemOwnershipException`. Both 403.

## 5. File size

`api/workflows.py` ~1795 and `managers/workflows.py` ~2287 lines were already over 1k; the branch adds ~20 lines net. No threshold crossed.

## 6. Modularity / reuse

- Remaining older-getter sites: `UsesStoredWorkflowMixin.get_stored_workflow` (controllers, `__api_import_shared_workflow`, annotations) - deferred as decided. `services/invocations.py` `index` uses `get_stored_workflow` only to translate an instance id, and `services/workflows.py` index `missing_tools` re-fetches ids that came from the already-filtered index; neither needs a checked getter.
- Two ownership vocabularies and the inline share query in the accessible getter - see top.
- Populators: `update_workflow` now delegates to `update_workflow_fields`; the two shapes stay as separate helpers because tests cover both payload shapes through the gate.

## 7. Legibility

- `decoded_id` local removed (acted on).
- `_shows_in_tool_panel` asserts a single match (acted on).
- Tests mix `_update_workflow` (wrapped) and `update_workflow_fields` (top-level) on purpose: both shapes exercise the gate.

</details>
