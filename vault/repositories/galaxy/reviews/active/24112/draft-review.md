Reviewed `1d31ecb856392cadb3457d5418139d6682bb424a`. No blocking findings from the code review.

The enrichment cap preserves names for the remote-file dialog's paginated results while avoiding name requests for large unpaginated listings. Token normalization and filesystem-initialization error handling are consistent with the intended behavior. The shared fsspec 404 handler keeps useful backend reasons without changing the status.

Local validation: 64 targeted tests passed, 15 skipped. Additional probes checked the actual 100/101-entry boundary and the 60-second transient-failure retry in `nomad-fsspec==0.4.4`. Live NOMAD/Oasis browsing and imports were not run.

The API CI failure is in `test_error_outputs_with_purged_inputs` (`error` instead of `paused` for a cat output), which appears unrelated to these paths; please account for it before merge.

## Risks

Risks are low and reversible (a two-way door). The visible behavior change is intentional: more than 100 uploads returned together keep their IDs as names. The shared fsspec change affects descriptive 404 text, and the backend bump changes retry behavior. There are no migrations or new workflow/tool artifact contracts.
