Profile: gx_risk_assessment · Model: Claude Opus 5.5 · Effort: low · Reviewed commit: bd5821aac2059ce9c3757e8e6c7982c207684bb6

Risks are minimal - this client-only change to how FilesDialog shows folders under a selected folder doesn't lock Galaxy into hard-to-change choices (a two-way door).

<details><summary>Risk Details</summary>

- `isDirectorySelected` now also counts a folder as selected when it sits under a selected folder (`isSubPath`), so selected/mixed row icons, select-all state and recursive re-selection (`selectDirectoryRecursive`, `onSelectAll`) all change for nested folders.
- Folders can now be treated as selected even though they're not in `selectedDirectories`, so what gets submitted relies on unselect logic (`unselectPath`) to drop descendants correctly when a nested folder is toggled off.
- No API, schema, or workflow/tool artifact changes; it targets release_26.0 with a new Vitest file only.

</details>

<details><summary>Risk Review Advice</summary>

Check toggling a subfolder of a selected folder: it should unselect that subfolder and leave the parent mixed, and selecting the parent again should not keep a stale ancestor match. Also check `checkIfAllSelected`, which can now push the current folder into `selectedDirectories` when an ancestor is already selected, adding redundant entries.

</details>
