<!-- Profile: gx_risk_assessment; model: Opus 5.5; effort: low; reviewed commit: c1e5f3fd6e0 -->

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door). It is client-only: sorting now reorders the staged items array so uploads, collection elements and pairing follow the displayed order; no API, tool, or workflow behavior changes.

<details><summary>Risk Review Advice</summary>

Worth a glance: binding `localSorting: false` on the upload GTables also disables GTable's local filtering for those tables, and newly added items are re-sorted into the active sort rather than appended. Check no upload table relied on GTable filtering and that auto-resorting on add matches user expectations; on a release branch, also confirm the remove-by-item change covers every method that previously removed by row index.

</details>
