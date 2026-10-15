# Implementation debrief

Status: READY. Head `95c83c5d1e5` on `jmchilton:ts_readme_render_fix_26.1`, base `release_26.1` (branched at `32b8f0a3e83`, the newest 26.1 commit already in `dev`).

- `129b96a7ae8` — the fix, byte-identical to the deployed 26.1 patch (John's commit rebased cleanly). `readme_util.py` kept frozen throughout; every reviewer suggestion touching it is a follow-up, not applied.
- `ca3fc36467c` — tests: placeholder substitution, tables/code/images survive sanitizing (from normal review).
- `2abe25a16d3` — test through `readmes()` for latest and old revisions; covers the manifest branch and gives a behavioral red (from test challenge).
- `95c83c5d1e5` — test helper cleanup (from thermo-nuclear review).

Tests: `test_readme_util.py` 8 passed; `test/unit/tool_shed/` 93 passed, 12 skipped. No UI changes, so no screenshots.

Scope: unchanged ([scope evaluation](scope_evaluation.md)). Follow-ups, now done on `dev` in [`ts_readme_render_followups`](../../active/ts_readme_render_followups/index.md): run `set_image_paths` on old-revision READMEs too (shared post-processing in `build_readme_files_dict`), drop dead Galaxy-side branch/`tool_path`, drop no-op `unicodify`.

Decisions for John:
- Sibling branches `ts_readme_render_fix` (25.0) and `ts_readme_render_fix_dev` stay local. Dev sibling is redundant once 26.1 merges forward; 25.1/26.0 coverage is John's call.
- Merge into `dev` via `ts_readme_render_followups` (resolves the one `readme_util.py` conflict with dev's typed signature), so the later 26.1→dev forward merge is clean.
