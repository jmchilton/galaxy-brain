Run via claude-opus-5-5 at default effort.

# Normal review 1

Verdict: design sound, one real bug (symlinked tool dirs) — fixed. Also acted on: reuse `_get_materialized_tool`; strip `?query`/`#fragment` from relative srcs; `ToolHelpRst` reactive props (content too); API test pinning that server RST output leaves relative srcs for the client (exercises the `help_images_rst` fixture); XSD wording now notes shed RST still shows SVG.

Not acted on:

- Restrict endpoint to paths referenced in help: breadth matches `test_data_download` precedent; dynamic/unprivileged tools have no `tool_dir`. Left for John.
- Route shed RST through the new endpoint and drop `set_image_paths`/`shed_tool_static` for tool help: good follow-up, out of scope.
- Serve SVG with `Content-Security-Policy: sandbox`: open question for John.
- Shed `_repository_dir` fallback test: needs a shed install fixture; no cheap API test.
- `get_tool_icon_path` symlink flaw + bare `Exception` (500): pre-existing, out of scope.
- `Cache-Control` on images, skip rewrite for user-defined tools (`toolUuid`), datatypes-registry vs `mimetypes`: nits, skipped.
- `"../help_features_markdown.xml"` case rejected by media type, not containment: kept; `../../../../test-data/im3_a.png` covers traversal.

<details>
<summary>Full review</summary>

**Verdict:** design is sound and scoped right; one real bug to fix before READY (symlinked tool dirs → images 404). No security vulnerability found. Unit tests (12) and vitest (7) pass; API tests not run.

## Real bugs

1. **Help images 404 whenever the tool dir path contains a symlink** — `help_images.py` `find_tool_asset`, called from `services/tools.py`. `safe_contains(base_dir, candidate)` realpaths the candidate but compares to the unresolved `base_dir`, so relpath starts with `..`. Verified with a scratch script. Affects deploys where the server dir, `shed_tools`, or `tool_path` is under a symlink (release-dir layouts, symlinked volumes, macOS `/tmp`, `/var`). Fix: `base_dir = os.path.realpath(base_dir)` at top of `find_tool_asset`; realpath in the service dedupe; add a symlinked-tool-dir unit test. Inherited from old `_asset_exists_and_is_safe`; `get_tool_icon_path` has the same pattern and raises bare `Exception` (500) — out of scope.

## Suggested improvements

- Reuse: `get_tool_help_image` hand-rolls `_get_tool` + `materialize_tool`; `_get_materialized_tool` already exists.
- Endpoint breadth: serves any raster image at any depth under `tool_dir`/shed repo root, referenced or not. Siblings: icon serves one declared file; anonymous `test_data_download` walks `tool_dir` and serves any file under any `test-data/`, so precedent exists. Dynamic/unprivileged tools have `tool_dir=None` → 404. Optional tightening: only serve paths that appear as img srcs in the tool's help.
- Altitude: client-side DOM rewrite is defensible (markdown rendered client-side). But now two mechanisms: shed RST still rewritten server-side to `shed_tool_static/...`. A follow-up could drop `set_image_paths` for installed tools and use one route. Non-client API consumers (`/build` help, MCP) still get raw relative srcs — note in PR body.
- SVG inconsistency: shed RST still serves SVG via `shed_tool_static`; XSD text inaccurate. Document exception or serve SVG with CSP sandbox.
- Test strength: `help_images_rst` fixture unused server-side; add an API test asserting `/build` help contains unrewritten `src="help_image.png"`. Shed `_repository_dir` fallback untested.
- Client edge: `foo.png?raw=true` / `foo.png#x` sent whole as `path` → 404. Strip `?…`/`#…`.

## Nits

- `"../help_features_markdown.xml"` rejected by media type before containment; doesn't test traversal (`../../../../test-data/im3_a.png` does).
- `ToolHelpRst.vue` captures props non-reactively; make consistent with `ToolHelpMarkdown` computed.
- `shed_tool_static` uses `datatypes_registry` for mimetype; new endpoint uses `mimetypes`.
- User-defined tools: ToolCard fires always-404 help_image requests; could skip when `toolUuid` set.
- No `Cache-Control` on `FileResponse` unlike icon endpoint.
- Verified fine: Starlette `{tool_id:path}/help_image` routing, %2F-encoded guids; client detection skips `data:`, scheme URLs, `//host`, `/…`, `${static_path}`-rendered paths, shed prefixes; imports top-level; baseline commit first.

</details>
