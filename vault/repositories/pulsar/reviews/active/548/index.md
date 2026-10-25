# pulsar#548 — Enable retries in tus uploader

- [View on GitHub](https://github.com/galaxyproject/pulsar/pull/548) · [Code review](initial_review.md) · [Risks](risks.md) · [Verified review](verified_review.md) · [Verification evidence](verification.md) · [Response](initial_review_response.md) · [Actions](initial_response_action.md)

## Status

Initial review of `08dc85505c9794fc47f726cf6370303dd43164a4` completed on 2026-10-25 with no actionable findings; approval response posted on 2026-10-25.

PR remains open and approved. Merge is blocked by Framework tests / Test (3.10, master, directory), which fails during collection importing `build_client_manager` from installed Pulsar before reaching the changed transport.

## Worktree

`/Users/jxc755/projects/worktrees/pulsar/pr/548`, created with `ghwt create pulsar 548`.

## Vault synchronization

`make validate` fails on unrelated untracked `vault/FILL_IN_AT_RUNTIME.md` (no frontmatter); review records remain uncommitted and unpushed pending a passing validation gate.
