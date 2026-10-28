# Thermo-nuclear review (82a993c494a...HEAD, re-harden)

Acted on: `rollback_tools_on_error` had the unload loop twice (`except` and `else: if discard`). Error now sets `discard` and one `finally` unloads (dadc555490f, pushed). No other structural regressions.

Not acted on:
- Wrapper + `_build/_update_workflow_from_raw_description` split repeats the signature. Indenting the long bodies under `with` is a bigger churn; a decorator would hide `discard=dry_run`. Kept.
- `session.info` key as the scope registry: a side channel, but simpler than threading a flag (removed last round) or SQLAlchemy event hooks.
- `copy_workflow_for_user` scope covers only the copy loop; the caller commits the flushed copies with the workflow. Fine: the caller's commit is the single commit point.
- `unload_dynamic_tool` restores default via `max(version_object)`, not `_newer_tool`; equivalent here.
- No file crosses 1k lines due to this diff.

<details>

Checks: black/ruff/isort/mypy clean on tools.py; test_toolbox.py 51 passed; API `-k "rolls_back or embedded or user_defined or shared"` 36 passed.

</details>
