# Normal review 1 — debrief

No must-fix. Acted on: restacked onto pushed `issue_24218_can_map_over_parity_26.0` (`d45d2fdb3bc`), dropping this branch's duplicate `canMapOver` commit and baseline copy of `collectionTypeDescription.test.ts`; un-exported unused `SINGLE_DATASETS`; dropped restating comment in `toDataOption`; added rows `sample_sheet:paired` on `paired` (baseline) and element holding `list` on `paired_or_unpaired` (element fix).

Not acted on:

- **Merge-forward to dev conflicts** (`canMatch` → `accepts`, dev's `sample_sheet` guard): note for the PR / merge-forward; `collectionMatch.ts` should switch to `accepts` on dev.
- **Workflow editor `_effectiveMapOver` picks map-over in declared order**: pre-existing, editor-side; follow-up candidate (move deepest-first pick into `collectionTypeDescription.ts`). Out of scope for a 26.0 backport.
- **Column-definition check stricter than server map-over listing** for `sample_sheet` inputs: pre-existing; follow-up.
- Test comment/table-style nits on `collectionTypeDescription.test.ts`: moot after restack (file now from 24218 branch).

<details><summary>Full review</summary>

See [normal_review_1_raw.md](normal_review_1_raw.md).

</details>
