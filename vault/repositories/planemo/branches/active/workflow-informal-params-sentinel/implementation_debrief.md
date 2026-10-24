# Implementation debrief

- Root cause confirmed: `planemo/galaxy/activity.py` invoked workflows without `replacement_params`.
- Names come from `GET /api/workflows/{id}/download?style=run&history_id=...` (same data as the UI run form). `history_id` is required — without it Galaxy 400s with "History unavailable".
- Fetch reuses `planemo/galaxy/api.py:get_dict_from_workflow` (extended with `style`, `history_id`). On fetch failure planemo warns and invokes without params (pending decision, see `codex_review.md`).
- Tests: 4 unit tests in `tests/test_galaxy_activity.py`; Galaxy-backed `tests/test_run.py::test_run_fills_undeclared_replacement_parameter` passes, fails on base (no warning).
- Pre-existing gap found: planemo workflow tests silently ignore `metadata:` (e.g. `name:`) assertions — a `name` check passed on base. Worth filing separately.
- Local gate: `tox -e lint` clean. `mypy` has 10 pre-existing errors on base, none new.
- Process note: `git stash` in a ghwt worktree raced another session's stash (shared stash stack); recovered from the dangling commit. Don't stash in planemo worktrees.
