Run via claude-opus-5-5 at default effort.

The "Pass user to tool icon lookup" fix (`2a6cefa3879`, a dev bug: logged-in users got 401 for icons of `require_login` tools) moved ahead of the feature, right after the round-2 icon fix. Nothing else moved. The final tree is identical to the old HEAD `5ac56b5994a`.

## New history (oldest first)

| SHA | Commit | Kind |
|---|---|---|
| `a585a1a6563` | Baseline tests for tool help image sources | baseline (unchanged) |
| `1bfb47160cb` | Fix tool icon revalidation by If-None-Match | icon fix (unchanged) |
| `94713ccb5b9` | Extract conditional-GET file response helper into webapps.base.api | refactor (unchanged) |
| `96c019d9a9e` | Extract tool asset lookup from shed_tool_static | refactor (unchanged) |
| `532dc070873` | Tool icon: resolve within tool dir via find_tool_file, 404 when outside | icon fix (unchanged) |
| `5879cabce8a` | Pass user to tool icon lookup | **icon fix, moved here** |
| `f7436e73ddd` … `9b05bb000a6` | the 17 feature commits from "Add API endpoint…" to "Trim help image unit cases…" | feature (replayed, messages unchanged) |
| `973ac8d36e5` | Add tool icon request helper; read optional headers with get | feature (also converts the moved test to the helper) |
| `843380892b2` … `b1eb8330a50` | "Check an SVG help image…" to "Gate shed help image rewrite…" | feature (replayed) |
| `8fc208cd9f7`, `d8e0303cef9`, `349c6fd7abc` | `$PATH_TO_IMAGES` strip, require_login help image test, screenshots | feature (trees identical to originals) |

## The moved fix (`5879cabce8a`)

- **Change:** `get_tool_icon_path` passes `user=trans.user` to `_get_tool`, so `require_login` tools resolve for logged-in users. The commit message also covers admins and Data Manager icons.
- **Comes with:** fixture `help_images/help_images_require_login.xml`, its line in `sample_tool_conf.xml`, and API test `test_tool_icon_require_login` (200 logged in, 401 anon).
- **Test form at this slot:** `_get_tool_icon` does not exist until `973ac8d36e5`. So the test calls `self._get("tools/help_images_require_login/icon", anon=...)` directly. The replay of `973ac8d36e5` converts it to the helper and adds `anon=False` to `_get_tool_icon`. From there on, the delta against the old commits is exactly the original `2a6cefa3879` patch.
- **To split it out:** stack baseline → `1bfb47160cb` → `94713ccb5b9` → `96c019d9a9e` → `532dc070873` → `5879cabce8a`. The two refactors are needed because `find_tool_file` and the service code it touches come from them.

## What stayed in the feature, and why

- **`d28ee5a5703` (require_login help image test):** tests the feature's `help_image` endpoint.
- **`8e0c044d2a7` (`$PATH_TO_IMAGES/` strip), `5ac56b5994a` (screenshots):** feature only.
- **`71428562dff`, `dfbe6ab4519`:** judged feature-bound last round (shed rewrite gate, header mapping for the help image CSP). Nothing new changes that.
- Round-2 reasoning on `If-None-Match: *` and 304 header resend still applies (see `earlier_drafts/2/baseline_refactor.md`).

## Verification

- **Tree equality:** `git diff 5ac56b5994a HEAD` is empty. The last three commits match their originals' trees exactly. Backup branch is `tool_help_relative_images_r3_backup` at `5ac56b5994a`, pushed to `jmchilton`.
- **Per-commit delta:** each of the 17 replayed commits before the helper commit differs from its original only by the moved delta in raw-`_get` form. Each of the 5 from the helper commit to `b1eb8330a50` differs only by the original `2a6cefa3879` patch.
- **Red to green at `5879cabce8a`:** with the service line reverted, `test_tool_icon_require_login` failed with 401 ("Access denied, please login…"). With it restored, `-k test_tool_icon` passed 5 of 5.
- **Every rewritten commit (26):** `test_help_images.py` and `test_shed_util_common.py` pass (12–18 tests). `ruff check` is clean on `test_tools.py` and `services/tools.py`. `test_tools.py` collects (204–207 tests). Black passes at `5879cabce8a`.
- **Not re-run:** client vitest and E2E. Those files are byte-identical replays.
- **Pushed:** `jmchilton/tool_help_relative_images` is now `349c6fd7abc` (force-with-lease from `5ac56b5994a`).
