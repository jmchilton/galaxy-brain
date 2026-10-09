# upload_datatypes_composable

Status: `branches_implemented_needs_ci`. Base: `dev`.

Adds a `useUploadDatatypes` composable with loading/error state; upload configurations and collection editing use it.

[Implementation](implementation_debrief.md)

Stacked on [#23995](../issue_23977_datatypes_fanout_26.1/index.md): its first three commits are cherry-picks of that PR. Once #23995 merges and `release_26.1` forward-merges to `dev`, rebase onto `dev` to drop them; keep `333b511c6d4` unless the forward-merge already ported those tests.
