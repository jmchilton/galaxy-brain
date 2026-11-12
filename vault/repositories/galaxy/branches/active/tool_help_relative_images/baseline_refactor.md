Run via claude-opus-5-5 at default effort.

The icon lookup fix (`find_tool_file`, plus 404 instead of 500 when the icon is outside the tool dir) now comes before the feature, as its own commit with its tests. That commit also takes the "icon 404 in service" half of `9b19244b684`. Nothing else moved. The final tree is identical to the old HEAD `93e1e98d81f`.

## New history (oldest first)

| SHA | Commit | Kind |
|---|---|---|
| `1aca71d5123` | Baseline tests for tool help image sources | baseline (unchanged) |
| `bdf5b88ded2` | Fix tool icon revalidation by If-None-Match | icon fix, round 1 (unchanged) |
| `529159530d5` | Extract conditional-GET file response helper into webapps.base.api | refactor, round 1 (unchanged) |
| `efaff5dfb71` | Extract tool asset lookup from shed_tool_static | refactor, round 1 (unchanged) |
| `45993f2ddc1` | Tool icon: resolve within tool dir via find_tool_file, 404 when outside | **icon fix, moved here** |
| `cfa5ae7998f` … `a96a253edc9` | the 10 feature commits from "Add API endpoint…" to "Clarify tool help image docs" | feature (replayed, messages unchanged) |
| `2570b78ddf6` | Build find_tool_asset on find_tool_file | feature (what is left of `e6220417d31`) |
| `75c28aeb4ca` … `8a65fd7f225` | the 10 commits from "Serve installed Tool Shed tools' RST help images…" to "Address Codex round 2…" | feature (replayed, messages unchanged) |
| `a63d26c390f` | Pass full header set to cached_file_response | feature (`9b19244b684` minus the icon-404 half) |
| `d0798eda166` | Gate shed help image rewrite on make_image_paths_relative's own regex | feature (unchanged message) |

## The moved icon fix (`45993f2ddc1`)

- **What it fixes:** dev's `get_tool_icon_path` compared the tool dir as given with a symlink-resolved candidate, so icons failed for symlinked tool dirs. An icon path outside the tool dir raised a bare `Exception`, which gave a 500.
- **What it adds:**
  - `find_tool_file(base_dir, file_path)` in `galaxy.tools.help_images`, which does `realpath` on the base, then a `safe_contains` check and an `isfile` check.
  - `get_tool_icon_path` now uses it and raises `ObjectNotFound` itself. The None check in the API handler is removed.
- **Tests that come with it:**
  - API test `test_tool_icon_outside_tool_dir_not_found`, with fixture `help_images/icon_outside_tool_dir.xml` and its line in `sample_tool_conf.xml`.
  - Unit test `test_tool_file_exact_path_only`.
  - That unit test is adapted to `efaff`'s simpler `tool_dir` fixture (`../outside.png`). From `725d8f73f7d` on, where the `outside_png` fixture exists, it is back in its final form.
- **`find_tool_asset` is left as it was** (no `realpath`, its own containment loop). So `shed_tool_static`'s behaviour is unchanged until `02abd61fa27`, the boundary round 1 kept. Rebuilding it on `find_tool_file` stays at the original slot as `2570b78ddf6`.
- **Cost:** from `45993f2ddc1` to `2570b78ddf6` the containment logic exists twice in `help_images.py`.
- **To split it out:** stack it on the baseline commit → `bdf5b88` → `529159530d5` → `efaff`. It needs `help_images.py` from `efaff`, and the `sample_tool_conf.xml`/`test_tools.py` context from the baseline and `bdf5b88`.

## What stayed in the feature, and why

- **`If-None-Match: *` (`a2fbe32e79d`) and 304s resending caching headers (`4f474306ab0`).**
  - Both change the icon's conditional-GET behaviour through `cached_file_response`. Their only tests are help-image endpoint assertions, which can't exist before the feature.
  - Tree equality rules out adding icon tests for them, so moving them would give untested fix commits.
  - **Reviewer note:** the feature PR therefore also changes icon conditional GETs in these two ways.
- **"Header-precedence" fix.** There is no separate commit for it. The only `cached_file_response` changes after `529159530d5` are in `4f474306ab0`, `a2fbe32e79d` and `9b19244b684`. If-None-Match over If-Modified-Since precedence was already in `bdf5b88ded2` in round 1.
- **Header mapping for `cached_file_response` (`9b19244b684`).** It exists for the help image CSP/nosniff headers, so it belongs to the feature.
- **Removing `set_image_paths`' `shed_tool_static` branch (`4f474306ab0`).** It is only dead once `0fa6672d90e` removes its caller.
- **`72cfeb134af`, `93e1e98d81f`.** Feature-only.

## Verification

- **Tree equality:** `git diff 93e1e98d81f HEAD` is empty. The backup branch is `tool_help_relative_images_r2_backup` at `93e1e98d81f`.
- **Per-commit tree check:**
  - Each replayed commit from `cfa5ae7998f` to `a96a253edc9` differs from its original only by the moved delta: `find_tool_file`, the icon service and handler, the icon API test and fixture, and the unit test.
  - From `2570b78ddf6` to `8a65fd7f225`, each differs only by the icon-404 half: `services/tools.py` and the `api/tools.py` handler.
  - `a63d26c390f` and `d0798eda166` are identical to `9b19244b684` and `93e1e98d81f`.
- **Every rewritten commit (24):**
  - `test/unit/app/tools/test_help_images.py` and `test/unit/tool_shed/test_shed_util_common.py` pass (10–18 tests).
  - `ruff check` on changed files passes.
  - `api.tools`, `services.tools`, `shed_tool_static`, `help_images` and `galaxy.tools` import.
- **Black/isort** pass at `45993f2ddc1`.
- **API (one run at `45993f2ddc1`):** `-k test_tool_icon` passed 4 of 4, including `test_tool_icon_outside_tool_dir_not_found` and `test_tool_icon_revalidated_by_etag`.
- **Not re-run:**
  - The red check for the moved API test. The original `e6220417d31` was written red first (500).
  - Client vitest and E2E: those files are byte-identical replays.
