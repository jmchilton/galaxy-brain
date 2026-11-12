Run via claude-opus-5-5 at default effort.

**Recommendation: expand (modestly).** Keep everything as implemented and fold in two pieces. **(E1)** Route installed Tool Shed RST help through the new `help_image` endpoint. Galaxy's `Tool.__get_help_with_images` stops emitting `shed_tool_static/...` srcs for installed shed tools. It keeps stripping `$PATH_TO_IMAGES` and `${static_path}` for shed tools only, since non-shed `${static_path}` means Galaxy's own `/static`. The `shed_tool_static` route stays for already-issued URLs, and the Tool Shed and README branches of `set_image_paths` stay as they are. To avoid breaking shed tools that ship SVG help images today, the endpoint serves SVG under a sandboxing `Content-Security-Policy` rather than refusing it. **(E2)** Apply the symlinked-tool-dir fix to `get_tool_icon_path`: resolve the base before `safe_contains`, and raise a typed exception instead of the bare `Exception` that becomes a 500. The service and the icon endpoint are already touched, and it is the same bug class the branch fixed for help images. Every review so far parked E1 as a follow-up. That conflicts with the original ask: John disliked that the image mechanism is Tool Shed specific and wanted non-shed tools to behave the same. As implemented, the branch leaves two mechanisms. Shed RST also differs on SVG and on lookup order: the repo root wins for shed RST, while the tool dir wins for Markdown and `.. figure::`. Keep everything else out: restricting the endpoint to referenced paths, a help-image linter, `to_archive` packaging, Markdown images in the Tool Shed UI, and a shared client URL builder. The icon `If-None-Match` fix stays in the branch. Whether it also goes out as a release PR is a decomposition choice, not a scope change.

## Possible Decompositions

About 490 non-generated changed lines, excluding the regenerated `schema.ts`. Roughly 180 are server code, 85 client code and 290 tests and fixtures. `baseline_refactor.md` already ordered the history so it can be split:

1. **Baseline tests** (`1aca71d5123`): vitest pinning current img src handling, plus the `/build` RST API test and its `help_images_rst` fixture.
2. **Icon revalidation fix** (`bdf5b88ded2`): fixes `If-None-Match` on `/api/tools/{id}/icon`, applies RFC 9110 header precedence, and adds `test_tool_icon_revalidated_by_etag`.
   - It carries the `help_images_markdown.xml` fixture because that is the only test tool with an icon.
   - Cherry-picked onto bare `dev` or a release branch, it hits a context conflict, so it stacks on (1).
   - It is a behaviour fix on an existing endpoint, so it is a candidate for a release branch.
3. **Refactors** (`529159530d5`, `efaff5dfb71`): `cached_file_response` moves into `webapps.base.api`, and `find_tool_asset` is extracted from `shed_tool_static`. No behaviour change except that only regular files match.
4. **Feature** (`2cee70ca044` .. `572770e4706`): the endpoint, the client rewrite, the XSD docs, and unit, API and E2E tests.
5. If E1 and E2 are adopted, they go after (4). E2 could also ride with (2), since both touch icon code.

Natural groupings:
- one PR;
- (1+2) as a small icon PR, with (3+4) as the feature PR on `dev`;
- (1+2+3), then (4).

The order is 1, 2, 3, 4 in every case.

## Scope 0: As implemented

Relative image paths in tool help are served for every tool from a new `GET /api/tools/{tool_id}/help_image?path=&tool_version=`. The client rewrites them in the existing `useFormattedToolHelp` DOM pass, for both Markdown and RST. Shed RST `.. image::` srcs keep the server-side `shed_tool_static` route. Also included: the icon `If-None-Match` fix and the shared `cached_file_response`/`find_tool_asset` helpers.

| Pros | Cons |
|---|---|
| <ul><li>Unblocks Markdown help with images, which galaxy-iuc/standards#95 currently steers away from</li><li>Non-shed tools now get images too</li><li>Reuses icon-endpoint patterns, `_get_materialized_tool` and the LRU materialization cache</li><li>The extracted `find_tool_asset` is shared with `shed_tool_static`, and the symlink bug is fixed for both</li><li>Baseline-first history that is easy to decompose; reviews and challenges found no open bugs</li></ul> | <ul><li>Shed RST still uses `set_image_paths` → `shed_tool_static`, so there are two mechanisms, which is the shed-specific behaviour John objected to</li><li>SVG is displayed only in shed RST, and the XSD has to document that exception</li><li>Lookup order diverges: shed RST `.. image::` takes the repo root first, while Markdown and shed RST `.. figure::` (which is not rewritten server-side) take the tool dir first</li><li>`get_tool_icon_path` keeps the symlink 404 and the bare-`Exception` 500 the branch fixed for help images</li></ul> |

## Scope 1 (recommended): E1 + E2

**E1.** For installed shed tools (the `tool_shed_repository` branch), `__get_help_with_images` only strips the legacy `$PATH_TO_IMAGES` and `${static_path}` tokens. It no longer prefixes `shed_tool_static/...`. The client's `SHED_TOOL_STATIC_ROUTE` skip stays for old URLs. The endpoint's existing `_repository_dir` fallback resolves repo-root images. SVG is served with a sandboxing CSP plus `X-Content-Type-Options: nosniff`, and the XSD exception is removed. **E2.** `get_tool_icon_path` realpaths `tool_dir` before `safe_contains` and raises `ObjectNotFound` or `RequestParameterInvalidException` instead of `Exception`. It does not reuse `find_tool_asset`, because the icon has no `static/images` fallback.

| Pros | Cons |
|---|---|
| <ul><li>Delivers the ask literally: one mechanism, and the same paths, lookup order and image types for every tool and both formats</li><li>Small: one branch in `Tool.__get_help_with_images`, a CSP header path in the endpoint, a few lines in `get_tool_icon_path`, and the XSD sentence removed</li><li>Shed RST `.. image::` and `.. figure::` stop behaving differently</li><li>Shed RST images gain the new caching headers and 304s</li><li>Answers the open SVG question in a way that also helps Markdown</li><li>E2 is a related bug in touched code; reviews already identified it, and the fix is the one applied to help images</li></ul> | <ul><li>Changes rendered help for existing shed tools: if an image exists both beside the tool and at the repo root, the tool-dir copy now wins</li><li>Non-browser consumers of `/build` help (MCP, scripts) get raw relative srcs for shed RST instead of the page-relative `shed_tool_static/...` path. That path was never absolute, but it is a visible change</li><li>Needs a test with a shed-shaped tool (`tool_shed_repository` set). The API layer has no cheap shed fixture, so a unit test on the help rewrite is the likely route</li><li>Serving SVG at all needs reviewer buy-in on the CSP approach</li><li>Old `shed_tool_static` URLs need the route kept, so it can't be deleted yet</li></ul> |

<details>
<summary>Details</summary>

- **Keep the token stripping.** Don't drop `set_image_paths` from Galaxy tool parsing entirely. It also strips `$PATH_TO_IMAGES` and `${static_path}`. Without that, shed help written as `${static_path}/images/foo.png` would render through `render_help` as Galaxy's `/static/images/foo.png` and break. Keep the stripping for shed tools only. For non-shed tools, `${static_path}` legitimately points at Galaxy's static dir, and `to_archive` depends on that.
- **Leave the other `set_image_paths` branches.** The `encoded_repository_id` paths are used by the Tool Shed (`/repository/static/images/...`) and by `readme_util`. The `admin_toolshed` route in the client stays as well.
- **Path encoding.** `set_image_paths` rewrote `/` as `%2F` in `.. image::` targets. The client's `decodePath` already decodes srcs, so either form works.
- **SVG.** The branch refuses SVG because SVG opened directly would run on Galaxy's origin. A sandboxing CSP on the response (for example `default-src 'none'; style-src 'unsafe-inline'; sandbox`) neutralises the direct-open case. `<img>` rendering never runs script anyway. Galaxy has no existing helper for this; `cached_file_response` could take an optional extra-headers argument.
- **Variant 1b, not recommended:** E1 without SVG support. Simpler, but shed tools that display SVG help images today stop displaying them. That is a regression in exactly the behaviour the unification is meant to preserve.
- **Variant 1c:** E2 only. It adds the icon fix without unifying. It is strictly better than Scope 0, but it leaves the main gap with the ask open.

</details>

## Scope 2 (contract): Drop the icon fix and the shared helper

Ship only the help-image feature, and send `bdf5b88ded2` and `cached_file_response` as a separate PR.

| Pros | Cons |
|---|---|
| <ul><li>A smaller feature PR</li><li>The icon fix could target a release branch on its own</li></ul> | <ul><li>`help_image` needs the same conditional-GET logic, so it would duplicate the code or depend on the other PR anyway</li><li>The baseline refactor already isolates the fix as a commit, so a split is available without contracting scope (see Decompositions)</li><li>Runs against the process's guidance to fix related bugs in touched code</li></ul> |

## Scope 3 (contract): Serve only paths the help actually references

The endpoint parses the tool's help and serves only srcs that appear in it.

| Pros | Cons |
|---|---|
| <ul><li>A narrower surface: arbitrary raster files under `tool_dir` and the repo root are no longer fetchable</li></ul> | <ul><li>Requires parsing help on each request, or caching it, for both formats</li><li>There is precedent for the breadth: anonymous `test_data_download` serves any file under `test-data/`</li><li>Only image types are served, so there is little practical benefit</li><li>Adds coupling between the endpoint and the help formats</li></ul> |

## Scope 4 (expand): Help-image linter

A `tool_util` help linter that warns when a relative image referenced in help is missing, or when SVG is used.

| Pros | Cons |
|---|---|
| <ul><li>IUC would catch broken image paths at `planemo lint` time</li><li>Fits the existing help linter module</li></ul> | <ul><li>A new linter is a separate feature with its own tests and IUC discussion</li><li>Linters currently do no filesystem resolution of help</li><li>If E1 lands, the SVG warning is moot</li><li>Better as a follow-up once the syntax is settled</li></ul> |

## Scope 5 (expand): Package relative help images in `Tool.to_archive`

The tool download tarball would include images that help references relative to the tool dir. Today only `${static_path}` images from Galaxy's static dir are included.

| Pros | Cons |
|---|---|
| <ul><li>Exported tools would keep their help images</li></ul> | <ul><li>`to_archive` is a legacy admin path that the branch doesn't touch</li><li>It already ignores most of the tool dir</li><li>Low demand; a follow-up at most</li></ul> |

## Scope 6 (expand): Markdown help images in the Tool Shed UI

Render relative images for Markdown tool help when it is previewed in the Tool Shed.

| Pros | Cons |
|---|---|
| <ul><li>Authors would see the same result in the Tool Shed as in Galaxy</li></ul> | <ul><li>A separate app with a separate image route (`/repository/static/images/{id}`), changeset handling and frontend</li><li>Not a modest extension of this branch</li></ul> |

## Scope 7 (expand): Shared client `api/tools/{id}/…` URL builder

Add one helper for the hand-built tool API URLs: this branch's, plus `DatasetExplore`, `InteractiveToolsPanel`, `toolStore` and `Tool/services.ts`.

| Pros | Cons |
|---|---|
| <ul><li>Removes repeated hand-built URL code</li></ul> | <ul><li>Touches unrelated components</li><li>The thermo-nuclear review already rejected it as scope creep</li><li>The other call sites have no bug</li></ul> |

## Unresolved questions

- E1 SVG: serve under a sandboxing CSP (recommended), or accept the shed SVG regression?
- E1: is the tool-dir-first lookup acceptable for shed RST, or should shed tools keep repo-root-first?
- Should the icon fix (with E2) also go out as a release-branch PR?
- Should the `/build` and MCP consumers seeing raw relative srcs be noted in the PR body, or should help get a server-side rewrite for API consumers?
