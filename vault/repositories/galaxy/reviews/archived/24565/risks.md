<!-- Profile: gx_risk_assessment; model: Claude Opus 5.5; effort: low; reviewed commit: fc477492afec572160601cd5d60e8d2d0f5b1be6 -->

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door). It is client-only: the My workflows tab now passes the existing `show_shared=false` API parameter and drops the `is:shared_with_me` filter from that tab; no API, schema, or workflow-artifact behavior changes.

<details><summary>Risk Details</summary>

- Bookmarked or typed `is:shared_with_me` searches on the My workflows tab now surface as an invalid filter instead of returning results; users must use the Shared with me tab instead.
- The fix relies on the server-side `show_shared` default staying as is for the other tabs, which still pass `undefined`.

</details>

<details><summary>Risk Review Advice</summary>

Confirm that removing `is:shared_with_me` from the My workflows filter menu and help text is the intended UX, given that the Shared with me tab covers that case. Reverting is a two-line client change.

</details>
