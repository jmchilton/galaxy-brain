# Scope evaluation

**Recommendation: modest expansion.** Keep everything as implemented. Also route the remaining workflow-fetch call sites in the touched modules through the getter pair: `WorkflowsService.show_workflow` uses `get_stored_accessible_workflow`, and the getter takes over show's error text so nothing visible changes. Make `UsesStoredWorkflowMixin.get_stored_workflow` a thin wrapper over the manager pair, and fetch `placeholderRenderForSave` in `managers/pages.py` through the accessible getter. Tidy the legacy `update` code the branch already touches: drop the self-referencing `workflow` key from the merge, which removes the gate's `- {"workflow"}` special case, and derive the menu-entry check from `USER_MENU_UPDATE_KEYS`. Fix the misleading `get_owned_workflow` docstring too. Each piece is small, stays on 25.1, and finishes the "every call site names the access level it needs" story the branch starts. The other follow-ups are listed below with the reasons they stay out.

## Possible Decompositions

The branch has 7 commits and about 142 added lines: 38 in code, 104 in tests and populators.

1. **Single PR.** All 7 commits as they are now.
2. **Two PRs.**
   - (a) Baselines plus refactors, commits 1-4: the two baseline-test commits, `get_stored_owned_workflow` used by delete/undelete, and the `set_workflow_menu` resolve collapse. This changes no API behavior.
   - (b) Commits 5-7: the bookmark id taken from the fetched workflow (UUID/`instance` fix), update/refactor getter selection, and `PUT /menu` through the accessible getter. (b) lands after (a).
3. **Three PRs.** (a) as in option 2. Then the UUID/`instance` bookmark fix alone (commit 5 plus `test_update_show_in_tool_panel_by_uuid`). Then getter routing (commits 6-7). The UUID fix stands alone and doesn't depend on the getter pair.

If the recommended expansion lands:
- The `show_workflow`, `pages.py` and mixin-wrapper changes fit with (a). They are getter consolidation that keeps behavior.
- The `update` merge/gate tidy-up fits with commit 6, because it simplifies the gate that commit 6 adds.

## Scope: As implemented

This adds `WorkflowsManager.get_stored_owned_workflow` next to `get_stored_accessible_workflow`. Delete, undelete, refactor and legacy `PUT /api/workflows/{id}` now fetch through the getter that matches what they do. Updates that only set per-user tool-panel keys (`show_in_tool_panel`, `menu_entry`) use the accessible getter, and so does `PUT /api/workflows/menu`. The bookmark id now comes from the fetched stored workflow, which fixes UUID and `instance=true` ids.

| Pros | Cons |
|---|---|
| <ul><li>Getter pair lives in the manager; call sites say what they need</li><li>Removes get-then-check pairs in delete/undelete</li><li>Red/green API tests for every behavior commit, plus baseline commits</li><li>Small (38 code lines), easy to review on 25.1</li></ul> | <ul><li>Leaves inline/legacy duplicates of the same getters in touched files (`show_workflow`, the controller mixin)</li><li>Gate keeps a `- {"workflow"}` special case caused by the existing merge</li><li>Menu-entry key list repeated in `update`</li></ul> |

## Scope: `show_workflow` on `get_stored_accessible_workflow` (recommended)

`WorkflowsService.show_workflow` has an inline copy of the accessible check. Replace it with `get_stored_accessible_workflow(trans, workflow_id, by_stored_id=not instance)`. Change the getter's message to show's wording, "Workflow is neither importable, nor owned by or shared with current user", which is also a more accurate description of what the getter checks.

| Pros | Cons |
|---|---|
| <ul><li>Removes the last inline duplicate of the getter in the service</li><li>Getter text is asserted nowhere; show's text (asserted in `selenium/test_workflow_sharing.py:31`) stays the same, so the reviewer's reason for deferring goes away</li><li>Other getter callers (invoke, versions, SVG, markdown embeds) get the more accurate message</li></ul> | <ul><li>`StoredWorkflow.importable` is `Optional[bool]`. Show tests `is False` and the getter tests `not importable`, so legacy rows with `importable IS NULL` become stricter for non-owners who aren't share recipients. These are rare (default `False`) but worth a line in the PR</li><li>Changes message text for the getter's other callers (no tests assert it)</li></ul> |

<details>

The two checks are otherwise the same. Owner, admin, importable and share association all pass. An anonymous user on a non-importable workflow fails in both: show's `wf_count = 0` branch, and the getter's `filter_by(user=None)` count of 0. The existing `test_workflows.py:354` 403 show test and the selenium export test cover the path. One option is to make the getter test `importable is False` so it matches show exactly, but that would loosen the other callers instead. Keeping `not importable` is the more consistent choice.

</details>

## Scope: Drop the self-referencing `workflow` merge in legacy `update` (recommended)

`workflow_dict = payload.get("workflow", {})` aliases the wrapped dict. The merge comprehension then copies the top-level `"workflow"` key into it, so `workflow_dict["workflow"] is workflow_dict`. Adding `and k != "workflow"` to the merge removes the self-reference. The gate then becomes `set(workflow_dict) <= USER_MENU_UPDATE_KEYS`, with no comment needed.

| Pros | Cons |
|---|---|
| <ul><li>Removes the special case the branch had to add, along with its explanatory comment</li><li>Nothing downstream reads `workflow_dict["workflow"]`: `normalize_workflow_format`/`artifact_class` read `src`/`class`/`$graph`/`yaml_content`, and `WorkflowUpdateOptions(**payload)` reads `payload`, not `workflow_dict`</li><li>A one-line edit in code the branch already changes</li></ul> | <ul><li>Changes the dict passed to `__normalize_workflow` on the editor-save path. That needs one editor-save/`steps` update test run to confirm (existing `test_update*` tests)</li><li>The thermo-nuclear review judged it dev-only. This evaluation disagrees, since the dropped key is unread</li></ul> |

## Scope: Derive menu-entry check from `USER_MENU_UPDATE_KEYS` (recommended); shared helper (optional)

`if "menu_entry" in workflow_dict or "show_in_tool_panel" in workflow_dict` becomes `if USER_MENU_UPDATE_KEYS & workflow_dict.keys()`. A `__set_menu_entry(trans, stored_workflow, show)` helper shared with `set_workflow_menu` is possible too.

| Pros | Cons |
|---|---|
| <ul><li>One source for the tool-panel key list (gate and block can't drift)</li><li>One line</li></ul> | <ul><li>Helper is thin: `set_workflow_menu` replaces all entries at once and `update` toggles one, so a shared helper would only cover "append an entry". Skip the helper unless review asks</li></ul> |

## Scope: `UsesStoredWorkflowMixin.get_stored_workflow` as a thin wrapper (recommended)

The older controller-mixin getter (`webapps/base/controller.py:867`) fetches through the manager but then runs its own generic item check from `managers/base.py`. Route it by flags instead: `check_ownership` uses `get_stored_owned_workflow`, `check_accessible` uses `get_stored_accessible_workflow`, and otherwise it uses `get_stored_workflow`. Keep the missing-slug backfill. Callers are the annotations controller (owned), `/workflow/imp` and `POST /api/workflows/import` (neither flag, then an importable check), and `for_direct_import`/`export_to_file` (accessible).

| Pros | Cons |
|---|---|
| <ul><li>Every workflow fetch in the webapp ends at the one getter pair</li><li>Same rules for stored workflows: owner/admin for owned; owner/admin/importable/shared for accessible</li><li>UUID ids accepted on these legacy routes for free</li><li>Removes a dead `if not workflow: error(...)` branch (the manager raises `ObjectNotFound`)</li></ul> | <ul><li>Error message text changes on these legacy routes, e.g. "StoredWorkflow is not owned by the current user" becomes the manager's default. Grep found no tests asserting the mixin-path text; the "Must be logged in to manage Galaxy items" selenium assertion goes through the sharing API, not the mixin</li><li>Touches legacy controllers with thin test coverage, so it may need one API test for `for_direct_import`/annotations</li><li>The largest piece of the expansion (~10-15 lines)</li></ul> |

## Scope: `placeholderRenderForSave` in `managers/pages.py` (recommended)

The `StoredWorkflow` branch does `sa_session.get(StoredWorkflow, id)` followed by the generic `managers/base.py` item check with `check_accessible=True`. Swap it for `trans.app.workflow_manager.get_stored_accessible_workflow(trans, decoded_item_id)`.

| Pros | Cons |
|---|---|
| <ul><li>Same rules as now (both treat `importable` with `not`)</li><li>A missing id raises `ObjectNotFound` instead of an `AttributeError` on `None`</li><li>Same function already uses `hda_manager.get_accessible` for HDAs, so there's precedent</li></ul> | <ul><li>Outside the workflow modules; History/Visualization branches stay on the generic check, so the function stays mixed</li></ul> |

## Scope: `get_owned_workflow` docstring (recommended, trivial)

The `Workflow` (not stored) getter's docstring says "make sure it accessible" even though it checks ownership. Fix it to say ownership.

| Pros | Cons |
|---|---|
| <ul><li>Sits next to the new getter; one line</li></ul> | <ul><li>Cosmetic</li></ul> |

## Scope: Contract to refactor-only (not recommended)

Ship only the baselines, `get_stored_owned_workflow` for delete/undelete, the `set_workflow_menu` collapse and the UUID bookmark fix (commits 1-5). Drop the update/refactor/menu getter selection (6-7).

| Pros | Cons |
|---|---|
| <ul><li>No API behavior change apart from the UUID fix</li></ul> | <ul><li>The getter pair would have only two callers. Leaving update/refactor/menu on the bare getter defeats the abstraction the branch exists to establish</li><li>Throws away red/green tests that already pass</li></ul> |

## Scope: Considered and left out

| Item | Why out |
|---|---|
| Invocation index `instance` lookup (`services/invocations.py:103`) | It only translates a `Workflow` id to a stored id. Results are filtered by invocation/history afterwards. Using the accessible getter would hide a user's own invocations of a workflow that is no longer shared with them |
| `index(missing_tools)` raw get (`services/workflows.py:95`) | Ids come from the already-filtered index results. A getter there would only add queries |
| Align on `error_unless_owner` (`OwnableManagerMixin`) | Only the sharing endpoints use it. The workflow manager convention is the getter pair, and moving between them buys nothing |
| The manager's ownership-off check path (used for invocations and steps) ignores `importable` while the accessible getter honors it | Two different meanings of "accessible" in one manager. Unifying them changes invocation/step access rules, which is a dev-sized change of its own |
| Split legacy `update` into per-user tool-panel and owner-level paths | The cleaner end state, but a rewrite of a busy legacy endpoint. Belongs on dev |
| Switch raw `_put` toggles at `test_workflows.py:8961-8967` to `update_workflow_fields` | A cheap test-only cleanup outside the branch's tests. Fold in if convenient |
| Share-recipient delete/undelete tests | A test-strength item, not scope. The refactor test already pins the owned getter |
