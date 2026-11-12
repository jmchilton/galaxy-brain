# Component - Tool Help Rendering and Static Assets

Cover how a tool's `<help>` gets from XML to the screen, for all three formats (restructuredtext, html, markdown). Server side: `HelpContent` parsing (`ToolSource.parse_help`), `Tool.__get_help_with_images` and `set_image_paths` (shed-only RST `.. image::` rewrite), `help`/`help_format` in the tool `to_dict` and tool-form build responses. Client side: `ToolHelp.vue`, `ToolHelpRst.vue`, `ToolHelpMarkdown.vue`, `formattedToolHelp`, sanitize-html directive config, `Markdown/gxuris.ts` (`gxhelp://`, `gxstatic://`, `gxdatasetasimage://`). Static-file serving for tool resources: `shed_tool_static` / `admin_toolshed` routes, `/api/tools/{id}/icon` (`get_tool_icon_path`, `safe_contains`, `tool_dir`), and where tool_dir is None (user-defined, dynamic tools). Include existing tests and linter behavior for help images. Leave out the Markdown Visualizations galaxy blocks (already in `Component - Markdown Visualizations`).

## Why

The tool_help_relative_images branch needed a map of help rendering and tool-dir asset serving and found no note; `Component - Markdown Visualizations` covers galaxy fenced blocks, not tool help, and `Component - Tool Linters` only lists the help linter module.

## Requested by

- vault/repositories/galaxy/branches/active/tool_help_relative_images/index.md: tool-dir help images for Markdown help and non-shed tools
