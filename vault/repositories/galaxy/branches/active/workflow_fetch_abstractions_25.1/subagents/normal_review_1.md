# Normal review 1 - workflow_fetch_abstractions_25.1

Acted on 1-8 in `0f5cdb3b750`: share-recipient refactor (dry and real) + top-level `{"tags"}` 403 test, published-workflow bookmark test with a top-level payload (moved into the baseline commit since it passes on base), `decoded_id = stored_workflow.id`, `-> StoredWorkflow` on the accessible getter, `frozenset`, docstring. Also routed `PUT /api/workflows/menu` through `get_stored_accessible_workflow`, resolved before existing entries are cleared, with a test.

Not acted on:
- Share-recipient delete/undelete case: those paths kept their old semantics (get + `check_security`) and the refactor test already pins the owned getter.
- 9 (empty payload 403/404 vs 400): harmless.
- Reuse notes (`error_unless_owner`, controller mixin wrapper, `show_workflow` inline check): follow-ups, out of scope for a 25.1 target.

<details>

Reviewer: subagent, read-only. Diff: `git diff origin/release_25.1...HEAD` (62ce68ca399 baseline tests, 85374f7ea27 change).

## Verdict

Approve. I found no real bugs. The new getter is small and fits the existing pattern: it mirrors `get_owned_workflow` (manager line 348) and `get_stored_accessible_workflow`, and both use `check_security(check_ownership=True)`. The allowlist gate in `update` is correct for every payload shape I traced. The suggestions below are mostly about making the tests stronger. Two are cheap code nits.

## Bugs

None.

## Test strength (recommended)

1. **The refactor test passes under either getter.** `test_other_cannot_refactor` (test_workflows.py:502) uses a workflow that is not shared with the second user. That user gets a 403 from `get_stored_accessible_workflow` too, so the test would still pass if `refactor` went back to the accessible getter. Add a share-recipient case for both dry_run True and False. That is the case that pins "owned, not just accessible". The existing `test_other_cannot_delete` and `test_other_cannot_undelete` (around :441-464) have the same gap. A share-recipient delete case would pin the service change as well.
2. **No published-workflow bookmark test.** `get_stored_accessible_workflow` lets any importable workflow through. The client shows the bookmark toggle on any card that isn't deleted (`WorkflowCard.vue:148`), and that includes the published list. Suggested test: a user bookmarks another user's published workflow, which the user does not have shared with them. Check the result with `workflow_populator.index(show_published=True)`. `show_in_tool_panel` is set per user on every index item.
3. **No test covers the payload shape the client sends.** `workflow_populator.update_workflow` always wraps the update as `{"workflow": {...}}`. The client sends top-level keys: `useWorkflowCardActions.ts:110` sends `{show_in_tool_panel}`. The gate's `- {"workflow"}` handling only matters for the wrapped shape, so one share-recipient case should use a top-level payload (call `self._put` directly).
4. **Tags on the share-recipient path are untested (optional).** Tags and annotations are stored per user in the model, so someone could argue they belong on the allowlist. The client hides tag editing on shared cards (`WorkflowCard.vue:150`, `!shared`). Shared workflows also can't be selected for bulk tagging (`WorkflowList.vue:129`). Annotations from all users show up in the index. So a 403 is the consistent result for both, and the current allowlist is right. One `{"tags": [...]}` share-recipient 403 case would pin that decision.

## Nits

5. **Pre-existing: the menu block decodes the raw path id** (`api/workflows.py:484`, `decoded_id = trans.security.decode_id(id)`). With `instance=true` the path id is a Workflow id, but the block compares it against `stored_workflow_id`, so the membership check is wrong. A UUID id also fails to decode. The accessible getter is now the main way into this block. Using `decoded_id = stored_workflow.id` fixes both cases. This is optional and cheap.
6. `get_stored_accessible_workflow` has no `-> StoredWorkflow` return annotation, while its new sibling does. Adding it would make the pair consistent.
7. `USER_MENU_UPDATE_KEYS` (`api/workflows.py:136`) could be a `frozenset`.
8. The new docstring repeats "from a encoded" from the sibling's docstring.
9. Behavior change in an edge case: an empty payload now goes through the accessible getter before the "requires dictionary" check. A caller without access now gets a 403 or 404 instead of the 400 they got before. This is harmless.

## Abstraction / reuse notes (no action needed)

- I checked the sharable-manager alternative, `self.error_unless_owner(stored, trans.user, trans=trans)` from `OwnableManagerMixin` via `SharableModelManager`. It handles admins the same way and also returns 403. It would align with the sharing endpoints (publish, share_with_users), which go through `manager.get_owned`. The workflow-local convention is already `check_security`, so either choice is fine.
- `UsesStoredWorkflowMixin.get_stored_workflow` (`webapps/base/controller.py:867`) is an older owned or accessible getter in the controller mixin. It has no `by_stored_id`/`instance` support and it creates slugs as a side effect. A later cleanup could make it a thin wrapper over the manager getters. That is out of scope here.
- `WorkflowsService.show_workflow` (`services/workflows.py:240`) repeats the accessible check inline. It is a candidate consumer of `get_stored_accessible_workflow` in a follow-up. The semantics match: importable passes, anonymous users fail on non-importable workflows.
- The allowlist gate runs before `normalize_workflow_format`. I checked that normalization can't turn an allowlisted-only payload into owner-level keys: `artifact_class` only acts on `src`, `class`, `$graph` and `yaml_content`, and none of those are allowlisted. A nested `workflow` key inside `payload["workflow"]` is excluded from the check and ignored downstream.
- Client callers of `PUT /api/workflows/{id}` that are reachable for non-owners only send `show_in_tool_panel`. Rename, tags, bulk tags and the editor save (`{workflow, from_tool_form}`) only run for workflows the user owns. Nothing in `client/src` sends `menu_entry`. The only refactor caller is the editor (`Editor/modules/services.js:36`), which is owner-only.
- Admins pass both getters, so their behavior is unchanged.
- Imports: no new imports. The constant is defined at module level.

</details>
