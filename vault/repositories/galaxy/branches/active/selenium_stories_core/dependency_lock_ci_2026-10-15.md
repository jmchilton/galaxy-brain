# Dependency-lock CI failure — 2026-10-15

[Failed check](https://github.com/galaxyproject/galaxy/actions/runs/38669557417/job/116209193232?pr=24137), original PR head `6628929522b5a947000d943701e99c2538c555d8`.

The job runs `sh lib/galaxy/dependencies/update.sh --check`. It fails before tests with: `The lockfile at uv.lock needs to be updated, but --check was provided.` This is a relevant dependency-metadata omission, not a flaky test or an unrelated upstream failure.

The PR changed three package manifests without updating the workspace lock:

- galaxy-selenium now requests `galaxy-util[markdown-convert]`.
- galaxy-util adds its `markdown-convert` extra and Markdown to its test dependencies.
- galaxy-test-selenium adds pytest-mock to its test extra.

Reproduced the exact CI failure locally using repository-pinned **uv 0.12.23**, with Python 3.10. Regenerated the lock, retained only the generated blocks for those three packages, and preserved the existing registry-package versions (including the existing Python-specific lxml split). An unrestricted re-resolution had attempted unrelated lxml consolidation; that was discarded.

The final change touches **uv.lock only**, +13/-3. Requirements exports remain byte-identical. `sh lib/galaxy/dependencies/update.sh --check` now passes: lock freshness and all four requirements exports agree. Whitespace and commit hooks pass. No application/test behavior changed, so no browser suite rerun was needed for this metadata correction.

Published as `c9cbdb03895fb70c65daaf688cd4b8dfa8027182` to the existing jmchilton PR branch. PR stays draft in `ci_wait`; fresh CI pending. This diagnosis covers the linked dependency-check job, not other workflow failures.

Local evidence: `/tmp/pr24137-pinned-red.log`, `/tmp/pr24137-check-green.log`. Temporary pinned-uv environment: `/tmp/pr24137-tools`.
