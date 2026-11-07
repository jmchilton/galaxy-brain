```yaml
documents:
  - path: vault/repositories/galaxy/reviews/active/24745/metadata_source_shared_uuid_issue.md
    why: The issue draft - root cause trace, reproduction table (extended vs directory), history, what was and wasn't verified, direction. Written against dev. The reference branch's tests are already staged in the worktree.
  - path: vault/repositories/galaxy/reviews/active/24745/verified_review.md
    why: P1 1 gives the end-to-end repro and how duplicate-uuid rows interact with purge (uuid guard, pgcleanup RemovesMetadataFiles); also the HDA.copy_from shared-row case that a make_copy fix does not touch.
    load_when: Deciding whether the fix needs a companion purge guard or a repair story for existing duplicate rows.
  - path: vault/research/Component - Job Completion Lifecycle.md
    why: Extended-metadata path in finish() - the handler-side import of outputs_populated where the duplicate row is inserted, and what commits when.
    load_when: Tracing how the job-side object turns into a handler-side row.
  - path: vault/research/Component - Object Store Cache and Direct Access.md
    why: How a MetadataFile is addressed in the object store (extra_dir _metadata_files, alt_name metadata_<id|uuid>.dat) and inherits the dataset's object_store_id.
    load_when: Writing tests that assert on file paths or distinct files.
  - path: vault/repositories/galaxy/branches/active/issue_24264_library_metadata_file_name_25.1/index.md
    why: Prior release_25.1 branch in MetadataFile.get_file_name; shows the base, store_by handling and test choices for this area.
    load_when: Touching MetadataFile.get_file_name or object-store swapping in unit tests.
  - path: vault/agents/gx_research/todo/model_store_import_trust.md
    why: Pending request describing replace_metadata_file and the extended-metadata round trip; this branch is listed under Requested by.
    load_when: Understanding what replace_metadata_file does (not yet a published note).
research_requests:
  - vault/agents/gx_research/todo/dataset_metadata_files.md
  - vault/agents/gx_research/todo/model_store_import_trust.md
```
