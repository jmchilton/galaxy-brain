# Normal review 2 (post re-scope) — debrief

No must-fix. Acted on: one shared `restrictedCollectionTypes` computed now drives both drop gates (`toDataOption`, `canAcceptSrc`), so null and empty can't drift apart; added a `null` `collectionTypes` baseline row (what the server actually sends); reworded the column-definition commit so it says jobs get plain lists without column data.

Not acted on:

- **Map-over onto a column-defined `sample_sheet` input gives the tool column-less rows.** `sample_sheet` is outermost-only, so the map-over units are plain lists. The client now matches the server dropdown, which lists and submits these. Whether the server's `match_multirun_collections` (and `from_json`) should refuse them instead is a server decision → follow-up issue candidate; if the server tightens, revert the `mapOverType === null` guard and flip the test. Needs John's call; recorded in the hand-off.
- **Widen the `collectionTypes` prop type to `| null`**: tried; it ripples type errors into child components (`FormDataContextButtons`, etc.). Runtime is safe via the computed. Not worth it on a backport.
- **`from_json` checks neither collection type nor column definitions**: server follow-up.

<details><summary>Full review</summary>

See [normal_review_2_raw.md](normal_review_2_raw.md).

</details>
