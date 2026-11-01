# issue_24532_user_deletion_refusal_25.1_alt_original_scope

[View on GitHub](https://github.com/jmchilton/galaxy/tree/issue_24532_user_deletion_refusal_25.1_alt_original_scope). The parent branch at `4ddba1316d4`, before the re-scope.

What it does: it fixes #24532 on `release_25.1`. `UserDeletion.vue` matches `err_code` against a local `CONFIG_DOES_NOT_ALLOW = 403004` and assigns the "User deletion must be configured…" message. It also calls `preventDefault()` on BModal's `ok` event, so a failed deletion keeps the modal open and the error is visible. It includes baseline and regression jest tests.

How it differs from the parent: it has no in-flight `deleting` state. Once the modal stays open, **Delete Account Permanently** stays enabled while the DELETE is outstanding, and a double click can send two requests. The parent adds `deleting`, which disables the button during the request and re-enables it on failure, like 26.1's GModal version. The [scope evaluation](../earlier_drafts/1/scope_evaluation.md) recommended that change.
