# Re-scope debrief

Scope evaluation (first pass) recommended a modest expansion. Original scope kept as `workflow_fetch_abstractions_25.1_alt_original_scope` (`a8b3dfd81e4`, see [alts/original_scope.md](alts/original_scope.md)). Expansion landed as `5531402899b`.

Taken:
- `WorkflowsService.show_workflow` fetches through `get_stored_accessible_workflow`; the getter adopts show's error text (asserted by `selenium/test_workflow_sharing.py` and a client test), so the visible message doesn't change.
- Legacy `update` bookmark block keys off `USER_MENU_UPDATE_KEYS`.
- `get_owned_workflow` docstring.

Not taken:
- Drop the self-referencing `workflow` key from the legacy `update` merge: tried, `test_update_tags` failed - a wrapped empty update (`{"workflow": {}}`) relies on that key to be a no-op 200 instead of the "requires dictionary" 400. Reverted; gate keeps `- {"workflow"}` with its comment.
- `UsesStoredWorkflowMixin.get_stored_workflow` as a wrapper over the manager pair, and `pages.py` `placeholderRenderForSave`: `managers.base.security_check` applies the same accessibility rules as the getter, so the gain is consolidation only, while user-visible message text on legacy routes, the mixin's slug backfill and the callers that pass neither flag would change. Thin coverage there; left for a dev follow-up.
- Dropping now-unused `User.count_stored_workflow_user_assocs`: model method, left on a release branch.

Re-scope review: approved, no bugs. Acted on: accessible getter docstring, red-to-green `test_cannot_show_workflow_with_unset_importable` (show now treats unset `importable` like False, matching download/invoke/index) in `deca37cd456`.

Testing: 49 related `test_workflows.py` tests pass (show/download/anon, sharing, admin, update, refactor, delete/undelete, menu, bookmarks).
