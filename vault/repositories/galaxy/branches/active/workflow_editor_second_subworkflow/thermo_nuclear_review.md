# Thermo-nuclear review — workflow_editor_second_subworkflow

Reviewed `65132d40dac..2dedb1e1f89`. I acted on one finding: card lookup no longer catches stale elements itself, because `retry_call_during_transitions` already handles them. I folded that into the helper commit. Everything else on the branch passes the bar, or is a recorded decision kept on purpose.

Head `57292ea0b65` (was `2dedb1e1f89`). Base `65132d40dac` (`release_26.2`).

- `7e681e52e13` Insert a second subworkflow from the editor's Workflows panel (was `f5cf35fd8b7`, now includes the fixup)
- `57292ea0b65` Test inserting two subworkflows from the editor's Workflows panel (same content, rebased)

## Codex fix verified first (before any change)

The Codex exact-title fix had not been run E2E. All four runs passed on `2dedb1e1f89`, so the helper commit needed no fixup.

| Test | Backend | Result |
|---|---|---|
| `test_editor_embed_two_workflows` | Playwright | PASS (19s) |
| `test_editor_embed_workflow` | Playwright | PASS (15s) |
| `test_editor_insert_steps` | Playwright | PASS (41s) |
| `test_editor_embed_two_workflows` | Selenium | PASS (19s) |

## Acted on

- **Stale-element handling is now in one place.** `_workflow_editor_panel_card_titled` had its own `try/except` that turned a stale element into "no card yet". It ran inside `click_action`, which is already wrapped in `retry_call_during_transitions`, and that function treats stale elements as transitions. Now the stale exception goes up to that retry, which re-runs the lookup and click. The helper is down to "list the titles, return the exact match". I updated the retry comment to say it covers the lookup as well as the click.

## Not acted on

- **Nesting the panel selectors** like `workflow_editor.inputs` (`activity_button` / `activity_panel` / `search` / `list`). That would remove the prefix repeated three times. But it moves `workflow_activity`, which is a base key. `galaxy_ui_driver`, `dev` and both sibling branches all use it, so this is base-key churn for a tidier yml. A good small follow-up on `dev`.
- **Card-by-title lookup is duplicated with `workflow_open_exact_title`'s `_workflow_card_named`.** A shared helper would stop the two branches merging independently. This is a dev follow-up once both land, as `codex_review.md` already records.
- **Exact-title-only lookup, with no fallback.** Kept as recorded.
- **File size.** `navigates_galaxy.py` was 3379 lines before this branch, which adds a net 26. The 1k-line rule doesn't apply.
- **`workflow_editor_search_for_workflow` is still public** even though its only caller is now inside the module. It is existing API, and other code may call it.
- **`add_steps` keeps its `UX_RENDER` sleep.** Copied steps have no single label to wait on, as polish recorded.
- **Checked, no problem: retry around a full `_wait_on`.** `wait_on` raises `TimeoutAssertionError`, which isn't treated as a transition. So a missing card fails after one DATABASE_OPERATION wait, not after re-waiting on each of the 10 retries.

## Tests after the change

Final code, run one at a time against Galaxy on 8081 and Vite on 5181, with a scratch context that had no login credentials:

| Test | Backend | Result |
|---|---|---|
| `test_editor_embed_two_workflows` | Playwright | PASS (13s) |
| `test_editor_embed_workflow` | Playwright | PASS (15s) |
| `test_editor_insert_steps` | Playwright | PASS (41s) |
| `test_editor_embed_two_workflows` | Selenium | PASS (29s) |

## Other checks

- `pre-commit run -c .pre-commit-config.yaml.sample` on `navigates_galaxy.py`: all passed.
- `cd lib && mypy galaxy/selenium/navigates_galaxy.py`: no errors in that file. The only errors are the 7 existing ones in `galaxy/util`.
- `git merge-tree --write-tree` against `workflow_editor_run_cancel` and `workflow_open_exact_title`: both clean.
- I stopped everything I started by PID. No Galaxy, celery or Vite processes under this worktree were left running, and none from earlier sessions were still alive. I deleted the temp configs. Worktree clean.
