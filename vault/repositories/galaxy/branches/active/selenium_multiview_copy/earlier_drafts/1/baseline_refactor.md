# selenium_multiview_copy baseline refactor (2026-10-20)

Moved the removal of the unused `current_label` and `switch_history` selectors into a new leading commit on `release_26.2`. The feature commits keep the same content, and the final tree is unchanged.

Head `6f297eb8e42` → `71765406881` (force-pushed to `jmchilton`). Now 4 commits on `release_26.2` (`e2649e52818`):

| New | Old | Commit |
| --- | --- | --- |
| `d07da10cad7` | — | Drop unused Multiview selectors (`navigation.yml` and `schema.ts`, 4 deletions) |
| `46b3e43728b` | `6349637113e` | Point Multiview selectors at real per-history hooks (no longer includes the drop; message trimmed to match) |
| `2f05cbec84e` | `daa36aae91c` | Add a Multiview helper to copy items between history columns (cherry-picked, unchanged) |
| `71765406881` | `6f297eb8e42` | Test switching histories from a Multiview column (cherry-picked, unchanged) |

## Why
- Dropping the two selectors is the only hunk that applies to `release_26.2` unchanged and stands on its own. They have no callers in `lib/`, `client/src/utils/navigation` or `packages/` (re-grepped), and nothing depends on the new hooks.
- The Vue `data-history-id` / `data-description` attributes stay in the fix commit. Without the repointed selectors nothing reads them.
- Not split out:
  - `_wait_for_switch_button_labels` and the new column selectors are new code, not a reshaping of existing code.
  - Promoting `test_list_list_copy`'s raw drop-box selector would add a refactor the branch doesn't contain.

## Verification
- `git diff 6349637113e 46b3e43728b` is empty, and so is `git diff 6f297eb8e42 71765406881`. The final tree is byte-identical to the polished head, so the earlier Playwright 6/6 run, ruff and pre-commit results still apply. No E2E rerun.
- Pre-commit (prettier, client eslint) passed on the two new client commits.
- PR description still accurate (its table already lists `current_label`/`switch_history` as removed).
