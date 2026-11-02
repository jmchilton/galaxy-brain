Profile gx_risk_assessment, claude-opus-5-5 at low effort, reviewed commit 7247fea9983.

Mostly a two-way door: no API, schema, or tool/workflow format change, but the new allowlist rejects extended-metadata imports that touch anything outside the job's own outputs, so any legitimate job path the allowlist misses will now fail jobs on a release branch.

<details><summary>Risk Details</summary>

- Behavior change on `release_26.2`: extended-metadata finish now raises `MalformedContents` for edits to datasets, collections, jobs, library folders, or metadata files not derived from `job.io_dicts(exclude_implicit_outputs=True)`. Any tool or job type that legitimately edits other objects (implicit outputs, dynamically discovered collection elements populated later, data fetch into libraries, set-metadata jobs, `__DATA_FETCH__`/upload variants) would fail where it succeeded before.
- Library-folder access is now gated on `library_folder_manager.can_add_item` for the job's user; jobs run without a user/session, or admin-driven library imports, depend on that check behaving correctly in a `WorkRequestContext`.
- User-defined tools (`GalaxyUserTool`) can no longer set `external_filename` or move datasets to object stores outside the job's own; this intentionally narrows what those tools may do and is a small precedent for user-tool capabilities.
- Metadata-file reuse by uuid is refused unless the uuid belongs to one of the job's outputs; flows that legitimately copy or share metadata files across datasets could break.
- Rollback is cheap (code-only, no migration), and the change only applies to `metadata_strategy` extended/directory-celery paths that use the job-written model store.

</details>

<details><summary>Risk Review Advice</summary>

Reviewers should check that the allowlist built in `EditableObjects.__init__` covers every object a real extended-metadata job writes back: implicit outputs, discovered/dynamic collection elements, data-fetch library targets, and set-metadata jobs. Running the extended-metadata integration and data-fetch/library test suites against this branch is the main safeguard against release-branch job failures.

The `GalaxyUserTool` restrictions on `external_filename` and object store changes should also be confirmed as the intended policy, since they define what user-defined tools may do going forward.

</details>
