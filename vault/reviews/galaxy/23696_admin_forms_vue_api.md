# PR #23696 — Port the remaining slow admin forms to Vue and the API

- PR: https://github.com/galaxyproject/galaxy/pull/23696
- Author: `mvdbeek`
- Base: `dev` (`249b7e705b7348d8e69b65decfb4979f3ec76e5b` at review time)
- Reviewed head: `7808694c794a1883a96d880842b4f55d9d47eece`
- Follow-up head: `54dc72cd462` (current `dev` merged after deleted-role and quota-description fixes)
- State: open, non-draft, mergeable

## Summary

This is a well-structured port overall: the new role APIs are narrowly shaped for the forms, expensive user lists become server-side searches, IDs use the generated API types, load failures prevent destructive empty saves, and the backend tests cover permissions, invalid IDs, session invalidation, and association replacement. The generated schema and navigation selectors are included, and CI is completely green at the reviewed head.

I would request changes before merging because the new user form regresses the legacy handling of soft-deleted roles. The user roles/groups form also splits one logical save across two commits even though the existing security-agent abstraction can update both association sets atomically. A separate quota edit bug is real but predates this PR and is therefore non-blocking here.

## Findings

### 1. Resolved at `70df78ad88b`: filter soft-deleted roles before populating the user form

The legacy user form populated its selected roles while iterating only `Role.deleted == false()`. The new `UserRolesGroupsForm` instead selects every non-private role returned by `GET /api/users/{user_id}/roles`:

- `UsersService.get_user_roles()` returns every `user.roles` association without checking `role.deleted` (`lib/galaxy/webapps/galaxy/services/users.py:265-268`). `UserRolesGroupsForm` only removes private roles, so a deleted non-private role is displayed and submitted again (`client/src/components/admin/UserRolesGroupsForm.vue:82-86`).

Soft-deleting a role does not remove its `UserRoleAssociation`, and `_set_user_roles()` accepts the deleted role ID without checking the flag. Consequently, editing and saving a user now exposes and preserves a deleted non-private role that the legacy form hid and removed. This is a behavior regression in the workflow ported by this PR.

Please filter deleted roles in the service/query and add API coverage for a user associated with a soft-deleted role. The user-groups path already filters deleted groups, while the unfiltered group-user/group-role APIs and `GroupForm` behavior predate this PR; those parts of the original finding are not PR regressions.

Follow-up adds the service filter and `test_user_roles_leave_out_deleted_roles`; the focused API regression test passes.

### 2. Resolved at `8920c670a3f`: clearing a quota description is silently ignored

`QuotaForm` intentionally permits an empty description in edit mode and sends `description: ""`; its client test even covers that request. But `QuotaManager.rename_quota()` only assigns the description when it is truthy (`lib/galaxy/managers/quotas.py:116-126`). The request succeeds and the UI navigates away, while the old description remains in the database.

Use an explicit `is not None` check for updates and add an API/integration assertion that clearing the description persists an empty string. The current Vitest only proves the payload was emitted, not that the server applies it. This bug and the legacy form's route through the same manager predate this PR, so it is worth fixing but is not a newly introduced regression or merge blocker.

Follow-up changes the truthiness guard to an explicit `is not None` check and extends the quota integration test to clear the description and verify the subsequent GET returns an empty string.

### 3. Important: save user roles and groups in one transaction

`UserRolesGroupsForm.onSubmit()` first calls `PUT /api/users/{id}/roles` and only then calls `PUT /api/users/{id}/groups` (`client/src/components/admin/UserRolesGroupsForm.vue:94-111`). Each service method calls `set_user_group_and_role_associations()` separately and commits (`lib/galaxy/managers/users.py:558-567`). If the second request rejects—for example for a purged/nonexistent group or a server failure—the role changes have already persisted even though the combined form reports an error. The branch's client test explicitly models the roles request succeeding and the groups request returning 400, but checks only the error/navigation state rather than persisted associations.

The underlying security-agent method already accepts both `role_ids` and `group_ids` and performs one commit. A combined user-associations payload/endpoint would reuse that seam and keep the single form's save atomic. Add a rejection test showing neither side changes when either association list is invalid.

## Test and CI evidence

- `git diff --check 249b7e705b7348d8e69b65decfb4979f3ec76e5b...7808694c794a1883a96d880842b4f55d9d47eece` passed.
- All GitHub checks reported success at the reviewed head, including API, unit, integration, Selenium, client unit/lint, OpenAPI, mypy ratchet, PostgreSQL, and startup jobs.
- Local backend execution was not available because this worktree has no `.venv`; local client execution was also unavailable because `client/node_modules` is absent. The findings above follow directly from the loaded relationship queries and update conditions and are not contradicted by the added tests.

## Recommendation

Request changes for the remaining user roles/groups atomicity regression. The deleted-role regression and pre-existing quota-description bug are fixed with passing focused coverage through `8920c670a3f`.
