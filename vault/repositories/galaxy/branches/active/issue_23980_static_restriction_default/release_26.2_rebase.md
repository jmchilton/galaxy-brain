# Release 26.2 rebase — 2026-10-14

Requested target: `release_26.2`, fetched at `f9cf361962e1f75aba94c55f6e68bb0f5ff56a15`. Original branch head: `db7eb057921ec603bf48a3c1614cbbf90645ca2f`; original merge base: `9fd083720a7cc17a41a298d0039393a66685babd`. Transplanted only this branch's six commits with `git rebase --onto origin/release_26.2 <original-merge-base>`.

## Reconciliation

The release already includes merged #23992. Resolved `modules.py` to the branch's shared `_is_default_option` matcher, as instructed in its implementation notes, deleting the replaced `default_values` block. Preserved the release's unit validation test for disabling multiple on a list default while allowing the branch's later commit to move its own static-default unit coverage into API/browser tests. Final unit test file matches the release base.

The rebase applied the list-default API test a second time without a conflict. Compared both definitions by AST, confirmed equality, retained the release's definition and removed the duplicate in commit `6c9ef2e4ae2`. No assertion or coverage was lost. Final diff changes five files: backend options, form validation, and the corresponding API/browser/client tests.

## Validation

- `test/unit/workflows`: **193 passed, 2 skipped**, 3 warnings, using the existing issue_21015 test environment with this branch's `lib` on the Python path.
- `client/src/components/Form/utilities.test.js`: **46 passed**.
- `client/src/components/Form/composables/useFormState.test.js`: **14 passed**.
- Cleanup commit hooks: black, ruff, flake8, prettier, whitespace, merge-conflict and symlink checks passed.
- `git diff --check origin/release_26.2...HEAD`: passed. Worktree clean after commit.
- API/browser tests were not rerun locally for this rebase; upstream CI will exercise them. Earlier E2E evidence predates these conflict resolutions.

## Publication

Pushed `6c9ef2e4ae2099a6c005af62ce17b6d9367782e4` to `jmchilton/galaxy` with `--force-with-lease`. Created [draft #24140](https://github.com/galaxyproject/galaxy/pull/24140) against `release_26.2`, with the requested `[26.2]` title prefix. Verified base, head and draft state, with 40 upstream checks queued/in progress on first refresh.

Updated the description to distinguish existing release behavior from the new fixes and remove the obsolete future-conflict warning for #23992. Hosted the prepared screenshot on `pr-assets-issue_23980_static_restriction_default` (asset commit `b321f9f`) and used its raw URL. Preserved the human-read checkbox already checked in the working description; no mentions added. Queue status is `ci_wait`.
