# Alt: original scope

Branch `tool_help_relative_images_alt_original_scope` at `572770e4706` (pushed to `jmchilton`): the branch as implemented and hardened before the re-scope.

Relative tool help images work for Markdown help and non-shed tools via `/api/tools/{tool_id}/help_image`, which refuses SVG. Tool Shed RST help keeps the old server-side `set_image_paths` -> `shed_tool_static` route.

How the parent differs: installed shed tools' RST help also goes through `help_image` (one mechanism), SVG is served with a sandboxing CSP, and `get_tool_icon_path` gets the symlink/typed-exception fix. See [scope_evaluation](../earlier_drafts/1/scope_evaluation.md) and [rescope debrief](../implementation_rescope_debrief.md).
