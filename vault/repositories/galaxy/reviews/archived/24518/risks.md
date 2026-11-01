Profile: gx_risk_assessment · Model: Claude Opus 5.5 · Effort: low · Reviewed commit: 8ee467177ab

Risks are minimal - this client-only fix to FilesDialog selection on a release branch doesn't lock Galaxy into particular difficult to change choices (a two-way door).

<details><summary>Risk Details</summary>

- No API, schema, or developer-artifact changes; only `FilesDialog.vue` plus a new vitest file.
- On paginated sources, select-all now toggles only the visible page and never marks the folder itself as selected; users who expected whole-folder selection must page through or select the folder from its parent.
- `isPaginated` is true whenever an `itemsProvider` exists, so the new page-scoped behavior applies to every paginated source, not just the reported one.
- OK is now disabled while recursive folder listings are pending; a listing that hangs (no settle) would keep OK disabled, though `.finally` covers rejections.
- Recursive listings no longer overwrite `totalItems`, removing the pager-disappearing bug; any reliance on the old (incorrect) count is gone.

</details>

<details><summary>Risk Review Advice</summary>

Confirm the page-scoped select-all semantics are the intended UX for paginated sources on a release branch, and that unselect-all on one page correctly leaves other pages' files selected while dropping the folder-as-a-whole selection. Non-paginated behavior should be unchanged; a quick manual check on a plain (non-paginated) source would confirm.

</details>
