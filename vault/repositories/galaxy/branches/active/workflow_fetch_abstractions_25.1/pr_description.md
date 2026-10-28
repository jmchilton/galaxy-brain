Fix workflow update, refactor and menu endpoints fetching stored workflows without an access check.

On `release_25.1`, non-owners get 200 on these requests:

| Request (as a non-owner) | `release_25.1` | This branch |
|---|---|---|
| `PUT /api/workflows/{id}` `{"name": ...}` / `{"published": true}` (unrelated user) | 200 | 403 |
| `PUT /api/workflows/{id}` `{"hidden": true}` (share recipient) | 200 | 403 |
| `PUT /api/workflows/{id}/refactor` (dry run or real) | 200 | 403 |
| `PUT /api/workflows/menu` with someone else's private workflow id | 200 | 403 |
| `GET /api/workflows/{id}` on a workflow whose `importable` is unset (NULL) | 200 | 403 |

Also fixed: an owner bookmarking by UUID (`PUT /api/workflows/{uuid}` `{"show_in_tool_panel": true}`) got 400 on base and now gets 200.

Each of these is an API test that fails on the base and passes on this branch.

`WorkflowsManager` already had `get_stored_accessible_workflow`. This branch adds its owned counterpart, `get_stored_owned_workflow`, and every fetch that reads or edits a single workflow by request id in these modules now goes through the getter matching the access it needs:

- **Owned:** delete, undelete, refactor, and legacy `PUT /api/workflows/{id}` for any non-bookmark field.
- **Accessible:** show, `PUT /api/workflows/menu`, and legacy `PUT /api/workflows/{id}` when the payload is only `show_in_tool_panel`/`menu_entry`.

***Bookmarking stays open to anyone who can access the workflow: share recipients and users of published workflows can still add it to their own tool panel. Only edits to the workflow itself now require ownership (or admin).***

<details><summary>Implementation details</summary>

- `USER_MENU_UPDATE_KEYS` (`show_in_tool_panel`, `menu_entry`) picks the getter in legacy `update`, before any mutation. A mixed payload (bookmark plus `name`) needs ownership and changes nothing when it's rejected.
- The bookmark block takes its id from the fetched stored workflow, not a re-decode of the path id, so UUID and `instance=true` ids work.
- `PUT /api/workflows/menu` resolves every (deduplicated) id before clearing existing entries, so one inaccessible id leaves the menu unchanged.
- `show_workflow` drops its inline copy of the accessible check. The getter takes over show's error text ("Workflow is neither importable, nor owned by or shared with current user"), which the Selenium sharing test and the client already expect. The getter checks `not importable` rather than `importable is False`, so an unset `importable` is now treated as private, as download, invoke and index already do.
- Delete and undelete switch from get + `check_security` to the new getter with no behavior change.

</details>

***An unset (NULL) `importable` now reads as private on show, matching download, invoke and index.***

***This is scoped for `release_25.1`: the fix plus the getter pair. The legacy shared-import route (still on the mixin and its `importable is False` check) and consolidating `UsesStoredWorkflowMixin`, `pages.py` and the two ownership vocabularies onto these getters are left for a `dev` follow-up.***

## Risks

The one-way part is behavior: non-owners now get 403 on edit requests that used to succeed, which is the intent. Otherwise this is a refactor (a two-way door).

<details><summary>Risk Details</summary>

- Clients relying on editing other users' workflows through the legacy `PUT` or refactor (only admins should, and admins still can) will get 403.
- Workflows with `importable` unset (NULL) are no longer viewable by other users through `GET /api/workflows/{id}`.
- `PUT /api/workflows/menu` now returns 403 on an inaccessible id instead of adding it; a missing id now gives 404 (untested).
- The accessible getter's 403 message changes for its other existing callers (no test asserted the old text).

</details>

<details><summary>Risk Review Advice</summary>

Check the `USER_MENU_UPDATE_KEYS` gate in `WorkflowsAPIController.update`, in particular the `- {"workflow"}` exception: the merge copies a wrapped payload's own `workflow` key into the dict, and a wrapped empty update relies on it to stay a no-op 200. Also confirm that 403 on an unset `importable` is acceptable for 25.1.

</details>

## Context

Alternative kept on 🌿[`workflow_fetch_abstractions_25.1_alt_original_scope`](https://github.com/jmchilton/galaxy/tree/workflow_fetch_abstractions_25.1_alt_original_scope): the same branch without moving `show_workflow` onto the accessible getter, so show keeps its inline check. Developed with [John's Galaxy Brain Branch Factory](https://jmchilton.github.io/galaxy-brain/factory/galaxy-branches/).

## Agentic Checks

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>Keep scope: every API-level fetch in the touched modules now names the access level it needs.</summary>

Weighed and deferred for `dev`: the mixin wrapper and `pages.py` (consolidation only, changes legacy-route message text, thin coverage), dropping the self-referencing `workflow` merge key (breaks `test_update_tags`), and removing the now-unused `User.count_stored_workflow_user_assocs` (model churn on a release). Contracting the scope would drop red/green-tested fixes for little saving.

</details>

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>Approve: the getter pair lives in the manager and each endpoint picks one, with no scattered special cases.</summary>

Applied: dropped a misnamed `decoded_id` local, the populator `update_workflow` now delegates to `update_workflow_fields`, and `_shows_in_tool_panel` asserts exactly one index match. Left for `dev`: a shared menu-entry helper, unifying `check_security` with `SharableModelManager` ownership checks, and deduplicating the share-count query.

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>Added the "allowed" show/update cases and pinned the owned-getter gate with a field that has no other owner check.</summary>

Added shared-user, anonymous-importable and admin show tests and an admin update test. The shared-user rejection test now also sends `hidden`: tags alone are already rejected by the tag handler, so they couldn't prove the gate.

</details>

### ✅ Second Frontier Model Review

<details><summary>Codex returned no findings on the full branch.</summary>

Read-only Codex review of `release_25.1...` after the re-scope. It covered the manager, API, service, populators and the client callers of these endpoints.

</details>

### ✅ [Refactoring of base branch](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_REFACTOR_BASELINE.md)

<details><summary>Two baseline-test commits, then two behavior-preserving refactors, then four behavior commits, each bringing its red-to-green tests.</summary>

With the final tests checked out at the refactor tip, 39 pass and exactly the 7 behavior tests fail. 46 related API tests pass at head, and the final tree is identical to the pre-reorder head.

</details>

## John's Checklist

- [x] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? Non-owners get 403 on update, refactor, delete and undelete; inaccessible show gets 403 with the existing message; unknown ids get 404 "No such workflow found."
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. They are API tests asserting status and the visible state afterwards.
- [x] Are baseline tests in their own leading commits (if applicable)? Yes.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A.

## How to test the changes?

- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

## License

- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
