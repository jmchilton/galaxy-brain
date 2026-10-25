# Let file actions declare what they need from the destination

- [View PR #517](https://github.com/galaxyproject/pulsar/pull/517)
- [View on GitHub](https://github.com/jmchilton/pulsar/tree/action-destination-defaults)

## Status

Branch `action-destination-defaults` on `jmchilton`, base `master`; `~/projects/worktrees/pulsar/branch/action-destination-defaults`.

PR #517 open, rebased onto `origin/master` (`051b684`) 2026-10-25.

CI pending on `df0b98ee0c` (previously green on `c5f24c6e6a` pre-rebase).

Review notes: [reviews/active/517](../../../reviews/active/517/index.md).

## Notes

- 2026-10-25 rebase: conflicts in `HISTORY.rst` (entry moved to `0.16.1.dev0`) and `action_mapper.py` (upstream `BaseRemoteTransferAction` now carries `destination_defaults` and `populate_from_destination`). `transfer_action_test.py` switched from `inject_ssh_properties` to `destination_defaults`. Force-pushed `df0b98ee0c`.
