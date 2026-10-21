Profile: gx_risk_assessment, Opus 5.5 (claude-opus-5-5), low effort, reviewed commit 7399ba875a9ac05778d177b36b39eabf30cbb9c1.

Mostly a two-way door; the one sticky part is that permissions written to datasets on a release branch persist in the database, so if the defaults applied are wrong (too open or too restrictive) a code revert won't fix already-discovered datasets.

<details><summary>Risk Details</summary>

- Discovered collection elements now get default (often private) permissions where they previously had none; users or tools relying on those elements being publicly accessible may see access changes after upgrade.
- Permissions are persisted per Dataset; rolling back the code leaves rows already written, so correcting mistakes needs a data fix rather than a revert.
- The job-finish path no longer re-applies permissions to precreated outputs (`hdas_by_id`), relying on job-creation time instead; any precreated output path that skipped permissions at creation would now stay without them.
- Dedupe by `Dataset` picks one HDA per shared dataset to derive permissions; if copies differ in history context, the chosen HDA decides.
- Backport to `release_25.1` changes runtime behavior in a stable release, not just a bug-shaped no-op.

</details>

<details><summary>Risk Review Advice</summary>

Confirm the defaults applied match what non-collection discovered outputs already get, so this is closing a gap rather than introducing new policy, and that dropping `hdas_by_id` from the job-finish loop cannot leave precreated outputs unprotected (e.g. outputs created outside the normal job-creation permission path).

Also check the extra query on job finish is bounded by discovered HDAs only and doesn't add noticeable cost for large collections.

</details>
