Run via claude-opus-5-5 at default effort.

# Thermo-nuclear code quality review

No structural regressions and no file crossed 1k lines. I acted on four smaller boundary and reuse findings in three new commits on top of the branch. "Baseline tests" is still first, history was not rewritten, and nothing was pushed.

- `ad4ea9d9834` Share cached file response helper via webapps.base.api:
  - `_cached_file_response` moved out of `api/tools.py` and became `cached_file_response` in `lib/galaxy/webapps/base/api.py`, beside `GalaxyFileResponse`.
  - `Last-Modified` now comes from `email.utils.formatdate(usegmt=True)`, which is locale-independent and is what Starlette uses. Headers are passed to the constructor.
  - Dropped the redundant `os.path.abspath` in `shed_tool_static`, since `find_tool_asset` already realpaths.
  - Trimmed the `HELP_IMAGE_CACHE_CONTROL` comment so it states the constraint without the design justification.
- `c477f831a03` Pass tool to useFormattedToolHelp as an option; require ToolHelp toolId:
  - `useFormattedToolHelp(content, { tool, headingLevelIncrease = 2 })` replaces `(content, 2, tool)`.
  - `ToolHelp.toolId` is now required. Both of its callers always have an id.
  - Dropped the unreachable `admin_toolshed/` entry from the relative-path check, and named the regex.
- `f1203715d3a` Clarify tool help image docs. The XSD "such images" sentence was ambiguous.

Tests:
- Unit: `test_help_images.py`, 10 passed.
- API: `-k "test_tool_help_image or test_tool_icon or test_build_tool_help"`, 6 passed.
- vitest: `src/components/Tool` and `src/components/ToolsList`, 210 passed.
- `pnpm type-check` is clean.
- prettier, eslint, black, ruff, isort and pre-commit pass.
- mypy is clean on the changed files.
- No API schema change.

## Not acted on

- **1k-line rule.** `api/tools.py` was already 1114 lines on dev, so the branch didn't cross the threshold. After the helper move it is 1110, below dev.
- **Shared client URL builder for `api/tools/{id}/…`.** `DatasetExplore`, `InteractiveToolsPanel`, `toolStore`, `Tool/services.ts` and others all build these URLs by hand from `getAppRoot()`, and no canonical helper exists. Adding one means touching unrelated components, which is scope creep.
- **Reusing Starlette's own ETag and conditional logic.** `StaticFiles.is_not_modified` is an instance method. Starlette's ETag is based on mtime and size, which would change the icon's existing content-hash ETag. Doing it would be a behavior change, so I left it.
- **Switching to `GalaxyFileResponse`.** It would change x-accel/sendfile behavior. That is out of scope for small images.
- **`tool._repository_dir` private access.** `Tool` has no public accessor, and `shed_tool_static` and `Tool` itself already use it. This is pre-existing.
- **`get_tool_icon_path` has its own containment check and raises a bare `Exception`.** This is pre-existing, and the previous review noted it. `find_tool_asset` can't replace it, because the icon has no `static/images` fallback.
- **`mimetypes` vs the datatypes registry; SVG still served via `shed_tool_static`.** These belong to the shed RST unification follow-up, which is settled as out of scope.
- **Merging `find_tool_asset` and `find_help_image`.** `find_help_image` is thin, but it was extracted deliberately so it could be unit tested. The `None` skipping is real: non-shed tools have no `_repository_dir`, and dynamic tools have no `tool_dir`.
- **Duplicated `computed(() => ({ id, version }))` in `ToolHelpMarkdown` and `ToolHelpRst`.** It is one line in each. Threading a single `tool` object prop instead would not remove any concepts.
- **Existing `admin_toolshed` branch prefixes `getAppRoot()` onto the resolved `image.src`.** This is pre-existing dev behavior, and the baseline test pins it.

<details>
<summary>Full review</summary>

**Verdict:** approve after small fixes. The design is direct and stays in the right layers:
- A pure lookup module in `galaxy.tools.help_images`, reused by `shed_tool_static`.
- A thin service method that reuses `_get_materialized_tool`.
- A thin route.
- One DOM pass in the existing composable.

There was no obvious code-judo move left. The client-side rewrite is settled, and the server pieces are already minimal.

### Boundary / abstraction

1. **The conditional-GET helper lives in a feature API module** (`api/tools.py`, already over 1k lines). It is generic HTTP plumbing, and Galaxy already keeps its shared response helpers in `webapps/base/api.py`. Move it there. *Done.* It also formatted dates with `strftime("%a, %d %b …")`, which depends on the locale. `email.utils.formatdate(usegmt=True)` is the canonical stdlib helper, and Starlette uses it too. *Done.*
2. **Positional default in `useFormattedToolHelp(x, 2, tool)`.** Both callers pass the default `2` only to reach `tool`. Use an options bag. *Done.*
3. **Unnecessary optionality on `ToolHelp.toolId`.** Both callers (`ToolCard`, `ToolsListCard`) always pass a required id. Making the prop required states the invariant. `ToolHelpMarkdown` stays optional because `ReadmeEditor` and `AuthoringHelpPanel` use it without a tool. *Done.*

### Spaghetti / duplication

4. **Shed routes are detected twice with different semantics.** The existing branch uses `image.src.includes("admin_toolshed")` on the resolved URL. The new `SHED_IMAGE_ROUTES` list also excluded `admin_toolshed/` by raw-attribute prefix, which can never be reached once the first branch has matched. Keep one source of truth. *Done:* only `shed_tool_static/` remains, and the URL regex is named.

### Nits

5. `os.path.abspath(tool._repository_dir)` before `find_tool_asset` is redundant. *Done.*
6. The `HELP_IMAGE_CACHE_CONTROL` comment justified two design choices. It is trimmed to the access-control constraint. *Done.*
7. The XSD "such images" referent was ambiguous. *Done.*
8. A shared `toolApiUrl` client helper and the `_repository_dir` accessor are covered under "Not acted on" above.

### Checked and fine

- Imports are at module top, and the new `base/api.py` imports introduce no cycles.
- Comments are one line each.
- `help_images.py` is focused. It keeps the old `shed_tool_static` candidate order, with three differences: it uses `isfile` instead of `exists`, the base is realpath'd, and traversal returns not found instead of raising. The controller still raises `RequestParameterInvalidException` either way.
- The service rejects non-image paths before the tool lookup.
- No file crossed 1k lines. `services/tools.py` is at 790.
- The tests are focused, and the `_get_tool_help_image` helper avoids repetition.

</details>
