Run via claude-opus-5-5 at default effort.

# Test challenges debrief (round 2, after re-scope)

This round adds five new commits on top of `4f474306ab0` and does **not rewrite history**. The "Baseline tests" commit `1aca71d5123` is still first, and no new pin-current-behaviour test qualified to move into it. Nothing was pushed.

Commits, oldest first:

- `5704fd45571` Drop the client skip of `shed_tool_static` image srcs, plus its test case.
- `40ab66f2234` ToolsListCard vitest: tools-list help serves relative images from the tool.
- `78add36001b` Trim unit cases the API tests already cover.
- `bae469c0e68` Add an `_get_tool_icon` API helper; read optional headers with `.get`.
- `35d5dccd725` E2E: an SVG help image renders on the tool form.

## Refactor + dropped

- **Client `SHED_TOOL_STATIC_ROUTE` skip removed** (`formattedToolHelp.js`), together with the shed case in the non-baseline `ToolHelpRst` test "points relative image sources at the tool's help images".
  - This reverses review 2's "harmless, leave it". The test was asserting a dead branch, and keeping the skip while dropping only its test would leave it untested.
  - Why it's dead: the server no longer emits `shed_tool_static/` in help. I checked that nothing persists rendered help. `CachedTool.to_dict` re-materializes, and the search index stores help only for search.
  - The baseline shed case stays. It mounts without `toolId`, so it still passes.

## Dropped (duplicates of API tests or stdlib re-tests)

In `test/unit/app/tools/test_help_images.py`:
- **`test_escaping_paths_and_directories_not_found`:** dropped the `../../outside.png` case. `test_tool_help_image`'s `../../../../test-data/im3_a.png` goes through the same `find_tool_file` containment. The absolute-path and directory cases stay, since the API can't reach them.
- **`test_tool_file_exact_path_only`:**
  - Dropped the `../../outside.png` case, which `test_tool_icon_outside_tool_dir_not_found` covers through the same function.
  - Dropped the symlinked-dir case, which `test_tool_dir_reached_through_symlink` covers on the same code path.
  - Kept the exact-path (no `static/images` fallback) and missing cases.
- **`test_help_image_media_type`:**
  - Dropped `a.svg` (the API asserts SVG 200) and `script.py` (the API asserts the non-image `.xml` 404).
  - Dropped `a.gif`, which only re-tested the `mimetypes` table.
  - Kept `a.JPG` (case) and `noextension` (`guess_type` returns None). The API misses both.

## Rewritten

- **API `_get_tool_icon(tool_id, headers=None)` helper:** `tools/{id}/icon` was called five times, three of them in pre-existing tests. They all use the helper now.
- **API header assertions:** CSP, nosniff and the 304 `ETag`/`Cache-Control`/CSP lookups now use `.get(...)`. Without it, a missing header raised `KeyError` instead of failing at the assertion. I confirmed this in red run A below.

## Added

- **`ToolsListCard.test.ts` "serves relative help images from the tool's help images":** it toggles help and asserts that the img src is `/api/tools/__FILTER_FAILED_DATASETS__/help_image?path=a.png&tool_version=1.0.0`.
  - Nothing else covered ToolsListCard passing id and version through.
  - Why vitest and not E2E: the tool-form E2E already proves that the client URL matches the server route, so this only needs the wiring.
  - It uses `mount`, which matches the sibling "renders Markdown tool help" test, despite the README's general preference for `shallowMount`.
- **E2E `test_tool_help_markdown_relative_images`:** the `help_images_markdown.xml` fixture gains `![svg image](help_image.svg)`, and the expected count goes from 3 to 4.
  - This proves that an SVG served under the `sandbox` CSP still renders as an `<img>`. It is the only test that separates this branch from the alt, which refuses SVG.
  - The only other user of this fixture is the API test, which doesn't count images.
  - Not run (per process). Red reasoning: on the alt, the SVG returns 404 and `naturalWidth` stays 0. On dev, every src is page-relative and returns 404. Either way it fails at the `loaded` assertion.

## Red/green checks

- **Run A (API):** `api/tools.py`, `services/tools.py` and `webapps/base/api.py` reset to `572770e4706` (before the re-scope). Three tests fail at their assertions:
  - `test_tool_icon_outside_tool_dir_not_found`: got 500, expected 404.
  - `test_tool_help_image`: CSP is `None`.
  - `test_tool_help_image_caching`: the 304 has `ETag` `None`.
- **Run A2 (API):** the SVG refusal lives in the alt's `help_images.py`, and run A kept HEAD's copy, so run A did not exercise the SVG case on its own. I put the alt's SVG exclusion back into HEAD's `help_image_media_type`. `test_tool_help_image` then fails at the SVG 200 assertion: it got 404, expected 200.
- **Run B (API):** dev's `api/tools.py`, run with `-k test_tool_icon`. `test_tool_icon_revalidated_by_etag` fails with "status code (200) was not expected value 304". Run A can't catch this one, because the helper fix predates `572770e4706`.
- **`test_cached_tool`:** `tools/__init__.py` and `shed_util_common.py` swapped together to `572770e4706`. `test_materialized_shed_tool_without_install_row_rewrites_help_images` fails at `"shed_tool_static" not in help_text`. This is the behaviour-level red for `make_image_paths_relative`. That function's own unit test can only ImportError on dev.
- **`test_make_image_paths_relative`** with `shed_util_common.py` from `f8cd6c9b8ce` (before figure support) fails at the `.. figure::` line.
- **ToolsListCard vitest** with dev's `ToolsListCard.vue` fails: `expected 'a.png' to be '/api/tools/…'`.
- **`test_set_image_paths_does_not_modify_http_urls`:** a pre-existing test, adapted to the removed kwargs, that passes on dev. I logged it and did not move it, since that would need a history rewrite for no new coverage.
- **`test_tool_help_image*` on dev:** they fail at the first status assertion because the route doesn't exist. That can't be avoided for a new endpoint. For the re-scope additions, runs A and A2 are the reds that discriminate.
- **`test_help_images.py`:** ImportError on dev because the module is new. Round 1's substitution analysis still applies.

## Results (HEAD `35d5dccd725`)

- Unit (`test_help_images.py`, `test_shed_util_common.py`, `test_cached_tool.py`): 111 passed.
- API (`test_tool_help_image*`, `test_tool_icon*`, `test_build_tool_help*`, `test_no_panel_index_tool_help_markdown`): 8 passed.
- Vitest (`src/components/Tool`, `src/components/ToolsList`): 211 passed.
- `vue-tsc` type-check: clean.
- black, ruff and isort on changed Python: clean.
- Prettier and eslint on changed client files: clean. The 5 pre-existing `any` warnings in `ToolsListCard.test.ts` remain.
- E2E: not run.

## Not acted on

- **No E2E for installed Tool Shed RST help.** It isn't feasible without a shed install. The server half is covered by `test_cached_tool` plus the `make_image_paths_relative` unit test, and the client half by the vitest and E2E for local RST.
- **No mocks or SimpleNamespace in the branch's unit tests.** They are pure `tmp_path` tests. The `test_cached_tool` change is an expectation update to an existing fixture-driven test.
- **`test_tool_help_image` is large.** I left it, because folding the 404s in is what made them discriminate (round 1).
