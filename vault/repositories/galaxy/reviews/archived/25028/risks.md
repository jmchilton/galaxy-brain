Mostly a two-way door: it aligns Pulsar remote extended metadata with the job script's existing `from_work_dir` semantics, but the new error-state export in `set_metadata_portable` changes how every extended-metadata failure is reported, on a release branch.

<details><summary>Risk Details</summary>

- The new `except` branch exports the output in `error` state whenever metadata fails before any object-store action was queued. This applies to all extended-metadata jobs (local, Pulsar, Kubernetes), not just the unmatched `from_work_dir` case, so failures that used to leave outputs queued or get retried now land as visible errors.
- The purged-output branch now also exports `error` state. Outputs that really were purged mid-job still take this path; if Galaxy ever starts importing state from the export, a purged output could show as errored.
- `filename_fallback` is a new key in the metadata params JSON. Reads use `.get`, so old params still work. Galaxy and remote metadata run the same Galaxy lib, so version skew is limited to mixed-version metadata environments.
- A tool output with a `from_work_dir` glob that matches 0 or 2+ files now keeps whatever the tool wrote to the regular output path under remote metadata. This matches the local job script, so it fixes a divergence rather than adding a new rule for tools, but tools that wrote nothing now finish `ok`/empty or `error` where before they behaved differently.
- The fallback path comes from `remote_output_path_rewrite`. If a Pulsar destination's path mapping differs from where the tool actually writes the output, the fallback quietly misses and the output errors.

</details>

<details><summary>Risk Review Advice</summary>

The `except`-branch change in `set_metadata.py` is broader than the PR title suggests. Reviewers should confirm that exporting `error` for every early metadata failure fits `retry_metadata_internally` and Galaxy's handling of a failed `metadata_results` file, and that `reset_external_filename` is safe when no file was collected.

On the Pulsar side, check that `fallback_path` matches the remote output path across the file-action configs (copy, rewrite_parameters, staging) and not only the embedded copy setup the new tests cover.

</details>
