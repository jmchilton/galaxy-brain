Mostly a two-way door: the containment check is a code-only backstop that can be reverted, but it removes a previously accepted input (tool-provided `MetadataTempFile` paths outside the job's `metadata/` directory), which tools or job runners may have relied on, and in-flight set-metadata jobs from before the upgrade will end in `failed_metadata`.

<details><summary>Risk Details</summary>

- Behavior narrowing for tool authors: legacy XML tools (profile ≤ 26.2) and opted-in interactive tools that emit a file-valued metadata value in `galaxy.json` pointing anywhere other than `<job_wd>/metadata` now get `failed_metadata` instead of a copied file.
- Extended metadata (compute-side discovery) passes no directory, so any `MetadataTempFile` in tool-provided metadata is always rejected there.
- Pulsar `remote_metadata` relies on `path_rewriter` mapping `remote_metadata_directory` paths into local `<job_wd>/metadata`; deployments whose staged paths don't follow that layout will fail metadata.
- `realpath` is applied before the check, so a symlinked job working directory or `metadata/` dir whose target is outside the configured path would be rejected (the directory side is not realpath-ed).
- Upgrade: set-metadata jobs queued before the upgrade on datasets with existing metadata files fail once; rerunning fixes it.
- `set_datasets_metadata` changed from `@staticmethod` to an instance method; any external caller using it on the class breaks.
- Fully reversible in code; no schema, API, or persisted-data changes.

</details>

<details><summary>Risk Review Advice</summary>

Reviewers should confirm the `metadata_tmp_files_dir` comparison is robust to symlinked/relative job working directories (only the file path is `realpath`-ed, not the directory), and that every production caller of `from_JSON_dict`/`set_datasets_metadata` that legitimately reads temp files (job finish, set-metadata tool, Pulsar remote metadata, directory strategy) passes the right directory.

Release managers should weigh the tool-author-visible narrowing on a release branch and make sure the upgrade note about in-flight set-metadata jobs and remote metadata layouts reaches admins.

</details>
