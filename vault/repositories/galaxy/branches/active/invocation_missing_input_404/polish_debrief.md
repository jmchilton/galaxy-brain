# Polish debrief

2026-10-15. `570041b2d04` (dev) → `ed2a517eacd` (`release_26.1`). Ready for John's final review.

## Rebase

At John's request, rebased onto `release_26.1` `92e66c53394`; PR targets `release_26.1`. One mechanical conflict in `test_workflows.py`: dev-only tests surround the new one, so only this branch's test was kept. `run_request.py` applied cleanly. 5 API cases passed on the new base before pushing.

## CI

Fork CI on the dev-based `570041b2d04`: everything relevant was green, including API tests. The only red was `Test Galaxy packages`, from an unrelated mypy error in `galaxy/security/ssh_util.py:18` (untyped paramiko `publickey`). CI on `ed2a517eacd` hadn't finished at hand-off.

## Checklist

GENERAL + WORKFLOW_RELATED: [checklist_evaluation.md](checklist_evaluation.md). Nothing failed. Two items needed judgement:

- **Who hits this:** there are no field reports. The description says so and cites the base-branch red run as the evidence.
- **Existing approaches:** no manager fits as-is. The not-found guard was copied 4 times, and HDCA was looked up twice. Folded both into `_get_input_or_not_found`, which keeps behavior the same.

## Strengthening (one round)

Tasks applied:

1. Positive control `test_run_with_library_input[ldda|ld]`. No API test previously invoked a workflow with a library input.
2. The 404 test now asserts `USER_OBJECT_NOT_FOUND` and the full message.
3. Control `test_run_with_inaccessible_input[hda|hdca]`: another user's private dataset or collection is still a 403.

Description fixes:

- Dropped the run-form framing; API clients are the audience.
- Added why it targets `release_26.1` (the `hda` 500).
- Changed the caller count to 17 call sites, and cited the report test that asserts the manager's 400 text.
- Tightened the Sentry wording.

Checked against the base: the 4 regressions fail there with 500/403/403/400, and the 5 controls pass. A checklist re-check after the test changes passed everything. Its fixes are applied: `@requires_admin`, plus a `_upload_single_input_workflow` helper. 9 API cases pass. black, isort and ruff are clean, and mypy reports no errors in `run_request.py`.

## Left for John

- The human-read checklist item.
- Possible `dev` follow-up, not in this PR: have `__get_history_collection_instance` raise `ObjectNotFound`, which would make the HDCA pre-check unnecessary.
- Out of scope, left as is: an `ld` whose LDDA association is missing still hits `assert ldda` and returns 403.
- Early validation, and the empty history left behind by a failing `new_history_name` request, stay with `issue_20900_invocation_validation`.

## Follow-up from John's review (test duplication)

John asked to move test duplication into the workflow populator and add a `with self._different_user_history() as other_history_id:` abstraction. He confirmed the name `_different_user_history`, to match `_different_user`; his message had `_different_users_history`.

- `WorkflowPopulator.invoke_single_input_workflow_raw` replaces the hand-built request dicts and the test-class workflow helper. It builds on `invoke_workflow(..., inputs_by="name")`.
- `_different_user_history(email=None)` lives in `UsesApiTestCaseMixin`.
- At John's request, a separate commit `99a44f7d604` converts the existing sites. 8 converted. 3 create-only sites act as the main user after the block, so they stay on `_different_user()`: `test_histories.py` `test_other_users_history_is_forbidden`, `test_workflows.py` (run into another user's history) and `test_wes.py`. Converting them would need empty `with` blocks.
- Verified: 18 pass, covering the new tests plus all converted tests. On base code the 4 regressions still fail at the status assertion and the 4 controls pass. black, isort, ruff and pre-commit hooks pass; mypy reports no errors in `galaxy_test`.
