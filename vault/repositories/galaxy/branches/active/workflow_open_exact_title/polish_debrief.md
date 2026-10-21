# Polish debrief — workflow_open_exact_title

Polished 2026-10-21. Head `e6b89ba6004` on `release_26.2`.

## Steps

- **CI.** Fork CI on `fc5802715a1` was still queued, with no failures. Rebased onto `origin/release_26.2` (31 commits newer). The rebase was clean, giving `e2a49402942`, then the amend below. Fork CI is now running on `e6b89ba6004`.
- **Checklist** (GENERAL + WORKFLOW_RELATED, subagent). Nothing failed.
  - Mechanical fix, amended into the bookmark/delete test commit: the delete wait message `"a deleted workflow"` became `exactly one of [NAME] and [NAME (copy)] left`. The wait polls for exactly one remaining id, so the old message misled when both were deleted. black, ruff and pre-commit pass.
  - Kept the `find_elements` comment that names the count-then-nth stall. It guards against reintroducing it.
- **Description:** [pr_description.md](pr_description.md). Opens with a red table for the four helpers, plus highlighted lines on test-infra-only, card-scoped delete, `find_elements` semantics and why `release_26.2`.
- **Strengthening subagent.** Applied:
  - softened "always resolved to the first card's item";
  - moved the `find_elements` line above the folds;
  - added a bold-italic line on why `release_26.2`;
  - noted the backend of the reds;
  - dropped the unconfirmed ~30s-gap link.
- **Titles:** [pr_titles.md](pr_titles.md), all prefixed `[26.2]`.
- **Tags:** [pr_tags.md](pr_tags.md): `kind/bug` and `area/testing/selenium`. Drop the labeler's `area/testing`.

## Left over (not done)

- No local E2E runs on the rebased head. The new worktree `~/projects/worktrees/galaxy/branch/workflow_open_exact_title` has no `.venv`, and fork CI covers green.
- The open/run reds come from the initial cherry-picked 7c/7g, with the backend unrecorded. The bookmark/delete reds are Playwright only. A Selenium delete red was not run.
- The ~30s gap ↔ `find_elements` link is still unconfirmed and is no longer claimed.

## Decisions for John

Both are carried from the hardening pass. The description assumes the scope evaluation's defaults.

1. **One PR, or split out the `find_elements` fix?** The description assumes one PR. Fixing the same race in `find_elements_by_selector` / `assert_disabled` stays a follow-up (H).
2. **Explicit `workflow_index_open()` in the bookmark/delete test.** Kept. The test-challenges check in the description explains why.
