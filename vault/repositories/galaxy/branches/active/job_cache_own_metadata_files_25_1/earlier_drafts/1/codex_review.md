Run via gpt-6.1-sol at high effort.

# Codex review

Codex found one issue. I checked it and refuted it for the disk object store, and added a test that pins the behavior (`7f71b59b32f`). No code changes were needed.

Codex's sandbox can't run on this host, because it needs unprivileged user namespaces. It reviewed only what was pasted into the prompt: the diff at `5b4fc0295bd`, plus excerpts of `copy_from`, `HDA.copy`, `Job.copy_from_job`, `MetadataFile`, `MetadataCollection`/`FileParameter`, deferred materialization, the tool-action cache hit, the expression passthrough, `replace_elements_with_copies`, and pgcleanup's `PurgesHDAs`/`RemovesMetadataFiles`. The first run used Codex's default reasoning effort, `none`, and returned no findings. I reran it at `high` and kept that run.

Not acted on:

- **Linked BAM loses its index (P2, "likely").** This is refuted for the disk store. `make_copy` copies only when `object_store.exists(target_dataset)` is true. Disk `_exists` ignores `external_filename`, so Codex reasoned that a linked BAM would lose its index. In practice a linked upload still has an empty placeholder file in the object store. A probe during `test_expression_tool_output_copied_from_linked_input` showed `exists() == True` at `database/objects/.../dataset_<uuid>.dat`, and the copy owns its own index with the same bytes. Not verified: remote or caching object stores, and linked library datasets imported into a history.

<details>
<summary>Full review (high effort)</summary>

Coverage notes: "Reviewed only the pasted diff and surrounding excerpts, including pgcleanup. Could not inspect omitted implementations, verify external-file handling by object_store.exists, search other callers, or run tests."

- **P2 correctness, `lib/galaxy/model/__init__.py:5910`: Copying a linked BAM can drop its index metadata (likely).** The metadata setter uses `FileParameter.make_copy`, which returns None for a persisted MetadataFile when `target_dataset.object_store.exists(target_dataset)` is false. Datasets whose primary file lives outside the object store would then lose readable file metadata. The expression passthrough skips metadata regeneration when the extension is unchanged, so it leaves the output without its BAM index. The submission-time cache assignment has the same limitation. Failure scenario: pass an externally linked BAM, with a persisted `bam_index` MetadataFile and no primary data object in the object store, through an expression passthrough without changing its datatype. `copy_from` now replaces `bam_index` with None, although the source index is still readable. Before the change, the output kept the index reference.

</details>
