# Re-scope debrief

The first [scope evaluation](earlier_drafts/1/scope_evaluation.md) recommended a modest expansion: the branch still left Tool Shed RST help on its own Tool Shed specific image route, which is what John objected to. The original scope is kept as `tool_help_relative_images_alt_original_scope` at `572770e4706` ([alt](alts/original_scope.md)).

## What changed

- `e6220417d31` **E2, icon lookup**: `get_tool_icon_path` uses the new `find_tool_file`, so symlinked tool dirs resolve and an icon outside the tool dir gives 404 instead of a bare-`Exception` 500. Red first (API test got 500).
- `0fa6672d90e` **E1, one mechanism**: `Tool.__get_help_with_images` gives installed shed tools plain relative image paths via `make_image_paths_relative`, which strips `$PATH_TO_IMAGES`, `${static_path}` and leading `/`. The client rewrites them to `/api/tools/{id}/help_image` like every other tool. The Tool Shed app (`repository_id`) and READMEs keep `set_image_paths`, and the `shed_tool_static` route stays for existing links.
- `f8cd6c9b8ce` **SVG**: served, with `Content-Security-Policy: ... sandbox` and `nosniff` on every help image. `shed_tool_static` already served SVG with no CSP, so refusing SVG would have regressed shed tools. John can reverse this; the alt refuses SVG.
- `4f474306ab0` **review 2 follow-ups**: `.. figure::` support; removed `set_image_paths`' dead `shed_tool_static` branch; `data:` allowed in the CSP; 304s resend caching headers; stricter header tests.

## Test changes to note

- `test_cached_tool.py::test_materialized_shed_tool_without_install_row_rewrites_help_images` now expects `.. image:: merge-glyph.png` and asserts that `shed_tool_static` is absent. Before, it expected the routed `shed_tool_static/...` path. This is a behaviour change, not a weakening.
- Removed `test_set_image_paths_encodes_special_characters_in_tool_id` and `test_set_image_paths_preserves_slashes_in_route`, which tested the deleted branch. `test_set_image_paths_does_not_modify_http_urls` now uses `encoded_repository_id` and asserts the output equals the input.
- `test_tool_help_image`: the SVG case moved from the 404 list to a 200 with exact CSP assertions.

## Behaviour notes

- Lookup order: shed tools now search the tool dir before the repo root (the old route searched only the repo root). This matters only when the same image exists at both levels.
- Processed help isn't persisted (the cached toolbox re-parses on materialize), so no stale `shed_tool_static` srcs survive an upgrade.

## Review

[subagents/normal_review_2.md](subagents/normal_review_2.md): no real bugs; improvements acted on in `4f474306ab0`.

Tests: unit (114), API help image/icon/build (8) pass.
