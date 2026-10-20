:shipit: -John

<details><summary>Automated Review Details</summary>

- Review profile [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) was run via Claude Opus 5.5 at medium effort.
- Review profile [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) was run via Claude Opus 5.5 at low effort.
- Review profile [gx_risk_assessment](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_risk_assessment.md) was run via Claude Opus 5.5 at low effort.
- Verification was run as documented [here](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/PROCESS_INITIAL_REVIEW.md) via Claude Opus 5.5 at medium effort.

</details>

<details><summary>Risks</summary>

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

</details>

## Automated Review Findings

<details><summary>About findings</summary>

These are broken into P1 (must fix), P2 (should fix), and P3 (smaller nits). These ratings are agent defined and the priority to John may be different and called out above. If anything is rated P3 and not called out as important by John above - please don't feel compelled to act on them or respond to them.

You're contributing to a repository John cares about and you deserve a human response. If any of these don't make sense or are missing important context - please push back and accept John's apology.

</details>

<details><summary>Review Verification Branch Details</summary>

This [review branch](https://github.com/jmchilton/galaxy/tree/pr_24280_review_0) contains work the verification agent did to help verify findings and make sure suggestions make sense and are actionable. This doesn't necessarily represent production ready code. Feel free to include any commits in the PR but they should be reviewed by a human.

<details><summary>Branch and Commit Details</summary>

# Review branch [`pr_24280_review_0`](https://github.com/jmchilton/galaxy/tree/pr_24280_review_0)

Based on reviewed commit `ff83754163b`. It narrows the type hints on the new stored-preference validation helper in the job wrapper so the signature documents its contract. Behavior is unchanged.

- [`f2412c63e04`](https://github.com/jmchilton/galaxy/commit/f2412c63e04) Narrow stored preference helper typing — types `user` as `Optional[User]` and `owner_type` as `Literal["history", "user"]` on `_validated_stored_preferred_object_store_id`.

</details>

</details>

### P3 1: Narrow the new helper's signature (implementation verified)

`_validated_stored_preferred_object_store_id` leaves `user` untyped and types `owner_type` as `str`, though it only ever gets `"history"` or `"user"`. The PR already tightens `User.preferred_object_store_id` to `Mapped[Optional[str]]` in the same spirit.

Type them as `user: Optional[User]` and `owner_type: Literal["history", "user"]`. Fixed in [`f2412c63e04`](https://github.com/jmchilton/galaxy/commit/f2412c63e04).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>
