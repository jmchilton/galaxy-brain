# Implementation debrief

Status: READY. Head `174a43bd37a` on `jmchilton:ts_readme_render_followups`, base `dev`. Depends on [`ts_readme_render_fix_26.1`](../ts_readme_render_fix_26.1/index.md) — merged in as real history (`ae4e1c4a442`), so either PR can land first and the `release_26.1` → `dev` forward merge has no `readme_util.py` conflict (checked with `git merge-tree`). Open the 26.1 PR first and mention the dependency here.

- `ec2c345a5aa` — disk (latest) and manifest (old) reads feed one `_render_repository_readme` (`size_string` → `set_image_paths` → `render_readme`), so old-revision images use the repository image route. Dead code dropped: `app.name == "galaxy"` branch, `tool_path`, stale docstring, no-op `unicodify`.
- `7b45e071d4e` — old revisions find the README via existing `hg_util.get_ctx_file_path_from_manifest` (README's last change ≤ revision); before, only files changed in that exact changeset were seen, so most old revisions showed no README. Typed that helper and `reversed_upper_bounded_changelog`.
- `9aa139b386f` — test challenge: lookup must pick the nearest earlier README change.
- `174a43bd37a` — drop unreachable try/except around `set_image_paths`.

Tests: `test_readme_util.py` 9 passed; `test/unit/tool_shed/` 107 passed, 12 skipped; mypy clean for touched files. Red-to-green for both behavior fixes. No UI changes.

Not done (follow-ups): old-revision images are served from the latest on-disk files — needs a changeset-aware image route ([scope evaluation](scope_evaluation.md) sketches it). Possibly-dead Galaxy-side `ToolShedRepository.has_readme_files` / `Folder.readme_files` left alone (grep-only evidence). Thermo reviewer's restore of `unicodify` in `render_readme` dropped: no forward-merge conflict, and John asked for it removed.
