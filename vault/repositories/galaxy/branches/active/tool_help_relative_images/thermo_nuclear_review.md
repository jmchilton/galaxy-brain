Run via claude-opus-5-5 at default effort.

# Thermo-nuclear code quality review (hardening round 2)

No structural regressions, and no file crossed 1k lines. I acted on two boundary findings (how the response headers were built, and the sibling not-found contract) and one duplication finding (the directive check), in two new commits on top of `a2fbe32e79d`. "Baseline tests" is still first, history was not rewritten, and nothing was pushed.

- `9b19244b684` Pass full header set to cached_file_response; icon 404 in service:
  - `cached_file_response(request, path, media_type, headers)` takes the complete header mapping instead of a `cache_control` string. The help image route used to patch CSP and nosniff onto the response after it was built; now it passes them in. `HELP_IMAGE_HEADERS` replaces the two `HELP_IMAGE_*` constants, and `ICON_HEADERS` folds `ICON_CACHE_MAX_AGE` and `ICON_CACHE_CONTROL` into one. The 304 path still gets every header.
  - `get_tool_icon_path` now raises `ObjectNotFound` itself and returns `str`. That gives it the same shape as its sibling `get_tool_help_image`. The route was its only caller. The message is unchanged.
- `93e1e98d81f` Gate shed help image rewrite on make_image_paths_relative's own regex:
  - `Tool.__get_help_with_images` gated on its own `".. image:: " in … or ".. figure:: " in …` check. It now calls a new `has_local_image_paths()` in `shed_util_common`, built on `LOCAL_IMAGE_OR_FIGURE_DIRECTIVE`, so the list of directives lives in one module.
  - Small behaviour change: RST help whose only images are http(s) no longer triggers the install-DB lookup.
  - Strengthened test: the skip-install-DB test is parametrized with a `remote_image` case, which was red before the change.

Tests:
- Unit: `test_help_images.py`, `test_shed_util_common.py` and `test_cached_tool.py`, 113 passed.
- API: `-k "test_tool_help_image or test_tool_icon or test_build_tool_help"`, 7 passed. This includes the CSP-on-304 assertion that covers the headers change.
- black, ruff, isort and pre-commit pass.
- mypy is clean on the changed files.
- No client changes, so vitest was not run.
- No API schema change.

## Not acted on

- **1k-line rule.** `api/tools.py` is 1114 lines on dev, so it was already over before this branch. It is now 1111. `services/tools.py` is 781 lines.
- **`help_images.py` is named more narrowly than what it holds.** `find_tool_file` also serves the icon route, and `find_tool_asset` serves `shed_tool_static`. A rename such as `tool_files.py` would be accurate, but it churns imports and the documented test path. I'm leaving it as a nit for John to decide.
- **Near-duplicate regexes `LOCAL_IMAGE_DIRECTIVE` and `LOCAL_IMAGE_OR_FIGURE_DIRECTIVE`.** They differ only by `figure`. Unifying them would make the Tool Shed app's `set_image_paths` route `.. figure::` targets, which changes how the Tool Shed renders help. That is out of this branch's scope.
- **`shed_tool_static` keeps its own content-type lookup** (the datatypes registry, not `help_image_media_type`). The route is kept only for existing links, and changing what it serves would change behaviour on a legacy route.
- **`tool._repository_dir` used from the service and the controller.** It is an `AbstractTool` property already used this way by `test_data_path` and the old controller. Adding a public alias would grow the 5k-line `tools/__init__.py` without removing anything.
- **`Tool.__get_help_with_images` Tool Shed branch still uses `help_text.find(".. image:: ")`.** That is pre-existing Tool Shed-app behaviour, and `set_image_paths` only handles `image`.
- **Client composable shape.** The `{ id?, version? }` computed in `ToolHelpMarkdown` and `ToolHelpRst` is one line in each. `ToolHelpMarkdown` legitimately has no tool for README and authoring uses. No new client finding this round.
- **Shared client `api/tools/{id}/…` URL builder.** There is no canonical helper, and the existing call sites are in unrelated components, so this would be scope creep. Same reasoning as round 1.
- **`get_tool_icon_path` uses `_get_tool` without `user=`, while `get_tool_help_image` passes `trans.user`.** Without a user, `allow_user_access(None)` fails closed. So the icon 404s for logged-in users on `require_login` tools, data manager tools and user-defined tools, where the help image works. This is a pre-existing functional gap in the icon route, not a cleanup, so it is a candidate follow-up.

<details>
<summary>Full review</summary>

**Verdict:** approve. Since round 1, the re-scope made the design simpler:
- Shed RST and non-shed help now go through one client rewrite and one endpoint.
- The `set_image_paths` branch that built `shed_tool_static` routes has been deleted.
- `shed_tool_static` reuses `find_tool_asset`.

I see no remaining code-judo move. The server-side rewrite of shed RST is the minimum the client needs, because it can't treat `$PATH_TO_IMAGES/…` or `/foo.png` as tool-relative. Client-side rewriting and the lookup order are settled.

### Boundary / abstraction

1. **Headers were patched onto the response after construction.** The help image route built the response through `cached_file_response(…, cache_control)` and then called `response.headers.update(HELP_IMAGE_SECURITY_HEADERS)`. That split one response's headers across two constants and two construction points, and the 304 only got CSP because headers are mutable. Pass the full mapping in instead. *Done* in `9b19244b684`.
2. **The sibling service methods had different not-found contracts.** `get_tool_help_image` raised `ObjectNotFound`, while `get_tool_icon_path` returned `None` and left the route to raise. The branch had already rewritten `get_tool_icon_path`'s body, so aligning them is cheap. *Done* in `9b19244b684`.

### Spaghetti / duplication

3. **The directive names were hard-coded in `Tool`.** `".. image:: " in t or ".. figure:: " in t` restated, as string checks, the knowledge that `LOCAL_IMAGE_OR_FIGURE_DIRECTIVE` already encodes in `shed_util_common`. It was also looser than the rewrite, since http-only help still paid for the install-DB lookup. Add one predicate next to the regex. *Done* in `93e1e98d81f`.

### Nits

4. The module name `help_images.py` is narrower than its contents (see Not acted on).
5. The regex pair differs only by `figure` (see Not acted on).
6. `test_tool_help_image*` repeats `tool_version="1.0.0"` about 8 times. I'm not changing it, because the tests read fine.

### Checked and fine

- Imports are at module top, and there are no new cycles.
- Comments are one line each.
- `help_images.py`: every function has a real consumer:
  - `find_tool_file` is used by the icon lookup and by `find_tool_asset`.
  - `find_tool_asset` is used by `shed_tool_static` and by `find_help_image`.
  - `find_help_image` is used by the service.
  - `help_image_media_type` is used by the service. Its pre-lookup rejection avoids materializing the tool.
- The `shed_util_common` split is clean: `_strip_legacy_image_prefixes` is shared by `set_image_paths` and `make_image_paths_relative`.
- `cached_file_response` belongs in `webapps.base.api`. It handles If-None-Match precedence and the `*` wildcard correctly.
- The XSD and endpoint descriptions match the `static/images`-first rule.
- Test helpers `_get_tool_icon` and `_get_tool_help_image` remove repetition.

</details>
