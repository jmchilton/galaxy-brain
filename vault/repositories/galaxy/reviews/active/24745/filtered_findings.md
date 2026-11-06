# Filtered findings: #24745

- **default, "For the verifier": LDDA input to `ExpressionTool.exec_after_process` leaves a live HDA on an `lda_id` row.** Disproved. `DefaultToolAction` converts LDDA inputs with `to_history_dataset_association` (`tools/actions/__init__.py:551`), which copies metadata to a new row, and `_record_inputs` records the HDA.
- **default, "For the verifier": duplicate uuid rows look unreachable.** Disproved by P1 1. Export and import strip metadata files by default, but extended metadata doesn't.
- **default and gx_test_challenger: `HDA.copy_from` shares a metadata row with its source.** Pre-existing and safe for `full_delete()`, since both share a `Dataset`. pgcleanup removal by `hda_id` was already exposed. Noted in P1 1 details.
- **gx_risk_assessment: `full_delete()` has more ways to fail.** Not actionable. A metadata delete fails in the same way as the primary dataset delete right after it, on the same callers.
- **gx_risk_assessment: `--force-retry delete_library_datasets` becomes a bulk historical delete.** Not a code finding, and reclaiming these files is the PR's stated purpose. Worth a release note.
- **gx_risk_assessment: existing API-purged HDA leftovers stay.** The description's table calls this out explicitly.
- **gx_risk_assessment: purging datasets with many associations costs more; gx_performance_challenger P3 4: library purge sweeps inside the web request.** Speculative. No production data shows copy counts, and the debrief's measurement plan would settle it.
- **gx_performance_challenger, pre-existing: `DeleteLibraryDatasets` ignores `--batch-size`; `remove_from_object_store` calls `get_filename()` first.** Pre-existing code the PR doesn't touch.
- **gx_performance_challenger P3 2: `delete_library_datasets` returns versions x metadata files rows.** Not worth fixing. The suggested `UNION ALL` took the 20-version library dataset from 1,200 rows to 80 but doubled the common case: 400,080 total rows on the 200,000 library dataset run, against 201,200. Sets deduplicate the results, so the only harm is iteration and an occasional `ObjectNotFound` warning.
- **gx_test_challenger P3 2: roundabout setup in `test_delete_library_datasets_force_retry_metadata_files`.** Nit. The test is correct as written.
- **gx_test_challenger P3 5: `ObjectNotFound` and `session is None` branches untested.** Not actionable. The disk store can't raise `ObjectNotFound` here, and the `session is None` return is plain. The `store_by="id"` part moved to P2 3.
- **gx_test_challenger P3 6: non-disk backends unexercised.** Not actionable for this PR. The delete call has the same shape as the existing pgcleanup removal.
