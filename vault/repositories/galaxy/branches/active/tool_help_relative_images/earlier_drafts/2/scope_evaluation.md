Run via claude-opus-5-5 at default effort.

**Recommendation: expand (modestly). The branch parks for John's decision.** Keep everything as implemented, including the re-scope (installed Tool Shed RST goes through `help_image`, SVG is served under a sandboxing CSP, and the icon lookup is fixed), and add two small pieces. **(X1) The legacy `$PATH_TO_IMAGES` token should work in RST help for tools that aren't from the Tool Shed.** At the moment, `Tool.__get_help_with_images` strips the token only for installed shed tools, so the same tool XML shows its images once installed from the Tool Shed but not when loaded from a checkout. Checkouts are how `planemo serve` and servers that load tools from git work, and the authors galaxy-iuc/standards#95 addresses preview their tools that way. tools-iuc (local clone, Jul 2026) has 97 `.. image:: $PATH_TO_IMAGES/…` uses across 71 files. Plain relative paths, by comparison, appear in 33 uses across 18 files. This mismatch is exactly the "non-shed tools should behave the same" gap from the original ask. The fix is a new `elif` after the shed branch that strips `$PATH_TO_IMAGES/?` from `.. image::`/`.. figure::` targets. The slash has to go too, because the client skips path-absolute srcs. The `elif` is gated on a cheap text check, so the round-2 install-DB fix keeps working. It leaves `${static_path}` and leading `/` alone for these tools, because there they legitimately mean Galaxy's own `/static` (15 files in `tools/` rely on that). That is about 5 server lines, plus one `$PATH_TO_IMAGES/help_image.png` line in the `help_images_rst.xml` fixture and a new `/build` API test asserting the token is gone from the rendered help, which is red on HEAD. The baseline test `test_build_tool_help_rst_relative_image_srcs_unchanged` stays untouched. **(X2) `get_tool_icon_path` should pass `user=trans.user` to `_get_tool`, as its new sibling `get_tool_help_image` does.** Without it, logged-in users get a 401 for icons of `require_login` tools and data manager tools, admins included. No tool shipped in Galaxy or tools-iuc combines an icon with a login requirement today, so this is a latent one-line inconsistency in a method the branch already rewrote. The fix needs one new fixture with `require_login` and an icon, plus an API test. Leave out the rest: `../` paths bounded by the repo root (0 uses in tools-iuc), changing or removing the legacy `shed_tool_static` route (nothing emits its URLs now), and the round-2 polish items and round-1 follow-ups listed below. If John prefers not to park, X1 is the item that matters for the ask; X2 can be a follow-up.

## Possible Decompositions

There are 28 commits, about 640 inserted and 170 deleted non-generated lines. That excludes the regenerated `schema.ts` and two PNG fixtures. Roughly 175/105 are server code, 74/8 client code and 390/57 tests and fixtures. `baseline_refactor.md` (round 2) ordered the history so it can be split at these points:

1. **Baseline tests** (`1aca71d5123`): vitest pinning today's img src handling, the `/build` RST API test and the `help_images_rst` fixture.
2. **Icon fixes** (`bdf5b88ded2`, `45993f2ddc1`):
   - `If-None-Match` revalidation and RFC 9110 header precedence.
   - `find_tool_file`: symlinked tool dirs, and a 404 instead of a 500 for an icon outside the tool dir.
   - API and unit tests.
   - `45993f2ddc1` needs the refactors in (3) underneath it.
3. **Refactors** (`529159530d5`, `efaff5dfb71`): `cached_file_response` moves into `webapps.base.api`, and `find_tool_asset` is extracted from `shed_tool_static`. Interleaved with (2) as 1, `bdf5b88`, `529159`, `efaff`, `45993f`.
4. **Feature** (`cfa5ae7998f` .. `d0798eda166`, 23 commits):
   - The endpoint, the client rewrite, the XSD docs, and unit, API and E2E tests.
   - Then the re-scope: shed RST goes through `help_image`, SVG gets the CSP, `.. figure::` support, the dead `set_image_paths` branch is removed, and the client skip is dropped.
   - Then hardening.
   - Reviewer note: this group still changes icon conditional GETs through `cached_file_response`. `If-None-Match: *` now returns a 304, and 304s resend the caching headers. The only tests for those changes are help-image tests.
5. **If adopted:** X2 fits naturally at the end of (2). X1 has to land after `75c28aeb4ca`, the commit that puts shed RST on `help_image`, so it goes in or after (4).

Natural groupings, landing in the order 1 → 2/3 → 4 in each case:
- One PR.
- (1+2+3) as a small icon-fix PR, which could also target a release branch, then (4) as the feature PR on `dev`.
- (1+2+3), then (4) split into "endpoint + client for non-shed tools" (up to `a96a253edc9`) and "shed RST unification + SVG" (`2570b78ddf6` onward).

## Scope 0: As implemented

All relative image paths in tool help go through `GET /api/tools/{tool_id}/help_image?path=&tool_version=`:
- for Markdown and RST, shed and non-shed tools;
- SVG is served under a sandboxing CSP and `nosniff`;
- installed shed RST is rewritten server-side to plain relative paths (`make_image_paths_relative`);
- `shed_tool_static` is kept only for old URLs.

It also includes the icon fixes (revalidation, symlink, 404 instead of 500) and the shared `cached_file_response` and `find_tool_*` helpers.

| Pros | Cons |
|---|---|
| <ul><li>One mechanism, one lookup order and one set of image types for every installed tool and both formats</li><li>Unblocks Markdown help with images, which is what standards#95 needs</li><li>Shed images gain caching headers and 304s that the old route lacked</li><li>The perf regression from the re-scope is fixed (no install-DB query for imageless help)</li><li>Codex, thermo-nuclear, test and perf rounds left no open bugs</li><li>History is ordered for splitting</li></ul> | <ul><li>Legacy `$PATH_TO_IMAGES` help (97 uses in tools-iuc) still breaks when the tool is loaded from a checkout, e.g. `planemo serve`. That is a remaining shed/non-shed difference</li><li>`get_tool_icon_path` still calls `_get_tool` without `user=`, while its sibling `get_tool_help_image` passes it</li><li>Behaviour change for shed tools: the tool dir is searched before the repo root, and `/build` consumers see raw relative srcs instead of `shed_tool_static/...`</li><li>Serving SVG needs reviewer buy-in</li></ul> |

## Scope 1 (recommended): X1 + X2

**X1.** In `Tool.__get_help_with_images`, add an `elif` for tools that have no `repository_id` and are not installed from the shed:
- when the help contains `$PATH_TO_IMAGES`, strip `$PATH_TO_IMAGES/?` from `.. image::`/`.. figure::` targets;
- leave `${static_path}` and leading `/` untouched.

**X2.** `get_tool_icon_path` passes `user=trans.user`.

| Pros | Cons |
|---|---|
| <ul><li>X1 closes the last shed/non-shed difference that real tools hit. The same XML now renders images whether it was installed or loaded from a checkout</li><li>X1 is about 5 lines. It reuses the existing directive regex style and the text-check gate, so it adds no DB or perf cost</li><li>X1 is easy to test red-to-green: one fixture line plus a new `/build` test asserting `$PATH_TO_IMAGES` is gone</li><li>X2 is one line. It is a related bug in code the branch rewrote, and it makes the two sibling service methods agree on access</li></ul> | <ul><li>Parks the branch for a decision</li><li>X1 gives non-shed RST a second, narrower rewrite: shed tools strip three legacy forms, non-shed tools strip one. That has to be documented, though the XSD need not advertise the legacy token</li><li>X2 fixes no tool that ships today, so it's hard to justify on impact</li><li>X2 needs a new fixture, because adding `require_login` to the existing one would affect the E2E</li></ul> |

<details>
<summary>Details</summary>

- **Why X1 strips the slash too.** `$PATH_TO_IMAGES/foo.png` with only the token removed becomes `/foo.png`. The client's `NOT_TOOL_RELATIVE` treats that as path-absolute and leaves it alone, so the image would still break. Stripping `$PATH_TO_IMAGES/?` gives `foo.png`, which `find_tool_asset` resolves (trying `static/images/foo.png` first), the same as for shed tools.
- **Why X1 is not `make_image_paths_relative` for every tool.** That function also strips `${static_path}` and leading `/`.
  - For non-shed tools, `render_help` substitutes `${static_path}` with Galaxy's `/static`.
  - Galaxy's own `tools/` uses that in 15 files, e.g. `${static_path}/images/maf_icons/…`, and `to_archive` depends on it.
  - `$PATH_TO_IMAGES` has no meaning outside the shed, so stripping it is safe.
- **Placement.** Put it after the shed `elif` so that shed tools keep the full rewrite. Gate it on `"$PATH_TO_IMAGES" in help_text` so it's free for other help.
- **X2 status code.** `_get_tool` raises `AuthenticationFailed` (401) when `allow_user_access(None)` fails. That covers `require_login` tools and `DataManagerTool`, which requires an admin user. User-defined tools aren't found without a user, but they have no `tool_dir`, so they have no icon to serve either way.
- **X2 header choice.** Once restricted tools' icons are served, they still go out with `ICON_HEADERS` (`public, max-age=30d, immutable`). Switching to `private` for `require_login` tools is optional. A plain one-line fix is fine for a first PR.
- **Variant 1b (X1 only):** this captures the ask-relevant part. X2 then goes out as a follow-up, or rides with the icon-fix PR if the branch is split.
- **Variant 1c (X2 only):** it doesn't address the ask, so it isn't a reason to park.

</details>

## Scope 2 (contract): Revert to the original scope

Ship `tool_help_relative_images_alt_original_scope` (`572770e4706`): the endpoint covers Markdown and non-shed RST and refuses SVG, and installed shed RST keeps `set_image_paths` → `shed_tool_static`.

| Pros | Cons |
|---|---|
| <ul><li>Smaller, and no change to how existing shed tools render</li><li>No SVG question for reviewers</li></ul> | <ul><li>Two mechanisms with different lookup orders and image types. That is the shed-specific behaviour John objected to</li><li>Loses `.. figure::` support for shed tools and the shed caching headers</li><li>Undoes a re-scope that already passed review, test and perf rounds</li></ul> |

## Scope 3 (contract): Unification without SVG

Keep shed RST on `help_image`, but refuse SVG as round 1 did.

| Pros | Cons |
|---|---|
| <ul><li>Removes the CSP header design from the review</li></ul> | <ul><li>Shed tools that display SVG help images through `shed_tool_static` today would stop showing them. That is a regression the unification was meant to avoid</li><li>The XSD would need to document an SVG exception again</li></ul> |

## Scope 4 (expand): `../` paths bounded by the repo root

For a shed tool in a repository subdir, resolve `../shared/img.png` against the tool dir, with containment checked against the repository root instead of the tool dir.

| Pros | Cons |
|---|---|
| <ul><li>Would let suites share images across sibling tool dirs</li></ul> | <ul><li>0 `.. image::`/`.. figure:: ../` uses in tools-iuc</li><li>Shared images already resolve through the repo-root fallback (`static/images/` at the repo root)</li><li>Non-shed tools have no repo root, so this would add a new shed-only difference</li><li>Widens the containment boundary on a file-serving endpoint</li></ul> |

## Scope 5 (expand): Change or remove the legacy `shed_tool_static` route

Either serve the legacy route through `cached_file_response` with `HELP_IMAGE_HEADERS` and `help_image_media_type`, so its headers and content types match `help_image`, or delete it.

| Pros | Cons |
|---|---|
| <ul><li>Header and content-type parity with `help_image`</li><li>Deleting it would remove the last shed-only image code in Galaxy (route, controller, `find_tool_asset` caller)</li></ul> | <ul><li>Nothing in Galaxy emits these URLs any more (no persisted help, and the client no longer special-cases them), so the route only answers stale external links</li><li>Thermo-nuclear round 2 declined changing a legacy route's behaviour in this branch</li><li>Deleting it in the same release that stops emitting its URLs breaks any cached links. A follow-up after a release is the safer order</li></ul> |

## Scope 6: Round-2 polish items

These are each small, and none of them is a scope change in itself:
- 404s for help images get a short `max-age`.
- `help_images.py` is renamed to e.g. `tool_files.py`, since it also serves the icon and `shed_tool_static`.
- `LOCAL_IMAGE_DIRECTIVE` and `LOCAL_IMAGE_OR_FIGURE_DIRECTIVE` are merged into one regex.
- `shed_tool_static`'s datatypes-registry content-type lookup is replaced.

| Pros | Cons |
|---|---|
| <ul><li>Each is cheap and was raised by a review</li></ul> | <ul><li>404 caching is parity with the old route, and the 1 h max-age and md5 ETag match the icon endpoint</li><li>The rename churns imports for a naming nit</li><li>Unifying the regexes changes how the Tool Shed app renders `.. figure::`. That is a different app and out of scope</li><li>The content-type change alters a legacy route (see Scope 5)</li><li>Better left to John or a reviewer to ask for</li></ul> |

## Scope 7: Round-1 follow-ups, unchanged

These are carried forward from [round 1](earlier_drafts/1/scope_evaluation.md). They still stay out:
- **Serve only paths the help references.** This couples the endpoint to both help formats, and anonymous `test_data_download` sets the precedent for broad file serving.
- **A help-image linter.** It is a separate feature for `planemo lint`. Linters do no filesystem resolution today. The SVG warning became moot once SVG was served.
- **Relative images in `Tool.to_archive`.** A legacy admin path the branch doesn't touch.
- **Markdown help images in the Tool Shed UI.** A separate app and route.
- **A shared client `api/tools/{id}/…` URL builder.** Touches unrelated components, and both thermo-nuclear rounds rejected it.

## Unresolved questions

- Take X1 (non-shed `$PATH_TO_IMAGES`) in this branch, or as a follow-up?
- X2 (icon `user=`): take it here, with the icon-fix PR if the branch is split, or as a follow-up?
- If X2 is taken, should icons for restricted tools be sent `private` instead of `public, immutable`?
- Should the XSD mention `$PATH_TO_IMAGES` at all, or keep advertising plain relative paths only?
- Remove `shed_tool_static` in a later release?
