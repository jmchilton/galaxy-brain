# galaxy-brain research follow-up for galaxyproject/galaxy#24647

No existing research note conflicts with the pre-PR baseline. The items below are post-merge updates only.

## Post-merge activities

- [ ] **[[Component - Job Completion Lifecycle]], "Extended-metadata path".** It says `finish()` imports `outputs_populated` with `ImportOptions(allow_dataset_object_edit=True, allow_edit=True)`. After the merge, the import also passes `editable_objects=EditableObjects(job, ...)`, so the store may only edit the job's own outputs, the job, and library folders the user can add to. An unlisted id raises `MalformedContents`, and `finish()` fails the job through `fail()`. Add a bullet and refresh the line references. The "explicit failure" list in the error-handling section should also name the rejection.
- [ ] **[[Component - User-Defined Tools]], section 3 "The security model".** It lists three layers of defense (sandboxed expressions, mandatory containers, per-user authorization) and the boundaries that matter. Add the job-written model store as a trust boundary. Under extended metadata, a UDT job's `outputs_populated` store is limited to the job's outputs. It also cannot set `external_filename` or move a dataset to another object store, and a new dataset may only land in a user object store the job already uses (`allow_dataset_file_edit=False`).
- [ ] **[[Component - Private Object Stores]].** Optionally note that `is_user_object_store` now also gates which object stores a UDT job's discovered datasets may claim on extended-metadata import.
- [ ] Fold the PR into the queued request `vault/agents/gx_research/todo/model_store_import_trust.md` (Component - Model Store Import and Export) if it hasn't been ingested by then.
