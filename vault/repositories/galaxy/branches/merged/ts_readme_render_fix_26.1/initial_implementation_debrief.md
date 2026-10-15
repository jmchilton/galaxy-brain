# Initial implementation

Commit `129b96a7ae8` — John's existing local commit `61d23ab342a` rebased cleanly onto `origin/release_26.1` (`1bcd9691362`, 41 commits newer). Diff verified identical, hunk for hunk, to the deployed 26.1 patch.

- `lib/tool_shed/util/readme_util.py`: new `render_readme(name, text)`. `.rst` → `rst_to_html`, legacy `${static_path}`/`${host_url}` replaced literally (no Mako `Template`), then `sanitize_html`. Other files → `basic_util.to_html_string`. Used for both current and old-revision (manifest) READMEs; old-revision ones were previously returned raw.
- `test/unit/tool_shed/test_readme_util.py`: 4 unit tests (no template eval, raw-html sanitized, formatting kept, plain text escaped).

Tests: new file 4 passed; `test/unit/tool_shed/` 89 passed, 12 skipped. Red check on pre-patch `readme_util.py` fails only at import (`render_readme` missing), so it is a weak red; behavior through `build_readme_files_dict` isn't covered.
