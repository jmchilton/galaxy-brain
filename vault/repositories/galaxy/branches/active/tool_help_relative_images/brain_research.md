```yaml
documents:
  - path: vault/plans/TOOL_FORM_POPULATE_REFACTOR.md
    why: Documents `help`/`help_format` (restructuredtext|html|markdown) in the tool build response and the workflow-editor consumer (`FormTool.vue`); any change to help content shape or URL rewriting flows through both the tool form and workflow editor.
    load_when: Deciding where server-side rewriting of help happens (parse time vs build response) and checking consumers.
  - path: vault/research/Component - Markdown Visualizations.md
    why: Only research note touching `<help format="markdown">` tools and the client markdown rendering pipeline (galaxy fenced blocks, `gxuris`-style schemes); sibling surface to ToolHelpMarkdown.
    load_when: Touching `Markdown/gxuris.ts` or the markdown sanitizer; skim, it is mostly about directive blocks.
  - path: vault/research/Component - Tool Linters.md
    why: Lists the help linter module; relevant if a lint rule for relative help images / missing image files is added or must stay consistent.
    load_when: Considering a linter check for help image paths.
  - path: vault/research/Component - Dynamic Tool Manager and Toolbox Lifecycle.md
    why: How tools are materialized/loaded; helps judge where `tool_dir` is set or None (user-defined/dynamic tools) for the endpoint's not-found path.
    load_when: Handling tools without a tool_dir in the new endpoint.
  - path: vault/research/Component - Tool Testing Infrastructure.md
    why: Test conventions for tool-related API/unit tests (test tool XML under `test/functional/tools`) for adding a test tool with a `static/images` file.
    load_when: Writing API/framework tests for the new endpoint.
  - path: vault/research/Component - API Tests Tools.md
    why: Existing API test coverage layout for `/api/tools` (icon endpoint tests live in `lib/galaxy_test/api/test_tools.py`).
    load_when: Adding API tests modelled on the icon test.
  - path: vault/projects/foundries/shed_reviews/STANDARDS_PIPELINES.md
    why: Context for galaxy-iuc/standards guidance (tool XML help, repo layout) that motivated the change; check if standards docs need an update.
    load_when: Writing PR description or considering standards/planemo follow-ups.
research_requests:
  - vault/agents/gx_research/todo/tool_help_rendering_and_static_assets.md
```
