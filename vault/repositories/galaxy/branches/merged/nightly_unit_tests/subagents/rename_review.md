# Normal review — underscore rename (`d449d938617`)

Clean; no blocking or should-fix findings. Acted on the header-comment nit: `a97ecd968ad` drops the comments, which repeated `on: workflow_call` and would conflict with release-branch edits to `name:`, and states the convention once in `debugging_tests.md`.

Not acted on:
- **Merge-forward risk.** A release branch adding a new `uses:`/`paths:` reference to `build_client.yaml` and merging forward would leave `dev` pointing at a missing file; GitHub flags it as an invalid workflow. Goes in the PR description.

## Details

- No old names remain anywhere (`git grep`). The two renamed files are the only `workflow_call` workflows in the repo.
- All 5 `_build_client.yaml` callers had both `push` and `pull_request` `paths:` updated in place, keeping the include/exclude order.
- The cache key (`galaxy-static-${commit}`) doesn't depend on the filename, so existing caches still hit.
- Call-only workflows have no run history of their own, so the rename loses none.
- Simulated with `git merge-tree`:
  - A release-side edit in the middle of `build_client.yaml` merges cleanly into `_build_client.yaml` (94% rename similarity).
  - A release-side edit to `name:` conflicts because of the header comment, which motivated dropping the comment.
- release_26.2 has the same `build_client.yaml` blob as `dev` before the rename.
