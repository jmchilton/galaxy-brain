Run via Claude Opus 5.5 (claude-opus-5-5) at medium effort.

- [x] What does the user see when it fails? A broken image with its alt text: `help_image` 404s on a missing image, unknown tool, non-image file or path outside the tool dir, 401s for anonymous users of `require_login` tools.
  <details>

  - All misses raise `ObjectNotFound` from `ToolsService.get_tool_help_image` (`services/tools.py`); path escapes and symlinks out of the tool dir are rejected by `find_tool_file` (`tools/help_images.py`) and give the same 404, never a 500. API tests cover missing, `.xml`, `../` escape, unknown tool and anon `require_login` (`test_tool_help_image`, `test_tool_help_image_require_login`).
  - Absolute, scheme and fragment srcs are left untouched by the client (`NOT_TOOL_RELATIVE` in `formattedToolHelp.js`), so remote images behave as before.
  - Icon: an icon outside the tool dir now 404s instead of raising a generic 500 (`532dc070873`, `test_tool_icon_outside_tool_dir_not_found`).
  - A server-side rewrite error in `parse_help` is logged and the help renders unrewritten (existing `try/except`).
  </details>
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. `test_help_images.py` uses real files and symlinks; vitest checks rendered `img` srcs; the shed tests check RST output and that no install DB queries run.
- [x] Are baseline tests in their own leading commits (if applicable)? Yes. `a585a1a6563` is first and only adds tests and fixtures, checked against `origin/dev` (`test_challenges_debrief.md`). Tests that fail on dev come in later commits.
  <details>

  The commit adds the gxstatic/relative-src vitest cases, `test_build_tool_help_rst_relative_image_srcs_unchanged`, the `help_images_rst` fixture and `test_materializing_shed_tool_without_help_images_skips_install_database` (no_images). The debrief records `test_cached_tool.py` passing at that commit (100 passed). The `$PATH_TO_IMAGES` strip API test and the `remote_image` case fail on dev, so they are kept out of it.
  </details>
- [x] Are the comments free of excess archeology? Yes. New comments state constraints (symlink resolution, why the text check comes first, private caching, SVG CSP, repo-root fallback).
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? They explain legacy compatibility. `_strip_legacy_image_prefixes` keeps the existing "shed help used to require `$PATH_TO_IMAGES`" note, and the `galaxy.xsd` line tells tool authors that releases before 27.0 only support Tool Shed RST.
