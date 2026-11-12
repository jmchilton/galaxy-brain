Run via claude-opus-5-5 at default effort.

# Normal review 2 (re-scope)

Verdict: approve with improvements; no real bugs in the three re-scope commits. Acted on (`4f474306ab0`): removed `set_image_paths`' now-dead `shed_tool_static` branch and its two tests (http-URL test moved to the remaining route); `.. figure::` handled by `make_image_paths_relative`; CSP allows `data:` images/fonts in SVGs; 304s resend `Cache-Control`/`ETag`/`Last-Modified`; tests assert exact CSP and headers on 304; `LOCAL_IMAGE_DIRECTIVE` at module top; `help_images.py` docstring.

Not acted on:

- Client `shed_tool_static/` skip and its `ToolHelpRst` cases: harmless; the skip case lives in the Baseline tests commit.
- Security headers on the legacy `shed_tool_static` controller: hardening of an existing route; out of scope.
- `..` paths resolved against tool dir but bounded by the repo root: broken before too; optional.
- `make_image_paths_relative` for all RST help (local tools): non-shed `${static_path}` means Galaxy's `/static`; judgement call for John.
- `test_cached_tool` resolving through `find_help_image`: skipped; API + unit tests cover each half.
- `find_help_image` checks the same dir twice when `tool_dir == _repository_dir`; lint for `icon_outside_tool_dir`: nits.

<details>
<summary>Full review</summary>

**Verdict: approve with improvements.** No real bugs in the three re-scope commits. Unit tests (116) pass.

**Real bugs: none.** Verified: security headers do apply to 304s (`headers.update` after `cached_file_response`); CSP doesn't disable `XFrameOptionsMiddleware`; repo-root images resolve under "detail" materialization (`_repository_dir` depends only on tool_dir/repo name/changeset); ToolCard/ToolsListCard pass full GUID + version, `encodeURIComponent` + `{tool_id:path}` matches the icon pattern; `$PATH_TO_IMAGES/x.png`, `${static_path}/images/x.png`, `/static/images/x.png` all become client-relative; `:width:` options unaffected; workflow `tooltip` not rendered as HTML client-side. Red-before-green confirmed for all three commits.

**Improvements**

1. Dead code: `set_image_paths`' `tool_shed_repository`/`tool_id`/`tool_version` branch has no caller; remove with `quote` import and two tests; client `SHED_TOOL_STATIC_ROUTE` and `ToolHelpRst` shed cases also dead; keep the route.
2. `shed_tool_static` still serves SVG without CSP/nosniff; share headers.
3. `.. figure::` and `.. |name| image::` not rewritten; `\.\. (?:image|figure):: ` cheap fix.
4. `../static/images/x.png` from a subdir tool 404s (each base bounds its own candidates); broken before.
5. Local tool with `$PATH_TO_IMAGES/x.png` stays broken while shed install works; could apply to all RST help.
6. Test strengthening: exact CSP value; headers on 304; optionally tie `test_cached_tool` output to `find_help_image`.
7. `default-src 'none'` blocks `data:` rasters/fonts inside SVG opened directly; add `img-src data:; font-src data:`.

**Nits:** `help_images.py` docstring/name no longer fits; `LOCAL_IMAGE_DIRECTIVE` mid-file; 304 omits `ETag`/`Cache-Control` (RFC 9110 says resend); duplicate dir check; `icon_outside_tool_dir` could be a lint error. No security concern needing a private report.

</details>
