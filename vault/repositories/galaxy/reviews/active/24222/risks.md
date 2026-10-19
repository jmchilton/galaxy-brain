Risks are minimal - this is mostly client UI on the tool discovery page (a tag picker over the existing `tag:` search syntax, chip/card refactors, a new opt-in `GDropdown` `initialFocus` prop), so it doesn't lock Galaxy into hard-to-change choices (a two-way door).

<details><summary>Risk Details</summary>

- `/api/tags/tool_tags` now returns only tools visible to the requesting user (toolbox filters applied), not every loaded tool. Narrower output is the safer direction, but it is an observable API behavior change on a release branch.
- `GDropdown` (shared `@galaxyproject/ui` package) gets an `initialFocus` prop that changes ArrowUp/ArrowDown handling when set; existing callers don't set it, so they keep current behavior.
- Tool-store refactor: tags are now kept as a separate mapping and applied when tools are read, rather than copied into the tool objects. Any consumer reading `toolsById` before the mapping loads sees tools without tags.

</details>

<details><summary>Risk Review Advice</summary>

Confirm the visibility filter on `/api/tags/tool_tags` is wanted for 26.2 and that no external client depends on the full mapping. Otherwise review focuses on keyboard/accessibility behavior of the tag picker, since that is the one place users learn a new interaction.

</details>
