# Implementation debrief

Status: READY. Head `39bc700e527` on `jmchilton:ts_readme_render_fix_26.1`, base `release_26.1`.

- `3c56ef0d1b1` — the fix, byte-identical to the deployed 26.1 patch (John's commit rebased cleanly). `readme_util.py` kept frozen throughout; every reviewer suggestion touching it is a follow-up, not applied.
- `be8cd767344` — tests: placeholder substitution, tables/code/images survive sanitizing (from normal review).
- `c3bb87e8cab` — test through `readmes()` for latest and old revisions; covers the manifest branch and gives a behavioral red (from test challenge).
- `39bc700e527` — test helper cleanup (from thermo-nuclear review).

Tests: `test_readme_util.py` 8 passed; `test/unit/tool_shed/` 93 passed, 12 skipped. No UI changes, so no screenshots.

Scope: unchanged ([scope evaluation](scope_evaluation.md)). Follow-ups for a later `dev` PR: run `set_image_paths` on old-revision READMEs too (shared post-processing in `build_readme_files_dict`), drop dead Galaxy-side branch/`tool_path`, drop no-op `unicodify`.

Decisions for John:
- Sibling branches `ts_readme_render_fix` (25.0) and `ts_readme_render_fix_dev` stay local. Dev sibling is redundant once 26.1 merges forward; 25.1/26.0 coverage is John's call.
- 26.1→dev forward merge has one conflict hunk in `readme_util.py` (dev's typed signature); keep both and confirm the old-revision branch still calls `render_readme`.
