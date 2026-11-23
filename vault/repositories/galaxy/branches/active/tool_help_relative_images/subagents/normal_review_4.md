# Normal review 4 (XSD wording)

Reviewed John's requested rewording of the XSD Images section (fixup into `5f08197faed`). The old text, "The legacy `$PATH_TO_IMAGES/` prefix on RST image targets is ignored. Before Galaxy 27.0, …", read as if the branch broke tools that use the prefix. The review found the new text accurate: the prefix is stripped from `.. image::` and `.. figure::` targets for both local and installed shed tools. No changes made.

Not acted on:

- The `repository_id` path (`set_image_paths`) only triggers on `.. image::`, not on `.. figure::`. It runs only when the Tool Shed app renders a tool, never for Galaxy-served help, and `dev` behaves the same.
- The docs don't mention `${static_path}`. Leaving it out avoids encouraging it.
- Optional wording ("may keep" → "still works"; naming `.. figure::`). The current text is clear enough, and another history rewrite isn't worth it.

<details>
<summary>Full review</summary>

Verdict: accurate for the common cases, and it fixes the "broken tools" reading. Two small caveats. No security findings.

- Local tools: `__get_help_with_images` falls through to `strip_path_to_images` when `$PATH_TO_IMAGES/` is present. That regex covers `.. image::` and `.. figure::`.
- Shed tools: `make_image_paths_relative` runs `_strip_legacy_image_prefixes` first, then rewrites both `image` and `figure` targets.
- The "RST targets" scope and the pre-27.0 sentence are correct.

Minor:
1. The legacy `repository_id` branch (`set_image_paths`) only runs when the help contains `.. image:: `, and it only handles `image`, not `figure`. This is an edge case, not a regression from the docs change.
2. `${static_path}` is also stripped on the shed path, but the XSD doesn't mention it. Optional; leave out.

Clarity nits: the paragraph never names `.. figure::`; "may keep" is vague, and "still works" is more direct. Suggested: "RST `.. image::` and `.. figure::` targets may still use the legacy ``$PATH_TO_IMAGES/`` prefix (from the Tool Shed); it is stripped for local and Tool Shed tools alike."

</details>
