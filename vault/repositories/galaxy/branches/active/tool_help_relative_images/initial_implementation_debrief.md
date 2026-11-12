# Initial implementation debrief

```
created .../differential-review/snapshots/20261112T160058Z-implementation-c9248bd7f61e.json
  implementation @ c9248bd7f61e vs origin/dev (merge-base 9489852b1f64)
  first snapshot: 5 commits, 22 files, 28 hunks
```

Images shipped with a tool and referenced by relative paths in its help now display for Markdown help and for tools not installed from the Tool Shed. The same paths (`static/images/foo.png`, or a bare `foo.png` looked up in `static/images/` first as the shed does) work in both formats for every tool.

## Commits

1. `Baseline tests for tool help image sources`: vitest pins current img src handling (gxstatic rewritten; relative and shed-routed srcs untouched).
2. `Extract tool help image lookup from shed_tool_static`: `lib/galaxy/tools/help_images.py` `find_tool_asset` (shared lookup) + `help_image_media_type`; `shed_tool_static` now uses it.
3. `Add API endpoint serving images shipped with a tool's help`: `GET /api/tools/{tool_id:path}/help_image?path=&tool_version=`, modelled on the icon endpoint; resolves against `tool_dir` and a shed tool's repository root; raster images only (SVG refused). Test tools in `test/functional/tools/help_images/`, API tests, schema regen.
4. `Show tool help images referenced by relative paths`: `useFormattedToolHelp` rewrites relative img srcs to the endpoint when given a tool; `ToolHelp`/`ToolHelpMarkdown`/`ToolHelpRst`/`ToolCard`/`ToolsListCard` pass the tool through. XSD help docs.
5. `Address review: ...`: symlinked tool dir fix, `_get_materialized_tool` reuse, `?`/`#` stripping, reactive `ToolHelpRst`, RST `/build` API test.

## Decisions

- Client-side rewrite, not server-side: Markdown renders client-side, and one DOM pass covers both formats without parse-time URL building. Shed RST keeps its server-side `set_image_paths` route.
- Plain relative paths (render on GitHub/editors), not a `gxtool://` scheme.
- `{tool_id:path}/help_image` with a fixed suffix (like `/icon`) and `path`/`tool_version` as query params.
- SVG refused: same-origin SVG opened directly could run script.

## Tests

- Unit: `test/unit/app/tools/test_help_images.py` (13), red first.
- API: `test_tool_help_image`, `test_tool_help_image_not_found`, `test_tool_help_rst_relative_images_left_for_client` (+ existing icon/markdown help tests): pass locally.
- Client: `ToolHelpMarkdown.test.ts`, `ToolHelpRst.test.js` red first; `src/components/Tool` + `ToolsList` vitest (210) pass; `vue-tsc` clean; CI-config mypy clean on changed lines.

## Review

[subagents/normal_review_1.md](subagents/normal_review_1.md). One real bug (symlinked tool dirs) fixed.

## Open for John

- Serve SVG with `Content-Security-Policy: sandbox` instead of refusing it?
- Restrict the endpoint to paths the help actually references?
- Follow-up: route shed RST through the new endpoint and retire `set_image_paths`/`shed_tool_static` for tool help.
