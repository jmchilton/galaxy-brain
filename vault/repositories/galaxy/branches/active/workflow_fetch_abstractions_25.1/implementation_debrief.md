# Implementation debrief

STATUS: READY. Base `release_25.1` (`74f52289d82`), head `fac396515e4`, pushed to `jmchilton`.

## Final implementation

`WorkflowsManager.get_stored_owned_workflow` joins `get_stored_accessible_workflow`, and each workflow API/service fetch names the access level it needs:

- Owned: service `delete`/`undelete`/`refactor`; legacy `PUT /api/workflows/{id}` for any non-bookmark field.
- Accessible: `show_workflow`; legacy `PUT` when the payload is only `USER_MENU_UPDATE_KEYS` (`show_in_tool_panel`, `menu_entry`); `PUT /api/workflows/menu` resolves each id (deduped) before clearing entries.
- Bookmark block takes the id from the fetched stored workflow (fixes `instance=true` and UUID ids).
- Show now treats unset `importable` like False, matching download/invoke/index; the accessible getter adopts show's error text, so the visible message is unchanged.

History (baseline tests first, then refactors, then behavior changes):

1. `e7b5a77b407` Baseline tests for `show_in_tool_panel` updates and `PUT /api/workflows/menu` (+ populator helpers)
2. `b4a83ce27cc` Baseline tests for workflow show and admin update
3. `b81c3a799b9` Add `get_stored_owned_workflow` (delete/undelete)
4. `680bc5dc1a7` Collapse `set_workflow_menu` id handling
5. `77b06ed3503` Bookmark id from fetched stored workflow
6. `24eac9c1fb1` Update and refactor through owned/accessible getters
7. `c519a9986e1` Menu entries through accessible getter
8. `fac396515e4` Show through accessible getter

## Choices

- Payload-key allowlist picks the getter in legacy `update` ahead of any mutation; the self-referencing `workflow` merge key stays (wrapped empty update relies on it).
- Error text kept where tests assert it; getter messages unified on show's text.
- Not taken (dev follow-up): `UsesStoredWorkflowMixin`/`pages.py` onto the manager getters, import paths still checking `importable is False`, two ownership vocabularies (`check_security` vs `SharableModelManager`), dropping now-unused `User.count_stored_workflow_user_assocs`.

## Process

Normal review + re-scope review (both approve, nits acted on). Re-harden: test challenges, Codex (no findings), thermo-nuclear (approve), baseline refactor (final tree identical to pre-refactor head `2610c4e6ed1`; each behavior test red before its commit, 46 related API tests green at head), scope evaluation (keep scope), `make format` + mypy clean. No UI change, no screenshots. Earlier hardening debriefs in [earlier_drafts/1](earlier_drafts/1/).

## Scope decision

Keep scope. Original-scope alt: `workflow_fetch_abstractions_25.1_alt_original_scope` ([alts/original_scope.md](alts/original_scope.md)).
