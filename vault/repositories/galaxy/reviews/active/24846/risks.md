Profile gx_risk_assessment · Claude Opus 5.5 · effort low · reviewed `00be733f7cc9a515c7a994399a80268b1892fda9`

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door).

<details><summary>Risk Details</summary>

- Client-only; no API, schema, or workflow/tool artifact changes. Rollback is a plain revert.
- The change is in shared `Filtering.getFilterText`, not just the workflow list: every `Filtering` built without an `autoFilterKey` (grids for pages/visualizations/admin roles/quotas, tools list, jobs list, credentials, published/curated workflows, etc.) now keeps plain words when `applyFiltersToText` / `setFilterValue` rebuild the query from existing text. That is the intended fix shape but broadens the user-visible effect beyond the PR title.
- In those components, plain text was previously dropped on filter toggle; any that implicitly relied on that (or sent the rebuilt text to a backend that rejects free text) would now see free text forwarded.
- Plain words are always written first, so word order relative to `key:value` tokens may change versus what the user typed (cosmetic).
- Targets `release_26.2`; small and covered by unit tests in `filtering.test.js` plus one `WorkflowList` component test.

</details>

<details><summary>Risk Review Advice</summary>

Reviewers should confirm the broadened scope is wanted on a release branch: spot-check one or two non-workflow `Filtering` users without `autoFilterKey` (e.g. a Grid list and the tools list) by typing a word and toggling an advanced filter, and confirm the backend accepts the retained free text there.

</details>
