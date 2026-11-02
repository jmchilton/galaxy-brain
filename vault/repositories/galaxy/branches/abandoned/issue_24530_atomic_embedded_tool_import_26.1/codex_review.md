# Codex review debrief (re-harden)

Codex raised 2 issues. I fixed the P1 and left the P2.

- **P1 confirmed and fixed (`5736d36d060`):** `set_tags_from_list` commits by default, so a nested subworkflow build committed its embedded tools before the parent import finished. It now passes `flush=False`; the build's own flush or commit follows. Added a red→green case, `test_failed_import_rolls_back_embedded_user_tools[first_nested]`: a valid tool inside a subworkflow, then an invalid tool in a parent step.

Not acted on:
- **P2: unloading a failed admin tool whose id and version match an installed tool drops that installed version from the versions map.** This is a rare admin edge case. Loading the embedded tool already displaced the installed version, including on a successful import, and before this branch a failed import left the embedded tool in its place. A fix would need `load_dynamic_tool` to remember what it displaced.

<details><summary>Raw findings</summary>

1. P1 `managers/workflows.py:829`: subworkflow tag handling commits embedded tools before the parent import finishes.
2. P2 `toolbox/base.py:449`: unloading after a failed import can erase an existing tool version.
</details>
