# PR #24051: move the whole change to release_26.2 — 2026-10-15

John requested moving the entire PR to `release_26.2`, preserving both the HTTP test refactor and production async-initialization fix. The standing target is now **release_26.2**. Future queue refreshes/rebases must use this base unless John explicitly changes it.

## What Marius changed

GitHub's BaseRefChangedEvent history shows Marius (`mvdbeek`) changed the PR target from `dev` to `release_26.2` at **2026-10-15 08:58:00 UTC**, then changed it back from `release_26.2` to `dev` at **08:58:32 UTC**. Both base changes were his. Our later 21:51:46 UTC force-push rebased the existing five commits on dev; it did not change the PR target.

Marius then [recommended backporting the sync interaction fix or the whole PR](https://github.com/galaxyproject/galaxy/pull/24051#issuecomment-6188385617). This move follows John's explicit choice to carry the whole PR.

## Rebase and publication

- Previous published head: `9acb0b2b8a44018d6c04205486e330acb1487e6c`.
- Previous dev base: `88127f42979425ef316b5bb0fd07fd67ce2f16bc`.
- Actual release base: `7690068b48a0bc4c268aa1905908eed5b9230f8b`.
- New head: `0bc8047f61a89b756de575338573bf710d3e32c7`.
- All **five commits** replayed without conflicts. [Range-diff](release_26.2_range_diff.txt) confirms every patch is identical. Final diff: **10 files, +456/-283**; no extra dev commits carried into the release PR.
- Pushed only to `jmchilton/plugins_test_fake_provider` with an exact lease on the previous published head, then changed [#24051](https://github.com/galaxyproject/galaxy/pull/24051)'s GitHub base to `release_26.2`.
- Updated the original local development worktree only after rechecking that it was unchanged and clean. Both pre-move heads are retained under local backup refs `codex-backup-24051-before-release-20261015` and `codex-backup-24051-local-before-release-20261015`.
- The PR remains open and non-draft. No title, description or public comment was changed.

## Validation on release_26.2

**178 passed, 21 skipped** with `GALAXY_TEST_AIOCOP=1`: plugin/agent integration suites contribute 43 passed and six opt-in live-provider skips; agent unit tests contribute 135 passed and 15 existing skips.

```sh
PYTHONPATH=/tmp/pr24051-test-extras:lib \
GALAXY_TEST_AIOCOP=1 \
GALAXY_CONFIG_OVERRIDE_CONDA_AUTO_INIT=false \
GALAXY_CONFIG_ENABLE_BETA_WORKFLOW_MODULES=true \
GALAXY_CONFIG_OVERRIDE_ENABLE_BETA_TOOL_FORMATS=true \
/Users/jxc755/projects/worktrees/galaxy/branch/issue_21015_multiple_text_param/.venv/bin/python -m pytest \
  test/integration/test_plugins.py test/integration/test_agents.py test/unit/app/test_agents.py -q \
  --html=/tmp/pr24051-release-tests.html --self-contained-html
```

The initial invocation lacked this release base's required pytest-xdist extension. Installed pytest-xdist 3.8.0 and its dependencies in `/tmp/pr24051-test-extras`, leaving the shared environment unchanged, then reran successfully. Local log: `/tmp/pr24051-release-tests.log`; HTML: `/tmp/pr24051-release-tests.html`.

Repository hooks pass across all ten changed files (Black, Ruff, Flake8, Prettier and hygiene checks). `git diff --check` passes. No code edits or conflict resolutions were needed.

New-head upstream CI is starting; prior-head CI is not attributed to this rebase. Keep the existing `branches_ready_for_final_review` hold and unchecked human-read item. A clean rebase does not resolve the earlier pending review.
