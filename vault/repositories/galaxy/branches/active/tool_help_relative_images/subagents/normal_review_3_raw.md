Run via Opus at low effort.

# Normal review 3: e8277e0cf0c + 616d14a1cf1

## Verdict

Both commits fine to keep as-is. No real bugs found. A few optional nits below; none block.

## What was checked

- `e8277e0cf0c`: `get_tool_icon_path` now passes `user=trans.user`, matching every other `_get_tool` caller in `services/tools.py` / `api/tools.py` (lines 594, 774, 597, 1003) and the sibling `get_tool_help_image` (`_get_materialized_tool(..., user=trans.user)`). It was the only caller that dropped the user. API test is red before (user=None -> `allow_user_access` False -> 401) and green after.
  - Side effects, all improvements: admins now get Data Manager tool icons (before: 401 for everyone because `is_admin_user(None)` is False); owners now get icons of their unprivileged tools; an id missing from the toolbox now also tries the user's tool lookup (YAML tools have no `tool_dir`, so still 404). Could mention the Data Manager change in the commit message.
- `616d14a1cf1`: survey of local tools-iuc (Jul 2026) + tools-devteam + tools-iwc-lab:
  - every `$PATH_TO_IMAGES` use is `.. image:: $PATH_TO_IMAGES/<file>` (91 unindented, 6 indented); zero `figure`, zero `.. |x| image::`, zero `${PATH_TO_IMAGES}`, zero no-trailing-slash, zero double space after `::`. `PATH_TO_IMAGES_TARGET` matches all 97.
  - 96/97 images resolve from the tool dir or its `static/images/` (so `find_help_image` finds them for checkout-loaded tools); the one miss (`tools/hicexplorer/hicFindTADs.xml` -> `hicFindTADs_TAD_calling_comparison.png`) does not exist anywhere in tools-iuc, an upstream bug.
  - Branch order in `Tool.__get_help_with_images` is right: shed tools with a repository still take `make_image_paths_relative` (has_local_image_paths matches `$PATH_TO_IMAGES/...` targets), so the new branch is only hit by non-shed tools or shed tools whose repository lookup returned None (reasonable degradation). `tool_shed_repository` short-circuits on `self.tool_shed` falsy, so no DB cost for non-shed tools.
  - Leaving `${static_path}` and leading `/` alone matches `AbstractTool.render_help`, which substitutes `${static_path}` -> `/static` for non-shed tools.
  - Unanchored regex also strips `.. image:: $PATH_TO_IMAGES/` appearing mid-line; harmless.
  - Unit test passes (`test/unit/tool_shed/test_shed_util_common.py`, 4 passed). API test red before (PATH_TO_IMAGES literal, count 1) / green after. Selenium count 2->3: before the fix the third img would exist but 404 (`naturalWidth` 0), so the load assertion is the real red.
- Imports at module top: yes. Comment and docstring are one line each.

## Nits (optional)

1. `lib/galaxy_test/api/test_tools.py` `test_tool_icon_require_login`: also assert the gate still applies, e.g. `self._assert_status_code_is(self._get("tools/icon_require_login/icon", anon=True), 401)` (or add an `anon` param to `_get_tool_icon`). Without it the test passes even if the access check were dropped. Strengthening only.
2. `lib/galaxy/tool_util/xsd/galaxy.xsd` ~1054: the new sentence follows "Before Galaxy 27.0, relative image paths only work in RST help of tools installed from the Tool Shed.", so it reads like part of that version caveat. Move it before the "Before Galaxy 27.0" sentence.
3. Placement of `strip_path_to_images`: `shed_util_common.py` is defensible because it sits next to `_strip_legacy_image_prefixes` and the other RST image-target regexes that `tools/__init__.py` already imports from there. The alternative home, the branch's new `lib/galaxy/tools/help_images.py`, holds file lookup, not RST text rewriting. Keep it where it is.

## Considered, no action

- RST substitution definitions (`.. |x| image:: $PATH_TO_IMAGES/x.png`) and figure `:target:` options aren't rewritten. The shed path (`LOCAL_IMAGE_OR_FIGURE_DIRECTIVE`) doesn't handle them either, and no tool in the surveyed repos uses them.
- Reusing `_strip_legacy_image_prefixes` / `make_image_paths_relative` for the non-shed branch: no, they also strip `${static_path}` and leading `/`, which mean Galaxy `/static` for non-shed tools. A separate narrow regex is the right call.
- Switching `get_tool_icon_path` to `_get_materialized_tool`: no, it would materialize tools without an icon; the current code only materializes when `tool.icon` is set.
