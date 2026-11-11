Run via gpt-6.1-sol at high effort.

# Codex review

Codex found nothing to fix, and I made no changes.

Codex's sandbox can't run on this host, because it needs unprivileged user namespaces. It reviewed only what was pasted into the prompt:
- the diff at `ff28c6828a9`;
- excerpts of `copy_from`, `HDA.copy`, `Job.copy_from_job`, `MetadataFile`, `MetadataCollection`/`FileParameter`, deferred materialization, `get_replacement_dataset`, the workflow-scheduling `materialize` caller, the tool-action cache hit, the expression passthrough, `replace_elements_with_copies`, and pgcleanup's `PurgesHDAs`/`RemovesMetadataFiles`.

Not acted on: nothing; no findings.

<details>
<summary>Full review (high effort)</summary>

Coverage notes: "Reviewed only the pasted diff and excerpts. Repository access and test execution were unavailable. Could not verify the metadata setter, object-store implementations, session/locking helpers, complete callers, or test fixtures and base classes."

Findings: none.

The earlier round's only finding, that a linked BAM loses its index, was refuted by a probe and is pinned by `test_expression_tool_output_copied_from_linked_input`; see `earlier_drafts/1/codex_review.md`.

</details>
