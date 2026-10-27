# Move COMMAND_VERSION_FILENAME to import-free pulsar.shared

- [View PR #522](https://github.com/galaxyproject/pulsar/pull/522)
- [View on GitHub](https://github.com/jmchilton/pulsar/tree/pulsar-shared-constant)

## Status

Branch `pulsar-shared-constant` on `jmchilton`, base `master`; `~/projects/worktrees/pulsar/branch/pulsar-shared-constant`.

Abandoned by John 2026-10-26 at `3379e60eca`: merged #537 already made `pulsar.client.staging` import-free, so the change is redundant.

PR #522 still open, conflicting; closing it is a separate step.

## Notes

2026-10-26: rebase onto `origin/master` conflicted in `staging/__init__.py` and `staging/up.py`; only resolution was dropping the changes, so not rebased or pushed.

Review notes: [reviews/active/522](../../../reviews/active/522/index.md).
