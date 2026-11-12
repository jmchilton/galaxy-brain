Run via claude-opus-5-5 at default effort.

Three commits now sit between "Baseline tests" and the feature:
1. Fix the tool icon's If-None-Match revalidation, with its test.
2. Extract the icon's conditional-GET handling into `cached_file_response` in `galaxy.webapps.base.api`.
3. Extract `find_tool_asset` from `shed_tool_static` into `galaxy.tools.help_images`.

The feature commits are replayed on top. The final tree is identical to the old HEAD `f1203715d3a`.

## New history (oldest first)

| SHA | Commit | Kind |
|---|---|---|
| `1aca71d5123` | Baseline tests for tool help image sources | baseline (unchanged, same SHA) |
| `bdf5b88ded2` | Fix tool icon revalidation by If-None-Match | behaviour fix (own PR candidate) |
| `529159530d5` | Extract conditional-GET file response helper into webapps.base.api | refactor |
| `efaff5dfb71` | Extract tool asset lookup from shed_tool_static | refactor |
| `2cee70ca044` | Add API endpoint serving images shipped with a tool's help | feature |
| `3233b119331` | Show tool help images referenced by relative paths | feature |
| `02abd61fa27` | Address review: symlinked tool dirs, query strings | feature |
| `39dcb35e6b4` | Fold help image 404 checks into the positive test, add request helper | feature |
| `7c183ef0511` | Extract help image base dir fallback, test it and trim duplicate unit tests | feature |
| `0afb84f99bf` | Add E2E tests that tool form help images load | feature |
| `326977ddc37` | Accept PathLike tool dirs in help image lookup | feature |
| `0c1528bc66a` | Serve tool help images with caching headers and 304s | feature (squash of `a919776`, `87f8dbe`, `ad4ea9d`) |
| `1623d90e3e0` | Pass tool to useFormattedToolHelp as an option; require ToolHelp toolId | feature |
| `572770e4706` | Clarify tool help image docs | feature |

## Refactor / pre-feature commits

- **Icon fix (`bdf5b88ded2`)**
  - Fixes the existing icon code in `api/tools.py` in place:
    - The quoted ETag was compared to the client's stripped value, so a matching If-None-Match never got a 304.
    - If-Modified-Since is now ignored when If-None-Match is sent (RFC 9110).
  - Adds `test_tool_icon_revalidated_by_etag`.
  - This is a behaviour change on an existing endpoint, kept separate so it can go out as its own PR.
  - The fixture comes with it: `help_images_markdown.xml` (final content, including `<icon>`), `beside_tool.png` and its `sample_tool_conf.xml` line. It's the only test tool with an icon, and the tree-equality constraint rules out a separately named fixture. So the fix PR ships a tool named for help images, which looks odd but blocks nothing.
  - The icon test doesn't check precedence. The help-image caching test covers that later.
  - **To split it out:** stack it on the baseline PR. Its `sample_tool_conf.xml` and `test_tools.py` hunks use lines from the baseline commit as context, so cherry-picking it onto bare dev hits a small context conflict.
  - **Red not re-run:** the test wasn't run red in this rewrite. That it fails on the old code comes from the original `9c51e25` commit message.
- **`cached_file_response` (`529159530d5`)**
  - Moves the fixed handling into `galaxy.webapps.base.api.cached_file_response(request, path, media_type, cache_control)` and adds `ICON_CACHE_CONTROL`.
  - Last-Modified now uses `email.utils.formatdate`: same format, but locale-independent.
  - No other behaviour change. Because the fix lands first, the shared helper never contains the buggy comparison.
- **`find_tool_asset` (`efaff5dfb71`)**
  - Original `79d713b`, minus the feature-only pieces: `help_image_media_type`, `UNSERVED_IMAGE_TYPES` and their unit test moved into the endpoint commit, their only consumer.
  - Keeps `base_dir: str` and the `abspath` in `shed_tool_static`. The `realpath` and PathLike changes stay where they first landed (`02abd61fa27`, `326977ddc37`), so this commit doesn't change `shed_tool_static` for symlinked repo dirs.
  - One small behaviour change: only regular files match. A directory now gets the controller's existing 400 instead of failing on `open()`. Unsafe and missing paths still get 400, as before.

## Feature replay

- `e4901ad` was replayed as `2cee70ca044`:
  - It adds back `help_image_media_type` and its tests.
  - The fixture conflict was resolved to the version that has the icon.
- `9c51e25` (icon test) was dropped because `bdf5b88ded2` absorbs it.
- `a919776`, `87f8dbe` and `ad4ea9d` became one caching commit with a rewritten message. Their extraction and icon-fix parts now live in the earlier commits, and squashing avoids an intermediate state where help images are served `public, immutable`.
- The other commits cherry-picked cleanly with their original messages.

## Verification

- **Tree equality:** `git diff f1203715d3a HEAD` is empty.
- **Per-commit tree check:**
  - From `0c1528bc66a` on, each tree is identical to its original counterpart.
  - Each replayed commit from `2cee70ca044` to `326977ddc37` differs from its original only by the refactor delta: the helper in `base/api.py`, the icon code in `api/tools.py`, the icon test, and the fixture's `<icon>` line.
- **Every new commit:**
  - `ruff check` on changed `.py` files passes.
  - The `api/tools`, `shed_tool_static` and `services/tools` modules import.
  - `test/unit/app/tools/test_help_images.py` passes wherever it exists: 5 tests at `efaff5dfb71`, then 10–13 through the feature.
- **API (one run at `efaff5dfb71`):** `lib/galaxy_test/api/test_tools.py -k test_tool_icon` passed 3 of 3, including `test_tool_icon_revalidated_by_etag`.
- **Not re-run:**
  - The client vitest and E2E: the client commits are byte-identical replays.
  - The help-image API tests: the trees match the originals from the caching commit onward.
