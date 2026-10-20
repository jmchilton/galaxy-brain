Profile: gx_risk_assessment · Model: Claude Opus 5.5 · Effort: low · Reviewed commit: ff83754163b26e9c19fd6d2d2fb241b69e4adf4a

The main one-way risk is a silent behavior change on a release branch: outputs whose saved user/history preference points to a now-unselectable backend go to the weighted default, which may differ in quota, privacy, and expiry. Datasets written there in the meantime aren't moved back if the change is reverted. The code itself is small and easy to revert (mostly a two-way door).

<details><summary>Risk Details</summary>

- Stale preferences now go to the weighted default, not the retired backend. For deployments like the one in the issue, scratch data lands on permanent storage. It counts against permanent quota, isn't purged, and may be less private. Datasets created before a revert stay where they were written.
- The change ships in 25.1 point releases, so admins who upgrade get it without opting in. The only guidance is in the sample config comments and the PR's SQL snippet.
- Because the change reuses `validate_selected_object_store_id`, `user://` preferences are also rechecked against `user.object_stores`. If a user deletes or loses a user-defined store, their saved preference silently falls back to the default.
- Validation runs against `job.user`, not the history owner. These are normally the same, but they can differ in edge cases, such as jobs in another user's history or anonymous or admin-run jobs, and the result there may change.
- Each job with a stale preference logs a warning, so busy servers can get noisy logs until admins update the stored preferences.
- Job destination, tool request, and workflow invocation ids are deliberately left unvalidated, so the same retired backend can still be reached through those paths.
- The `Mapped[Optional[str]]` typing fix and sample-config edits are low-risk. The new test only covers the job path; upload and other paths that read preferences elsewhere aren't covered.

</details>

<details><summary>Risk Review Advice</summary>

Reviewers should decide whether falling back to the weighted default is acceptable on a stable release branch, or whether it should go to dev only or sit behind a config option. The alternative is to keep writing to the retired backend, which wastes space but doesn't change privacy or quota. Release notes should flag the change and include the SQL migration hint.

Also check that every place that reads a stored preference goes through `_set_object_store_ids_full` and so gets validated. In particular, check that uploads and other dataset creation paths don't read `preferred_object_store_id` directly.

</details>
