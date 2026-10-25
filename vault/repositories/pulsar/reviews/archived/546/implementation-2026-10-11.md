# Datetime alias lint fix — 2026-10-11

John requested a PR against Pulsar master for the lint failures previously parked during the 0.16.0 release.

[PR #546](https://github.com/galaxyproject/pulsar/pull/546) is based on master `1c4398f8aa53a91a601493b0689828ab440f27f9`. Worktree: `/Users/jxc755/projects/worktrees/pulsar/branch/fix-datetime-import-alias`, created with ghwt. Branch: `jmchilton/pulsar:fix-datetime-import-alias`.

CI installs Ruff 0.17.0, which reports four ICN001 errors for unaliased datetime imports. The errors are in `pulsar/managers/stateful.py`, `pulsar/messaging/bind_relay.py`, `test/messaging_capabilities_test.py`, and `tools/release.py`. The fix imports datetime as dt and updates only the corresponding module references. An AST comparison after normalizing the aliases confirms the executable trees otherwise match their originals.

- `ceb31c5`: four module alias fixes (10 insertions, 10 deletions).
- `3219acc`: required PR #546 history entry and link under 0.16.1.dev0.
- Reproduced all four errors before the change with exact CI Ruff 0.17.0.
- Whole-tree Ruff 0.17.0 and isort checks pass after the change; whitespace checks pass.
- Existing stateful, messaging relay, capabilities, and release-script suites: 40 passed.
- Release-history parser confirms the new entry has a valid reference and remains under 0.16.1.dev0.

The PR is mergeable and CI is queued. No release was published and no independent PR review or completed remote CI result is claimed. The 0.15 branch was not modified.
